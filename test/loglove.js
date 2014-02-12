var ll = require('../lib/loglove'),
  fmt = require('util').format,
  assert = require('chai').assert,
  fs = require('fs'),
  log = ll.log(__filename);

var llToString = '{\"config\":{\"/*\":\"OFF\"},\"logmap\":{},\"formatter\":\"function (level, name, args) {\\n    var msg = fmt.apply(null, args).replace(\x2F\\\\n|\\\\r\x2Fg, \' \');\\n    return fmt(JSON.stringify(\\n        new Date()).substr(1, 24),\\n      level.substr(0, 3),\\n      \'\\\\x1B[33m\' + msg + \'\\\\x1B[39m\',\\n      name);\\n  }\"}';

function reset(configFile, rootPath) {
  delete process.env.LOG_LOVE_ROOT_PATH;
  delete process.env.LOG_LOVE_CONFIG_FILE;
  if (configFile) {
    process.env.LOG_LOVE_CONFIG_FILE = configFile;
  }
  if (rootPath) {
    process.env.LOG_LOVE_ROOT_PATH = rootPath;
  }
  ll.__reset();
}

describe('loglove.js', function() {

  before(function() {
    reset();
  });

  describe('reset with config file', function() {
    before(function() {
      reset(process.cwd() + '/loglove.json');
    });
    it('will show log', function(next) {
      assert(ll.log('/LOGLOVE').__message.indexOf('loglove initialized') === 29);
      next();
    });
  });

  // describe('loglove . . . ', function() {
  //   var log;
  //   before(function() {
  //     log = ll.log();
  //   });
  //   it('will . . .', function() {
  //   });
  // });

  describe('crappy config', function() {
    it('will not crash', function() {
      reset();
      ll.configure('function()   return \'a\';}');
      var log = ll.log('/a/b/c').info(function() {
        return 'boo';
      });
    });
    it('will not hose a prior successful RELOAD_INTERVAL_SECONDS', function(done) {
      fs.writeFileSync('./test/configs/reload-hose.json', '{"foo": "WARNING", "RELOAD_INTERVAL_SECONDS": 1}');
      reset('./test/configs/reload-hose.json');
      assert.equal(ll.log('foo').levelName, 'WARNING');
      ll.configure('asljklasdjflakjflk asjdflk asjf');
      assert.equal(ll.log('foo').levelName, 'WARNING');
      fs.writeFileSync('./test/configs/reload-hose.json', '{"foo": "INFO", "RELOAD_INTERVAL_SECONDS": 1}');
      setTimeout(function() {
        assert.equal(ll.log('foo').levelName, 'INFO');
        done();
      }, 1100);
    });
  });

  describe('crappy log', function() {
    it('will not crash', function() {
      reset();
      ll.configure({
        '/*': 'DEBUG'
      });
      var log = ll.log('/a/b/c').info(function() {
        return 'boo';
      });
    });
  });

  describe('broken formatter', function() {
    it('will not crash', function() {
      reset();
      ll.formatter(function() {
        throw Error('formatting error');
      });
      ll.configure({
        '/*': 'DEBUG'
      });
      var log = ll.log('/a/b/c').info('should log format error');
      //console.log(log.__message);
      assert.equal(log.__message, 'formatter error: Error: formatting error');
    });
  });

  describe('config LOG_LOVE_ROOT_PATH', function() {
    it('will work', function() {
      reset(null, "/a/b");
      var log = ll.log('/a/b/c/d');
      assert.equal(log.name, '/c/d');
    });
  });

  describe('method level logging', function() {
    it('will concise as possible', function() {
      var mlog = log.m('someMethodName').info('method specific logger here');
      mlog.info('more logs for this method');
    });
  });

  describe('wildcards', function() {
    var log;
    before(function() {
      reset();
      log = ll.configure({
        "/a/*": "DEBUG"
      }).log('/a/b/c/d/e');
      ll.configure({
        "/a/b/c/*": "WARNING"
      });
    });
    it('will work', function() {
      log.info(log);
      assert.equal(log.levelName, 'WARNING');
    });
  });

  describe('RELOAD_INTERVAL_SECONDS', function() {
    var log;
    before(function() {
      fs.writeFileSync('./test/configs/reload.json', '{"/some/logger": "WARNING", "RELOAD_INTERVAL_SECONDS": 1}');
      reset('./test/configs/reload.json');
      log = ll.log('/some/logger');
    });
    it('will reload the config with new value', function(done) {
      this.timeout(2000);
      assert.equal(log.levelName, 'WARNING');
      fs.writeFileSync('./test/configs/reload.json', '{"/some/logger": "DEBUG", "RELOAD_INTERVAL_SECONDS": 1}');
      setTimeout(function() {
        assert.equal(log.levelName, 'DEBUG');
        done();
      }, 1100);
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
      ll.formatter(function(level, name, args) {
        var msg = fmt.apply(null, args).replace(/\n|\r/g, ' ');
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
      reset('./test/configs/dummy.json');
      log = ll.log('/some/logger');
    });
    it('will load correctly from file system', function() {
      console.log(ll + '');
      assert.equal(log.levelName, 'WARNING');
    });
  });

  describe('LOG_LOVE_CONFIG_FILE not found', function() {
    var log;
    before(function() {
      reset('can\'t find me');
      log = ll.log('/some/logger');
    });
    it('will not barf', function() {
      //console.log(ll + '');
      assert.equal(log.levelName, 'OFF');
    });
  });

  describe('LOG_LOVE_CONFIG_FILE invalid JSON', function() {
    var log;
    before(function() {
      reset('./test/configs/broken.json');
      log = ll.log('/some/logger');
    });
    it('will not barf', function() {
      //console.log(ll + '');
      assert.equal(log.levelName, 'OFF');
    });
  });

  describe('smoke test', function() {
    var log;
    before(function() {
      reset(null, process.cwd());
      log = ll.log(__filename, 'DEBUG', true);
      ll.formatter(function(level, name, args) {
        var msg = fmt.apply(null, args).replace(/\n|\r/g, ' ');
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
      ll.configure({
        "FOO": "BAR"
      });
      assert.notEqual(ll + '', llToString);
      reset();
    });
    it('will reset the state', function() {
      // TODO fix this assert.equal(ll + '', llToString);
    });
  });

});