# Rx-Socket-Client

<div style="overflow:hidden;margin-bottom:20px;">
<div style="float:left;line-height:60px">
    <a href="https://travis-ci.org/akanass/rx-socket-client.svg?branch=master">
        <img src="https://travis-ci.org/akanass/rx-socket-client.svg?branch=master" alt="build" />
    </a>
    <a href="https://coveralls.io/github/akanass/rx-socket-client?branch=master">
        <img src="https://coveralls.io/repos/github/akanass/rx-socket-client/badge.svg?branch=master" alt="coveralls" />
    </a>
    <a href="https://david-dm.org/akanass/rx-socket-client">
        <img src="https://david-dm.org/akanass/rx-socket-client.svg" alt="dependencies" />
    </a>
    <a href="https://david-dm.org/akanass/rx-socket-client?type=dev">
        <img src="https://david-dm.org/akanass/rx-socket-client/dev-status.svg" alt="devDependencies" />
    </a>
</div>
<div style="float:right;">
    <a href="https://www.typescriptlang.org/docs/tutorial.html">
        <img src="https://cdn-images-1.medium.com/max/800/1*8lKzkDJVWuVbqumysxMRYw.png"
             align="right" alt="Typescript logo" width="50" height="50" style="border:none;" />
    </a>
    <a href="http://reactivex.io/rxjs">
        <img src="http://reactivex.io/assets/Rx_Logo_S.png"
             align="right" alt="ReactiveX logo" width="50" height="50" style="border:none;" />
    </a>
</div>
</div>

Reconnectable websocket client, [RxJS](http://reactivex.io/rxjs) compliant, wrote in full [Typescript](https://www.typescriptlang.org/docs/tutorial.html) | [ES6](https://babeljs.io/docs/learn-es2015/) for client and browser side.

This library is an **enhancement** of [RxJS WebSocketSubject](https://github.com/ReactiveX/rxjs/blob/master/src/internal/observable/dom/WebSocketSubject.ts) to add more features and the native support of **Node.js** environment.


## Table of contents

* [Installation](#installation)
* [Super simple to use](#super-simple-to-use)
* [Browser compatibility](#browser-compatibility)
* [API in Detail](#api-in-detail)
    * [webSocket(urlConfigOrSource)](#websocketurlconfigorsource)
    * [.connectionStatus$](#connectionstatus$)
    * [.send(data)](#senddata)
    * [.emit(event, data)](#emitevent-data)
    * [.on(event, cb(data))](#onevent-cbdata)
    * [.on$(event)](#onevent)
    * [.onBytes(cb(data))](#onbytescbdata)
    * [.onBytes$()](#onbytes)
    * [.onClose$()](#onclose)
* [RxSocketClientConfig in detail](#rxsocketclientconfig-in-detail)
* [Contributing](#contributing)
* [Change History](#change-history)
* [License](#license)

## Installation

```sh
$ yarn add @akanass/rx-socket-client rxjs

or

$ npm install --save @akanass/rx-socket-client rxjs
```

## Super simple to use

**Rx-Socket-Client** is designed to be the simplest way possible to make web socket connections and calls.

It's fully `Typescript` | `ES6` written so you can import it :

```typescript
import { webSocket } from '@akanass/rx-socket-client';
```

or use `CommonJS`:

```javascript
const webSocket = require('@akanass/rx-socket-client').webSocket;
```

Now, it's easy to perform a `WS` calls:

```typescript
const socket$ = webSocket('ws://127.0.0.1:1235');

// send message
socket$.send('my message from socket');

// emit message on specific event
socket$.emit('event', 'my message from socket for event');

// receive message from server with callback
socket$.on('event', data => console.log(data)); // will display received data in console if event is fired

// receive message from server with Observable
socket$.on$('event').subscribe(data => console.log(data)); // will display received data in console if event is fired
```

## Browser compatibility

**Rx-Socket-Client** can be used in your favorite browser to have all features in your own front application.

Just import `browser/index.js` script and enjoy:

```javascript
<script src="node_modules/@akanass/rx-socket-client/browser/index.js" type="application/javascript"></script>
<script type="application/javascript">
    const socket$ = rsc.webSocket('ws://127.0.0.1:1235');

    // send message
    socket$.send('my message from socket');
</script>
```

Browser version is a **standalone** version so you just need to `copy/paste` file from `node_modules/@akanass/rx-socket-client/browser/index.js` when you want to create your bundle and change path to it.

[Back to top](#table-of-contents)

## API in Detail

### `webSocket(urlConfigOrSource)`

Returns an instance of `RxSocketClientSubject` with given configuration.

**Parameter:**
> ***{string | RxSocketClientConfig} urlConfigOrSource*** *(required): `url` or `RxSocketClientConfig` object with default values foreach next web socket calls*

**Result:**
> ***new*** *`RxSocketClientSubject` instance*

### `.connectionStatus$`

This property provides an **Observable** to check server's connection status.

For example:

```typescript
const socket$ = webSocket('ws://127.0.0.1:1235');

socket$.connectionStatus$.subscribe(isConnected => isConnected ? console.log('Server connected'): console.log('Server disconnected'));
```

### `.send(data)`

This method sends **data** to web socket server.

**Parameter:**
> ***{any} data*** *(required): data sent to web socket server. Can be of any type.*

**Note:** If `data` is an **object**, it'll be **stringified** with `JSON.stringify`. If it's a **string** or a **buffer**, it'll be sent like this **without** transformation.

**Note:** The message sent to server will be like this:

For **binary data**,

```
{
  type: 'binary',
  binaryData: `data`
}
```

For **others**,

```
{
  type: 'utf8',
  utf8Data: `data`
}
```

### `.emit(event, data)`

This method emits **data** for given **event** to web socket server.

**Parameters:**
> - ***{string} event*** *(required): event sent to web socket server.*
> - ***{any} data*** *(required): data sent to web socket server. Can be of any type.*

**Note:** This method calls [`.send`](#senddata) method with **object** parameter `{event, data}`.

### `.on(event, cb(data))`

This method handles **text response** for given **event** from web socket server.

**Parameters:**
> - ***{string | 'close'} event*** *(required): event represents value inside `{utf8Data.event}` or `{event}` from server response.*
> - ***{function} cb*** *(required): cb is the function executed if event matches the response from the server. `data` in parameter is the **text** data received from the server.*

**Note:** `close` event will be only fired by `Observable` **complete** process.

**Note:** Message received from the server can be like this:

**UTF** Text Message,

```
{
  type: 'utf8',
  utf8Data: {
    event: `event`,
    data: `data`
  }
}
```

**Simple** Text Message,

```
{
  event: `event`,
  data: `data`
}
```

For example:

```typescript
const socket$ = webSocket('ws://127.0.0.1:1235');

// receive message from server with callback
socket$.on('event', data => console.log(data)); // will display received data in console if event is fired

// handle close from server with callback
socket$.on('close', () => console.log('Socket closed')); // will display message in console if event is fired
```

### `.on$(event)`

This method is the same as [`.on`](#onevent-cbdata) but with `Observable` result.

**Parameter:**
> ***{string} event*** *(required): event represents value inside `{utf8Data.event}` or `{event}` from server response.*

**Result:**
> *Observable instance*

**Note:** `close` event is not supported with this method, check after for specific implementation. But, you can just use `complete` section of each **subscription** to handle them in each event if you want.

For example:

```typescript
const socket$ = webSocket('ws://127.0.0.1:1235');

socket$.on$('event').subscribe(data => console.log(data)); // will log data from server in console if event is fired

// handle close in subscription
socket$.on$('*').subscribe(undefined, undefined, () => console.log('Socket closed'));
```

### `.onBytes(cb(data))`

This method handles **binary response** from web socket server.

**Parameter:**
> ***{function} cb*** *(required): cb is the function executed with the response from the server. `data` in parameter is the **binary** data received from the server.*

**Note:** Binary received from the server can be like this:

**Bytes** Message,

```
{
  type: 'binary',
  binaryData: <Buffer 74 6f 74 6f>
}
```

**Simple** Bytes Message,

```
<Buffer 74 6f 74 6f>
```

For example:

```typescript
const socket$ = webSocket('ws://127.0.0.1:1235');

socket$.onBytes(data => console.log(data)); // will log data from server in console if event is fired
```

### `.onBytes$()`

This method is the same as [`.onBytes`](#onbytescbdata) but with `Observable` result.

**Result:**
> *Observable instance*

**Note:** `close` event is not supported with this method, check after for specific implementation. But, you can just use `complete` section of each **subscription** to handle them in each event if you want.

For example:

```typescript
const socket$ = webSocket('ws://127.0.0.1:1235');

socket$.onBytes$().subscribe(data => console.log(data)); // will log data from server in console if event is fired

// handle close in subscription
socket$.onBytes$().subscribe(undefined, undefined, () => console.log('Socket closed'));
```

### `.onClose$()`

This method handles `close` from web socket server with `Observable` result and send `complete` inside **`next`** process.

**Result:**
> *Observable instance*

For example:

```typescript
const socket$ = webSocket('ws://127.0.0.1:1235');

socket$.onClose$().subscribe(() => console.log('Socket closed')); // will log close from server in console if event is fired
```

[Back to top](#table-of-contents)

## `RxSocketClientConfig` in detail

> - ***{string} url*** *(required): connection url to web socket server.*
> - ***{string | Array<string>} protocol*** *(optional): the protocol to use to connect.*
> - ***{'blob' | 'arraybuffer'} binaryType*** *(optional): sets the `binaryType` property of the underlying WebSocket.*
> - ***{number} reconnectInterval*** *(optional): sets the reconnection interval value. (default: `5000 ms`).*
> - ***{number} reconnectAttempts*** *(optional): sets the reconnection attempts value. (default: `10`).*
> - ***{ { new(url: string, protocol?: string | Array<string>): WebSocket } } WebSocketCtor*** *(optional): a WebSocket constructor to use. This is useful for mocking a WebSocket for testing purposes.*

[Back to top](#table-of-contents)

## Contributing

To set up your development environment:

1. clone the repo to your workspace,
2. in the shell `cd` to the main folder,
3. hit `npm or yarn install`,
4. run `npm or yarn run test`.
    * It will lint the code and execute all tests.
    * The test coverage report can be viewed from `./coverage/lcov-report/index.html`.

[Back to top](#table-of-contents)

## Change History

* v1.2.0 (2019-07-18)
    * Upgrade all packages' versions
    * Migrate tests to [jest](https://jestjs.io/en/) and [ts-jest](https://kulshekhar.github.io/ts-jest/)
    * Documentation
* v1.1.0 (2018-05-31)
    * Delete `error` process/methods because never called with reconnection
    * Update tests
    * Latest packages' versions
    * Documentation
* v1.0.0 (2018-05-16)
    * Carefully written from scratch to make `Rx-Socket-Client` a drop-in replacement for `WebSocketSubject`

## License

Copyright (c) 2018 **Nicolas Jessel** Licensed under the [MIT license](https://github.com/akanass/rx-socket-client/tree/master/LICENSE.md).

[Back to top](#table-of-contents)
