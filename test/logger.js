'use strict';

const assert = require('assert');
const LogLove = require('../');

process.setMaxListeners(100);

var Writable = require('stream').Writable;
var util = require('util');

function TestOut(max) {
  this.messages = [];
  Writable.call(this);
}

util.inherits(TestOut, Writable);

TestOut.prototype._write = function(chunk, encoding, next) {
  this.messages.push(chunk + '');
  next();
};

describe('Logger', function() {

  let love = new LogLove();

  describe('Default Logger', function() {
    let log = new love._Logger();
    it('should have correct default properties', function() {
      assert.equal(log._name, 'default');
      assert.equal(log._level, 1);
      assert.equal(log._formatFn.name, '_defaultFormatFn');
      assert.equal(log._out, process.stdout);
      assert.equal(log._levelName, 'ERROR');
    });
  });

  describe('Custom name', function() {
    let log = new love._Logger('franklyn');
    it('should have custom name', function() {
      assert.equal(log._name, 'franklyn');
    });
  });

  describe('Custom Output Stream', function() {
    let myout = new TestOut();
    let log = new love._Logger(null, null, null, myout);
    it('should send to custom output stream', function() {
      log.error('some error message');
      assert.equal(myout.messages[0].substring(25), 'ERROR [default] some error message\n');
    });
  });

  describe('Custom Formatter', function() {
    let myout = new TestOut();
    let log = new love._Logger(null, null, function(string, levelName) {
      return "FOO [" + levelName + "] " + string + "\n";
    }, myout);
    it('should have custom format', function() {
      log.error('some error message');
      assert.equal(myout.messages[0], 'FOO [ERROR] some error message\n');
    });
  });

  describe('Off level', function() {
    let myout = new TestOut();
    let log = new love._Logger(null, 0, null, myout);
    it('should not log on level 0', function() {
      log.error('error');
      log.warn('warn');
      log.info('info');
      log.debug('debug');
      assert.equal(myout.messages.length, 0);
    });
  });

  describe('Error level', function() {
    let myout = new TestOut();
    let log = new love._Logger(null, 1, null, myout);
    //console.log(log + '');
    it('should log error only on level 1', function() {
      log.error('error');
      log.warn('warn');
      log.info('info');
      log.debug('debug');
      assert.equal(myout.messages.length, 1);
      assert.equal(myout.messages[0].substring(25), 'ERROR [default] error\n');
    });
  });

  describe('Warn level', function() {
    let myout = new TestOut();
    let log = new love._Logger(null, 2, null, myout);
    //console.log(log + '');
    it('should log error, warn only on level 2', function() {
      log.error('error');
      log.warn('warn');
      log.info('info');
      log.debug('debug');
      assert.equal(myout.messages.length, 2);
      assert.equal(myout.messages[0].substring(25), 'ERROR [default] error\n');
      assert.equal(myout.messages[1].substring(25), 'WARN [default] warn\n');
    });
  });

  describe('Info level', function() {
    let myout = new TestOut();
    let log = new love._Logger(null, 3, null, myout);
    //console.log(log + '');
    it('should log error, warn, info only on level 3', function() {
      log.error('error');
      log.warn('warn');
      log.info('info');
      log.debug('debug');
      assert.equal(myout.messages.length, 3);
      assert.equal(myout.messages[0].substring(25), 'ERROR [default] error\n');
      assert.equal(myout.messages[1].substring(25), 'WARN [default] warn\n');
      assert.equal(myout.messages[2].substring(25), 'INFO [default] info\n');
    });
  });

  describe('Debug level', function() {
    let myout = new TestOut();
    let log = new love._Logger(null, 4, null, myout);
    //console.log(log + '');
    it('should log error, warn, info, debug only on level 4', function() {
      log.error('error');
      log.warn('warn');
      log.info('info');
      log.debug('debug');
      assert.equal(myout.messages.length, 4);
      assert.equal(myout.messages[0].substring(25), 'ERROR [default] error\n');
      assert.equal(myout.messages[1].substring(25), 'WARN [default] warn\n');
      assert.equal(myout.messages[2].substring(25), 'INFO [default] info\n');
      assert.equal(myout.messages[3].substring(25), 'DEBUG [default] debug\n');
    });
  });

});