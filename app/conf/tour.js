/*jshint multistr: true */
(function (root, factory) {
    root.squid_api.view.TourGuide = factory(root.Backbone, root.squid_api);

}(this, function (Backbone, squid_api) {
    var View = Backbone.View.extend({

        initialize: function(options) {
            this.config = squid_api.model.config;
            this.listenTo(this.config,"change", this.render);
        },

        triggerMainTour: function() {
            this.mainTour.start(true);
        },

        projectGuide: function() {
            // Instance the tour
            this.projectTour = new Tour({
                storage: false,
                steps: [
                    {
                        element: "#project",
                        title: "Welcome!",
                        template: "<div class='popover tour'>\
                        <div class='arrow'></div>\
                        <h3 class='popover-title'></h3>\
                        <div class='popover-content'></div>\
                        <div class='popover-navigation'>\
                        </div>",
                        placement: "bottom",
                        content: "Click the button above to select your project <i> (we don't bite) </i>",
                        onShow: function(tour) {
                            $('body').click({tour: tour}, function (e) {
                                if ($(e.target).closest('.popover').length === 0 && $(e.target).parents().hasClass("project")) {
                                    e.data.tour.end();
                                }
                            });
                        }
                    }
                ]});

            // Initialize the tour
            this.projectTour.init();

            // Start the tour
            this.projectTour.start();
        },

        domainGuide: function() {
            // Instance the tour
            this.domainTour = new Tour({
                storage: false,
                steps: [
                    {
                        element: "#domain-bookmark",
                        title: "Almost there...",
                        template: "<div class='popover tour'>\
                        <div class='arrow'></div>\
                        <h3 class='popover-title'></h3>\
                        <div class='popover-content'></div>\
                        <div class='popover-navigation'>\
                        </div>",
                        placement: "bottom",
                        content: "“That’s one small step for man, one giant leap for mankind,” - just choose a domain then you're in! ",
                        onShow: function(tour) {
                            $('body').click({tour: tour}, function (e) {
                                if ($(e.target).closest('.popover').length === 0 && ($(e.target).parents().hasClass("domain") || $(e.target).parents().hasClass("bookmark"))) {
                                    e.data.tour.end();
                                }
                            });
                        }
                    }
                ]});

            // Initialize the tour
            this.domainTour.init();

            // Start the tour
            this.domainTour.start(true);
        },

        mainGuide: function() {
            var me = this;
            var tourSeen = this.config.get("tourSeen");

            // Instance the tour
            this.mainTour = new Tour({
                storage: false,
                onEnd: function() {
                    me.config.set("tourSeen", true);
                },
                steps: [
                    {
                        element: "#date-picker",
                        title: "Select date range",
                        onShow: function (tour) {
                            var selection = me.config.get("selection");
                            var dateFound = false;
                            if (selection) {
                                if (selection.facets) {
                                    var facets = selection.facets;
                                    for (i=0; i<facets.length; i++) {
                                        if (facets[i].dimension.type == "CONTINUOUS" && facets[i].dimension.valueType == "DATE") {
                                            dateFound = true;
                                            this.content = "This is where you define the date range of your data. If multiple data measures are available, pick one first.";
                                        }
                                    }
                                    if (! dateFound) {
                                        this.content = "This is where you define the date range of your data. Looks like we can't find a date column within your dataset to use. One will have to be defined, but we'll look into this later.";
                                    }
                                }
                            }
                        }
                    },
                    {
                        element: "#selection",
                        title: "Filter your data",
                        content: "This is where you can filter your data. First pick a filter, then search the values you want to filter on. Remember to index the dimension first."
                    },
                    {
                        element: "#metric",
                        placement: "bottom",
                        title: "Add columns to your data set",
                        content: "Pick from the available dimensions and metrics to add columns to your data. You can reorder the dimensions with a simple drag & drop.",
                        onNext: function() {
                            setTimeout(function() {
                                $("#origin button").click();
                            }, 100);
                        }
                    },
                    {
                        element: "#origin",
                        placement: "bottom",
                        title: "Edit the datamodel",
                        content: "By clicking the Configure icon after clicking on one of the buttons, you can choose to index dimensions, create new metrics and manage relations between domains."
                    },
                    {
                        element: ".zEWidget-launcher",
                        title: "How to get help",
                        placement: "left",
                        content: "This Help button is available at all times. Use it to browse the documentation and find answers."
                    }
                ]
            });

            // Initialize the tour
            this.mainTour.init();
            // Start the tour
            if (! this.tourSeen) {
                squid_api.getSelectedDomain().then(function(domain) {
                    if (domain.get("_role") !== "OWNER") {
                        // by default only start the tour if user isn't an admin
                        me.mainTour.start(true);
                    }
                });
            }
        },

        render: function() {
            var me = this;

            var project = this.config.get("project");
            var domain = this.config.get("domain");

            if (project && domain && ! this.mainTour) {
                this.mainGuide();
            } else if (! project && ! this.config.previousAttributes().project && ! this.projectTour) {
                this.projectGuide();

            } else if (! domain && ! this.config.previousAttributes().domain && ! this.domainTour) {
                this.domainGuide();
            }

            return this;
        }
    });

    return View;
}));
