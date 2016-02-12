#!/usr/bin/env node

const log = require('./')({
  config: {
    OFF: '**'
  }
}).log();

console.log(log + '');

log.debug('hello there!!!');