import { Observable } from 'rxjs';
import * as ws from 'websocket';
import { RxSocketClientSubject } from '../../src';

let w3cwebsocketStub: any;
let rxWsSubject: any;

describe('- Unit rx-socket-client.subject.test.ts file', () => {
  /**
   * Before each test
   */
  beforeEach(() => {
    w3cwebsocketStub = jest.spyOn<any, any>(ws, 'w3cwebsocket');
    rxWsSubject = new RxSocketClientSubject({ url: null, WebSocketCtor: w3cwebsocketStub });
  });
  /**
   * After each test
   */
  afterEach(() => {
    w3cwebsocketStub.mockRestore();
    rxWsSubject = undefined;
  });


  /**
   * Test if `RxSocketClient` as a `send` function
   */
  test('- `RxSocketClientSubject` must have `send` function', (done) => {
    expect(typeof rxWsSubject.send).toBe('function');
    expect(w3cwebsocketStub).toHaveBeenCalledTimes(1);
    done();
  });

  /**
   * Test if `RxSocketClient` as a `on` function
   */
  test('- `RxSocketClientSubject` must have `on` function', (done) => {
    expect(typeof rxWsSubject.on).toBe('function');
    expect(w3cwebsocketStub).toHaveBeenCalledTimes(1);
    done();
  });

  /**
   * Test if `RxSocketClient` as a `on$` function
   */
  test('- `RxSocketClientSubject` must have `on$` function', (done) => {
    expect(typeof rxWsSubject.on$).toBe('function');
    expect(w3cwebsocketStub).toHaveBeenCalledTimes(1);
    done();
  });

  /**
   * Test if `RxSocketClient` as a `on$` function returns an Observable
   */
  test('- `RxSocketClientSubject.on$` function must return an Observable', (done) => {
    expect(rxWsSubject.on$(undefined)).toBeInstanceOf(Observable);
    expect(w3cwebsocketStub).toHaveBeenCalledTimes(1);
    done();
  });

  /**
   * Test if `RxSocketClient` as a `onBytes` function
   */
  test('- `RxSocketClientSubject` must have `onBytes` function', (done) => {
    expect(typeof rxWsSubject.onBytes).toBe('function');
    expect(w3cwebsocketStub).toHaveBeenCalledTimes(1);
    done();
  });

  /**
   * Test if `RxSocketClient` as a `onBytes$` function
   */
  test('- `RxSocketClientSubject` must have `onBytes$` function', (done) => {
    expect(typeof rxWsSubject.onBytes$).toBe('function');
    expect(w3cwebsocketStub).toHaveBeenCalledTimes(1);
    done();
  });

  /**
   * Test if `RxSocketClient` as a `onBytes$` function returns an Observable
   */
  test('- `RxSocketClientSubject.onBytes$` function must return an Observable', (done) => {
    expect(rxWsSubject.onBytes$()).toBeInstanceOf(Observable);
    expect(w3cwebsocketStub).toHaveBeenCalledTimes(1);
    done();
  });

  /**
   * Test if `RxSocketClient` as a `onClose$` function
   */
  test('- `RxSocketClientSubject` must have `onClose$` function', (done) => {
    expect(typeof rxWsSubject.onClose$).toBe('function');
    expect(w3cwebsocketStub).toHaveBeenCalledTimes(1);
    done();
  });

  /**
   * Test if `RxSocketClient` as a `onClose$` function returns an Observable
   */
  test('- `RxSocketClientSubject.onClose$` function must return an Observable', (done) => {
    expect(rxWsSubject.onClose$()).toBeInstanceOf(Observable);
    expect(w3cwebsocketStub).toHaveBeenCalledTimes(1);
    done();
  });

  /**
   * Test if `RxSocketClient` as a `emit` function
   */
  test('- `RxSocketClientSubject` must have `emit` function', (done) => {
    expect(typeof rxWsSubject.emit).toBe('function');
    expect(w3cwebsocketStub).toHaveBeenCalledTimes(1);
    done();
  });
});
