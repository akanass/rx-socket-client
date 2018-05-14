import { RxSocketClientConfig, RxSocketClientSubject } from './rx-socket-client.subject';

/**
 * Returns new instance of RxSocketClientSubject
 *
 * @param {string | RxSocketClientConfig} urlConfigOrSource the source of the rxSocketClient as an url or
 *  a structure defining the rxSocketClient object
 *
 * @return {RxSocketClientSubject}
 */
export function rxSocketClient<T>(urlConfigOrSource: string | RxSocketClientConfig<T>): RxSocketClientSubject<T> {
    return new RxSocketClientSubject<T>(urlConfigOrSource);
}
