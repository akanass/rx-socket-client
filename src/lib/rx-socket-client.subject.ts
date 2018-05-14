import { Observable, Subject, Subscription, interval } from 'rxjs';
import { WebSocketSubject, WebSocketSubjectConfig } from 'rxjs/webSocket';
import { root } from 'rxjs/internal/util/root';
import { distinctUntilChanged, takeWhile, map, filter } from 'rxjs/internal/operators';

import * as ws from 'websocket';

import { Buffer } from 'buffer';

/**
 * Extends default config to add reconnection data and serializer
 */
export interface RxSocketClientConfig<T> {
    /** The url of the socket server to connect to */
    url: string;
    /** The protocol to use to connect */
    protocol?: string | Array<string>;
    /**
     * A WebSocket constructor to use. This is useful for situations like using a
     * WebSocket impl in Node (WebSocket is a DOM API), or for mocking a WebSocket
     * for testing purposes
     */
    WebSocketCtor?: { new(url: string, protocol?: string | Array<string>): WebSocket };
    /** Sets the `binaryType` property of the underlying WebSocket. */
    binaryType?: 'blob' | 'arraybuffer';
    /** Sets the reconnection interval value. */
    reconnectInterval?: number;
    /** Sets the reconnection attempts value. */
    reconnectAttempts?: number;
    /**
     * A serializer used to create messages from passed values before the
     * messages are sent to the server.
     */
    serializer?: (value: T) => WebSocketMessage;
    /**
     * A deserializer used for messages arriving on the over the socket from the
     * server.
     */
    deserializer?: (e: MessageEvent) => T;
}

/** Type of message sent to server */
export type WebSocketMessage = string | ArrayBuffer | Blob | ArrayBufferView;

/**
 * Class definition
 */
export class RxSocketClientSubject<T> extends Subject<T> {
    // Observable for reconnection stream
    private _reconnectionObservable: Observable<number>;
    // WebSocketSubjectConfig instance
    private _wsSubjectConfig: WebSocketSubjectConfig<T>;
    // WebSocketSubject instance
    private _socket: WebSocketSubject<any>;
    // Subject for connection status stream
    private _connectionStatus$: Subject<boolean>;
    // Deserializer
    private _deserializer: (e: MessageEvent) => T;
    // Serializer
    private _serializer: (value: T) => WebSocketMessage;
    // Socket Subscription
    private _socketSubscription: Subscription;
    // Reconnection Subscription
    private _reconnectionSubscription: Subscription;
    // Reconnect interval
    private _reconnectInterval: number;
    // Reconnect attempts
    private _reconnectAttempts: number;

    /**
     * Class constructor
     *
     * @param urlConfigOrSource
     */
    constructor(urlConfigOrSource: string | RxSocketClientConfig<T>) {
        super();

        // define connection status subject
        this._connectionStatus$ = new Subject<boolean>();

        // set deserializer
        if ((<RxSocketClientConfig<T>> urlConfigOrSource).deserializer) {
            this._deserializer = (<RxSocketClientConfig<T>> urlConfigOrSource).deserializer;
        } else {
            this._deserializer = this._defaultDeserializer;
        }

        // set serializer
        if ((<RxSocketClientConfig<T>> urlConfigOrSource).serializer) {
            this._serializer = (<RxSocketClientConfig<T>> urlConfigOrSource).serializer;
        } else {
            this._serializer = this._defaultSerializer;
        }

        // set reconnect interval
        if ((<RxSocketClientConfig<T>> urlConfigOrSource).reconnectInterval) {
            this._reconnectInterval = (<RxSocketClientConfig<T>> urlConfigOrSource).reconnectInterval;
        } else {
            this._reconnectInterval = 5000;
        }

        // set reconnect attempts
        if ((<RxSocketClientConfig<T>> urlConfigOrSource).reconnectAttempts) {
            this._reconnectAttempts = (<RxSocketClientConfig<T>> urlConfigOrSource).reconnectAttempts;
        } else {
            this._reconnectAttempts = 10;
        }

        // check type of constructor's parameter to add url in config
        if (typeof urlConfigOrSource === 'string') {
            // create minimum config object
            this._wsSubjectConfig = Object.assign({}, { url: urlConfigOrSource });
        } else {
            // create minimum config object
            this._wsSubjectConfig = Object.assign({}, { url: urlConfigOrSource.url });
        }

        // add protocol in config
        if ((<RxSocketClientConfig<T>> urlConfigOrSource).protocol) {
            Object.assign(this._wsSubjectConfig, { protocol: (<RxSocketClientConfig<T>> urlConfigOrSource).protocol });
        }

        // node environment
        if (!root.WebSocket) {
            root['WebSocket'] = ws[ 'w3cwebsocket' ];
        }
        // add WebSocketCtor in config
        if ((<RxSocketClientConfig<T>> urlConfigOrSource).WebSocketCtor) {
            Object.assign(this._wsSubjectConfig, { WebSocketCtor: (<RxSocketClientConfig<T>> urlConfigOrSource).WebSocketCtor });
        }

        // add binaryType in config
        if ((<RxSocketClientConfig<T>> urlConfigOrSource).binaryType) {
            Object.assign(this._wsSubjectConfig, { binaryType: (<RxSocketClientConfig<T>> urlConfigOrSource).binaryType });
        }

        // add default data in config
        Object.assign(this._wsSubjectConfig, {
            deserializer: this._deserializer,
            serializer: this._serializer,
            openObserver: {
                next: (e: Event) => {
                    this._connectionStatus$.next(true);
                }
            },
            closeObserver: {
                next: (e: CloseEvent) => {
                    this._cleanSocket();
                    this._connectionStatus$.next(false);
                }
            }
        });

        // connect socket
        this._connect();

        // connection status subscription
        this.connectionStatus.subscribe(isConnected => {
            if (!this._reconnectionObservable && typeof(isConnected) === 'boolean' && !isConnected) {
                this._reconnect();
            }
        });
    }

    /**
     * Returns connection status observable
     *
     * @return {Observable<boolean>}
     */
    get connectionStatus(): Observable<boolean> {
        return this._connectionStatus$
            .pipe(
                distinctUntilChanged()
            );
    }

    /**
     * Function to send data by socket
     *
     * @param data
     */
    send(data: any): void {
        this._socket.next(data);
    }

    /**
     * Function to handle text response for given event from server
     *
     * @example <caption>UTF Text Message from server</caption>
     *
     * const message = {
     *  type: 'utf8',
     *  utf8Data: {
     *      event: 'data',
     *      data: 'Data from the server'
     *  }
     * }
     *
     * @example <caption>Simple Text Message from server</caption>
     *
     * const message = {
     *  event: 'data',
     *  data: 'Data from the server'
     * }
     *
     * @param event represents value inside {utf8Data.event} or {event} from server response
     *
     *  @value error | complete | <any>
     *  @example <caption>Event type</caption>
     *
     *  if (event === 'error') => handle Observable's error
     *  else if (event === 'complete') => handle Observable's complete
     *  else handle Observable's success
     *
     * @param cb is the function executed if event matches the response from the server
     */
    on(event: string | 'error' | 'complete', cb: (data?: any) => void): void {
        this
            .pipe(
                map((message: any): any =>
                    (message.type && message.type === 'utf8' && message.utf8Data) ?
                        message.utf8Data :
                        message
                ),
                filter((message: any): boolean => message.event && message.event !== 'error' && message.event !== 'complete'
                    && message.event === event && message.data)
            ).subscribe(
            (message: any): void => cb(message.data),
            /* istanbul ignore next */
            (error: Error): void => {
                if (event === 'error') {
                    cb(error);
                }
            },
            /* istanbul ignore next */
            (): void => {
                if (event === 'complete') {
                    cb();
                }
            }
        );
    }

    /**
     * Function to handle bytes response for given event from server
     *
     * @example <caption>Bytes Message from server</caption>
     *
     * const message = {
     *  type: 'binary',
     *  binaryData: <Buffer 74 6f 74 6f>
     * }
     *
     * @example <caption>Simple Bytes Message from server</caption>
     *
     * const message = <Buffer 74 6f 74 6f>
     *
     * @param event represents Observable handler type
     *
     * @value error | complete | data
     * @example <caption>Event type</caption>
     *
     * if (event === 'error') => handle Observable's error
     * else if (event === 'complete') => handle Observable's complete
     * else handle Observable's success
     *
     * @param cb is the function executed if event matches the response from the server
     */
    onBytes(event: 'data' | 'error' | 'complete', cb: (data?: any) => void): void {
        this
            .pipe(
                map((message: any): any =>
                    (message.type && message.type === 'binary' && message.binaryData) ?
                        message.binaryData :
                        message
                ),
                filter((): boolean => event === 'data')
            ).subscribe(
            (message: any): void => cb(message),
            /* istanbul ignore next */
            (error: Error): void => {
                if (event === 'error') {
                    cb(error);
                }
            },
            /* istanbul ignore next */
            (): void => {
                if (event === 'complete') {
                    cb();
                }
            }
        );
    }

    /**
     * Function to emit data for given event to server
     *
     * @param event type of data for the server request
     * @param data request data
     */
    emit(event: string, data: any): void {
        this.send({ event, data });
    }

    /**
     * Function to clean socket data
     *
     * @private
     */
    private _cleanSocket(): void {
        /* istanbul ignore else */
        if (this._socketSubscription) {
            this._socketSubscription.unsubscribe();
        }
        this._socket = undefined;
    }

    /**
     * Function to clean reconnection data
     *
     * @private
     */
    private _cleanReconnection(): void {
        /* istanbul ignore else */
        if (this._reconnectionSubscription) {
            this._reconnectionSubscription.unsubscribe();
        }
        this._reconnectionObservable = undefined;
    }

    /**
     * Function to create socket and subscribe to it
     *
     * @private
     */
    private _connect() {
        this._socket = new WebSocketSubject(this._wsSubjectConfig);
        this._socketSubscription = this._socket.subscribe(
            (m: any) => {
                this.next(m);
            },
            (error: Event) => {
                /* istanbul ignore if */
                if (!this._socket) {
                    this._cleanReconnection();
                    this._reconnect();
                }
            }
        );
    }

    /**
     * Function to reconnect socket
     *
     * @private
     */
    private _reconnect(): void {
        this._reconnectionObservable = interval(this._reconnectInterval)
            .pipe(
                takeWhile((v, index) => index < this._reconnectAttempts && !this._socket)
            );

        this._reconnectionSubscription = this._reconnectionObservable.subscribe(
            () => this._connect(),
            null,
            () => {
                this._cleanReconnection();
                /* istanbul ignore if */
                if (!this._socket) {
                    this.complete();
                    this._connectionStatus$.complete();
                }
            }
        );
    }

    /**
     * Default deserializer
     *
     * @param e
     *
     * @return {any}
     * @private
     */
    private _defaultDeserializer(e: MessageEvent): T {
        try {
            return JSON.parse(e.data);
        } catch (err) {
            return e.data;
        }
    };

    /**
     * Default serializer
     *
     * @param data
     *
     * @return {WebSocketMessage}
     * @private
     */
    private _defaultSerializer(data: any): WebSocketMessage {
        return typeof(data) === 'string' || Buffer.isBuffer(data) ? data : JSON.stringify(data);
    };
}
