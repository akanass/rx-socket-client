/*
import { Hapiness, HapinessModule, Inject, OnStart, Socket, SocketServerExt, WebSocketServer } from '@hapiness/core';
import { Buffer } from 'buffer';
import 'rxjs-compat';
import { elementAt, first } from 'rxjs/operators';

import { webSocket } from '../../src';

describe('- Integration rx-socket-client._test.ts file', () => {
    beforeEach(() => jest.setTimeout(300000));
    afterAll(() => setTimeout(() => process.exit(), 1000));
    /!**
     * Test if `webSocket` can connect to server and status is connected
     *!/
    test('- `webSocket` must connect to server and status is connected', (done) => {
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
                        isConnected => {
                            expect(isConnected).toBeTruthy();
                            Hapiness.shutdown().subscribe(() => done());
                        }
                    );
            }
        }

        Hapiness.bootstrap(SocketServerModule, [
            SocketServerExt.setConfig({
                port: 1235
            })
        ]);
    });

    /!**
     * Test if `webSocket` can reconnect to server by itself
     *!/
    test('- `webSocket` must reconnect to server by itself', (done) => {
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
                    .subscribe(isConnected => {
                        expect(isConnected).toBeTruthy();
                        this._wsServer.getServer().closeAllConnections();
                    });

                connectionStatus
                    .pipe(
                        elementAt(1)
                    )
                    .subscribe(isConnected => expect(isConnected).toBeFalsy());

                connectionStatus
                    .pipe(
                        elementAt(2)
                    )
                    .subscribe(isConnected => {
                        expect(isConnected).toBeTruthy();
                        Hapiness.shutdown().subscribe(() => done());
                    });
            }
        }

        Hapiness.bootstrap(SocketServerModule, [
            SocketServerExt.setConfig({
                port: 1235
            })
        ]);
    });

    /!**
     * Test if `webSocket` can emit UTF data for given event to server
     *!/
    test('- `webSocket` must emit data for given event to server', (done) => {
        @HapinessModule({
            version: 'x.x.x'
        })
        class SocketServerModule implements OnStart {
            constructor(@Inject(SocketServerExt) private _wsServer: WebSocketServer) {
                this._wsServer.connections().subscribe(
                    (socket: Socket) =>
                        socket.on('test', d => {
                            expect(d).toBe('test message');
                            Hapiness.shutdown().subscribe(() => done());
                        })
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
    });

    /!**
     * Test if `webSocket` can send UTF message to server
     *!/
    test('- `webSocket` must send UTF message to server', (done) => {
        @HapinessModule({
            version: 'x.x.x'
        })
        class SocketServerModule implements OnStart {
            constructor(@Inject(SocketServerExt) private _wsServer: WebSocketServer) {
                this._wsServer.connections()
                    .subscribe(
                        (socket: Socket) =>
                            socket.on('*', d => {
                                expect(d).toHaveProperty('type');
                                expect(d).toHaveProperty('utf8Data');
                                expect(d.utf8Data).toBe('test message');
                                Hapiness.shutdown().subscribe(() => done());
                            })
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
    });

    /!**
     * Test if `webSocket` can send Bytes message to server
     *!/
    test('- `webSocket` must send bytes message to server', (done) => {
        @HapinessModule({
            version: 'x.x.x'
        })
        class SocketServerModule implements OnStart {
            constructor(@Inject(SocketServerExt) private _wsServer: WebSocketServer) {
                this._wsServer.connections()
                    .subscribe((socket: Socket) =>
                        socket.onBytes(d => {
                                expect(Buffer.from(d).toString()).toBe('test message');
                                Hapiness.shutdown().subscribe(() => done());
                            }
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
    });

    /!**
     * Test if `webSocket` can receive UTF data for given event emit by server
     *!/
    test('- `webSocket` must receive UTF data for given event emit by server', (done) => {
        @HapinessModule({
            version: 'x.x.x'
        })
        class SocketServerModule implements OnStart {
            constructor(@Inject(SocketServerExt) private _wsServer: WebSocketServer) {
                this._wsServer.connections().subscribe((socket: Socket) => socket.emit('test', 'test message'));
            }

            onStart() {
                webSocket('ws://0.0.0.0:1235')
                    .on('test', d => {
                        expect(d).toBe('test message');
                        Hapiness.shutdown().subscribe(() => done());
                    });
            }
        }

        Hapiness.bootstrap(SocketServerModule, [
            SocketServerExt.setConfig({
                port: 1235
            })
        ]);
    });

    /!**
     * Test if `webSocket` can receive UTF data for given event emit by server with Observable
     *!/
    test('- `webSocket` must receive UTF data for given event emit by server with Observable', (done) => {
        @HapinessModule({
            version: 'x.x.x'
        })
        class SocketServerModule implements OnStart {
            constructor(@Inject(SocketServerExt) private _wsServer: WebSocketServer) {
                this._wsServer.connections().subscribe((socket: Socket) => socket.emit('test', 'test message'));
            }

            onStart() {
                webSocket('ws://0.0.0.0:1235')
                    .on$('test').subscribe(d => {
                    expect(d).toBe('test message');
                    Hapiness.shutdown().subscribe(() => done());
                });
            }
        }

        Hapiness.bootstrap(SocketServerModule, [
            SocketServerExt.setConfig({
                port: 1235
            })
        ]);
    });

    /!**
     * Test if `webSocket` can receive UTF message for given event from server
     *!/
    test('- `webSocket` must receive UTF message for given event send by server', (done) => {
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
                    .on('test', d => {
                        expect(d).toBe('test message');
                        Hapiness.shutdown().subscribe(() => done());
                    });
            }
        }

        Hapiness.bootstrap(SocketServerModule, [
            SocketServerExt.setConfig({
                port: 1235
            })
        ]);
    });

    /!**
     * Test if `webSocket` can receive UTF message for given event from server with Observable
     *!/
    test('- `webSocket` must receive UTF message for given event send by server with Observable', (done) => {
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
                    .on$('test').subscribe(d => {
                    expect(d).toBe('test message');
                    Hapiness.shutdown().subscribe(() => done());
                });
            }
        }

        Hapiness.bootstrap(SocketServerModule, [
            SocketServerExt.setConfig({
                port: 1235
            })
        ]);
    });

    /!**
     * Test if `webSocket` can receive Bytes data emitted by server
     *!/
    test('- `webSocket` must receive Bytes data emitted by server', (done) => {
        @HapinessModule({
            version: 'x.x.x'
        })
        class SocketServerModule implements OnStart {
            constructor(@Inject(SocketServerExt) private _wsServer: WebSocketServer) {
                this._wsServer.connections().subscribe((socket: Socket) => socket.emitBytes(Buffer.from('test message')));
            }

            onStart() {
                webSocket('ws://0.0.0.0:1235')
                    .onBytes((d: Buffer) => {
                        expect(Buffer.from(d).toString()).toBe('test message');
                        Hapiness.shutdown().subscribe(() => done());
                    });
            }
        }

        Hapiness.bootstrap(SocketServerModule, [
            SocketServerExt.setConfig({
                port: 1235
            })
        ]);
    });

    /!**
     * Test if `webSocket` can receive Bytes data emitted by server with Observable
     *!/
    test('- `webSocket` must receive Bytes data emitted by server with Observable', (done) => {
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
                    .subscribe((d: Buffer) => {
                        expect(Buffer.from(d).toString()).toBe('test message');
                        Hapiness.shutdown().subscribe(() => done());
                    });
            }
        }

        Hapiness.bootstrap(SocketServerModule, [
            SocketServerExt.setConfig({
                port: 1235
            })
        ]);
    });

    /!**
     * Test if `RxSocketClient` can receive Bytes message sent by server
     *!/
    test('- `webSocket` must receive Bytes message sent by server', (done) => {
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
                    .onBytes((d: Buffer) => {
                        expect(Buffer.from(d).toString()).toBe('test message');
                        Hapiness.shutdown().subscribe(() => done());
                    });
            }
        }

        Hapiness.bootstrap(SocketServerModule, [
            SocketServerExt.setConfig({
                port: 1235
            })
        ]);
    });

    /!**
     * Test if `RxSocketClient` can receive UTF message for given event send by server with Observable
     *!/
    test('- `webSocket` must receive Bytes message for given event send by server with Observable', (done) => {
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
                    .subscribe((d: Buffer) => {
                        expect(Buffer.from(d).toString()).toBe('test message');
                        Hapiness.shutdown().subscribe(() => done());
                    });
            }
        }

        Hapiness.bootstrap(SocketServerModule, [
            SocketServerExt.setConfig({
                port: 1235
            })
        ]);
    });

    /!**
     * Test if `RxSocketClient` can handle close with Observable
     *!/
    test('- `webSocket` must handle close with Observable', (done) => {
        @HapinessModule({
            version: 'x.x.x'
        })
        class SocketServerModule implements OnStart {
            constructor(@Inject(SocketServerExt) private _wsServer: WebSocketServer) {
                this._wsServer.connections().subscribe((socket: Socket) => socket.close());
            }

            onStart() {
                webSocket({ url: 'ws://0.0.0.0:1235', reconnectAttempts: 1, reconnectInterval: 100 }).onClose$()
                    .subscribe(() => Hapiness.shutdown().subscribe(() => done()));
            }
        }

        Hapiness.bootstrap(SocketServerModule, [
            SocketServerExt.setConfig({
                port: 1235
            })
        ]);
    });

    /!**
     * Test if `RxSocketClient` can handle close with cb
     *!/
    test('- `webSocket` must handle close with callback', (done) => {
        @HapinessModule({
            version: 'x.x.x'
        })
        class SocketServerModule implements OnStart {
            constructor(@Inject(SocketServerExt) private _wsServer: WebSocketServer) {
                this._wsServer.connections().subscribe((socket: Socket) => socket.close());
            }

            onStart() {
                webSocket({ url: 'ws://0.0.0.0:1235', reconnectAttempts: 1, reconnectInterval: 100 })
                    .on('close', () => Hapiness.shutdown().subscribe(() => done()));
            }
        }

        Hapiness.bootstrap(SocketServerModule, [
            SocketServerExt.setConfig({
                port: 1235
            })
        ]);
    });
});
*/
