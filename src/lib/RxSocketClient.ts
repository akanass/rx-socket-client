import { Subject } from 'rxjs/Subject';
import { WebSocketSubject, WebSocketSubjectConfig } from 'rxjs/observable/dom/WebSocketSubject';
import { Observable } from 'rxjs/Observable';
import { Subscription } from 'rxjs/Subscription';
import 'rxjs/add/operator/distinctUntilChanged';
import 'rxjs/add/observable/interval';
import 'rxjs/add/operator/takeWhile';
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/filter';

/**
 * Extends default config to add reconnection data and serializer
 */
export interface RxSocketClientConfig {
    url: string;
    protocol?: string | Array<string>;
    resultSelector?: (e: MessageEvent) => any;
    WebSocketCtor?: { new(url: string, protocol?: string | Array<string>): WebSocket };
    binaryType?: 'blob' | 'arraybuffer';
    reconnectInterval?: number;
    reconnectAttempts?: number;
    serializer?: (data: any) => string;
}

/**
 * Class definition
 */
export class RxSocketClient<T> extends Subject<T> {
    // Observable for reconnection stream
    private _reconnectionObservable: Observable<number>;
    // WebSocketSubjectConfig instance
    private _wsSubjectConfig: WebSocketSubjectConfig;
    // WebSocketSubject instance
    private _socket: WebSocketSubject<any>;
    // Subject for connection status stream
    private _connectionStatus$: Subject<boolean>;
    // Result selector
    private _resultSelector: (e: MessageEvent) => any;
    // Serializer
    private _serializer: (data: any) => string;
    // Socket Subscription
    private _socketSubscription: Subscription;
    // Reconnection Subscription
    private _reconnectionSubscription: Subscription;
    // Reconnect interval
    private _reconnectInterval: number;
    // Reconnect attempts
    private _reconnectAttempts: number;

    /**
     * Static method to create new instance
     *
     * @param urlConfigOrSource
     *
     * @return {RxSocketClient<T>}
     */
    static create<T>(urlConfigOrSource: string | RxSocketClientConfig): RxSocketClient<T> {
        return new RxSocketClient<T>(urlConfigOrSource);
    }

    /**
     * Class constructor
     *
     * @param urlConfigOrSource
     */
    constructor(urlConfigOrSource: string | RxSocketClientConfig) {
        super();

        // define connection status subject
        this._connectionStatus$ = new Subject<boolean>();

        // set result selector
        if ((<RxSocketClientConfig> urlConfigOrSource).resultSelector) {
            this._resultSelector = (<RxSocketClientConfig> urlConfigOrSource).resultSelector;
        } else {
            this._resultSelector = this._defaultResultSelector;
        }

        // set serializer
        if ((<RxSocketClientConfig> urlConfigOrSource).serializer) {
            this._serializer = (<RxSocketClientConfig> urlConfigOrSource).serializer;
        } else {
            this._serializer = this._defaultSerializer;
        }

        // set reconnect interval
        if ((<RxSocketClientConfig> urlConfigOrSource).reconnectInterval) {
            this._reconnectInterval = (<RxSocketClientConfig> urlConfigOrSource).reconnectInterval;
        } else {
            this._reconnectInterval = 5000;
        }

        // set reconnect attempts
        if ((<RxSocketClientConfig> urlConfigOrSource).reconnectAttempts) {
            this._reconnectAttempts = (<RxSocketClientConfig> urlConfigOrSource).reconnectAttempts;
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
        if ((<RxSocketClientConfig> urlConfigOrSource).protocol) {
            Object.assign(this._wsSubjectConfig, { protocol: (<RxSocketClientConfig> urlConfigOrSource).protocol });
        }

        // add WebSocketCtor in config
        if ((<RxSocketClientConfig> urlConfigOrSource).WebSocketCtor) {
            Object.assign(this._wsSubjectConfig, { WebSocketCtor: (<RxSocketClientConfig> urlConfigOrSource).WebSocketCtor });
        }

        // add binaryType in config
        if ((<RxSocketClientConfig> urlConfigOrSource).binaryType) {
            Object.assign(this._wsSubjectConfig, { binaryType: (<RxSocketClientConfig> urlConfigOrSource).binaryType });
        }

        // add default data in config
        Object.assign(this._wsSubjectConfig, {
            resultSelector: this._resultSelector,
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
        return this._connectionStatus$.distinctUntilChanged();
    }

    /**
     * Function to send text data by socket
     *
     * @param data
     */
    sendUTF(data: any): void {
        this._socket.next(this._serializer(data));
    }

    /**
     * Function to send binary data by socket
     *
     * @param data
     */
    sendBytes(data: any): void {
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
    on(event: string, cb: (data?: any) => void): void {
        this.map((message: any): any => {
            if (message.type && message.type === 'utf8' && message.utf8Data) {
                return message.utf8Data;
            } else {
                return message;
            }
        }).filter((message: any): boolean => {
            return message.event && message.event !== 'error' && message.event !== 'complete' && message.event === event && message.data;
        }).subscribe(
            (message: any): void => cb(message.data),
            (error: Error): void => {
                if (event === 'error') {
                    cb(error);
                }
            },
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
        this.map((message: any): any => {
            if (message.type && message.type === 'binary' && message.binaryData) {
                return message.binaryData;
            } else {
                return message;
            }
        }).filter((message: any): boolean => {
            return event === 'data';
        }).subscribe(
            (message: any): void => cb(message),
            (error: Error): void => {
                if (event === 'error') {
                    cb(error);
                }
            },
            (): void => {
                if (event === 'complete') {
                    cb();
                }
            }
        );
    }

    /**
     * Function to emit data for given to server
     *
     * @param event type of data for the server request
     * @param data request data
     */
    emit(event: string, data: any): void {
        this.sendUTF({ event, data });
    }

    /**
     * Function to clean socket data
     *
     * @private
     */
    private _cleanSocket(): void {
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
        this._reconnectionObservable = Observable.interval(this._reconnectInterval)
            .takeWhile((v, index) => index < this._reconnectAttempts && !this._socket);

        this._reconnectionSubscription = this._reconnectionObservable.subscribe(
            () => this._connect(),
            null,
            () => {
                this._cleanReconnection();
                if (!this._socket) {
                    this.complete();
                    this._connectionStatus$.complete();
                }
            }
        );
    }

    /**
     * Default result selector
     *
     * @param e
     *
     * @return {any}
     * @private
     */
    private _defaultResultSelector(e: MessageEvent): any {
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
     * @return {string}
     * @private
     */
    private _defaultSerializer(data: any): string {
        return typeof(data) === 'string' ? data : JSON.stringify(data);
    };
}
