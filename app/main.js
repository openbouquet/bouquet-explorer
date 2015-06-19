var api = squid_api, loginView, statusView, config;

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
        if (timeFacet && (timeFacet.selectedItems.length === 0) && (timeFacet.items.length > 0)) {
            // set date range to -30 days
            var startDate = moment.utc(timeFacet.items[0].upperBound);
            startDate = moment(startDate).subtract(30, 'days');
            timeFacet.selectedItems = [ {
                        "type" : "i",
                        "lowerBound" : startDate.format("YYYY-MM-DDTHH:mm:ss.SSSZZ"),
                        "upperBound" : timeFacet.items[0].upperBound
                    }];
        }
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
var exportAnalysis = new api.model.AnalysisJob();

// the main app model
// note model objects references contain oids
var mainModel = new Backbone.Model({
    "timeDimension": null,
    "tableAnalysis" : tableAnalysis,
    "exportAnalysis" : exportAnalysis
});

config.on("change", function() {
    api.saveState();
    refreshExportAnalysis();
    refreshTableAnalysis();

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

tableAnalysis.on("change:status", function() {
    if (tableAnalysis.get("status") == "DONE") {
        $("button.refresh-analysis .text").html("Preview up to date");
        $("button.refresh-analysis .glyphicon").hide();
        $("button.refresh-analysis .glyphicon").removeClass("loading");
    } else if (tableAnalysis.get("status") == "RUNNING") {
        $("button.refresh-analysis .glyphicon").show();
        $("button.refresh-analysis .text").html("Refreshing...");
        $("button.refresh-analysis .glyphicon").addClass("loading");
    } else if (tableAnalysis.get("status") == "PENDING") {
        $("button.refresh-analysis .glyphicon").show();
        $("button.refresh-analysis .glyphicon").removeClass("loading");
        $("button.refresh-analysis").removeClass("dataUpdated");
        $("button.refresh-analysis .text").html("Refresh Preview");
    }
});

$("button.refresh-analysis").click(function(event) {
    event.preventDefault();
    compute(tableAnalysis);
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
    selectMetricHeader : false,
    searching : true,
    noDataMessage : " ",
    paging : true,
    ordering : false
});

new api.view.CategoricalView({
    el : '#selection',
    filterPanel : '#filters',
    filterSelected : '#selected',
    panelButtons : false,
    config : config,
    popup : false
});

new api.view.PeriodSelectionView({
    el : '#date',
    datePickerPosition : "right",
    refreshOnChange : false,
    ranges : {
        "First Month" : "first-month",
        'Last Month': function(min, max) { return [moment(max).startOf('month'), moment(max).endOf('month')]; }
    }
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
    a.setFacets(config.get("chosenDimensions"), silent);
    changed = changed || a.hasChanged();
    a.setMetrics(config.get("chosenMetrics"), silent);
    changed = changed || a.hasChanged();
    a.setSelection(api.model.filters.get("selection"), silent);
    changed = changed || a.hasChanged();
    return changed;
};

var refreshExportAnalysis = function() {
    var a = mainModel.get("exportAnalysis");
    var silent = true;
    var changed = refreshAnalysis(a, silent);
    a.set({"orderBy" : null}, {"silent" : silent});
    changed = changed || a.hasChanged();
    a.set({"limit": null}, {"silent" : silent});
    changed = changed || a.hasChanged();
    // only trigger change if the analysis has changed
    if (changed) {    
        a.trigger("change");
    }
};

var refreshTableAnalysis = function() {
    var a = mainModel.get("tableAnalysis");
    var chosenDimensions = config.get("chosenDimensions");
    var chosenMetrics = config.get("chosenMetrics");
    if ((!chosenDimensions || chosenDimensions.length === 0) && (!chosenMetrics || chosenMetrics.length === 0)) {
        $("button.refresh-analysis").prop('disabled', true);
    } else {
        $("button.refresh-analysis").prop('disabled', false);
    }
    var silent = false;
    var recompute = false;
    var changed = refreshAnalysis(a, silent);
    a.set({"orderBy" : config.get("orderBy")}, {"silent" : silent});
    changed = changed || a.hasChanged();
    a.set({"limit": config.get("limit")}, {"silent" : silent});
    changed = changed || a.hasChanged();
    a.set({"rollups": config.get("rollups")}, {"silent" : silent});
    changed = changed || a.hasChanged();
    // handle the pagination parameters
    var startIndex = a.getParameter("startIndex");
    if ((startIndex || startIndex === 0) && (startIndex !== config.get("startIndex"))) {      
        // force analysis recompute if pagination
        recompute = true;
    }
    a.setParameter("startIndex", config.get("startIndex"));
    a.setParameter("maxResults", config.get("maxResults"));
    if (recompute) {
        compute(a);
    } else {
        // only trigger change if the analysis has changed
        if (changed) {
            a.set("status", "PENDING");
        }
    }
};

var getOrderByIndex = function() {
    var index;
    if (config.get("chosenDimensions")) {
        index = config.get("chosenDimensions").length;
        var selectedMetric = config.get("selectedMetric");
        var metrics = config.get("chosenMetrics");
        if (metrics) {
            for (i=0; i<metrics.length; i++) {
                if (metrics[i] === selectedMetric) {
                    index += i;
                }
            }
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
    refreshExportAnalysis();
    refreshTableAnalysis();
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

/*
* Start the App
*/
api.init();
