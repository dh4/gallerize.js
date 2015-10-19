module.exports = function(grunt) {
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        jshint: {
            files: ['Gruntfile.js', 'src/<%= pkg.name %>.js'],
            options: {
                globals: {
                    jQuery: true
                }
            }
        },
        watch: {
            files: ['<%= jshint.files %>'],
            tasks: ['jshint']
        },
        uglify: {
            options: {
                banner: '/**\n'+
                        ' * <%= pkg.name %> <%= pkg.version %>\n'+
                        ' * Copyright (c) 2015, Dan Hasting\n'+
                        ' * All rights reserved.\n'+
                        ' **/\n'
            },
            build: {
                src: 'src/<%= pkg.name %>.js',
                dest: 'min/<%= pkg.name %>.min.js'
            }
        }
    });

    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.registerTask('default', ['jshint', 'uglify']);
};
