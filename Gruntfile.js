module.exports = function (grunt) {
    grunt
        .initConfig({
            connect: {
                server: {
                    options: {
                        port: 9000,
                        hostname: 'localhost',
                    }
                }
            },
            jshint: {
                all: ['app/**/*.js'],
                options: {
                    force: true
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
            clean: {
                all: "dist/"
            },
            handlebars: {
                options: {
                    namespace: 'app.template',
                    processName: function (filePath) {
                        return filePath.replace(/^app\/templates\//, '')
                            .replace(/\.hbs$/, '').replace(/^.*\//, '');
                    }
                },
                all: {
                    files: {
                        "dist/templates.js": ["app/templates/*.hbs"]
                    }
                }
            },
            concat: {
                options: {
                    stripBanners: true,
                },
                all: {
                    src: ['dist/templates.js',
                        'app/config/base-setup.js',
                        'app/config/api-setup.js', 'app/models/*.js',
                        'app/views/*.js', 'app/controllers/*.js',
                        'app/conf/*.js', 'app/*.js'],
                    dest: 'dist/app.js',
                }
            },
            copy: {
                main: {
                    files: [{
                        expand: true,
                        src: [
                            "app/app.js",
                            "*.html",
                            "app/conf/*.js",
                            "app/fonts/**",
                            "app/img/**",
                            "bower_components/font-awesome/fonts/*",
                            "bower_components/data_tables/media/images/*",
                            "bower_components/bootstrap/dist/fonts/*",
                            "bower_components/backbone-forms/distribution/**",
                            "bower_components/backbone.bootstrap-modal/**"],
                        dest: 'dist/',
                        rename: function (dest, src) {
                            return dest
                                + src.replace(/\.template.html$/,
                                    ".html");
                        }
                    }]
                }
            },
            wiredep: {
                target: {
                    src: ['dist/index.html'],
                    ignorePath: '../'
                }
            },
            wiredepCopy: {
                dist: {
                    options: {
                        src: 'bower_components',
                        dest: 'dist/bower_components',
                        wiredep: {
                            src: ['dist/index.html'],
                            ignorePath: '../'
                        }
                    }
                },
                dev: {
                    options: {
                        src: 'bower_components',
                        dest: 'dist/bower_components',
                        wiredep: {
                            overrides: {
                                squid_api: {
                                    main: [
                                        'src/squid_api_core.js',
                                        'src/squid_api_models.js',
                                        'src/squid_api_utils.js',
                                        'src/squid_api_analysisjob_controller.js',
                                        'src/squid_api_facetjob_controller.js']
                                },
                                squid_api_data_widgets: {
                                    main: [
                                        "build/templates.js",
                                        "src/squid_api_datatable_widget.js",
                                        "src/squid_api_dimension_widget.js",
                                        "src/squid_api_displaytype_selector_widget.js",
                                        "src/squid_api_domain_selector_widget.js",
                                        "src/squid_api_export_scheduler_widget.js",
                                        "src/squid_api_export_widget.js",
                                        "src/squid_api_materialize_widget.js",
                                        "src/squid_api_saveastable_widget.js",
                                        "src/squid_api_saveasdomain_widget.js",
                                        "src/squid_api_saveonspark_widget.js",
                                        "src/squid_api_filters_controller.js",
                                        "src/squid_api_kpi_widget.js",
                                        "src/squid_api_metric_total_widget.js",
                                        "src/squid_api_metric_widget.js",
                                        "src/squid_api_orderby_widget.js",
                                        "src/squid_api_project_selector_widget.js",
                                        "src/squid_api_simple_export_widget.js",
                                        "src/squid_api_analysis_controller.js",
                                        "src/squid_api_timeseries_widget.js",
                                        "src/squid_api_barchart_widget.js",
                                        "src/squid_api_datatable_widget.css",
                                        "src/squid_api_dimension_widget.css",
                                        "src/squid_api_displaytype_selector_widget.css",
                                        "src/squid_api_export_scheduler_widget.css",
                                        "src/squid_api_export_widget.css",
                                        "src/squid_api_metric_widget.css",
                                        "src/squid_api_orderby_widget.css",
                                        "src/squid_api_timeseries_widget.css",
                                        "src/squid_api_barchart_widget.css",
                                        "src/squid_api_materialize_widget.css",
                                        "src/squid_api_saveastable_widget.css",
                                        "src/squid_api_saveasdomain_widget.css",
                                        "src/squid_api_saveonspark_widget.css",
                                    ]
                                },
                                squid_api_filters_widget: {
                                    main: [
                                        "build/templates.js",
                                        "src/squid_api_dialog_extension.js",
                                        "src/squid_api_filters_categorical_widget.js",
                                        "src/squid_api_filters_categorical_facet_view.js",
                                        "src/squid_api_filters_date_filter_selection_widget.js",
                                        "src/squid_api_filters_categorical_paging_view.js",
                                        "src/squid_api_filters_date_selection_widget.js",
                                        "src/squid_api_filters_categorical_selected_view.js",
                                        "src/squid_api_filters_segment_widget.js",
                                        "src/squid_api_filters_categorical_selector_view.js",
                                        "src/squid_api_selection_widget.js",
                                        "src/squid_api_filters_categorical_view.js",
                                        "dist/squid_api_filters-widgets.css"
                                    ]
                                },
                                squid_api_admin_widgets: {
                                    main: [
                                        "build/templates.js",
                                        "src/squid_api_base_collection_management_widget.js",
                                        "src/squid_api_base_model_management_widget.js",
                                        "src/squid_api_bookmark_collection_management.js",
                                        "src/squid_api_bookmark_model_management_widget.js",
                                        "src/squid_api_bookmark_selector_button.js",
                                        "src/squid_api_collection_selector_utils.js",
                                        "src/squid_api_columns_management_widget.js",
                                        "src/squid_api_columns_model_management_widget.js",
                                        "src/squid_api_core_admin.js",
                                        "src/squid_api_dimension_columns_manangement_widget.js",
                                        "src/squid_api_dimension_model_management_widget.js",
                                        "src/squid_api_dimension_selector_widget.js",
                                        "src/squid_api_domain_collection_management_widget.js",
                                        "src/squid_api_domain_selector_button.js",
                                        "src/squid_api_metric_collection_widget.js",
                                        "src/squid_api_metric_columns_management_widget.js",
                                        "src/squid_api_metric_selector_widget.js",
                                        "src/squid_api_modal_view.js",
                                        "src/squid_api_project_collection_management_widget.js",
                                        "src/squid_api_project_creator_button.js",
                                        "src/squid_api_project_model_management_widget.js",
                                        "src/squid_api_project_selector_button.js",
                                        "src/squid_api_relation_collection_management_widget.js",
                                        "src/squid_api_relation_model_management_widget.js",
                                        "src/squid_api_shortcuts_admin_widget.js",
                                        "src/squid_api_users_admin_widget.js",
                                        "src/squid_api_base_collection_management_widget.css",
                                        "src/squid_api_base_model_management_widget.css",
                                        "src/squid_api_button_view.css",
                                        "src/squid_api_columns_management_widget.css",
                                        "src/squid_api_dimension_selector_widget.css",
                                        "src/squid_api_domain_collection_management_widget.css",
                                        "src/squid_api_metric_selector_widget.css",
                                        "src/squid_api_modal_view.css",
                                        "src/squid_api_project_collection_management_widget.css",
                                        "src/squid_api_relation_collection_management_widget.css",
                                        "src/squid_api_relation_model_management_widget.css",
                                        "src/squid_api_users_admin_widget.css"

                                    ]
                                },
                                squid_api_core_widgets: {
                                    main: ["build/templates.js",
                                        "src/squid_api_login.js",
                                        "src/squid_api_pagination.js",
                                        "src/squid_api_selector.js",
                                        "src/squid_api_status.js",
                                        "src/squid_api_switch.js",
                                        "src/squid_api_status.css",]
                                },
                            },
                            src: ['dist/index.html'],
                            ignorePath: '../'
                        }
                    }
                }
            },

            // only used for dev anyway. adding the bower components in the
            // watch list
            watch: {
                js: {
                    files: ['app/**/*.js', 'app/**/*.hbs',
                        'index.template.html', 'app/style.scss',
                        "bower_components/squid_api*/src/*.js",
                        "bower_components/squid_api*/src/*.css",
                        "bower_components/squid_api*/src/*.hbs"],
                    tasks: ['dev']
                }
            },
            cacheBust: {
                options: {
                    encoding: 'utf8',
                    algorithm: 'md5',
                    length: 8,
                    deleteOriginals: true,
                    ignorePatterns: ["main.js"]
                },
                assets: {
                    files: [{
                        src: ['dist/index.html']
                    }]
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
    grunt.loadNpmTasks('grunt-cache-bust');
    grunt.loadNpmTasks('grunt-contrib-connect');

    grunt.registerTask('build', ['jshint', 'clean', 'handlebars', 'concat',
        'copy', 'sass', 'wiredep']);

    grunt.registerTask('dev', ['build', 'wiredepCopy:dev', 'cacheBust']);

    grunt.registerTask('dist', ['build', 'wiredepCopy:dist', 'cacheBust']);

    grunt.registerTask('default', ['dist']);
};
