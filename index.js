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
    this._LOGLOVE_CONFIG = process.env.LOGLOVE_CONFIG;
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
      this._out.write(this._formatFn(string, levelName));
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

class Manager {
  constructor(formatFn, out) {
    this._formatFn = formatFn;
    this._out = out;
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

exports = module.exports = Manager;

if (!module.parent) {
  //console.log(__filename.substring(process.cwd().length));
}