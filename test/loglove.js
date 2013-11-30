var ll = require('../lib/loglove'),
  fmt = require('util').format,
  assert = require('chai').assert,
  fs = require('fs');

var llToString = '{"rootPath":"","config":{},"logmap":{},"formatter":"function (msg, level, name) {\\n    return fmt(JSON.stringify(new Date()).substr(1, 24), level.substr(0, 3), name, msg);\\n  }"}';

function reset(rootPath, configFile) {
  delete process.env.LOG_LOVE_ROOT_PATH;
  delete process.env.LOG_LOVE_CONFIG_FILE;
  if (rootPath) {
    process.env.LOG_LOVE_ROOT_PATH = rootPath;
  }
  if (configFile) {
    process.env.LOG_LOVE_CONFIG_FILE = configFile;
  }
  ll.__reset();
}

describe('loglove.js', function() {

  before(function() {
    reset();
  });

  // describe('loglove . . . ', function() {
  //   var log;
  //   before(function() {
  //     log = ll.log();
  //   });
  //   it('will . . .', function() {
  //   });
  // });

  describe('RELOAD_INTERVAL_SECONDS', function() {
    var log;
    before(function() {
      fs.writeFileSync('./test/configs/reload.json', '{"/some/logger": "WARNING", "RELOAD_INTERVAL_SECONDS": 1}');
      reset(null, './test/configs/reload.json');
      log = ll.log('/some/logger');
    });
    it('will reload the config with new value', function(done) {
      this.timeout(2000);
      assert.equal(log.levelName, 'WARNING');
      fs.writeFileSync('./test/configs/reload.json', '{"/some/logger": "DEBUG", "RELOAD_INTERVAL_SECONDS": 1}');
      setTimeout(function() {
        assert.equal(log.levelName, 'DEBUG');
        done();
      }, 1500);
    });
  });

  describe('process.env', function() {
    it('will allow you to modify it', function() {
      // JavaScript pretty much lets you do anythig, but wasn't sure if they
      // protected process.env or not. Would not want to change it in prod
      // but it's nice to be able to in testing.
      delete process.env.LOG_LOVE_CONFIG_FILE;
      assert(!process.env.LOG_LOVE_CONFIG_FILE);
      process.env.LOG_LOVE_CONFIG_FILE = 'yummy';
      assert.equal(process.env.LOG_LOVE_CONFIG_FILE, 'yummy');
    });
  });

  describe('colors', function() {
    // ['\x1B[33m', '\x1B[39m']
    var log;
    before(function() {
      ll.formatter(function(msg, level, name) {
        return fmt('\x1B[42m' + JSON.stringify(new Date()).substr(1, 24) + '\x1B[49m',
          'level=\x1B[33m' + level + '\x1B[39m', 'message="' + msg + '"', 'logger="' + name + '"');
      });
      log = ll.log();
    });
    it('will show a colored log', function() {
      log.info('green date, yellow level.');
    });
  });

  describe('LOG_LOVE_CONFIG_FILE', function() {
    var log;
    before(function() {
      reset(null, './test/configs/dummy.json');
      log = ll.log('/some/logger');
    });
    it('will load correctly from file system', function() {
      //console.log(ll + '');
      assert.equal(log.levelName, 'WARNING');
    });
  });

  describe('LOG_LOVE_CONFIG_FILE not found', function() {
    var log;
    before(function() {
      reset(null, 'can\'t find me');
      log = ll.log('/some/logger');
    });
    it('will load not barf', function() {
      //console.log(ll + '');
      assert.equal(log.levelName, 'INFO');
    });
  });

  describe('smoke test', function() {
    var log;
    before(function() {
      reset('/Users/jstein/ubuntu/loglove');
      log = ll.log(__filename, 'DEBUG', true);
      ll.formatter(function(msg, level, name) {
        return 'HI ' + name + ' ' + level.substr(0, 2) + ' ' + msg;
      });
      ll.configure({
        "/test/loglove.js": "WARNING"
      });
    });
    it('will not smoke', function() {
      log.emergency('yo %s %d', 'p1', 33.44);
      assert.equal(log.__message, 'HI /test/loglove.js EM yo p1 33.44');
      log.alert('yo %s %d', 'p1', 33.44);
      assert.equal(log.__message, 'HI /test/loglove.js AL yo p1 33.44');
      log.critical('yo %s %d', 'p1', 33.44);
      assert.equal(log.__message, 'HI /test/loglove.js CR yo p1 33.44');
      log.error('yo %s %d', 'p1', 33.44);
      assert.equal(log.__message, 'HI /test/loglove.js ER yo p1 33.44');
      log.warning('yo %s %d', 'p1', 33.44);
      assert.equal(log.__message, 'HI /test/loglove.js WA yo p1 33.44');
      log.notice('yo %s %d', 'p1', 33.44);
      assert.equal(log.__message, 'HI /test/loglove.js WA yo p1 33.44');
      log.info('yo %s %d', 'p1', 33.44);
      assert.equal(log.__message, 'HI /test/loglove.js WA yo p1 33.44');
      log.debug('yo %s %d', 'p1', 33.44);
      assert.equal(log.__message, 'HI /test/loglove.js WA yo p1 33.44');
    });
  });

  // this __reset test should go last so we know we're not in virgin state.
  describe('__reset', function() {
    var log;
    before(function() {
      reset('blabber');
      assert.notEqual(ll + '', llToString);
      reset();
    });
    it('will reset the state', function() {
      assert.equal(ll + '', llToString);
    });
  });

});