(function (api) {
    /*jshint multistr: true */

var loginView, statusView, config;
var me = this;

api.setup({
    "clientId" : "dashboard",
    "config" : {
        "limit" : 1000,
        "startIndex" : 0,
        "maxResults" : 10
    }
});

config = api.model.config;

new api.view.LoginView();

new api.view.StatusView();


/* Project */

// collection view
var projectCollection = new api.view.ProjectCollectionManagementWidget({
    onSelect: function() {
        projectModal.close();
    }
});

var projectModal = new api.view.ModalView({
    view : projectCollection
});

var projectButton = new api.view.ProjectSelectorButton({
    el : '#project'
});

projectButton.$el.click(function() {
    projectModal.render();
});

var projectCreateButton = new api.view.ProjectCreatorButton({
    el : '#project-create'
});


projectCreateButton.$el.click(function() {
    projectModal.render();
    projectModal.view.eventCreate();
});

/* Domain */

// collection view
var domainCollection = new api.view.DomainCollectionManagementWidget({
    onSelect: function() {
        domainModal.close();
    }
});

var domainModal = new api.view.ModalView({
    view : domainCollection
});

var domainButton = new api.view.DomainSelectorButton({
    el : '#domain'
});

domainButton.$el.click(function() {
    domainModal.render();
});

/* Relations Management */
 //var relationCollection = new api.view.RelationCollectionManagementWidget();
 //
 //var relationModal = new api.view.ModalView({
 //    view : relationCollection
 //});
 //
 //var relationButton = new api.view.ButtonView({
 //    el : '#relation',
 //    parent : "Project"
 //});
 //
 //relationButton.$el.click(function() {
 //    relationModal.render();
 //});

/* Bookmark Management */
var bookmarkCollection = new api.view.BookmarkCollectionManagementWidget({
    onSelect: function() {
        bookmarkModal.close();
    }
});

var bookmarkModal = new api.view.ModalView({
    view : bookmarkCollection
});

var bookmarkButton = new api.view.BookmarkSelectorButton({
    el : '#bookmark'
});

bookmarkButton.$el.click(function() {
    bookmarkModal.render();
});

/* end */

new api.view.ShortcutsAdminView({
    el : '#shortcuts',
    onSave : function() {
        $('#shortcutsModal').modal('hide');
    }
});

// new api.view.BookmarksManagementWidget({
//     el : '#bookmark-crud'
// });

/*
 * Controllers
 */

// filters controller
new api.controller.FiltersController();

api.model.login.on('change:login', function(model) {
    // performed when login is updated
    if (model.get("login")) {
        $(".navbar").removeClass("hidden");
        $("#loading").addClass("hidden");
        $("#app-export").removeClass("hidden");
    }
});

api.model.status.on('change', function(model) {
	var error = model.get("error");
	if (error) {
		if (error.canStart) {
			$("#no-connection").addClass("hidden");
			$("#loading").show();
		} else if (error === true) {
			$("#no-connection").removeClass("hidden");
			$("#selectProject").addClass("hidden");
			$("#loading").hide();
		}
	} else {
		$("#no-connection").addClass("hidden");
	}
});

var tableAnalysis = new api.model.AnalysisJob();
var timeAnalysis = new api.model.AnalysisJob();
var exportAnalysis = new api.model.AnalysisJob();

// the main app model
// note model objects references contain oids
var mainModel = new Backbone.Model({
    "timeDimension": null,
    "currentAnalysis" : tableAnalysis,
    "tableAnalysis" : tableAnalysis,
    "timeAnalysis" : timeAnalysis,
    "exportAnalysis" : exportAnalysis
});

config.on("change", function() {
    api.saveState();
    if (! this.hasChanged("configDisplay")) {
    	refreshCurrentAnalysis();
        refreshExportAnalysis();
    }

    if (config.get("project") && config.get("domain")) {
        $("#selectProject").addClass("hidden");
        $("#selectDomain").addClass("hidden");
        $("#main").removeClass("hidden");
    } else if(config.get("project")) {
        $("#selectProject").addClass("hidden");
        $("#selectDomain").removeClass("hidden");
        $("#main").addClass("hidden");
    } else if (! api.model.status.get("error")) {
        $("#selectProject").removeClass("hidden");
        $("#selectDomain").addClass("hidden");
        $("#main").addClass("hidden");
    }
});

var updateRefreshButton = function(analysis) {
    if (analysis.get("status") === "DONE") {
        $("button.refresh-analysis .text").html("Refresh");
        $("button.refresh-analysis i").hide();
        $("button.refresh-analysis i").removeClass("fa-spin");
    } else if (analysis.get("status") === "RUNNING") {
        $("button.refresh-analysis i").show();
        $("button.refresh-analysis .text").html("Refreshing...");
        $("button.refresh-analysis i").addClass("fa-spin");
    } else if (analysis.get("status") === "PENDING") {
        $("button.refresh-analysis i").show();
        $("button.refresh-analysis i").removeClass("fa-spin");
        $("button.refresh-analysis").removeClass("dataUpdated");
        $("button.refresh-analysis .text").html("Preview");
    }
};

tableAnalysis.on("change:status", function() {
    updateRefreshButton(tableAnalysis);
});

timeAnalysis.on("change:status", function() {
    updateRefreshButton(timeAnalysis);
});

$("button.refresh-analysis").click(function(event) {
    event.preventDefault();
    var a = mainModel.get("currentAnalysis");
    compute(a);
});

// Views

userAdminView = new api.view.UsersAdminView({
    el : '#adminDisplay',
    status : api.model.status
});

new api.view.DimensionSelector({
    el : '#origin',
    model : config,
    dimensionIndex: null
});

new api.view.OrderByView({
    el : '#orderby',
    model : config
});

new api.view.DimensionView({
    el : '#dimension',
    model : config,
    selectDimension : false,
});

var tableView = new squid_api.view.DataTableView ({
    el : '#tableView',
    model : tableAnalysis,
    config : config,
    noDataMessage : " ",
    paging : true,
    ordering : true
});

var timeView = new squid_api.view.TimeSeriesView ({
    el : '#timeView',
    model : timeAnalysis,
    multiSeries : true,
    colorPalette : squid_api.view.metadata,
    interpolationRange : 'months',
    staleMessage : "Click preview to update"
});

var displayTypeView = new api.view.DisplayTypeSelectorView({
    el : '#display-selector',
    model : mainModel,
    tableView : tableView,
    timeView : timeView
});

mainModel.on("change:currentAnalysis", function() {
    var a = mainModel.get("currentAnalysis");
    refreshCurrentAnalysis(a);
    if (a) {
        if (a == tableAnalysis) {
            tableView.$el.show();
        } else {
            tableView.$el.hide();
        }
        if (a == timeAnalysis) {
            timeView.$el.show();
        } else {
            timeView.$el.hide();
        }
    }
});

new api.view.CategoricalView({
    el : '#selection',
    filterPanel : '#filters',
    filterSelected : '#selected',
    panelButtons : false,
    config : config,
    popup : true
});

var dateSelectionView = new api.view.DateSelectionWidget({
    el : '#date-picker',
    datePickerPosition : "right",
    ranges : {
        "First Month" : "first-month",
        'Last Month': function(min, max) { return [moment(max).startOf('month'), moment(max).endOf('month')]; }
    }
});

new squid_api.view.DateFilterSelectionWidget({
    el : "#date-selector"
});

new api.view.MetricSelectorView({
    el : '#metric',
    model : config,
    metricIndex: null
});

new api.view.MetricView({
    el : '#total',
    model : config,
    displayMetricValue : false,
    selectMetric : false,
});

var exportView = new api.view.DataExport({
    el : '#export',
    renderTo : '#export-content',
    model : exportAnalysis,
    displayInPopup : true,
    sqlView : true,
    materializeDatasetsView: false
});

// Controllers

var compute = function(analysis) {
    // get rid of previous errors
    api.model.status.set("error", null);
    // compute if the analysis is correct
    if ((analysis.get("facets") && analysis.get("facets").length>0) || (analysis.get("metricList") && analysis.get("metricList").length>0)) {
        api.compute(analysis);
    } else {
        api.model.status.set({"error" : {"reason" : "Please select at least a dimension or a metric"}});
    }
};

var refreshAnalysis = function(a, silent) {
    var changed = false;
    if (a) {
        a.set({"id": {
            "projectId" : config.get("project"),
            "analysisJobId" : a.get("id").analysisJobId
        }}, {
                "silent" : silent
            });
        changed = changed || a.hasChanged();
        a.set({"domains": [{
            "projectId": config.get("project"),
            "domainId": config.get("domain")
        }]}, {
                "silent" : silent
        });

        changed = changed || a.hasChanged();

        // if timeAnalysis, use the date as the default dimension if non already set
        if (a == timeAnalysis) {
        	var selection = config.get("selection");
            if (selection) {
                for (i=0; i<selection.facets.length; i++) {
            		if (selection.facets[i].dimension.type == "CONTINUOUS" && selection.facets[i].dimension.valueType == "DATE") {
            			a.setFacets([selection.facets[i].id], silent);
            			break;
            		}
            	}
            }
        } else {
        	a.setFacets(config.get("chosenDimensions"), silent);
        }
        changed = changed || a.hasChanged();
        a.setMetrics(config.get("chosenMetrics"), silent);
        changed = changed || a.hasChanged();
        a.setSelection(api.model.filters.get("selection"), silent);
        changed = changed || a.hasChanged();
        if (a == tableAnalysis) {
        	a.setParameter("startIndex", config.get("startIndex"));
        	a.setParameter("maxResults", config.get("maxResults"));
        }
        if (a == exportAnalysis) {
            if (config.get("chosenDimensions") && config.get("chosenMetrics")) {
                if (config.get("chosenDimensions").length > 0 || config.get("chosenMetrics").length > 0) {
                    a.set("enabled", true);
                } else {
                    a.set("enabled", false);
                }
            } else if (config.get("chosenDimensions")) {
                if (config.get("chosenDimensions").length > 0) {
                    a.set("enabled", true);
                } else {
                    a.set("enabled", false);
                }
            } else if (config.get("chosenMetrics")) {
                if (config.get("chosenMetrics").length > 0) {
                    a.set("enabled", true);
                } else {
                    a.set("enabled", false);
                }
            }
        }
    }

    return changed;
};

refreshExportAnalysis = function() {
    var a = exportAnalysis;
    var silent = true;
    var changed = refreshAnalysis(a, silent);
    // only trigger change if the analysis has changed
    if (changed) {
        a.trigger("change");
    }
};

var refreshCurrentAnalysis = function() {
    var a = mainModel.get("currentAnalysis");
    if (a) {
        var chosenDimensions = config.get("chosenDimensions");
        var chosenMetrics = config.get("chosenMetrics");
        var orderBy = config.get("orderBy");
        if ((!chosenDimensions || chosenDimensions.length === 0) && (!chosenMetrics || chosenMetrics.length === 0)) {
            $("button.refresh-analysis").prop('disabled', true);
        } else {
            $("button.refresh-analysis").prop('disabled', false);
        }
        var silent = false;
        var changed = refreshAnalysis(a, silent);
        if (a !== timeAnalysis) {
            a.set({"orderBy" : config.get("orderBy")}, {"silent" : silent});
        }
        changed = changed || a.hasChanged();
        a.set({"rollups": config.get("rollups")}, {"silent" : silent});
        changed = changed || a.hasChanged();
        if (a == exportAnalysis || a == timeAnalysis) {
            a.set({"limit": null}, {"silent" : silent});
        } else {
            a.set({"limit": config.get("limit")}, {"silent" : silent});
        }
        changed = changed || a.hasChanged();
        // only trigger change if the analysis has changed
        if (changed) {
            if (a == exportAnalysis) {
                a.trigger("change");
            } else {
                if (a.get("status") !== "RUNNING") {
                    a.set("status", "PENDING");
                }
            }
        }
    }
};

config.on("change:startIndex", function(config) {
    // refresh the tableAnalysis with paginated results
    var a = mainModel.get("tableAnalysis");
    var startIndex = a.getParameter("startIndex");
    if ((startIndex || startIndex === 0) && (startIndex !== config.get("startIndex"))) {
        // update if pagination changed
        a.setParameter("startIndex", config.get("startIndex"));
        a.set("status", "RUNNING");
        squid_api.controller.analysisjob.getAnalysisJobResults(null, a);
    }
});

config.on("change:bookmark", function(config) {
    config.trigger("change:currentAnalysis", config, true);
});

config.on("change:currentAnalysis", function(config, forceRefresh) {
    mainModel.set("currentAnalysis", mainModel.get(config.get("currentAnalysis")));
    if (! config._previousAttributes.currentAnalysis || forceRefresh === true) {
        var canCompute = false;
        if (config.get("chosenDimensions")) {
            if (config.get("chosenDimensions").length > 0) {
                canCompute = true;
            }
        }
        if (config.get("chosenMetrics")) {
            if (config.get("chosenMetrics").length > 0) {
                canCompute = true;
            }
        }
        if (mainModel.get("currentAnalysis")) {
            if (mainModel.get("currentAnalysis").get("status") !== "RUNNING" && canCompute === true) {
                setTimeout(function() {
                    compute(mainModel.get("currentAnalysis"));
                }, 1000);
            }
        }
    }
});

config.on("change", function(config) {
    var me = this;
	var project = config.get("project");
	var domain = config.get("domain");

    setTimeout(function() {
        if (project && domain) {
            if (! config.get("currentAnalysis")) {
                mainModel.set("currentAnalysis", tableAnalysis);
            }
            // Instance the tour
            var tour = new Tour({
                steps: [
                    {
                        element: ".zEWidget-launcher",
                        title: "How to get help",
                        placement: "left",
                        content: "This Help button is available at all times. Use it to browse the documentation and find answers."
                    },
                    {
                        element: "#date-picker",
                        title: "Select date range",
                        content: "This is where you define the date range of your data. If multiple data measures are available, pick one first."
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
                        element: ".menu-link",
                        placement: "right",
                        title: "Management panel",
                        content: "By clicking here you can open the management panel allowing you to manage users & shortcuts.",
                        onPrev: function() {
                            setTimeout(function() {
                                $("#origin button").click();
                            }, 100);
                        }
                    }
                ]
            });

            // Initialize the tour
            tour.init();
            // Start the tour
            tour.start();

            $("#tour").click(function() {
                tour.start(true);
            });

        } else if (! project && ! config.previousAttributes().project && ! me.projectTour) {
            // Instance the tour
            me.projectTour = new Tour({
                backdrop: true,
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
                                if ($(e.target).closest('.popover').length === 0) {
                                    e.data.tour.end();
                                }
                            });
                        }
                    }
                ]});

            // Initialize the tour
            me.projectTour.init();

            // Start the tour
            me.projectTour.start(true);

        } else if (! domain && ! config.previousAttributes().domain && ! me.domainTour) {
            // Instance the tour
            me.domainTour = new Tour({
                backdrop: true,
                steps: [
                    {
                        element: "#domain",
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
                                if ($(e.target).closest('.popover').length === 0) {
                                    e.data.tour.end();
                                }
                            });
                        }
                    }
                ]});

            // Initialize the tour
            me.domainTour.init();

            // Start the tour
            me.domainTour.start(true);
        }
    }, 500);
});

var getOrderByIndex = function() {
    var index;
    if (config.get("chosenDimensions")) {
        index = config.get("chosenDimensions").length;
        var selectedMetric = config.get("selectedMetric");
        var metrics = config.get("chosenMetrics");
        if (metrics && metrics.length > 0) {
            for (i=0; i<metrics.length; i++) {
                if (metrics[i] === selectedMetric) {
                    index += i;
                }
            }
        } else {
            index = index - 1;
        }
    } else {
        index = 0;
    }
    return index;
};

config.on('change:project', function(model) {
    if (model.get("project")) {
        // Make sure loading icon doesn't appear
        $("button.refresh-analysis .glyphicon").removeClass("loading");
    } else {
        // Make sure loading icon doesn't appear
        $("#loading").addClass("hidden");
    }
});

api.model.filters.on('change:selection', function(filters) {
    refreshCurrentAnalysis();
    refreshExportAnalysis();
});

config.on('change:domain', function(model) {
    // manage the workflow guide display
    var domainId = model.get("domain");
    var projectId = model.get("project");
    if (projectId && domainId) {
        $('#main').removeClass("hidden");
        setTimeout(function() {
        if ($(".noDataInTable").length > 0) {
            $(".noDataInTable").typed({
                strings: ["<span style='font-size: 22px'>Welcome to the export app </span> ^1500. <br> A recommended workflow is: ^1000 <br> <br>1. Configure preview in the panel above^1000 <br>2. Click the refresh preview button^1000 <br> 3. Click the export button to export"],
                typeSpeed: 5
            });
        }
        }, 2000);

        // Fade in main
        setTimeout(function() {
            $('#main').fadeIn();
        }, 1000);

    }
});

// Menu State management

$("#app #menu #export-app").click(function() {
    $('#admin').addClass("hidden");
    $('#project').removeClass("hidden");
    userAdminView.remove();
    $('#app-export').removeClass("hidden");
});

$("#app #menu #user-management").click(function() {
    userAdminView.fetchModels();
    $('#admin').removeClass("hidden");
    $('#project').addClass("hidden");
    $('#app-export').addClass("hidden");
});

$("#app #menu #user-management").click(function() {
    userAdminView.fetchModels();
    $('#project').removeClass("hidden");
    $('#admin').removeClass("hidden");
    $('#app-export').addClass("hidden");
});

$("#app #menu #shortcut-management").click(function() {
    $('#shortcutsModal').modal('show');
});

// Trigger Sliding Nav
$('.menu-link').bigSlide();

// Configuration accordion

$(".configuration-hider").click(function() {
	var configDisplay = api.model.config.get("configDisplay");
	var obj = {};
	if (configDisplay) {
		obj.originalHeight = configDisplay.originalHeight;
		if (configDisplay.visible) {
			obj.visible = false;
		} else {
			obj.visible = true;
		}
	} else {
		obj.visible = false;
		obj.originalHeight = $(".configuration").height();
	}
	api.model.config.set("configDisplay", obj);
});

config.on("change:configDisplay", function(model, attribute) {
	if (attribute.visible) {
		$(".configuration-hider").removeClass("closed");
		$(".configuration").animate({opacity: 1});
		$(".configuration").animate({height:attribute.originalHeight + "px"}, function() {
			$(".configuration").removeClass("closed");
		});
	} else {
		$(".configuration-hider").addClass("closed");
		$(".configuration").addClass("closed");
		$(".configuration").animate({opacity: 0});
		$(".configuration").animate({height:"10px"});
	}
});


/*
* Start the App
*/
api.init();

})(squid_api);
