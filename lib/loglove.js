// # loglove
// A simple logging facility for node.js.
//
// Allows for multiple loggers each with its own level.
//
// Configuration is easy and can be changed at runtime.
//
// Here's how you use the default logger.
// ```
// log = require('loglove').log()
// ```
// If you want multiple loggers, give each one a name.
// ```
// log = require('loglove').log('/my/log/name.js')
// ```
// We look for a configuration file at
// ```process.env.LOG_LOVE_CONFIG_FILE```, or you can just pass your config
// to ```require('loglove').configure()```
//
// You can easily set your logger names to the source file name.
// ```
// log = require('loglove').log(__filename)
// ```
// If you use this method you probably want to set the ```LOG_LOVE_ROOT_PATH```
// environment variable to the base path of your app so your logger names
// are relative to that.
//
// You can safely use loglove in library modules provided you use hard coded
// log names and specify ```OFF``` as the level.
// ```
// log = require('loglove').log('/us/jsks/somelib.js', 'OFF')
// ```
// Now your library won't log anything unless your clients configure it to do so.
//
// We only log to ```stdout```. Let your ops guys take it from there.
// They can send it to http://www.loggly.com,
// https://papertrailapp.com, or http://www.splunk.com
//
// See: http://adam.heroku.com/past/2011/4/1/logs_are_streams_not_files for the
// rationale.
//
// This should work fine unless you want to log different levels or formats
// to different outputs.
var ll = {},
  fmt = require('util').format,
  fs = require('fs');

// ## configure
// Takes a JSON string or object configuration like so.
// ```
// { "/some/logger.js": "INFO", "/": "ERROR" }
// ```
// ```"/some/logger.js": "INFO"``` sets the logger named ```/some/logger.js```
// to the ```INFO``` level.
//
// ```"/": "ERROR"``` sets the logger with the name ```/``` to the ```ERROR```
// level. It also sets the default level (which is ```INFO``` if you haven't
// changed it). All loggers will use the default level unless you specify
// otherwise.
//
// You can also configure ```RELOAD_INTERVAL_SECONDS```.
// ```
// { "RELOAD_INTERVAL_SECONDS": 60 }
// ```
// In conjunction with ```process.env.LOG_LOVE_CONFIG_FILE``` this will cause
// the ```LOG_LOVE_CONFIG_FILE``` to be reloaded periodically.
//
// TODO Implement wildcards.
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
    if ('/' === key) {
      ll.DEFAULT_LEVEL = ll[config[key]];
    }
  }
  if (ll.config['RELOAD_INTERVAL_SECONDS'] && process.env.LOG_LOVE_CONFIG_FILE) {
    setTimeout(function() {
      fs.readFile(process.env.LOG_LOVE_CONFIG_FILE, {
        encoding: 'utf8'
      }, function(err, cfg) {
        if (!err) {
          exports.configure(cfg);
        }
      });

    }, ll.config['RELOAD_INTERVAL_SECONDS'] * 1000);
  }
};

// ## formatter
// Sets the callback function that will format your log messages.
// You can use this to add timestamps, <font color='red'>colors</font>,
// log level, name, etc. to your log messages.
// The callback will be called as follows.
// ```
// callback(message, levelString, loggerName);
// ```
exports.formatter = function formatter(cb) {
  ll.formatter = cb;
};

// ## We use syslog levels.
//
// http://en.wikipedia.org/wiki/Syslog
//
// ??? Allow custom levels ???
ll.OFF = -1;
ll.EMERGENCY = 0;
ll.ALERT = 1;
ll.CRITICAL = 2;
ll.ERROR = 3;
ll.WARNING = 4;
ll.NOTICE = 5;
ll.INFO = 6;
ll.DEBUG = 7;

ll.levelNames = [];
ll.levelNames[0] = 'EMERGENCY';
ll.levelNames[1] = 'ALERT';
ll.levelNames[2] = 'CRITICAL';
ll.levelNames[3] = 'ERROR';
ll.levelNames[4] = 'WARNING';
ll.levelNames[5] = 'NOTICE';
ll.levelNames[6] = 'INFO';
ll.levelNames[7] = 'DEBUG';

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
function Log(name, level, noshow) {
  // just return the logger if it already exists
  if (ll.logmap[this.name]) {
    return ll.logmap[this.name];
  }
  name = name || '/';
  // the logger's name
  this.name = name.substr(ll.rootPath.length);
  // the numeric level -- 0, 1, 2, etc.
  this.level = determineLevel(this.name, level);
  // the string level -- ```WARNING```, ```INFO```, ```DEBUG```, etc.
  this.levelName = levelName(this.level);
  // the last message logged (mostly for unit testing)
  this.__message = null;
  // if ```noshow``` is ```true```, we do everything except actually log.
  // makes unit tests a bit less annoying.
  // ```__message``` still
  // gets set and you can check if it matches what you expect.
  this.__noshow = noshow || false;
  ll.logmap[this.name] = this;
}

// ## log
// Returns the logger of your dreams. All params are optional.
// ```name``` defaults to ```/```. ```level``` defaults to the default level
// which is ```INFO``` unless it has been changed.
exports.log = function log(name, level, noshow) {
  return new Log(name, level, noshow);
};

// ## prototype
// Here's what you can do with a logger. Log level descriptions from
// http://en.wikipedia.org/wiki/Syslog
Log.prototype = {
  // ### __log
  // Private method.
  __log: function(level, args) {
    if (this.level >= ll[level]) {
      this.__message = fmt.apply(null, args);
      this.__message = ll.formatter(this.__message, level, this.name);
      if (!this.__noshow) {
        console.log(this.__message);
      }
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
  },
  // ### toString
  // Pretty print the logger.
  toString: function toString() {
    return JSON.stringify(this);
  }
};

// ## toString
// Pretty print loglove.
exports.toString = function toString() {
  return JSON.stringify({
    rootPath: ll.rootPath,
    config: ll.config,
    logmap: ll.logmap,
    formatter: ll.formatter + ''
  });
};

// ## __reset
// Handy for unit testing. Should not be used otherwise.
//
// For unit testing you can modify ```process.env.LOG_LOVE_ROOT_PATH```
// or ```process.env.LOG_LOVE_CONFIG_FILE``` and then call ```_reset()```.
exports.__reset = function __reset() {
  ll.DEFAULT_LEVEL = ll.INFO;
  ll.logmap = {};
  ll.rootPath = process.env.LOG_LOVE_ROOT_PATH || '';
  ll.config = null;
  if (process.env.LOG_LOVE_CONFIG_FILE) {
    try {
      ll.config = JSON.parse(fs.readFileSync(process.env.LOG_LOVE_CONFIG_FILE, {
        encoding: 'utf8'
      }));
    } catch (e) {
      // intentionally ignore error
    }
  }
  ll.config = ll.config || {};
  exports.configure(ll.config);
  ll.formatter = function(msg, level, name) {
    return fmt(JSON.stringify(new Date()).substr(1, 24), level.substr(0, 3), name, msg);
  };
};

exports.__reset();

new Log('/LOG_LOVE_SYSTEM_LOGGER').info('loglove initialized');