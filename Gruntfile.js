/* global module */
module.exports = function(grunt) {
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        jshint: {
            files: ['Gruntfile.js', 'src/gallerize.js'],
            options: {
                undef: true,
                unused: true,
                browser: true,
                devel: true,
            },
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
                        ' *\n'+
                        ' * https://github.com/dh4/gallerize.js\n'+
                        ' **/\n'
            },
            build: {
                src: 'src/gallerize.js',
                dest: 'build/gallerize-<%= pkg.version %>.min.js'
            },
        },
        copy: {
            main: {
                src: 'src/gallerize.js',
                dest: 'build/gallerize-<%= pkg.version %>.js',
            },
        },
        compress: {
            main: {
                options: {
                    archive: 'gallerizejs-<%= pkg.version %>.zip'
                },
                files: [
                    {
                        flatten: true,
                        expand: true,
                        src: [
                            'build/gallerize-<%= pkg.version %>.js',
                            'build/gallerize-<%= pkg.version %>.min.js',
                            'LICENSE'
                        ],
                        dest: 'gallerize.js',
                    },
                ],
            },
        },
        jsdoc : {
            dist : {
                src: ['src/*.js'],
                options: {
                    destination: 'doc'
                }
            }
        }
    });

    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-contrib-compress');
    grunt.loadNpmTasks('grunt-jsdoc');
    grunt.registerTask('default', ['jshint']);
    grunt.registerTask('package', ['uglify', 'copy', 'compress']);
};
