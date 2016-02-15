'use strict';

const assert = require('assert');
const Loglove = require('../');

process.setMaxListeners(100);

describe('Loglove', function() {

  describe('constructor no args', function() {
    let ll = new Loglove();
    it('should have null format', function() {
      assert.equal(ll._format, null);
    });
    it('should have null out', function() {
      assert.equal(ll.out, null);
    });
    it('should have empty loggers map', function() {
      assert.equal(ll._loggers.size, 0);
    });
    it('should have Configurer', function() {
      assert(ll._Configurer !== null);
    });
    it('should have Logger', function() {
      assert(ll._Logger !== null);
    });
    it('should have on SIGHUP listener', function() {
      assert((process.listeners('SIGHUP') + '').indexOf('this._configurer.configure(true);') > -1);
    });
  });
  describe('log', function() {
    let ll = new Loglove();
    it('should return logger with correct name', function() {
      assert.equal(ll.log('**/1234%#$%')._name, '**/1234%#$%');
    });
    it('should return same logger for same name', function() {
      var l1 = ll.log('a');
      var l2 = ll.log('a');
      assert(l1 === l2);
    });
    it('should return different logger for different name', function() {
      var l1 = ll.log('a');
      var l2 = ll.log('b');
      assert(l1 !== l2);
    });
    it('should set the level correctly', function() {
      process.env.LOGLOVE_LOGLOVE_CONFIG = './test/love.config';
      process.env.LOGLOVE_ERROR = ' ERROR1.js   ERROR2.js   ';
      process.env.LOGLOVE_INFO = ' /**/INFO1 INFO2/** ';
      let ll2 = new Loglove();
      assert.equal(ll2.log('/nolog/')._level, 0);
      assert.equal(ll2.log('/nolog/a')._level, 0);
      assert.equal(ll2.log('/nolog/a/')._level, 0);
      assert.equal(ll2.log('/nolog/a/b.js')._level, 0);
      assert.equal(ll2.log('ERROR1.js')._level, 1);
      assert.equal(ll2.log('ERROR2.js')._level, 1);
      assert.equal(ll2.log('anything that doesnt match')._level, 1);
      assert.equal(ll2.log('warna')._level, 2);
      assert.equal(ll2.log('warnb')._level, 2);
      assert.equal(ll2.log('warnb/')._level, 2);
    });
  });
});