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
// config value to the base path of your app so your logger names
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

// # configure
// Takes a JSON string or object configuration like so.
// ```
// { "/some/logger.js": "INFO", "/foo/*": "WARNING" }
// ```
// ```"/some/logger.js": "INFO"``` sets the logger named ```/some/logger.js```
// to the ```INFO``` level.
//
// ```"/foo/*": "WARNING"``` sets the logger named ```/foo``` or any logger
// below ```/foo/``` to ```WARNING```.
//
// The configuration defaults to ```{ "/*": "INFO" }```.
//
// You can also configure ```RELOAD_INTERVAL_SECONDS```.
// ```
// { "RELOAD_INTERVAL_SECONDS": 60 }
// ```
// In conjunction with ```process.env.LOG_LOVE_CONFIG_FILE``` this will cause
// the ```LOG_LOVE_CONFIG_FILE``` to be reloaded periodically.
//
// The following configuration will make all your logger names relative
// to ```/a/b/c```
// ```
// { "LOG_LOVE_ROOT_PATH": "/a/b/c" }
// ```
//This is handy in conjunction with
// ```
// log = require('loglove').log(__filename)
// ```
// If ```__filename```
// resolves to ```/a/b/c/foo/bar.js``` then your logger will be named
// ```/foo/bar.js``` instead of ```/a/b/c/foo/bar.js```.
//
// By default we merge the passed ```config``` with any existing config.
// Setting ```{ "OVERWRITE_CONFIG": true }``` will cause us to overwrite any existing
// config with the new one.
//
// Finally ```{ "SOME_SETTING": "-" }``` will remove a setting from the config.
// This only takes effect if ```OVERWRITE_CONFIG``` is ```false```.
function configure(config) {
  if (typeof config === 'string' || config === String) {
    config = JSON.parse(config);
  }
  // if not OVERWRITE_CONFIG merge new config with existing config
  if (!config['OVERWRITE_CONFIG']) {
    for (var key in config) {
      var val = config[key];
      if (val === '-') {
        delete ll.config[key];
      } else {
        ll.config[key] = config[key];
      }
    }
  }
  // set default level pattern if not already specified
  if (!ll.config['/*']) {
    ll.config['/*'] = 'INFO';
  }
  // configure each logger based on merged config
  for (var logName in ll.logmap) {
    ll.logmap[logName].__configure();
  }
  // reload config on a given interval if specified
  if (ll.config['RELOAD_INTERVAL_SECONDS'] && process.env.LOG_LOVE_CONFIG_FILE) {
    setTimeout(function() {
      fs.readFile(process.env.LOG_LOVE_CONFIG_FILE, {
        encoding: 'utf8'
      }, function(err, cfg) {
        if (!err) {
          configure(cfg);
        }
      });

    }, ll.config['RELOAD_INTERVAL_SECONDS'] * 1000);
  }
  return this;
}

// # formatter
// Sets the callback function that will format your log messages.
// You can use this to add timestamps, <font color='red'>colors</font>,
// log level, logger name, etc. to your log messages.
// The callback will be called as follows.
// ```
// callback(levelName, loggerName, args);
// ```
// ```args``` is the arguments that you passed to log.info(), log.debug(), etc.
// This gives you complete control of your log messages.
// To get started you can use a copy of the default formatter
// in the __reset method below.
function formatter(callback) {
  ll.formatter = callback;
  return this;
}

// # We use syslog levels.
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

// # Constructor
function Log(name, levelName, noshow) {
  name = name || '/';
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

// # log
// Returns the logger of your dreams. All params are optional.
// ```name``` defaults to ```/```. ```level``` defaults to the default level
// which is ```INFO``` unless it has been changed.
function log(name, level, noshow) {
  return new Log(name, level, noshow);
}

// # prototype
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
    if (ll.config.LOG_LOVE_ROOT_PATH &&
      this.name.indexOf(ll.config.LOG_LOVE_ROOT_PATH) === 0) {
      this.name = this.name.substr(ll.config.LOG_LOVE_ROOT_PATH.length);
    }
    var key, val, keyNoSlashStar, strength;
    for (key in ll.config) {
      val = ll.config[key];
      if (this.name === key) {
        this.__setLevelAndStrength(val, 100);
      } else if (key.indexOf('*') > -1) {
        keyNoSlashStar = key.substr(0, key.length - 2);
        if (this.name === keyNoSlashStar) {
          this.__setLevelAndStrength(val, 100);
        } else if (this.name.indexOf(keyNoSlashStar) === 0) {
          // wildcard matches with more segments beat those with less, so
          // ```/foo/bar/*``` beats ```/foo/*``` assuming your logger is named
          // ```/foo/bar/zoo.js```
          strength = key.split('/').length;
          if (strength > this.strength) {
            this.__setLevelAndStrength(val, strength);
          }
        }
      }
    }
  },
  __setLevelAndStrength: function __setLevelAndStrength(levelName, strength) {
    this.strength = strength;
    // the numeric level
    this.level = ll[levelName];
    // the string level name
    this.levelName = levelName;
  },
  // ### toString
  // Pretty print the logger.
  toString: function toString() {
    return JSON.stringify(this);
  }
};

// # toString
// Pretty print loglove.
function toString() {
  return JSON.stringify({
    config: ll.config,
    logmap: ll.logmap,
    formatter: ll.formatter + ''
  });
}

// # __reset
// Handy for unit testing. Should not be used otherwise.
//
// For unit testing you can modify ```process.env.LOG_LOVE_CONFIG_FILE```
// and then call ```_reset()```.
function __reset() {
  ll.logmap = {};
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
  configure(ll.config);
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
}

__reset();

exports.configure = configure;
exports.formatter = formatter;
exports.log = log;
exports.toString = toString;
exports.__reset = __reset;

new Log('/LOG_LOVE_SYSTEM_LOGGER').info('loglove initialized');
