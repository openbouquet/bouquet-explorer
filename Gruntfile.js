module.exports = function(grunt) {
    grunt.initConfig({
        jshint : {
            all : [ 'app/**/*.js' ],
            options: {
                force : true
            }
        },
        sass: {
            dist: {
                files: {
                    'dist/app/style.css': 'app/style.scss'
                },
                options: {
                    sourcemap: 'none',
                    style: 'compressed'
                }
            }
        },
        clean : {
            all : "dist/"
        },
        handlebars : {
            options : {
                namespace : 'app.template',
                processName : function(filePath) {
                    return filePath.replace(/^app\/templates\//, '').replace(
                            /\.hbs$/, '');
                }
            },
            all : {
                files : {
                    "dist/templates.js" : [ "app/templates/*.hbs" ]
                }
            }
        },
        concat : {
            options : {
                stripBanners : true,
            },
            all : {
                src : [ 'dist/templates.js', 'app/config/base-setup.js', 'app/config/api-setup.js', 'app/models/*.js', 'app/views/*.js', 'app/controllers/*.js', 'app/*.js' ],
                dest : 'dist/main.js',
            }
        },
        copy : {
            main : {
                files : [ {
                    expand : true,
                    src : [ "app/main.js", "*.html", "app/fonts/**",  "bower_components/font-awesome/fonts/*", "bower_components/bootstrap/dist/fonts/*" ],
                    dest : 'dist/',
                    rename : function(dest, src) {
                        return dest + src.replace(/\.template.html$/, ".html");
                    }
                } ]
            }
        },
        wiredep : {
            target : {
                src : [ 'dist/index.html' ],
                ignorePath : '../'
            }
        },
        wiredepCopy : {
            target : {
                options : {
                    src : 'bower_components',
                    dest : 'dist/bower_components',
                    wiredep : {
                        src : [ 'dist/index.html' ],
                        ignorePath : '../'
                    }
                }
            },
        },
        watch : {
            js : {
                files : [ 'app/**/*.js', 'app/**/*.hbs', 'index.template.html', 'app/style.scss' ],
                tasks : [ 'default', 'sass' ]
            }
        }
    });
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-sass');
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-handlebars');
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-wiredep');
    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-wiredep-copy');

    grunt.registerTask('fast', [ 'handlebars', 'concat', 'copy', 'sass' ]);
    grunt.registerTask('build', [ 'jshint',  'clean', 'handlebars', 'concat',
                                    'copy', 'sass', 'wiredep', 'wiredepCopy' ]);
    grunt.registerTask('default', [ 'build' ]);
};
