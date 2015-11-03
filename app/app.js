(function (api) {

var loginView, statusView, config;
var me = this;

api.setup({
    "clientId" : "dashboard",
    "config" : {
        "orderBy" : [{"col":0, "direction":"DESC"}],
        "limit" : 1000,
        "startIndex" : 0,
        "maxResults" : 10
    }
});

config = api.model.config;

new api.view.LoginView();

new api.view.StatusView();

var projectSelect = new api.view.ProjectManagementWidget({
    el : '#project'
});

var projectCreate = new api.view.ProjectManagementWidget({
    el : '#project-create',
    createOnlyView : true
});

var domainSelect = new api.view.DomainManagementWidget({
    el : '#domain'
});

new api.view.ShortcutsAdminView({
    el : '#shortcuts',
    onSave : function() {
        $('#shortcutsModal').modal('hide');
    }
});

/*
 * Controllers
 */

// filters controller
new api.controller.FiltersContoller({
    onChangeHandler : function(selection, timeFacet) {
        // apply to main filters
        api.controller.facetjob.compute(api.model.filters, selection);
    }
});

api.model.login.on('change:login', function(model) {
    // performed when login is updated
    if (model.get("login")) {
        $(".navbar").removeClass("hidden");
        $("#loading").addClass("hidden");
        $("#app-export").removeClass("hidden");
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
    refreshCurrentAnalysis();
    refreshExportAnalysis();

    if (config.get("project") && config.get("domain")) {
        $("#selectProject").addClass("hidden");
        $("#selectDomain").addClass("hidden");
        $("#main").removeClass("hidden");
    } else if(config.get("project")) {
        $("#selectProject").addClass("hidden");
        $("#selectDomain").removeClass("hidden");
        $("#main").addClass("hidden");
    } else {
        $("#selectProject").removeClass("hidden");
        $("#selectDomain").addClass("hidden");
        $("#main").addClass("hidden");
    }
});

var updateRefreshButton = function(analysis) {
    if (analysis.get("status") === "DONE") {
        $("button.refresh-analysis .text").html("Refresh");
        $("button.refresh-analysis .glyphicon").hide();
        $("button.refresh-analysis .glyphicon").removeClass("loading");
    } else if (analysis.get("status") === "RUNNING") {
        $("button.refresh-analysis .glyphicon").show();
        $("button.refresh-analysis .text").html("Refreshing...");
        $("button.refresh-analysis .glyphicon").addClass("loading");
    } else if (analysis.get("status") === "PENDING") {
        $("button.refresh-analysis .glyphicon").show();
        $("button.refresh-analysis .glyphicon").removeClass("loading");
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

new api.view.DisplayTypeSelectorView({
    el : '#display-selector',
    model : mainModel,
    tableView : tableView,
    timeView : timeView
});

mainModel.on("change:currentAnalysis", function() {
    var a = mainModel.get("currentAnalysis");
    refreshCurrentAnalysis(a);
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
});

new api.view.CategoricalView({
    el : '#selection',
    filterPanel : '#filters',
    filterSelected : '#selected',
    panelButtons : false,
    config : config,
    popup : true
});

new api.view.DateSelectionWidget({
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
    displayInAccordion : true,
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
    if (a == timeAnalysis && config.get("chosenDimensions").length === 0) {
    	var selection = config.get("selection");
    	for (i=0; i<selection.facets.length; i++) {
    		if (selection.facets[i].dimension.type == "CONTINUOUS" && selection.facets[i].dimension.valueType == "DATE") {
    			a.setFacets([selection.facets[i].id], silent);
    			break;
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
    a.set({"orderBy" : config.get("orderBy")}, {"silent" : silent});
    changed = changed || a.hasChanged();
    a.set({"rollups": config.get("rollups")}, {"silent" : silent});
    changed = changed || a.hasChanged();
    if (a == exportAnalysis) {
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
            a.set("status", "PENDING");
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

// listen to orderBy widget
config.on("change:selectedMetric", function(config) {
    var orderBy = config.get("orderBy")[0];
    config.set("orderBy", [{"col" : getOrderByIndex(), "direction" : orderBy.direction}]);
});

config.on("change:chosenDimensions", function(config) {
    var orderBy = config.get("orderBy")[0];
    config.set("orderBy", [{"col" : getOrderByIndex(), "direction" : orderBy.direction}]);
});

config.on("change:chosenMetrics", function(config) {
    var orderBy = config.get("orderBy")[0];
    config.set("orderBy", [{"col" : getOrderByIndex(), "direction" : orderBy.direction}]);
});

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
