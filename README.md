# LogLove

A simple, configurable logger for node applications.

Version `3.0.0` is nothing at all like prior versions.

* Multiple named loggers
* Levels configured by pattern matching on logger name
* Configuration via environment variables and/or config file
* Live reconfiguration on `SIGHUP` AKA `kill -1 $PROCESS_ID`

We assume

* You only need a single output stream
* You may want to specify the output stream (default is `stdout`)
* You only need 4 levels, `ERROR`, `WARN`, `INFO`, `DEBUG`
* You may want to use your own format function

## Installation

```
npm install loglove
```

## Usage

At the entry point of your application you should save a single instance of
LogLove.

```
const LogLove = require('loglove');
LogLove.instance = new LogLove();

// or you could have another instance configured a different way.
LogLove.instance2 = new LogLove(null, myOutputStream);
```

In other modules you can get the instance you saved like so.

```
const log = require('loglove').instance.log('/some/log');
log.error('hello world');
```

If you specify your file names as follows, you will have a named logger per
file -- something like: /some/path/myJsFile.js
This assumes current working directory is the root of your application.

```
const log = require('loglove').instance.log(__filename.substring(process.cwd().length));
```

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

We start by matching a logger's name against the `DEBUG` patterns in the order the
patterns are specified. If the name matches the pattern, the logger's level will
be `DEBUG`. If not we move on to `INFO` and so on down to `OFF`.

If we find no match the default level is `ERROR`, not `OFF`.

Pattern matching is per https://github.com/isaacs/minimatch

**Environment Variables**

We configure levels with environment variables like so. Environment variables
will override any settings in the config file.

```
export LOGLOVE_DEBUG='/some/pattern/** /another*'
export LOGLOVE_INFO='/foo/** /bar*'
```

**Configuration File**

You specify a config file with the `LOGLOVE_CONFIG` environment variable.

```
export LOGLOVE_CONFIG='/some/file.conf'
```

The config file format is shown here.

```
# Comments allowed.

In fact any line that doesn't start with a level in upper case
will be ignored.

OFF    = /nolog/**
ERROR  = /err/j.s
WARN   = warna warnb /another/patt**ern.js /woo/hoo
INFO   = /server/** /db
DEBUG  = /foo* /bar/*
```

## Custom Format Function

You can use your own custom format function by passing it to loglove.
The format function takes two parameters, `message`, and `levelName`.

You also have access to the logger name via `this._name`.

```
const loglove = require('loglove')(function(message, levelName) {
  return "levelName + " " + this._name + " " + message + "\n";
});
```

## Custom Output Stream

You can also pass a custom output stream as the second parameter. We
default to `stdout`.

```
const loglove = require('loglove')(null, myOutputStream);
```
