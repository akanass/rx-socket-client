import { Buffer } from 'buffer';
import { interval, Observable, Subject, Subscription } from 'rxjs';
import { distinctUntilChanged, filter, map, takeWhile } from 'rxjs/operators';
import { WebSocketSubject, WebSocketSubjectConfig } from 'rxjs/webSocket';

import * as ws from 'websocket';

/**
 * Extends default config to add reconnection data and serializer
 */
export interface RxSocketClientConfig {
  /** The url of the socket server to connect to */
  url: string;
  /** The protocol to use to connect */
  protocol?: string | Array<string>;
  /**
   * A WebSocket constructor to use. This is useful for mocking a WebSocket
   * for testing purposes
   */
  WebSocketCtor?: { new(url: string, protocol?: string | Array<string>): WebSocket };
  /** Sets the `binaryType` property of the underlying WebSocket. */
  binaryType?: 'blob' | 'arraybuffer';
  /** Sets the reconnection interval value. */
  reconnectInterval?: number;
  /** Sets the reconnection attempts value. */
  reconnectAttempts?: number;
}

/** Type of message sent to server */
export type WebSocketMessage = string | Buffer | ArrayBuffer | Blob | ArrayBufferView;

/** Type of message received from server */
export type WebSocketMessageServer = {
  event: string;
  data: string;
}

/** Type of binary received from server */
export type WebSocketBinaryServer = Buffer | ArrayBuffer | Blob | ArrayBufferView;

/**
 * Class definition
 */
export class RxSocketClientSubject<T> extends Subject<T> {
  // Observable for reconnection stream
  private _reconnectionObservable: Observable<number>;
  // WebSocketSubjectConfig instance
  private readonly _wsSubjectConfig: WebSocketSubjectConfig<T>;
  // WebSocketSubject instance
  private _socket: WebSocketSubject<any>;
  // Socket Subscription
  private _socketSubscription: Subscription;
  // Reconnection Subscription
  private _reconnectionSubscription: Subscription;
  // Reconnect interval
  private _reconnectInterval: number;
  // Reconnect attempts
  private readonly _reconnectAttempts: number;
  // Subject for connection status stream
  private _connectionStatus$: Subject<boolean>;

  /**
   * Class constructor
   *
   * @param urlConfigOrSource
   */
  constructor(urlConfigOrSource: string | RxSocketClientConfig) {
    super();

    // define connection status subject
    this._connectionStatus$ = new Subject<boolean>();

    // set reconnect interval
    if ((urlConfigOrSource as RxSocketClientConfig).reconnectInterval) {
      this._reconnectInterval = (urlConfigOrSource as RxSocketClientConfig).reconnectInterval;
    } else {
      this._reconnectInterval = 5000;
    }

    // set reconnect attempts
    if ((urlConfigOrSource as RxSocketClientConfig).reconnectAttempts) {
      this._reconnectAttempts = (urlConfigOrSource as RxSocketClientConfig).reconnectAttempts;
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
    if ((urlConfigOrSource as RxSocketClientConfig).protocol) {
      Object.assign(this._wsSubjectConfig, { protocol: (urlConfigOrSource as RxSocketClientConfig).protocol });
    }

    // node environment
    if (typeof window === 'undefined') {
      Object.assign(this._wsSubjectConfig, { WebSocketCtor: ws['w3cwebsocket'] });
    }

    // add WebSocketCtor in config
    if ((urlConfigOrSource as RxSocketClientConfig).WebSocketCtor) {
      Object.assign(this._wsSubjectConfig, { WebSocketCtor: (urlConfigOrSource as RxSocketClientConfig).WebSocketCtor });
    }

    // add binaryType in config
    if ((urlConfigOrSource as RxSocketClientConfig).binaryType) {
      Object.assign(this._wsSubjectConfig, { binaryType: (urlConfigOrSource as RxSocketClientConfig).binaryType });
    }

    // add default data in config
    Object.assign(this._wsSubjectConfig, {
      deserializer: this._deserializer,
      serializer: this._serializer,
      openObserver: {
        next: () => {
          this._connectionStatus$.next(true);
        }
      },
      closeObserver: {
        next: () => {
          this._cleanSocket();
          this._connectionStatus$.next(false);
        }
      }
    });

    // connect socket
    this._connect();

    // connection status subscription
    this.connectionStatus$.subscribe({
      next: isConnected => {
        if (!this._reconnectionObservable && typeof (isConnected) === 'boolean' && !isConnected) {
          this._reconnect();
        }
      }
    });
  }

  /**
   * Returns connection status observable
   *
   * @return {Observable<boolean>}
   */
  get connectionStatus$(): Observable<boolean> {
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
   *  @value complete | <any>
   *  @example <caption>Event type</caption>
   *
   *  if (event === 'complete') => handle Observable's complete
   *  else handle Observable's success
   *
   * @param cb is the function executed if event matches the response from the server
   */
  on(event: string | 'close', cb: (data?: any) => void): void {
    this._message$<WebSocketMessageServer>(event)
      .subscribe({
        next: (message: WebSocketMessageServer): void => cb(message.data),
        /* istanbul ignore next */
        error: () => undefined,
        complete: (): void => {
          /* istanbul ignore else */
          if (event === 'close') {
            cb();
          }
        }
      });
  }

  /**
   * Function to handle bytes response from server
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
   * @param cb is the function executed if event matches the response from the server
   */
  onBytes(cb: (data: WebSocketBinaryServer) => void): void {
    this.onBytes$()
      .subscribe({
        next: (message: WebSocketBinaryServer): void => cb(message)
      });
  }

  /**
   * Same as `on` method but with Observable response
   *
   * @param event represents value inside {utf8Data.event} or {event} from server response
   *
   * @return {Observable<any>}
   */
  on$(event: string): Observable<any> {
    return this._message$<WebSocketMessageServer>(event)
      .pipe(
        map(_ => _.data)
      );
  }

  /**
   * Function to handle socket close event from server with Observable
   *
   * @return {Observable<void>}
   */
  onClose$(): Observable<void> {
    return new Observable(observer => {
      this.subscribe({
        /* istanbul ignore next */
        next: () => undefined,
        /* istanbul ignore next */
        error: () => undefined,
        complete: () => {
          observer.next();
          observer.complete();
        }
      });
    });
  }

  /**
   * Returns formatted binary from server with Observable
   *
   * @return {Observable<WebSocketBinaryServer>}
   *
   * @private
   */
  onBytes$(): Observable<WebSocketBinaryServer> {
    return this
      .pipe(
        map((message: any): any =>
          (message.type && message.type === 'binary' && message.binaryData) ?
            message.binaryData :
            message
        )
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
   * Returns formatted and filtered message from server for given event with Observable
   *
   * @param {string | "close"} event represents value inside {utf8Data.event} or {event} from server response
   *
   * @return {Observable<WebSocketMessageServer>}
   *
   * @private
   */
  private _message$<WebSocketMessageServer>(event: string | 'close'): Observable<WebSocketMessageServer> {
    return this
      .pipe(
        map((message: any): any =>
          (message.type && message.type === 'utf8' && message.utf8Data) ?
            message.utf8Data :
            message
        ),
        filter((message: any): boolean =>
          message.event &&
          message.event !== 'close' &&
          message.event === event &&
          message.data
        )
      );
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
    this._socketSubscription = this._socket.subscribe({
      next: (m: any) => {
        this.next(m);
      },
      error: () => {
        /* istanbul ignore if */
        if (!this._socket) {
          this._cleanReconnection();
          this._reconnect();
        }
      }
    });
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

    this._reconnectionSubscription = this._reconnectionObservable.subscribe({
      next: () => this._connect(),
      /* istanbul ignore next */
      error: () => undefined,
      complete: () => {
        this._cleanReconnection();
        if (!this._socket) {
          this.complete();
          this._connectionStatus$.complete();
        }
      }
    });
  }

  /**
   * Default deserializer
   *
   * @param e
   *
   * @return {any}
   * @private
   */
  private _deserializer(e: MessageEvent): T {
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
  private _serializer(data: any): WebSocketMessage {
    return typeof (data) === 'string' || Buffer.isBuffer(data) ? data : JSON.stringify(data);
  };
}
