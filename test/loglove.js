var ll = require('../lib/loglove'),
  assert = require('chai').assert;

describe('loglove.js', function() {

  describe('smoke test', function() {

    var log;

    before(function() {
      log = ll.getLog(__filename);
      ll.setFormatter(function(name, msg, level) {
        return 'HI ' + name + ' ' + level + ' ' + msg;
      });
      ll.configure({
        "/test/logger.js": "WARNING"
      });
    });

    it('will do stoof', function() {
      log.emergency('yo %s %j', 'param 1', {foo: 'bar'});
      assert.equal(log.message, 'HI /test/loglove.js EMERGENCY yo param 1 {"foo":"bar"}');
      log.alert('yo %s %j', 'param 1', {foo: 'bar'});
      assert.equal(log.message, 'HI /test/loglove.js ALERT yo param 1 {"foo":"bar"}');
      log.critical('yo %s %j', 'param 1', {foo: 'bar'});
      assert.equal(log.message, 'HI /test/loglove.js CRITICAL yo param 1 {"foo":"bar"}');
      log.error('yo %s %j', 'param 1', {foo: 'bar'});
      assert.equal(log.message, 'HI /test/loglove.js ERROR yo param 1 {"foo":"bar"}');
      log.warning('yo %s %j', 'param 1', {foo: 'bar'});
      assert.equal(log.message, 'HI /test/loglove.js WARNING yo param 1 {"foo":"bar"}');
      log.notice('yo %s %j', 'param 1', {foo: 'bar'});
      assert.equal(log.message, 'HI /test/loglove.js WARNING yo param 1 {"foo":"bar"}');
      log.info('yo %s %j', 'param 1', {foo: 'bar'});
      assert.equal(log.message, 'HI /test/loglove.js WARNING yo param 1 {"foo":"bar"}');
      log.debug('yo %s %j', 'param 1', {foo: 'bar'});
      assert.equal(log.message, 'HI /test/loglove.js WARNING yo param 1 {"foo":"bar"}');
    });
  });
});