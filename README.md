# Loglove

Love your logs!

##Features

A simple server side logging facility for node applications or libraries.

* Multiple named loggers
* Levels configured by glob pattern matching on logger name
* Configuration via environment variables and/or config file
* Live reconfiguration on `SIGHUP` AKA `kill -1 $PROCESS_ID`
* Deferred es6 template string interpolation for performance

##Assumptions

* You only need a single output stream per Loglove instance
* You may want to specify the output stream (default is `stdout`)
* You only need 4 levels, `ERROR`, `WARN`, `INFO`, `DEBUG`
* You may want to use your own format function
* You are using node version 4.2.4 or higher

You can have multiple output streams by creating multiple instances of Loglove.
Details at the end of this document.

We would love feedback, help, etc. Just put in a pull request!

## Installation

```
npm install loglove
```

## Usage

At your application entry point get a new instance of Loglove as follows. We
will save the new instance on the Loglove object at Loglove.instance.

```
const loglove = require('loglove')();
```

In the rest of your application you can get the saved instance like this.

```
const loglove = require('loglove').instance;
```

Here is how you create loggers.

```
// This creates a logger named /some/path/mylib.js where /some/path is relative
// to the current working directory and mylib.js is the current file.
const log = loglove.log(__filename.substring(process.cwd().length));

// Or you can just name loggers whatever you like.
const log2 = loglove.log('/some/logger/name');
```

Here is how you log.

```
log.debug('this is a debug message');
log.info('this is a info message');
log.warn('this is a warn message');
log.error('this is a error message');
```

##Deferred es6 template string interpolation

We offer deferred string interpolation as a performance enhancement.

Instead of doing this.

```
if ( log.isDebug() ) {
    log.debug(`My nice message with ${JSON.stringify(someObject)}`);
}
```

You can do this.

```
log.debug('`My nice message with ${JSON.stringify(someObject)}`');
```

If you quote your template string as shown above, `JSON.stringify` won't run
unless the log level is set to `DEBUG`.

We implement this by checking to see if the first character of your log message
is a  back-tick (`) (grave accent). If so, we assume you wanted deferred string
interpolation.

##Change log levels without restarting your app

Live reconfiguration allows you to change log levels without restarting your
application. This is handy if your app is having issues, and you want to
see more info but don't want to restart your app.

Live reconfiguration mostly applies to the configuration file since it's kinda
hard to change environment variables of a running process.

You could use something like https://www.consul.io with
https://github.com/hashicorp/consul-template to live modify your config file and
send a SIGHUP to your app telling it to reload its config.

## Configuration

**Matching Patterns**

We configure loggers by specifying one or more patterns for each level like so.

```
OFF    = /nolog/**
ERROR  = /err/j.s
WARN   = warna warnb
INFO   = /server/** /db
DEBUG  = /foo* /bar/*
```

We start by matching a logger's name against the `DEBUG` patterns in the order
the patterns are specified. If the name matches the pattern, the logger's level
will be `DEBUG`. If not we move on to `INFO` and so on down to `OFF`.

If we find no match the default level is `ERROR`.

Pattern matching is per https://github.com/isaacs/minimatch

**Environment Variables**

You may configure levels with environment variables like so. Environment variables
will override any settings in the config file.

```
export LOGLOVE_DEBUG='/some/pattern/** /another*'
export LOGLOVE_INFO='/foo/** /bar*'
```

**Configuration File**

You may specify the location of a config file with the `LOGLOVE_CONFIG`
environment variable. It defaults to `love.config`. Values in the config file
will be overridden by environment variables.

```
export LOGLOVE_CONFIG='/some/file.conf'
```

The config file format is simple.

```
# Comments allowed.

In fact any line that doesn't start with a level in upper case
will be ignored.

Just separate levels and patterns with an equals sign.
One level per line.

OFF    = /nolog/**
ERROR  = /err/j.s
WARN   = warna warnb /another/patt**ern.js /woo/hoo
INFO   = /server/** /db
DEBUG  = /foo* /bar/*
```

## Custom Format Function

You can use your own custom format function by passing it to Loglove. The format
function takes two parameters, `message`, and `levelName`.

You also have access to the logger name via `this._name`.

There is an example at the end of `index.js`

## Custom Output Stream

You can also pass a custom output stream as the second parameter. We default to
`stdout`.

There is an example at the end of `index.js`

## Custom Instance Name

You can specify the Loglove instance name to be whatever you want. This is handy
if your application uses multiple Loglove instances.

There is an example at the end of `index.js`
