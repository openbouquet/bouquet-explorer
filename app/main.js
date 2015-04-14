var api = squid_api, loginView, statusView, config;

var me = this;

api.setup({
    "clientId" : "dashboard",
    "filtersDefaultEvents" : false,
    "config" : {
        "orderByDirection" : "DESC",
        "limit" : 1000
    }
});

config = api.model.config;

new api.view.LoginView({
    el : '#login',
    autoShow : true
});

new api.view.StatusView({
    el : '#status'
});

var projects = new api.model.ProjectCollection();

new api.view.ProjectSelector({
    el : '#project',
    model : config,
    projects : projects,
    onChangeHandler : function(event) {
        var selectedOid = event.target.value || null;
        config.set({
            "project" : selectedOid,
            "domain" : null
        });
    }
});

new api.view.DomainSelector({
    el : '#domain',
    model : config,
    onChangeHandler : function(event) {
        var selectedOid = event.target.value || null;
        config.set({
            "domain" : selectedOid,
            "chosenDimensions" : null,
            "selectedDimension" : null,
            "chosenMetrics" : null,
            "selectedMetric" : null
        });
    }
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

api.model.login.on('change:login', function(model) {
    // performed when login is updated
    if (model.get("login")) {
        $(".navbar").removeClass("hidden");
        
        //init the projects
        projects.addParameter("deepread","1");
        projects.fetch({
            success : function(model, response) {
                $("#loading").addClass("hidden");
                $("#app-export").removeClass("hidden");
                console.log(model);
            },
            error : function(model, response) {
                $("#loading").addClass("hidden");
                console.log(model);
            }
        });
    }
});

var tableAnalysis = new api.model.AnalysisJob();
var exportAnalysis = new api.model.AnalysisJob();

// the main app model
// note model objects references contain oids
var mainModel = new Backbone.Model({
    "timeDimension": null,
    "tableAnalysis" : tableAnalysis,
    "exportAnalysis" : exportAnalysis,
    "analysisRefreshNeeded" : false,
    "refreshButtonPressed" : false
});

config.on("change", function() {
    me.saveState();
    refreshExportAnalysis();
    refreshTableAnalysis();
});

tableAnalysis.on("change", function() {
    if (!me.mainModel.get("analysisRefreshNeeded")) {
        if (tableAnalysis.get("status") == "DONE") {
            $("button.refresh-analysis .text").html("Preview up to date");
            $("button.refresh-analysis .glyphicon").hide();
            $("button.refresh-analysis .glyphicon").removeClass("loading");
        } else if (tableAnalysis.get("status") == "RUNNING") {
            $("button.refresh-analysis .glyphicon").show();
            $("button.refresh-analysis .text").html("Refreshing...");
            $("button.refresh-analysis .glyphicon").addClass("loading");
        }
    }
});

mainModel.on("change:analysisRefreshNeeded", function() {
    if (me.mainModel.get("analysisRefreshNeeded")) {
        // Dom manipulations
        $("button.refresh-analysis .glyphicon").show();
        $("button.refresh-analysis .glyphicon").removeClass("loading");
        $("button.refresh-analysis").removeClass("dataUpdated");
        $("button.refresh-analysis .text").html("Refresh Preview");
    } else {
        // Dom manipulations
        $("button.refresh-analysis").addClass("dataUpdated");
        $("button.refresh-analysis .glyphicon").removeClass("loading");
    }
});

$("button.refresh-analysis").click(function(event) {
    event.preventDefault();
    me.mainModel.set("refreshButtonPressed", true);
    me.mainModel.set("analysisRefreshNeeded", false);
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
    mainModel : mainModel,
    config : config,
    selectMetricHeader : false,
    searching : false,
    noDataMessage : " ",
    paging : true,
    ordering : true,
    reactiveState : true,
    reactiveMessage : "<i class='fa fa-table'></i><br>Click refresh to update",
});

new api.view.CategoricalView({
    el : '#selection',
    filterPanel : '#filters',
    filterSelected : '#selected',
    panelButtons : false
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

var refreshExportAnalysis = function() {
    var a = mainModel.get("exportAnalysis");
        var silent = true;
        var changed = false;
    a.setProjectId(config.get("project"));
    changed = changed || a.hasChanged();
    a.setDomainIds([config.get("domain")]);
    changed = changed || a.hasChanged();
        a.setFacets(config.get("chosenDimensions"), silent);
        changed = changed || a.hasChanged();
    a.setMetrics(config.get("chosenMetrics"), silent);
        changed = changed || a.hasChanged();
        a.set({"orderBy" : null}, {"silent" : silent});
        changed = changed || a.hasChanged();
        a.set({"limit": null}, {"silent" : silent});
        changed = changed || a.hasChanged();
        a.setSelection(api.model.filters.get("selection"), silent);
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
        var silent = true;
        var changed = false;
    a.setProjectId(config.get("project"));
    changed = changed || a.hasChanged();
    a.setDomainIds([config.get("domain")]);
    changed = changed || a.hasChanged();
        a.setFacets(chosenDimensions, silent);
        changed = changed || a.hasChanged();
    a.setMetrics(config.get("chosenMetrics"), silent);
        changed = changed || a.hasChanged();
        a.set({"orderBy" : [{"col" : getOrderByIndex() , "direction" : config.get("orderByDirection")}]}, {"silent" : silent});
        changed = changed || a.hasChanged();
        a.set({"limit": config.get("limit")}, {"silent" : silent});
        changed = changed || a.hasChanged();
    a.set({"rollups": config.get("rollups")}, {"silent" : silent});
    changed = changed || a.hasChanged();
        a.setSelection(api.model.filters.get("selection"), silent);
        changed = changed || a.hasChanged();
        // only trigger change if the analysis has changed
        if (changed) {
            me.mainModel.set("analysisRefreshNeeded", true);
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

config.on('change:project', function(model) {
    if (model.get("project")) {
        $("#selectProject").addClass("hidden");
        // Make sure loading icon doesn't appear
        $("button.refresh-analysis .glyphicon").removeClass("loading");
    } else {
        $("#selectProject").removeClass("hidden");
        $("#selectDomain").addClass("hidden");
        // Make sure loading icon doesn't appear
        $("button.refresh-analysis .glyphicon").removeClass("loading");
    }
});

var saveState = function() {
    api.saveState();
};

api.model.filters.on('change:selection', function() {
    me.saveState();
    refreshExportAnalysis();
    refreshTableAnalysis();
});

var updateFilters = function(filters, timeFacet) {
    if (timeFacet && (timeFacet.selectedItems.length === 0)) {
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
    api.model.filters.set("id", filters.get("id"));
    api.controller.facetjob.compute(api.model.filters, filters.get("selection"));
};

config.on('change:domain', function(model) {
    var domainId = model.get("domain");
    var projectId = model.get("project");
    
    if (model.get("domain")) {
        $("#selectDomain").addClass("hidden");
    } else {
        $("#selectDomain").removeClass("hidden");
    }
    
    if (projectId && domainId) {
        $('#main').removeClass("hidden");
        var domainPk = {
                "projectId" : projectId,
                "domainId" : domainId
        };
        setTimeout(function() {
        if ($(".noDataInTable").length > 0) {
            $(".noDataInTable").typed({
                strings: ["<span style='font-size: 22px'>Welcome to the export app </span> ^1500. <br> A recommended workflow is: ^1000 <br> <br>1. Configure preview in the panel above^1000 <br>2. Click the refresh preview button^1000 <br> 3. Click the export button to export"],
                typeSpeed: 5
            });
        }
        }, 2000);

        api.model.filters.setDomainIds([domainPk]);
       
        // launch the default filters computation
        var filters = new api.model.FiltersJob();
        filters.set("id", {
            "projectId": model.get("project")
        });
        filters.set("engineVersion", "2");

        filters.setDomainIds([domainPk]);
        var defaultFilters;
        if (config.get("domain")) {
            defaultFilters = config.get("selection");
        } else {
            defaultFilters = null;
        }
        $.when(api.controller.facetjob.compute(filters,defaultFilters))
        .then(function() {
            // search for a time facet
            var timeFacet;
            var sel = filters.get("selection");
            if (sel && sel.facets) {
                var facets = sel.facets;
                for (var i = 0; i < facets.length; i++) {
                    var facet = facets[i];
                    if (facet.dimension.type == "CONTINUOUS") {
                        timeFacet = facet;
                    }
                }
            }
            if (timeFacet) {
                if (timeFacet.done === false) {
                    // retrieve time facet's members
                    $.when(api.controller.facetjob.getFacetMembers(filters, timeFacet.id))
                    .always(function() {
                            console.log("selected time dimension = "+timeFacet.dimension.name);
                            me.updateFilters(filters, timeFacet);
                        });
                } else {
                    me.updateFilters(filters, timeFacet);
                }
            } else {
                console.log("WARN: cannot use any time dimension to use for datepicker");
                me.updateFilters(filters, null);
            }
        });

        // Fade in main
        setTimeout(function() {
            $('#main').fadeIn();
        }, 1000);
       
    } else {
        $('#main').addClass("hidden");
    }
});

// check for new filter selection
api.model.filters.on('change:userSelection', function(filters) {
    squid_api.controller.facetjob.compute(filters, filters.get("userSelection"));
});

// Menu State management

$("#app #menu #export-app").click(function() {
    $('#admin').addClass("hidden");
    userAdminView.remove();
    $('#app-export').removeClass("hidden");
});

$("#app #menu #user-management").click(function() {
    userAdminView.fetchModels();
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
