// # loglove
// A simple logging facility for node.js. We hope you love us.
//
// Most important is the ability to configure different loggers with
// different levels and the ability to change configuration at runtime.
//
// To easily configure both a logger and its descendents,
// name your loggers with path notation like
// ``` "/some/cool/logger" ```. Often you will use the source
// file name like so.
// ```
// loglove = require('loglove')
// log = loglove.log(__filename)
// ```
// Next most important are formatters that allow you to decorate your log
// messages with timestamp, level, etc.
var ll = {},
  fmt = require('util').format,
  fs = require('fs');

// ## We use syslog levels.
//
// http://en.wikipedia.org/wiki/Syslog
//
// A log request, ```log.notice()``` for example, is considered "enabled" if the
// logger's level is equal to or higher than the request. So a logger with a
// level of ```ERROR``` will do nothing if you request ```log.notice()```.
ll.OFF = -1;
ll.EMERGENCY = 0;
ll.ALERT = 1;
ll.CRITICAL = 2;
ll.ERROR = 3;
ll.WARNING = 4;
ll.NOTICE = 5;
ll.INFO = 6;
ll.DEBUG = 7;
ll.DEFAULT_LEVEL = ll.INFO;

ll.levelNames = [];
ll.levelNames[0] = 'EMERGENCY';
ll.levelNames[1] = 'ALERT';
ll.levelNames[2] = 'CRITICAL';
ll.levelNames[3] = 'ERROR';
ll.levelNames[4] = 'WARNING';
ll.levelNames[5] = 'NOTICE';
ll.levelNames[6] = 'INFO';
ll.levelNames[7] = 'DEBUG';

// TODO once we have wildcards in the config, this will get a bit more complex.
function determineLevel(name, level) {
  return ll[ll.config[name]] || ll[level] || ll.DEFAULT_LEVEL;
}

function levelName(level) {
  if (level === -1) {
    return 'OFF';
  } else {
    return ll.levelNames[level];
  }
}

// ## Constructor
// NOTE: If you are using __filename to name your loggers, you will probably
// want to set the LOG_LOVE_ROOT_PATH environment variable before starting
// your app so your logger names are relative to your app's root path.
function Log(name, level, noshow) {
  if (ll.logmap[this.name]) {
    return ll.logmap[this.name];
  }
  name = name || '/';
  // name of the logger
  this.name = name.substr(ll.rootPath.length);
  // numeric level, 0, 1, 2, etc.
  this.level = determineLevel(this.name, level);
  // string level WARNING, INFO, DEBUG, etc.
  this.levelName = levelName(this.level);
  // the last message logged (mostly for unit testing)
  this.message = null;
  this.noshow = noshow || false;
  ll.logmap[this.name] = this;
}

// ## log
// Returns the logger of your dreams. Name is required. Level is optional.
// If no level is passed we use the default level which is ```INFO``` unless
// you have changed it with a prior call to ```configure()```.
exports.log = function log(name, level, noshow) {
  return new Log(name, level, noshow);
};

// ## formatter
// Sets the callback function that will be used to format your log messages.
// If you don't set one we use a default. Function will be called with
// the arguments ```loggerName```, ```message```, and ```level```.
// We assume this will be called once on app startup.
exports.formatter = function formatter(cb) {
  ll.formatter = cb;
};

// ## configure
// Allows for configuration of log levels. Takes a JSON structure
// where the key is a path to a logger. The value is the log level.
// An asterisk (*) may
// be used to denote wildcards and descendents.
// ```
// { "/": "ERROR", "/some/logger": "INFO",
//   "/some/descendents/*": "DEBUG",
//   "/rea*lly/fancy": "ALERT" }
// ```
// "/" sets the default level. If you happened to name a logger "/" it
// sets that level too. "/*" does not set the default level. It just
// sets the ll of all the loggers below /.
// NOTE: configure only applies to loggers already constructed. If you
// construct a logger after calling configure its level will be the level
// you passed in the constructor or the default level if you didn't pass
// anythig.
// NOTE: Paths are matched in longest order first. Length is considered
// first by number of segments and then by total length. So /a/b/c will be
// considered longer than /a/somelongname.
exports.configure = function(config) {
  if (typeof config === 'string' || config === String) {
    config = JSON.parse(config);
  }
  var key, val, logger;
  for (key in config) {
    val = config[key];
    ll.config[key] = val;
    logger = ll.logmap[key];
    if (logger) {
      logger.level = ll[config[key]];
      logger.levelName = levelName(logger.level);
    }
  }
};

exports.toString = function toString() {
  return JSON.stringify({
    rootPath: ll.rootPath,
    config: ll.config,
    logmap: ll.logmap,
    formatter: ll.formatter + ''
  });
};

exports.__reset = function __reset() {
  ll.logmap = {};
  ll.rootPath = process.env.LOG_LOVE_ROOT_PATH || '';
  ll.config = null;
  if (process.env.LOG_LOVE_CONFIG_FILE) {
    try {
      ll.config = JSON.parse(fs.readFileSync(process.env.LOG_LOVE_CONFIG_FILE));
    } catch (e) {
      // eat it.
    }
  }
  ll.config = ll.config || {};
  exports.configure(ll.config);
  ll.formatter = function(name, msg, level) {
    return fmt(JSON.stringify(new Date()).slice(1, -1), level.substr(0, 3), name, msg);
  };
};

exports.__reset();

// ## prototype
// Here's what you can do with a logger.
Log.prototype = {
  // ### __log
  // Should not need to call this directly. But knock yourself out if you like.
  __log: function(level, args) {
    if (this.level >= ll[level]) {
      this.message = fmt.apply(null, args);
      this.message = ll.formatter(this.name, this.message, level);
      if (!this.noshow) {
        console.log(this.message);
      }
    }
  },
  toString: function toString() {
    return this.levelName + this.name;
  },
  // ### emergency
  // A "panic" condition usually affecting multiple apps/servers/sites.
  // At this level it would usually notify all tech staff on call.
  emergency: function emergency(msg) {
    this.__log('EMERGENCY', arguments);
  },
  // ### alert
  // Should be corrected immediately, therefore notify staff who can fix
  // the problem. An example would be the loss of a primary ISP connection.
  alert: function alert(msg) {
    this.__log('ALERT', arguments);
  },
  // ### critical
  // Should be corrected immediately, but indicates failure in a secondary
  // system, an example is a loss of a backup ISP connection.
  critical: function critical(msg) {
    this.__log('CRITICAL', arguments);
  },
  // ### error
  // Non-urgent failures, these should be relayed to developers or admins;
  // each item must be resolved within a given time.
  error: function error(msg) {
    this.__log('ERROR', arguments);
  },
  // ### warning
  // Warning messages, not an error, but indication that an error will occur
  // if action is not taken, e.g. file system 85% full - each item must be
  // resolved within a given time.
  warning: function warning(msg) {
    this.__log('WARNING', arguments);
  },
  // ### notice
  // Events that are unusual but not error conditions - might be summarized
  // in an email to developers or admins to spot potential problems
  // -- no immediate action required.
  notice: function notice(msg) {
    this.__log('NOTICE', arguments);
  },
  // ### info
  // Normal operational messages - may be harvested for reporting, measuring
  // throughput, etc. -- no action required.
  info: function info(msg) {
    this.__log('INFO', arguments);
  },
  // ### debug
  // Info useful to developers for debugging the application, not useful
  // during operations.
  debug: function debug(msg) {
    this.__log('DEBUG', arguments);
  }
};