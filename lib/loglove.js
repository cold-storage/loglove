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
// You can easily set your logger names to the source file name like so.
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
// changed it). All loggers will use the default level if you don't otherwise
// specify.
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
};

// ## formatter
// Sets the callback function that will be used to format your log messages.
// You can use this to add timestamps, <font color='red'>colors</font>,
// etc. to your logs.
// The callback will be called as follows.
// ```
// callback(loggerName, message, levelString);
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
// If no ```name``` is passed we use ```/```. If no ```level``` is passed we use
// the default level which is ```INFO```.
//
// If ```noshow``` is ```true``` everything functions exactly as normal except we don't
// actually log anything. This is handy mostly just for unit testing.
exports.log = function log(name, level, noshow) {
  return new Log(name, level, noshow);
};

// ## prototype
// Here's what you can do with a logger.
Log.prototype = {
  // ### __log
  // Should not need to call this directly. But knock yourself out if you like.
  __log: function(level, args) {
    if (this.level >= ll[level]) {
      this.__message = fmt.apply(null, args);
      this.__message = ll.formatter(this.name, this.__message, level);
      if (!this.__noshow) {
        console.log(this.__message);
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

// ## toString
// A pretty view of loglove.
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
      ll.config = JSON.parse(fs.readFileSync(process.env.LOG_LOVE_CONFIG_FILE));
    } catch (e) {
      // intentionally ignore error
    }
  }
  ll.config = ll.config || {};
  exports.configure(ll.config);
  ll.formatter = function(name, msg, level) {
    return fmt(JSON.stringify(new Date()).slice(1, -1), level.substr(0, 3), name, msg);
  };
};

exports.__reset();
