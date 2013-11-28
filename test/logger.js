var loglove = require('../lib/loglove'),
log = loglove.getLog(__filename);

describe('loglove.js', function() {

  describe('foo', function() {

    before(function() {
      loglove.setFormatter(function(name, msg, level) {
        return 'custom formatter ' + name + ' ' + level + ' ' + msg;
      });
    });

    it('will do stoof', function() {

      log.emergency('some message %s %j', 'param 1', {foo:'bar'});
      log.alert('some message %s %j', 'param 1', {foo:'bar'});
      log.critical('some message %s %j', 'param 1', {foo:'bar'});
      log.error('some message %s %j', 'param 1', {foo:'bar'});
      log.warning('some message %s %j', 'param 1', {foo:'bar'});
      log.notice('some message %s %j', 'param 1', {foo:'bar'});
      log.info('some message %s %j', 'param 1', {foo:'bar'});
      log.debug('some message %s %j', 'param 1', {foo:'bar'});
    });
  });
});