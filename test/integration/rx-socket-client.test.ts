/**
 * @see https://github.com/pana-cc/mocha-typescript
 */
import { suite, test } from 'mocha-typescript';
import 'rxjs-compat';

/**
 * @see http://unitjs.com/
 */
import * as unit from 'unit.js';

import { first, elementAt } from 'rxjs/operators';

import { Buffer } from 'buffer';

// element to test
import { webSocket } from '../../src';
import {
    Hapiness,
    HapinessModule,
    OnStart, Socket,
    SocketServerExt, WebSocketServer,
    Inject
} from '@hapiness/core';

@suite('- Integration RxSocketClientTest file')
export class RxSocketClientTest {
    /**
     * Class constructor
     */
    constructor() {
    }

    /**
     * Test if `webSocket` can connect to server and status is connected
     */
    @test('- `webSocket` must connect to server and status is connected')
    testRxSocketClientConnectionStatus(done) {
        @HapinessModule({
            version: 'x.x.x'
        })
        class SocketServerModule implements OnStart {
            constructor() {
            }

            onStart() {
                webSocket('ws://0.0.0.0:1235')
                    .connectionStatus$
                    .pipe(
                        first()
                    )
                    .subscribe(
                        isConnected => unit.bool(isConnected).isTrue().when(() => Hapiness.shutdown().subscribe(_ => done()))
                    );
            }
        }

        Hapiness.bootstrap(SocketServerModule, [
            SocketServerExt.setConfig({
                port: 1235
            })
        ]);
    }

    /**
     * Test if `webSocket` can reconnect to server by itself
     */
    @test('- `webSocket` must reconnect to server by itself')
    testRxSocketClientReConnectionStatus(done) {
        @HapinessModule({
            version: 'x.x.x'
        })
        class SocketServerModule implements OnStart {
            constructor(@Inject(SocketServerExt) private _wsServer: WebSocketServer) {
            }

            onStart() {
                const connectionStatus = webSocket({
                    url: 'ws://0.0.0.0:1235',
                    reconnectInterval: 1
                }).connectionStatus$;

                connectionStatus
                    .pipe(
                        elementAt(0)
                    )
                    .subscribe(isConnected => unit.bool(isConnected).isTrue().when(_ => this._wsServer.getServer().closeAllConnections()));

                connectionStatus
                    .pipe(
                        elementAt(1)
                    )
                    .subscribe(isConnected => unit.bool(isConnected).isFalse());

                connectionStatus
                    .pipe(
                        elementAt(2)
                    )
                    .subscribe(isConnected => unit.bool(isConnected).isTrue().when(() => Hapiness.shutdown().subscribe(_ => done())));
            }
        }

        Hapiness.bootstrap(SocketServerModule, [
            SocketServerExt.setConfig({
                port: 1235
            })
        ]);
    }

    /**
     * Test if `webSocket` can emit UTF data for given event to server
     */
    @test('- `webSocket` must emit data for given event to server')
    testRxSocketClientEmit(done) {
        @HapinessModule({
            version: 'x.x.x'
        })
        class SocketServerModule implements OnStart {
            constructor(@Inject(SocketServerExt) private _wsServer: WebSocketServer) {
                this._wsServer.connections().subscribe(
                    (socket: Socket) =>
                        socket.on('test', d => unit.string(d).is('test message').when(() => Hapiness.shutdown().subscribe(_ => done())))
                );
            }

            onStart() {
                webSocket('ws://0.0.0.0:1235').emit('test', 'test message');
            }
        }

        Hapiness.bootstrap(SocketServerModule, [
            SocketServerExt.setConfig({
                port: 1235
            })
        ]);
    }

    /**
     * Test if `webSocket` can send UTF message to server
     */
    @test('- `webSocket` must send UTF message to server')
    testRxSocketClientSendUTF(done) {
        @HapinessModule({
            version: 'x.x.x'
        })
        class SocketServerModule implements OnStart {
            constructor(@Inject(SocketServerExt) private _wsServer: WebSocketServer) {
                this._wsServer.connections()
                    .subscribe(
                        (socket: Socket) =>
                            socket.on('*', d =>
                                unit.object(d).hasProperty('type').hasProperty('utf8Data').when(() =>
                                    unit.string(d.utf8Data).is('test message').when(() => Hapiness.shutdown().subscribe(_ => done()))
                                )
                            )
                    );
            }

            onStart() {
                webSocket('ws://0.0.0.0:1235').send('test message');
            }
        }

        Hapiness.bootstrap(SocketServerModule, [
            SocketServerExt.setConfig({
                port: 1235
            })
        ]);
    }

    /**
     * Test if `webSocket` can send Bytes message to server
     */
    @test('- `webSocket` must send bytes message to server')
    testRxSocketClientSendBytes(done) {
        @HapinessModule({
            version: 'x.x.x'
        })
        class SocketServerModule implements OnStart {
            constructor(@Inject(SocketServerExt) private _wsServer: WebSocketServer) {
                this._wsServer.connections()
                    .subscribe((socket: Socket) =>
                        socket.onBytes(d => unit.string(Buffer.from(d).toString()).is('test message').when(() =>
                            Hapiness.shutdown().subscribe(_ => done()))
                        )
                    );
            }

            onStart() {
                webSocket('ws://0.0.0.0:1235').send(Buffer.from('test message'));
            }
        }

        Hapiness.bootstrap(SocketServerModule, [
            SocketServerExt.setConfig({
                port: 1235
            })
        ]);
    }

    /**
     * Test if `webSocket` can receive UTF data for given event emit by server
     */
    @test('- `webSocket` must receive UTF data for given event emit by server')
    testRxSocketClientReceiveEmit(done) {
        @HapinessModule({
            version: 'x.x.x'
        })
        class SocketServerModule implements OnStart {
            constructor(@Inject(SocketServerExt) private _wsServer: WebSocketServer) {
                this._wsServer.connections().subscribe((socket: Socket) => socket.emit('test', 'test message'));
            }

            onStart() {
                webSocket('ws://0.0.0.0:1235')
                    .on('test', d => unit.string(d).is('test message').when(() => Hapiness.shutdown().subscribe(_ => done())));
            }
        }

        Hapiness.bootstrap(SocketServerModule, [
            SocketServerExt.setConfig({
                port: 1235
            })
        ]);
    }

    /**
     * Test if `webSocket` can receive UTF data for given event emit by server with Observable
     */
    @test('- `webSocket` must receive UTF data for given event emit by server with Observable')
    testRxSocketClientReceiveEmitObservable(done) {
        @HapinessModule({
            version: 'x.x.x'
        })
        class SocketServerModule implements OnStart {
            constructor(@Inject(SocketServerExt) private _wsServer: WebSocketServer) {
                this._wsServer.connections().subscribe((socket: Socket) => socket.emit('test', 'test message'));
            }

            onStart() {
                webSocket('ws://0.0.0.0:1235')
                    .on$('test').subscribe(d => unit.string(d).is('test message').when(() => Hapiness.shutdown().subscribe(_ => done())));
            }
        }

        Hapiness.bootstrap(SocketServerModule, [
            SocketServerExt.setConfig({
                port: 1235
            })
        ]);
    }

    /**
     * Test if `webSocket` can receive UTF message for given event from server
     */
    @test('- `webSocket` must receive UTF message for given event send by server')
    testRxSocketClientReceiveSendUTF(done) {
        @HapinessModule({
            version: 'x.x.x'
        })
        class SocketServerModule implements OnStart {
            constructor(@Inject(SocketServerExt) private _wsServer: WebSocketServer) {
                this._wsServer.connections().subscribe((socket: Socket) => socket[ '_connection' ].send(JSON.stringify({
                    type: 'utf8',
                    utf8Data: { event: 'test', data: 'test message' }
                })));
            }

            onStart() {
                webSocket('ws://0.0.0.0:1235')
                    .on('test', d => unit.string(d).is('test message').when(() => Hapiness.shutdown().subscribe(_ => done())));
            }
        }

        Hapiness.bootstrap(SocketServerModule, [
            SocketServerExt.setConfig({
                port: 1235
            })
        ]);
    }

    /**
     * Test if `webSocket` can receive UTF message for given event from server with Observable
     */
    @test('- `webSocket` must receive UTF message for given event send by server with Observable')
    testRxSocketClientReceiveSendUTFObservable(done) {
        @HapinessModule({
            version: 'x.x.x'
        })
        class SocketServerModule implements OnStart {
            constructor(@Inject(SocketServerExt) private _wsServer: WebSocketServer) {
                this._wsServer.connections().subscribe((socket: Socket) => socket[ '_connection' ].send(JSON.stringify({
                    type: 'utf8',
                    utf8Data: { event: 'test', data: 'test message' }
                })));
            }

            onStart() {
                webSocket('ws://0.0.0.0:1235')
                    .on$('test').subscribe(d => unit.string(d).is('test message').when(() => Hapiness.shutdown().subscribe(_ => done())));
            }
        }

        Hapiness.bootstrap(SocketServerModule, [
            SocketServerExt.setConfig({
                port: 1235
            })
        ]);
    }

    /**
     * Test if `webSocket` can receive Bytes data emitted by server
     */
    @test('- `webSocket` must receive Bytes data emitted by server')
    testRxSocketClientReceiveEmitBytes(done) {
        @HapinessModule({
            version: 'x.x.x'
        })
        class SocketServerModule implements OnStart {
            constructor(@Inject(SocketServerExt) private _wsServer: WebSocketServer) {
                this._wsServer.connections().subscribe((socket: Socket) => socket.emitBytes(Buffer.from('test message')));
            }

            onStart() {
                webSocket('ws://0.0.0.0:1235')
                    .onBytes((d: Buffer) => unit.string(Buffer.from(d).toString()).is('test message')
                        .when(() =>
                            Hapiness.shutdown().subscribe(_ => done())
                        )
                    );
            }
        }

        Hapiness.bootstrap(SocketServerModule, [
            SocketServerExt.setConfig({
                port: 1235
            })
        ]);
    }

    /**
     * Test if `webSocket` can receive Bytes data emitted by server with Observable
     */
    @test('- `webSocket` must receive Bytes data emitted by server with Observable')
    testRxSocketClientReceiveEmitBytesObservable(done) {
        @HapinessModule({
            version: 'x.x.x'
        })
        class SocketServerModule implements OnStart {
            constructor(@Inject(SocketServerExt) private _wsServer: WebSocketServer) {
                this._wsServer.connections().subscribe((socket: Socket) => socket.emitBytes(Buffer.from('test message')));
            }

            onStart() {
                webSocket('ws://0.0.0.0:1235')
                    .onBytes$()
                    .subscribe((d: Buffer) => unit.string(Buffer.from(d).toString()).is('test message')
                        .when(() =>
                            Hapiness.shutdown().subscribe(_ => done())
                        )
                    );
            }
        }

        Hapiness.bootstrap(SocketServerModule, [
            SocketServerExt.setConfig({
                port: 1235
            })
        ]);
    }

    /**
     * Test if `RxSocketClient` can receive Bytes message sent by server
     */
    @test('- `webSocket` must receive Bytes message sent by server')
    testRxSocketClientReceiveSendBytes(done) {
        @HapinessModule({
            version: 'x.x.x'
        })
        class SocketServerModule implements OnStart {
            constructor(@Inject(SocketServerExt) private _wsServer: WebSocketServer) {
                this._wsServer.connections().subscribe((socket: Socket) => socket[ '_connection' ].send(JSON.stringify({
                    type: 'binary',
                    binaryData: Buffer.from('test message')
                })));
            }

            onStart() {
                webSocket('ws://0.0.0.0:1235')
                    .onBytes((d: Buffer) => unit.string(Buffer.from(d).toString()).is('test message')
                        .when(() =>
                            Hapiness.shutdown().subscribe(_ => done())
                        )
                    );
            }
        }

        Hapiness.bootstrap(SocketServerModule, [
            SocketServerExt.setConfig({
                port: 1235
            })
        ]);
    }

    /**
     * Test if `RxSocketClient` can receive UTF message for given event send by server with Observable
     */
    @test('- `webSocket` must receive Bytes message for given event send by server with Observable')
    testRxSocketClientReceiveSendBytesObservable(done) {
        @HapinessModule({
            version: 'x.x.x'
        })
        class SocketServerModule implements OnStart {
            constructor(@Inject(SocketServerExt) private _wsServer: WebSocketServer) {
                this._wsServer.connections().subscribe((socket: Socket) => socket[ '_connection' ].send(JSON.stringify({
                    type: 'binary',
                    binaryData: Buffer.from('test message')
                })));
            }

            onStart() {
                webSocket('ws://0.0.0.0:1235')
                    .onBytes$()
                    .subscribe((d: Buffer) => unit.string(Buffer.from(d).toString()).is('test message')
                        .when(() =>
                            Hapiness.shutdown().subscribe(_ => done())
                        )
                    );
            }
        }

        Hapiness.bootstrap(SocketServerModule, [
            SocketServerExt.setConfig({
                port: 1235
            })
        ]);
    }

    /**
     * Test if `RxSocketClient` can handle close with Observable
     */
    @test('- `webSocket` must handle close with Observable')
    testRxSocketClientHandleCloseObservable(done) {
        @HapinessModule({
            version: 'x.x.x'
        })
        class SocketServerModule implements OnStart {
            constructor(@Inject(SocketServerExt) private _wsServer: WebSocketServer) {
                this._wsServer.connections().subscribe((socket: Socket) => socket.close());
            }

            onStart() {
                webSocket({ url: 'ws://0.0.0.0:1235', reconnectAttempts: 1, reconnectInterval: 100 }).onClose$()
                    .subscribe(_ => Hapiness.shutdown().subscribe(_ => done()));
            }
        }

        Hapiness.bootstrap(SocketServerModule, [
            SocketServerExt.setConfig({
                port: 1235
            })
        ]);
    }

    /**
     * Test if `RxSocketClient` can handle close with cb
     */
    @test('- `webSocket` must handle close with callback')
    testRxSocketClientHandleClose(done) {
        @HapinessModule({
            version: 'x.x.x'
        })
        class SocketServerModule implements OnStart {
            constructor(@Inject(SocketServerExt) private _wsServer: WebSocketServer) {
                this._wsServer.connections().subscribe((socket: Socket) => socket.close());
            }

            onStart() {
                webSocket({ url: 'ws://0.0.0.0:1235', reconnectAttempts: 1, reconnectInterval: 100 })
                    .on('close', () => Hapiness.shutdown().subscribe(_ => done()));
            }
        }

        Hapiness.bootstrap(SocketServerModule, [
            SocketServerExt.setConfig({
                port: 1235
            })
        ]);
    }

    /**
     * Test if `RxSocketClient` can handle error with cb
     */
    @test('- `webSocket` must handle error with callback')
    testRxSocketClientHandleError(done) {
        @HapinessModule({
            version: 'x.x.x'
        })
        class SocketServerModule implements OnStart {
            onStart() {
                webSocket('ws://0.0.0.0:6666')
                    .on('error', () => Hapiness.shutdown().subscribe(_ => done()));
            }
        }

        Hapiness.bootstrap(SocketServerModule, [
            SocketServerExt.setConfig({
                port: 1235
            })
        ]);
    }

    /**
     * Test if `RxSocketClient` can handle error with Observable
     */
    @test('- `webSocket` must handle error with Observable')
    testRxSocketClientHandleErrorObservable(done) {
        @HapinessModule({
            version: 'x.x.x'
        })
        class SocketServerModule implements OnStart {
            onStart() {
                webSocket('ws://0.0.0.0:6666')
                    .onError$().subscribe(() => Hapiness.shutdown().subscribe(_ => done()));
            }
        }

        Hapiness.bootstrap(SocketServerModule, [
            SocketServerExt.setConfig({
                port: 1235
            })
        ]);
    }
}
