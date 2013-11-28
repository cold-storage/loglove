module.exports = function(grunt) {
  grunt.initConfig({
    clean: {
      files: {
        src: ['doc/']
      }
    },
    shell: {
      doc: {
        command: 'docco -o doc -l classic lib/*.js'
      },
      test: {
        command: 'mocha --recursive --reporter  spec',
        options: {
          stdout: true,
          stderr: true
        }
      }
    },
    open: {
      doc: {
        path: './doc/logger.html',
        app: 'Google Chrome'
      }
    }
  });

  grunt.loadNpmTasks('grunt-shell');
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-open');

  grunt.registerTask('default', ['shell:test']);
  grunt.registerTask('doc', ['clean', 'shell:doc', 'open:doc']);
  grunt.registerTask('docnoopen', ['clean', 'shell:doc']);
};