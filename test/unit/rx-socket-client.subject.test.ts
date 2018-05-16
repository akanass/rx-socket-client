/**
 * @see https://github.com/pana-cc/mocha-typescript
 */
import { suite, test } from 'mocha-typescript';
import { Observable } from 'rxjs';

/**
 * @see http://unitjs.com/
 */
import * as unit from 'unit.js';

import * as websocket from 'websocket';

// element to test
import { RxSocketClientSubject } from '../../src';

@suite('- Unit RxSocketClientSubjectTest file')
export class RxSocketClientSubjectTest {
    // private property to store websocket instance
    private _ws: any;
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
        this._ws = new RxSocketClientSubject({ url: null, WebSocketCtor: this._wsCtorMock });
    }

    /**
     * Executed after each test
     */
    after() {
        this._ws = undefined;
        this._wsCtorMock = undefined;
    }

    /**
     * Test if `RxSocketClient` as a `send` function
     */
    @test('- `RxSocketClientSubject` must have `send` function')
    testRxSocketClientSubjectSend() {
        unit.function(this._ws.send);
    }

    /**
     * Test if `RxSocketClientSubject` as an `on` function
     */
    @test('- `RxSocketClientSubject` must have `on` function')
    testRxSocketClientSubjectOn() {
        unit.function(this._ws.on);
    }

    /**
     * Test if `RxSocketClientSubject` as an `on$` function
     */
    @test('- `RxSocketClientSubject` must have `on$` function')
    testRxSocketClientSubjectOn$() {
        unit.function(this._ws.on$);
    }

    /**
     * Test if `RxSocketClientSubject.on$` function returns an Observable
     */
    @test('- `RxSocketClientSubject.on$` function must return an Observable')
    testRxSocketClientSubjectOn$Observable() {
        unit.object(this._ws.on$(undefined)).isInstanceOf(Observable);
    }

    /**
     * Test if `RxSocketClientSubject` as an `onBytes` function
     */
    @test('- `RxSocketClientSubject` must have `onBytes` function')
    testRxSocketClientSubjectOnBytes() {
        unit.function(this._ws.onBytes);
    }

    /**
     * Test if `RxSocketClientSubject` as an `onBytes$` function
     */
    @test('- `RxSocketClientSubject` must have `onBytes$` function')
    testRxSocketClientSubjectOnBytes$() {
        unit.function(this._ws.onBytes$);
    }

    /**
     * Test if `RxSocketClientSubject.onBytes$` function returns an Observable
     */
    @test('- `RxSocketClientSubject.onBytes$` function must return an Observable')
    testRxSocketClientSubjectOnBytes$Observable() {
        unit.object(this._ws.onBytes$()).isInstanceOf(Observable);
    }

    /**
     * Test if `RxSocketClientSubject` as an `onClose$` function
     */
    @test('- `RxSocketClientSubject` must have `onClose$` function')
    testRxSocketClientSubjectOnClose$() {
        unit.function(this._ws.onClose$);
    }

    /**
     * Test if `RxSocketClientSubject.onClose$` function returns an Observable
     */
    @test('- `RxSocketClientSubject.onClose$` function must return an Observable')
    testRxSocketClientSubjectOnClose$Observable() {
        unit.object(this._ws.onClose$()).isInstanceOf(Observable);
    }

    /**
     * Test if `RxSocketClientSubject` as an `onError$` function
     */
    @test('- `RxSocketClientSubject` must have `onError$` function')
    testRxSocketClientSubjectOnError$() {
        unit.function(this._ws.onError$);
    }

    /**
     * Test if `RxSocketClientSubject.onError$` function returns an Observable
     */
    @test('- `RxSocketClientSubject.onError$` function must return an Observable')
    testRxSocketClientSubjectOnError$Observable() {
        unit.object(this._ws.onError$()).isInstanceOf(Observable);
    }

    /**
     * Test if `RxSocketClientSubject` as an `emit` function
     */
    @test('- `RxSocketClientSubject` must have `emit` function')
    testRxSocketClientSubjectEmit() {
        unit.function(this._ws.emit);
    }
}
