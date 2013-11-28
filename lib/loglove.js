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
// log = loglove.getLog(__filename)
// ```
// Next most important are formatters that allow you to decorate your log
// messages with timestamp, level, etc.
var fmt = require('util').format,
  formatter = function(name, msg, level) {
    return fmt(JSON.stringify(new Date()).slice(1, -1), level, name, msg);
  };

// ## Constructor
// NOTE: If you are using __filename to name your loggers, you will probably
// want to set the LOG_LOVE_ROOT_PATH environment variable before starting
// your app so your logger names are relative to your app's root path.
function Log(name, level) {
  var rootPath = process.env.LOG_LOVE_ROOT_PATH || '';
  this.name = name.substr(rootPath.length);
  this.level = exports[level] || exports.DEFAULT_LEVEL;
  exports.logmap[name] = this;
}

// ## getLog
// Returns the logger of your dreams. Name is required. Level is optional.
// If no level is passed we use the default level which is ```INFO``` unless
// you have changed it with a prior call to ```configure()```.
module.exports.getLog = function getLog(name, level) {
  var lgr = new Log(name, level);
  exports.logmap[name] = lgr;
  return lgr;
};

// ## setFormatter
// Sets the callback function that will be used to format your log messages.
// If you don't set one we use a default. Function will be called with
// the arguments ```loggerName```, ```message```, and ```level```.
// We assume this will be called once on app startup.
module.exports.setFormatter = function setFormatter(cb) {
  formatter = cb;
};

// ## We use syslog levels.
//
// http://en.wikipedia.org/wiki/Syslog
//
// A log request, ```log.notice()``` for example, is considered "enabled" if the
// logger's level is equal to or higher than the request. So a logger with a
// level of ```ERROR``` will do nothing if you request ```log.notice()```.
exports.OFF = -1;
exports.EMERGENCY = 0;
exports.ALERT = 1;
exports.CRITICAL = 2;
exports.ERROR = 3;
exports.WARNING = 4;
exports.NOTICE = 5;
exports.INFO = 6;
exports.DEBUG = 7;
exports.DEFAULT_LEVEL = exports.INFO;

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
// sets the levels of all the loggers below /.
// NOTE: configure only applies to loggers already constructed. If you
// construct a logger after calling configure its level will be the level
// you passed in the constructor or the default level if you didn't pass
// anythig.
// NOTE: Paths are matched in longest order first. Length is considered
// first by number of segments and then by total length. So /a/b/c will be
// considered longer than /a/somelongname.
module.exports.configure = function(json) {
  if (typeof json === 'string' || json === String) {
    json = JSON.parse(json);
  }
};

// ## logmap
// Knows our loggers by name.
exports.logmap = {};

// ## prototype
// Here's what you can do with a logger.
Log.prototype = {
  // ### __log
  // Should not need to call this directly. But knock yourself out if you like.
  __log: function(level, args) {
    if (this.level >= exports[level]) {
      msg = fmt.apply(null, args);
      console.log(formatter(this.name, msg, level));
    }
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