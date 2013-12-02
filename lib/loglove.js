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
//
// Let me know what you think:
// john curleya johnandkerri littleroundthing com
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
// TODO Allow setting ```LOG_LOVE_ROOT_PATH``` after loggers have been created.
// make ```LOG_LOVE_ROOT_PATH``` part of normal config. So only thing that
// has to go in ```process.env``` is ```LOG_LOVE_CONFIG_FILE```.
exports.configure = function(config) {
  if (typeof config === 'string' || config === String) {
    config = JSON.parse(config);
  }
  // merge new config with existing config
  for (var key in config) {
    ll.config[key] = config[key];
  }
  // configure each logger based on merged config
  for (var logName in ll.logmap) {
    ll.logmap[logName].__configure();
  }
  // set default level if configured
  if (ll.config['/']) {
    ll.DEFAULT_LEVEL = ll.config['/'];
  }
  if (ll.config['RELOAD_INTERVAL_SECONDS'] && process.env.LOG_LOVE_CONFIG_FILE) {
    // reload config on a given interval
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
  return this;
};

// ## formatter
// Sets the callback function that will format your log messages.
// You can use this to add timestamps, <font color='red'>colors</font>,
// log level, name, etc. to your log messages.
// The callback will be called as follows.
// ```
// callback(levelName, loggerName, args);
// ```
// ```args``` is the arguments that you passed to log.info(), log.debug(), etc.
// This gives you complete control of your log messages.
// To get started you can use a copy of the default formatter
// in the __reset method below.
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

// ## Constructor
function Log(name, levelName, noshow) {
  name = name || '/';
  name = name.substr(ll.rootPath.length);
  // just return the logger if it already exists
  if (ll.logmap[name]) {
    return ll.logmap[name];
  }
  // the logger's name
  this.name = name;
  this.__configure();
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
  // ### emergency
  // A "panic" condition usually affecting multiple apps/servers/sites.
  // At this level it would usually notify all tech staff on call.
  emergency: function emergency(msg) {
    return this.__log('EMERGENCY', arguments);
  },
  // ### alert
  // Should be corrected immediately, therefore notify staff who can fix
  // the problem. An example would be the loss of a primary ISP connection.
  alert: function alert(msg) {
    return this.__log('ALERT', arguments);
  },
  // ### critical
  // Should be corrected immediately, but indicates failure in a secondary
  // system, an example is a loss of a backup ISP connection.
  critical: function critical(msg) {
    return this.__log('CRITICAL', arguments);
  },
  // ### error
  // Non-urgent failures, these should be relayed to developers or admins;
  // each item must be resolved within a given time.
  error: function error(msg) {
    return this.__log('ERROR', arguments);
  },
  // ### warning
  // Warning messages, not an error, but indication that an error will occur
  // if action is not taken, e.g. file system 85% full - each item must be
  // resolved within a given time.
  warning: function warning(msg) {
    return this.__log('WARNING', arguments);
  },
  // ### notice
  // Events that are unusual but not error conditions - might be summarized
  // in an email to developers or admins to spot potential problems
  // -- no immediate action required.
  notice: function notice(msg) {
    return this.__log('NOTICE', arguments);
  },
  // ### info
  // Normal operational messages - may be harvested for reporting, measuring
  // throughput, etc. -- no action required.
  info: function info(msg) {
    return this.__log('INFO', arguments);
  },
  // ### debug
  // Info useful to developers for debugging the application, not useful
  // during operations.
  debug: function debug(msg) {
    return this.__log('DEBUG', arguments);
  },
  // ### m
  // m is for (m)ethod level log. Returns a child copy of this log.
  // The logger name is parent name + '/' + child name.
  // Handy if your source file has hundreds of methods in it, which often
  // seems to the case with JavaScript. We are chainable so you can do the
  // following.
  // ```
  // var mlog = log.m('fooMethod').info('entering fooMethod');
  // mlog.info('more logs for fooMethod');
  // ```

  m: function m(name, level, noshow) {
    return new Log(this.name + '/' + name, level, noshow);
  },
  // ### __log
  // Private method that does the actually writing to stdout.
  __log: function(level, args) {
    if (this.level >= ll[level]) {
      this.__message = ll.formatter(level, this.name, args);
      if (!this.__noshow) {
        process.stdout.write(this.__message + '\n');
      }
    }
    return this;
  },
  // ### __configure
  // Configures this logger based on current config settings.
  __configure: function __configure() {
    this.strength = -1;
    var key, val, keyNoSlashStar, strength;
    for (key in ll.config) {
      val = ll.config[key];
      if (this.name === key) {
        this.__setLevel(val, 100);
      } else if (key.indexOf('*') > -1) {
        keyNoSlashStar = key.substr(0, key.length - 2);
        if (this.name === keyNoSlashStar) {
          this.__setLevel(val, 100);
        } else if (this.name.indexOf(keyNoSlashStar) === 0) {
          // wildcard matches with more segments beat those with less so
          // ```/foo/bar/*``` beats ```/foo/*``` assuming your logger is named
          // ```/foo/bar/zoo.js```
          strength = key.split('/').length;
          if (strength > this.strength) {
            this.__setLevel(val, strength);
          }
        }
      }
    }
    if (this.strength === -1) {
      this.__setLevel();
    }
  },
  __setLevel: function __setLevel(levelName, strength) {
    this.strength = strength;
    // the numeric level
    this.level = ll[levelName] || ll.DEFAULT_LEVEL;
    // the string level name
    this.levelName = levelName || ll.levelNames[this.level];
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
  // Default formatter outputs date, level, message and logger name.
  // ```
  // 2013-11-30T14:41:56.446Z INF My message here. /my/logger/name.js
  // ```
  // You can copy this and tweak it till your heart's content.
  ll.formatter = function(level, name, args) {
    var msg = fmt.apply(null, args).replace(/\n|\r/g, ' ');
    return fmt(JSON.stringify(
        new Date()).substr(1, 24),
      level.substr(0, 3),
      '\x1B[33m' + msg + '\x1B[39m',
      name);
  };
};

exports.__reset();

new Log('/LOG_LOVE_SYSTEM_LOGGER').info('loglove initialized');