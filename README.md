# Loglove

Love your logs!<sup>*</sup>

Simple, high performance logging for node 4.2.4<sup>*</sup> and higher.

* high performance
* simple flexible configuration
* multiple log levels
* multiple named loggers
* custom message formatting
* configurable output stream
* live re-configuration
* multiple loglove instances

<sup>* Any Loglove release prior to `3.1.2` is garbage.</sup>
<sup>* Loglove should work with any version of node that supports `const`, `class`,
template strings, etc.</sup>

Comments, questions, and pull requests gladly accepted.

## Installation

```bash
npm install loglove
```

## Usage

At your application entry point get a new instance of Loglove as follows.

```javascript
const loglove = require('loglove')();
```

We save the instance on the Loglove object at `Loglove.instance`. In the rest
of your application you can reference the saved instance like this.

```javascript
const loglove = require('loglove').instance;
```

Create a logger.

```javascript
const log = loglove.log('/some/logger/name');
```

Log some messages.

```javascript
log.debug('debug message');
log.info('info message');
log.warn('warn message');
log.error('error message');
```

## High performance

If you have lots of log statements, things like `JSON.stringify()`, or even
simple string concatenation can have a noticable impact on performance.

We recommend using ES6 template strings instead of string concatenation.
https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/template_strings

We also recommend using Loglove's deferred template pattern so you are
never penalized for log statements that don't actually get logged.

Instead of doing something like this.

```javascript
if (log.isInfo()) {
    log.info(`Some log message ${JSON.stringify(myobject)}`)
}
// (note: we don't support .isInfo() this is just hypythetical).
```

You can do this.

```javascript
log.info('`Some log message ${JSON.stringify(myobject)}`')
```

With either of the above there is no performance penalty if INFO logging is not
active, but the second method is much nicer.

Loglove implements deferred template strings by checking if the first character
of your log message is a back-tick. If so we assume you intended a deferred
template string (i.e a template string that doesn't get evaluated unless we are
actually going to log the message).

## Simple and flexible configuration

We configure loggers by specifying one or more patterns for each level.

```bash
DEBUG  = /foo* /bar/*
INFO   = /server/** /db
WARN   = warna warnb
ERROR  = /err/j.s
OFF    = /nolog/**
```

Patterns are a space separated list of patterns and matching is done per
https://github.com/isaacs/minimatch

We start by matching a logger's name against the `DEBUG` patterns in the order
they are specified. If the logger name matches the pattern, the logger's level
will be `DEBUG`. If not we move on to `INFO` and so on down the line to `OFF`.

If we find no match the default level is `ERROR`.

**Configuration options**

Loglove supports the following options to configure log levels (in order
of precedence).

* command line parameters
* environment variables
* constructor argument
* configuration file

Command line parameters override environment variables, which override
the constructor argument, etc.

NOTE: If you use the live reconfiguration feature to change log levels while
your app is running, the config file takes precedence over everything.

**Command line parameter configuration**

```bash
node myapp.js LOGLOVE_INFO='/pattern/**/one /pattern/two*.js'
```

**Environment variable configuration**

```bash
LOGLOVE_INFO='/pattern/**/one /pattern/two*.js' node myapp.js
```

**Constructor argument configuration**

```javascript
const options = { config: { INFO: '/pattern/**/one /pattern/two*.js' } };
const loglove = require('loglove')(options);
```

**Config file configuration**

The location of the config file is controlled by the `LOGLOVE_CONFIG`
environment variable. The default location is `./love.config`.

TODO maybe allow `LOGLOVE_CONFIG` command line parameter and constructor arg.

```
# The config file format is simple.
# Comments are allowed.
No real need for comments to start with #.
Any line that doesn't start with a level in upper case is ignored.

Levels and patterns are separated with an equals sign.

Specify one level per line.

OFF    = /nolog/**
ERROR  = /err/j.s
WARN   = warna warnb /another/patt**ern.js /woo/hoo
INFO   = /server/** /db
DEBUG  = /foo* /bar/*
```

## Multiple log levels

Loglove supports the following four levels only.

* debug
* info
* warn
* error

There is no support for custom level names. But you can easily specify your own
message format function that can output any level names you like.

## Multiple named loggers

The `Loglove.log('/some/log/name')` method returns a singleton (per Loglove
instance) named logger.

Names are matched against glob patterns to determine the logger's level.

You can have as many different loggers as make sense for your appliation, and
you can name them whatever you like.

A common pattern is to name loggers according to the file name.

Assuming a present working directory of `/myapp/`, and assuming the following
statement is in a file located at `/myapp/some/jsfile.js`, the following will
give you a logger named `/some/jsfile.js`.

```javascript
const log = loglove.log(__filename.substring(process.cwd().length));
```

## Custom message formatting

You have full control over log message formatting by passing a custom format
function to Loglove.

The following format function would work nicely with say Docker logging to
syslog since syslog adds the timestamp for you. It's also a nice format for
Splunk because of the clear key value pairs.
http://dev.splunk.com/view/logging-best-practices/SP-CAAADP6

```javascript
const loglove = require('loglove')({
  format: (message, levelName) => {
    return 'level=' + levelName +
      ' logger="' +
      this._name +
      '" ' +
      message +
      '\n';
  }
});
```

## Configurable output stream

You can easily log to file or any output stream you like.  The default output
stream is `stdout`.

**Logging to file**

```javascript
const fs = require('fs');
const loglove = require('loglove')({
  out: fs.createWriteStream('./log/scrub.log')
});
```

**Custom output stream that just adds logs to an array**

```javascript
const Writable = require('stream').Writable;
const util = require('util');
const ArrayAppendingOutputStream = function ArrayAppendingOutputStream() {
  this.messages = [];
  Writable.call(this);
};
util.inherits(ArrayAppendingOutputStream, Writable);
ArrayAppendingOutputStream.prototype._write = function(chunk, encoding, next) {
  this.messages.push(chunk + '');
  next();
};
const myout = new ArrayAppendingOutputStream();
const loglove = require('loglove')({ out: myout })
```

**Logging philosophy**

While Loglove allows you to specify an output stream, we believe it's generally
best to follow the 'Logs are a stream' philosophy.
http://adam.heroku.com/past/2011/4/1/logs_are_streams_not_files

>Logs are a stream, and it behooves everyone to treat them as such. Your programs
should log to stdout and/or stderr and omit any attempt to handle log paths, log
rotation, or sending logs over the syslog protocol. Directing where the
program’s log stream goes can be left up to the runtime container: a local
terminal or IDE (in development environments), an Upstart / Systemd launch
script (in traditional hosting environments), or a system like Logplex/Heroku
(in a platform environment).

Having said that, it's not *always* a bad idea to log to file or some other output
stream.

I just wrote some node scripts to pipeline process thousands of records from
`stdin` to `stdout`. It's certainly nice to get detailed logs about what records
had issues and what the issues were. But obviously I could not send my logs to
`stdout`. So I logged to a file. You may not need Loglove in this case, but it's
an example anyway.

**Multiple output streams**

Loglove supports only one output stream per Loglove instance. If you need
multiple output streams, you can configure multiple Loglove instances.

**Free tip**

Redirect bash script output to syslog.
http://urbanautomaton.com/blog/2014/09/09/redirecting-bash-script-output-to-syslog

## Live reconfiguration

If you want to change log levels without restarting your app you can send a
SIGHUP signal to your app process. On SIGHUP we re-read the config file and make
any changes specified.

Note: Even if your config file has not changed, live reconfiguration may change
log levels because on live reconfig the config file has precedence over
everything else, whereas on app startup the config file is last in precedence.

**Send SIGHUP manually**

```bash
kill -1 MY_PID
```

**Live reconfiguration with consul-template**

You could also use something like https://www.consul.io with
https://github.com/hashicorp/consul-template. consul-template will automatically
detect changes you make to log levels in consul, re-template your config file,
and send SIGHUP to your app. Beautiful!

## Multiple loglove instances

Multiple Loglove instances allow you to log to multiple output streams. There
may be other uses for multiple instances, not sure what they would be.

If you need more than one Loglove instance you will need to specify the name of
each instance as follows.

```javascript
// do this at your app entry point.
const llstdout = require('loglove')({ instanceName: 'harry' });
const llfile = require('loglove')({ instanceName: 'susie', out: myFileOutputStream });

// in the rest of your app get a reference like this.
const stdoutlog = require('loglove').harry.log();
const filelog = require('loglove').susie.log();

stdoutlog.info('wow! i am logging to stdout');
filelog.info('gee! i am logging to a file');
```
