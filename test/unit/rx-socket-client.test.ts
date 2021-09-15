import * as ws from 'websocket';
import { RxSocketClientSubject, webSocket } from '../../src';

let w3cwebsocketStub: any;

describe('- Unit rx-socket-client._test.ts file', () => {
    /**
     * Before each test
     */
    beforeEach(() => w3cwebsocketStub = jest.spyOn<any, any>(ws, 'w3cwebsocket'));
    /**
     * After each test
     */
    afterEach(() => w3cwebsocketStub.mockRestore());

    /**
     * Test if `webSocket` function returns an instance of `RxSocketClientSubject`
     */
    test('- `webSocket` function must return an instance of `RxSocketClientSubject`', (done) => {
        expect(webSocket({ url: null, WebSocketCtor: w3cwebsocketStub })).toBeInstanceOf(RxSocketClientSubject);
        // w3cwebsocketStub should have been called only 1 time
        expect(w3cwebsocketStub).toHaveBeenCalledTimes(1);
        done();
    });

    /**
     * Test if `webSocket` function returns an instance of `RxSocketClientSubject` with full config object
     */
    test('- `webSocket` function must return an instance of `RxSocketClientSubject` with full config object', (done) => {
        expect(webSocket({
            url: 'ws://0.0.0.0:1235',
            protocol: 'echo-protocol',
            WebSocketCtor: w3cwebsocketStub,
            binaryType: 'arraybuffer',
            reconnectInterval: 5000,
            reconnectAttempts: 10
        })).toBeInstanceOf(RxSocketClientSubject);
        // w3cwebsocketStub should have been called only 1 time
        expect(w3cwebsocketStub).toHaveBeenCalledTimes(1);
        done();
    });
});
