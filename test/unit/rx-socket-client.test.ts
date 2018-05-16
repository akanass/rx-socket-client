/**
 * @see https://github.com/pana-cc/mocha-typescript
 */
import { suite, test } from 'mocha-typescript';

/**
 * @see http://unitjs.com/
 */
import * as unit from 'unit.js';

import * as websocket from 'websocket';

// element to test
import { webSocket, RxSocketClientSubject } from '../../src';

@suite('- Unit RxSocketClientTest file')
export class RxSocketClientTest {
    // private property to store websocket connector mock
    private _wsCtorMock: any;

    /**
     * Class constructor
     */
    constructor() {
    }

    /**
     * Executed before each test
     */
    before() {
        this._wsCtorMock = unit.mock(websocket[ 'w3cwebsocket' ]);
    }

    /**
     * Executed after each test
     */
    after() {
        this._wsCtorMock = undefined;
    }

    /**
     * Test if `webSocket` function returns an instance of `RxSocketClientSubject`
     */
    @test('- `webSocket` function must return an instance of `RxSocketClientSubject`')
    testRxSocketClientInstance() {
        unit.object(webSocket({ url: null, WebSocketCtor: this._wsCtorMock })).isInstanceOf(RxSocketClientSubject);
    }

    /**
     * Test if `webSocket` function returns an instance of `RxSocketClientSubject` with full config object
     */
    @test('- `webSocket` function must return an instance of `RxSocketClientSubject` with full config object')
    testRxSocketClientInstanceWithFullConfig() {
        unit.object(webSocket({
            url: 'ws://0.0.0.0:1235',
            protocol: 'echo-protocol',
            WebSocketCtor: this._wsCtorMock,
            binaryType: 'arraybuffer',
            reconnectInterval: 5000,
            reconnectAttempts: 10
        })).isInstanceOf(RxSocketClientSubject);
    }
}
