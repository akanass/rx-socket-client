/**
 * @see https://github.com/pana-cc/mocha-typescript
 */
import { test, suite } from 'mocha-typescript';

/**
 * @see http://unitjs.com/
 */
import * as unit from 'unit.js';

// element to test
import { sayHello } from '../../src';

@suite('- Unit HelloWorldTest file')
class HelloWorldTest {
    /**
     * Function executed before the suite
     */
    static before() {}

    /**
     * Function executed after the suite
     */
    static after() {}

    /**
     * Class constructor
     * New lifecycle
     */
    constructor() {}

    /**
     * Function executed before each test
     */
    before() {}

    /**
     * Function executed after each test
     */
    after() {}

    /**
     * Test if sayHello() is a function
     */
    @test('- check if `sayHello` is a function')
    testSayHelloIsFunction() {
        unit.function(sayHello);
    }

    /**
     * Test if sayHello function returns 'Hello World'
     */
    @test('- `sayHello` must return a string with `Hello World` value')
    testSayHelloReturnString() {
        unit.string(sayHello()).is('Hello World');
    }
}
