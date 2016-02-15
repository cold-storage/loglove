#!/usr/bin/env node

/* jslint evil: true */
// eval isn't always evil

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
  constructor(config) {
    this._LOGLOVE_CONFIG = process.env.LOGLOVE_CONFIG || './love.config';
    this._level_patterns = new Map();
    // _codeConfig
    // {"WARN": "patterna patternb", "DEBUG": "/foo/bar /zoo/m*00"}
    this._codeConfig = config;
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
        this._level_patterns.set(level, pa);
      }
    }
  }

  // thought about making this async, but we hardly ever configure or
  // reconfigure, and you want logger fully configured at beginning of app
  // startup, so better to have it sync.
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

  // XXX TODO !!!! TEST
  _loadCodeConfig() {
    for (var l in this._codeConfig) {
      if (this._codeConfig.hasOwnProperty(l)) {
        this._setLevelAndPatterns(l, this._codeConfig[l]);
      }
    }
  }

  // ./foo.js LOGLOVE_DEBUG='this that the other'
  // for (var arg of process.argv) {
  //   console.log(arg);
  // }
  // /Users/jstein/.nvm/versions/node/v4.2.4/bin/node
  // /Users/jstein/git/loglove/zoo.js
  // LOGLOVE_DEBUG=this that the other
  // XXX TODO !!!! TEST
  _loadCommandLineConfig() {
    for (let arg of process.argv) {
      if (arg.startsWith('LOGLOVE_')) {
        let aa = arg.split('=');
        this._setLevelAndPatterns(aa[0].substring('LOGLOVE_'.length), aa[1]);
      }
    }
  }
  _loadEnvConfig() {
    this._setLevelAndPatterns('OFF', process.env.LOGLOVE_OFF);
    this._setLevelAndPatterns('ERROR', process.env.LOGLOVE_ERROR);
    this._setLevelAndPatterns('WARN', process.env.LOGLOVE_WARN);
    this._setLevelAndPatterns('INFO', process.env.LOGLOVE_INFO);
    this._setLevelAndPatterns('DEBUG', process.env.LOGLOVE_DEBUG);
  }
  configure(reconfigure) {
    if (reconfigure) {
      this._loadFileConfig();
    } else {
      this._loadFileConfig();
      this._loadCodeConfig();
      this._loadEnvConfig();
      this._loadCommandLineConfig();
    }
  }

  _checkPattern(name, patterns) {
    if (patterns) {
      for (let pattern of patterns) {
        if (minimatch(name, pattern)) {
          return true;
        }
      }
    }
  }

  // Return log level for logger name.
  level(name) {
    // loop backwards over the levels because we want to take the hightest
    // level that matches. if DEBUG and OFF both match, we take DEBUG.
    for (let i = LEVEL.DEBUG; i >= 0; i--) {
      let patterns = this._level_patterns.get(LEVEL_NAME[i + '']);
      if (this._checkPattern(name, patterns)) {
        return i;
      }
    }
    return LEVEL.ERROR;
  }
}

class Logger {
  constructor(name, level, format, out) {
    this._name = name || 'default';
    this._setLevelAndLevelName(level);
    this._format = format ? format.bind(this) : this._defaultFormatFn;
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
  _defaultFormatFn(message, levelName) {
    return new Date().toISOString() +
      ' ' +
      levelName +
      ' [' +
      this._name +
      '] ' +
      message +
      '\n';
  }
  _log(message, level, levelName) {
    if (this._level >= level) {
      // if the first chart is a back tic, we assume they wanted a deferred
      // template string. if not, we will catch the error and just log out
      // the string as is.
      // quickly tested in browser.
      // running eval really doesn't have the performance hit i thought it would
      // http://jsperf.com/log-string-vs-log-eval
      // but running json stringify on a string you aren't even going to log
      // will likely slow your app down if you have lots of log statements
      // http://jsperf.com/log-string-vs-log-json-stringify
      try {
        message = (message[0] === '`') ? eval(message) : message;
      } catch (err) {
        //SyntaxError: Unterminated template literal
      }
      this._out.write(
        this._format(
          message,
          levelName));
    }
  }
  debug(message) {
    this._log(message, 4, 'DEBUG');
    return this;
  }
  info(message) {
    this._log(message, 3, 'INFO');
    return this;
  }
  warn(message) {
    this._log(message, 2, 'WARN');
    return this;
  }
  error(message) {
    this._log(message, 1, 'ERROR');
    return this;
  }
}

class Loglove {
  constructor(options) {
      options = options || {};
      this._name = options.name || 'instance';
      this._format = options.format;
      this._out = options.out;
      this._loggers = new Map();
      this._configurer = new Configurer(options.config);
      this._configurer.configure();
      this._Logger = Logger;
      // live reload log config from config file.
      process.on('SIGHUP', () => {
        this._configurer.configure(true);
        for (let entry of this._loggers) {
          entry[1]._setLevelAndLevelName(this._configurer.level(entry[0]));
        }
      });
      if (!Loglove[this._name]) {
        Loglove[this._name] = this;
      }
    }
    // returns singleton (per Loglove instance) logger for the given name.
  log(name) {
    name = name || 'default';
    let log = this._loggers.get(name);
    if (!log) {
      log = new Logger(
        name,
        this._configurer.level(name),
        this._format,
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
  // http://dev.splunk.com/view/logging-best-practices/SP-CAAADP6
  // Use clear key-value pairs
  const format = function(message, levelName) {
    return 'level=' + levelName +
      ' logger="' +
      this._name +
      '" ' +
      message +
      '\n';
  };
  // Here is a custom output stream that just saves all the messages in an
  // array.
const Writable = require('stream').Writable;
const util = require('util');
const ArrayAppendingOutputStream = function ArrayAppendingOutputStream(max) {
  this.messages = [];
  Writable.call(this);
};
util.inherits(ArrayAppendingOutputStream, Writable);
ArrayAppendingOutputStream.prototype._write = function(chunk, encoding, next) {
  this.messages.push(chunk + '');
  next();
};
const myout = new ArrayAppendingOutputStream();
  // Here we pass in a custom instance name. We could have 'larry', 'curly'
  // and 'moe' instances if we want.
  const ll = new Loglove({
    name: 'larry',
    format: format,
    out: myout
  });
  Loglove.larry.log('/susie/queue.js').error('we had an error in susie q!');
  console.log('myout.messages', myout.messages);
}