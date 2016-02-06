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

function reset() {
  delete process.env;
  process.env = {};
}

function assertFileConfig(cfg) {
  assert.equal(cfg._patterns.get('OFF')[0], '/nolog/**');
  assert.equal(cfg._patterns.get('ERROR')[0], '/err/j.s');
  assert.equal(cfg._patterns.get('WARN')[0], 'warna');
  assert.equal(cfg._patterns.get('WARN')[1], 'warnb');
  assert.equal(cfg._patterns.get('INFO')[0], '/server/**');
  assert.equal(cfg._patterns.get('INFO')[1], '/db');
  assert.equal(cfg._patterns.get('DEBUG')[0], '/foo*');
  assert.equal(cfg._patterns.get('DEBUG')[1], '/bar/*');
}

function assertEnvConfig(cfg) {
  assert.equal(cfg._patterns.get('OFF')[0], '/OFF1/.');
  assert.equal(cfg._patterns.get('OFF')[1], 'OFF2/**');
  assert.equal(cfg._patterns.get('ERROR')[0], 'ERROR1.js');
  assert.equal(cfg._patterns.get('ERROR')[1], 'ERROR2.js');
  assert.equal(cfg._patterns.get('WARN')[0], 'WARN1/');
  assert.equal(cfg._patterns.get('WARN')[1], 'WARN2/');
  assert.equal(cfg._patterns.get('INFO')[0], '/**/INFO1');
  assert.equal(cfg._patterns.get('INFO')[1], 'INFO2/**');
  assert.equal(cfg._patterns.get('DEBUG')[0], '/DEBUG1');
  assert.equal(cfg._patterns.get('DEBUG')[1], 'DEBUG2');
}

describe('Configurer', function() {

  describe('constructor no environment', function() {
    reset();
    let cfg = new LogLove()._configurer;
    it('should leave _LOGLOVE_CONFIG null', function() {
      assert.equal(cfg._LOGLOVE_CONFIG, null);
    });
    it('should have empty patterns', function() {
      assert.equal(cfg._patterns.size, 0);
    });
  });

  describe('constructor with LOGLOVE_CONFIG', function() {
    reset();
    process.env.LOGLOVE_CONFIG = './test/love.cfg';
    let cfg = new LogLove()._configurer;
    it('should set LOGLOVE_CONFIG', function() {
      assert.equal(cfg._LOGLOVE_CONFIG, './test/love.cfg');
      // cfg.configure();
    });
  });

  describe('_setLevelAndPatterns', function() {
    reset();
    let cfg = new LogLove()._configurer;
    it('should not set if both null', function() {
      cfg._setLevelAndPatterns(null, null);
      assert.equal(cfg._patterns.size, 0);
    });
    it('should not set if level null', function() {
      cfg._setLevelAndPatterns(null, 'one two');
      assert.equal(cfg._patterns.size, 0);
    });
    it('should not set if level not valid name', function() {
      cfg._setLevelAndPatterns('wwarnning', 'one two');
      assert.equal(cfg._patterns.size, 0);
    });
    it('should set if level is OFF', function() {
      cfg._setLevelAndPatterns(' OFF ', '  /OFF1/.   OFF2/**    ');
      assert.equal(cfg._patterns.size, 1);
    });
    it('should set if level is ERROR', function() {
      cfg._setLevelAndPatterns('ERROR   ', ' ERROR1.js   ERROR2.js   ');
      assert.equal(cfg._patterns.size, 2);
    });
    it('should set if level is WARN', function() {
      cfg._setLevelAndPatterns('WARN ', 'WARN1/ WARN2/');
      assert.equal(cfg._patterns.size, 3);
    });
    it('should set if level is INFO', function() {
      cfg._setLevelAndPatterns('   INFO', ' /**/INFO1 INFO2/** ');
      assert.equal(cfg._patterns.size, 4);
    });
    it('should set if level is DEBUG', function() {
      cfg._setLevelAndPatterns('  DEBUG ', '/DEBUG1 DEBUG2 ');
      assert.equal(cfg._patterns.size, 5);
    });
    it('should properly trim level and patterns and set patterns', function() {
      assertEnvConfig(cfg);
    });
  });

  describe('_loadFileConfig', function() {
    reset();
    let cfg = new LogLove()._configurer;
    it('should not error if no file found', function() {
      cfg._loadFileConfig();
    });
    process.env.LOGLOVE_CONFIG = './test/love.cfg';
    cfg = new LogLove()._configurer;
    it('should read if file found', function() {
      cfg._loadFileConfig();
      assert.equal(cfg._patterns.get('OFF')[0], '/nolog/**');
    });
    it('should set correct values', function() {
      assertFileConfig(cfg);
    });
  });

  describe('_loadEnvConfig', function() {
    reset();
    process.env.LOGLOVE_OFF = '  /OFF1/.   OFF2/**    ';
    process.env.LOGLOVE_ERROR = ' ERROR1.js   ERROR2.js   ';
    process.env.LOGLOVE_WARN = 'WARN1/ WARN2/';
    process.env.LOGLOVE_INFO = ' /**/INFO1 INFO2/** ';
    process.env.LOGLOVE_DEBUG = '/DEBUG1 DEBUG2 ';
    let cfg = new LogLove()._configurer;
    it('should properly set patterns', function() {
      assertEnvConfig(cfg);
    });
  });

  describe('configure', function() {
    reset();
    process.env.LOGLOVE_CONFIG = './test/love.cfg';
    // process.env.LOGLOVE_OFF = '  /OFF1/.   OFF2/**    ';
    process.env.LOGLOVE_ERROR = ' ERROR1.js   ERROR2.js   ';
    // process.env.LOGLOVE_WARN = 'WARN1/ WARN2/';
    process.env.LOGLOVE_INFO = ' /**/INFO1 INFO2/** ';
    // process.env.LOGLOVE_DEBUG = '/DEBUG1 DEBUG2 ';
    let cfg = new LogLove()._configurer;
    cfg.configure();
    it('should override file config with env config', function() {
      // environment
      assert.equal(cfg._patterns.get('ERROR')[0], 'ERROR1.js');
      assert.equal(cfg._patterns.get('ERROR')[1], 'ERROR2.js');
      assert.equal(cfg._patterns.get('INFO')[0], '/**/INFO1');
      assert.equal(cfg._patterns.get('INFO')[1], 'INFO2/**');
      // config file
      assert.equal(cfg._patterns.get('OFF')[0], '/nolog/**');
      assert.equal(cfg._patterns.get('WARN')[0], 'warna');
      assert.equal(cfg._patterns.get('WARN')[1], 'warnb');
      assert.equal(cfg._patterns.get('DEBUG')[0], '/foo*');
      assert.equal(cfg._patterns.get('DEBUG')[1], '/bar/*');
    });
    it('should return the correct levels', function() {
      //assert.equal(cfg.level('/nolog'), 0);
      assert.equal(cfg.level('/nolog/'), 0);
      assert.equal(cfg.level('/nolog/a'), 0);
      assert.equal(cfg.level('/nolog/a/'), 0);
      assert.equal(cfg.level('/nolog/a/b.js'), 0);
      assert.equal(cfg.level('ERROR1.js'), 1);
      assert.equal(cfg.level('ERROR2.js'), 1);
      assert.equal(cfg.level('anything that doesnt match'), 1);
      assert.equal(cfg.level('warna'), 2);
      assert.equal(cfg.level('warnb'), 2);
      assert.equal(cfg.level('warnb/'), 2);
      //assert.equal(cfg.level('/warnb'), 2);
    });
  });
});