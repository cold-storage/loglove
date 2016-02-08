#!/usr/bin/env node

'use strict';

const fs = require('fs');
const minimatch = require('minimatch');

const LEVEL = {
  OFF: 0,
  ERROR: 1,
  WARN: 2,
  INFO: 3,
  DEBUG: 4,
};

const LEVEL_NAME = {
  '0': 'OFF',
  '1': 'ERROR',
  '2': 'WARN',
  '3': 'INFO',
  '4': 'DEBUG'
};

class Configurer {
  constructor() {
    this._LOGLOVE_CONFIG = process.env.LOGLOVE_CONFIG || 'love.config';
    this._patterns = new Map();
  }
  toString() {
    return JSON.stringify(this);
  }
  _setLevelAndPatterns(level, patterns) {
    if (level && patterns) {
      level = level.trim();
      if (level === 'OFF' ||
        level === 'ERROR' ||
        level === 'WARN' ||
        level === 'INFO' ||
        level === 'DEBUG') {
        // "    The quick   brown fox jumps over    the lazy dog.   ".match(/\S+/g);
        // ["The", "quick", "brown", "fox", "jumps", "over", "the", "lazy", "dog."]
        let pa = patterns.match(/\S+/g);
        this._patterns.set(level, pa);
      }
    }
  }

  // thought about making this async, but for the frequency we will configure
  // and the fact that you want logger totally configured at beginning of
  // app startup, better to have it sync.
  _loadFileConfig() {
    try {
      let lines = fs.readFileSync(this._LOGLOVE_CONFIG).toString().split('\n');
      for (let line of lines) {
        let levelPattern = line.split('=');
        this._setLevelAndPatterns(levelPattern[0], levelPattern[1]);
      }
    } catch (err) {
      // console.log('_loadFileConfig', err);
    }
  }
  _loadEnvConfig() {
    this._setLevelAndPatterns('OFF', process.env.LOGLOVE_OFF);
    this._setLevelAndPatterns('ERROR', process.env.LOGLOVE_ERROR);
    this._setLevelAndPatterns('WARN', process.env.LOGLOVE_WARN);
    this._setLevelAndPatterns('INFO', process.env.LOGLOVE_INFO);
    this._setLevelAndPatterns('DEBUG', process.env.LOGLOVE_DEBUG);
  }
  configure() {
    this._patterns = new Map();
    this._loadFileConfig();
    this._loadEnvConfig();
  }
  level(name) {
    for (let entry of this._patterns) {
      for (let pattern of entry[1]) {
        if (minimatch(name, pattern)) {
          return LEVEL[entry[0]];
        }
      }
    }
    return LEVEL.ERROR;
  }
}

class Logger {
  constructor(name, level, formatFn, out) {
    this._name = name || 'default';
    this._setLevelAndLevelName(level);
    this._formatFn = formatFn ? formatFn.bind(this) : this._defaultFormatFn;
    this._out = out || process.stdout;
  }
  _setLevelAndLevelName(level) {
    this._level = level === null || level === undefined ? 1 : level;
    this._levelName = LEVEL_NAME[this._level + ''];
  }
  toString() {
    return JSON.stringify({
      name: this._name,
      level: this._level,
      levelName: this._levelName
    });
  }
  _defaultFormatFn(string, levelName) {
    return new Date().toISOString() +
      ' ' +
      levelName +
      ' [' +
      this._name +
      '] ' +
      string +
      '\n';
  }
  _log(string, level, levelName) {
    if (this._level >= level) {
      // if the first chart is a back tic, we assume they wanted a deferred
      // template string. if not, we will catch the error and just log out
      // the string as is.
      try {
        string = (string.indexOf('`') === 0) ? eval(string) : string;
      } catch (err) {
        //SyntaxError: Unterminated template literal
      }
      this._out.write(
        this._formatFn(
          string,
          levelName));
    }
  }
  debug(string) {
    this._log(string, 4, 'DEBUG');
    return this;
  }
  info(string) {
    this._log(string, 3, 'INFO');
    return this;
  }
  warn(string) {
    this._log(string, 2, 'WARN');
    return this;
  }
  error(string) {
    this._log(string, 1, 'ERROR');
    return this;
  }
}

class Loglove {
  constructor(options) {
    options = options || {};
    this._instanceName = options.instanceName || 'instance';
    this._formatFn = options.formatFn;
    this._out = options.out;
    this._loggers = new Map();
    this._configurer = new Configurer();
    this._configurer.configure();
    this._Logger = Logger;
    process.on('SIGHUP', () => {
      this._configurer.configure();
      for (let entry of this._loggers) {
        entry[1]._setLevelAndLevelName(this._configurer.level(entry[0]));
      }
    });
    if (!Loglove[this._instanceName]) {
      Loglove[this._instanceName] = this;
    }
  }
  log(name) {
    name = name || 'default';
    let log = this._loggers.get(name);
    if (!log) {
      log = new Logger(
        name,
        this._configurer.level(name),
        this._formatFn,
        this._out
      );
      this._loggers.set(name, log);
    }
    return log;
  }
}

exports = module.exports = function(options) {
  return new Loglove(options);
};

if (!module.parent) {
  // This custom format function doesn't include date time.
  // If you are going to run in Docker and log to syslog, this is a good
  // format to use because syslog can add the timestamp for you.
  const formatFn = function(string, levelName) {
    return levelName +
      ' ' +
      this._name +
      ' ' +
      string +
      '\n';
  };
  // Here is a custom output stream that just saves all the messages in an
  // array.
  const Writable = require('stream').Writable;
  const util = require('util');
  const TestOut = function TestOut(max) {
    this.messages = [];
    Writable.call(this);
  };
  util.inherits(TestOut, Writable);
  TestOut.prototype._write = function(chunk, encoding, next) {
    this.messages.push(chunk + '');
    next();
  };
  const testout = new TestOut();
  // Here we pass in a custom instance name. We could have 'larry', 'curly'
  // and 'moe' instances if we want.
  const ll = new Loglove({
    instanceName: 'larry',
    formatFn: formatFn,
    out: testout
  });
  Loglove.larry.log('/susie/queue.js').error('we had an error in susie q!');
  setInterval(function() {
    console.log('testout.messages', testout.messages);
  }, 3000);
}