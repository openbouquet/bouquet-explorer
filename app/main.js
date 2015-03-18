var api = squid_api, loginView, statusView, config;

var me = this;

api.setup({
    "clientId" : "dashboard",
    "filtersDefaultEvents" : false
});

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
    model : projects
});

new api.view.DomainSelector({
    el : '#domain'
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
                $("#selectProject").removeClass("hidden");
                console.log(model);
            },
            error : function(model, response) {
                $("#loading").addClass("hidden");
                $("#selectProject").addClass("hidden");
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
    "refreshButtonPressed" : false,
    "chosenDimensions" : null,
    "selectedDimension" :  null,
    "chosenMetrics" : null,
    "selectedMetric" : null,
    "limit" : null,
    "orderByDirection" : "DESC",
});

mainModel.on("change:selectedDimension", function() {
    me.saveState();
    refreshExportAnalysis();
    refreshTableAnalysis();
});

mainModel.on("change:chosenDimensions", function() {
    me.saveState();
    refreshExportAnalysis();
    refreshTableAnalysis();
});

mainModel.on("change:chosenMetrics", function() {
    me.saveState();
    refreshExportAnalysis();
    refreshTableAnalysis();
});

mainModel.on("change:orderByDirection", function() {
    me.saveState();
    refreshExportAnalysis();
    refreshTableAnalysis();
});

mainModel.on("change:limit", function() {
    me.saveState();
    refreshExportAnalysis();
    refreshTableAnalysis();
});

mainModel.on("change:selectedMetric", function() {
    me.saveState();
    refreshExportAnalysis();
    refreshTableAnalysis();
});

tableAnalysis.on("change", function() {
    if (this.isDone()) {
        $("button.refresh-analysis").removeClass("first-view");
        $("button.refresh-analysis .text").html("Preview up to date");
        $("button.refresh-analysis .glyphicon").hide();
        $("button.refresh-analysis .glyphicon").removeClass("loading");
    } else {
        $("button.refresh-analysis .glyphicon").show();
        $("button.refresh-analysis .text").html("Refreshing...");
        $("button.refresh-analysis .glyphicon").addClass("loading");
    }
});

mainModel.on("change:analysisRefreshNeeded", function() {
    var analysisRefreshNeeded = me.mainModel.get("analysisRefreshNeeded");
    // Bind click event and tell the model a refresh is needed
    if (analysisRefreshNeeded) {
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
    compute(tableAnalysis);
    me.mainModel.set("analysisRefreshNeeded", false);
});

// Views

userAdminView = new api.view.UsersAdminView({
    el : '#adminDisplay', 
    status : api.model.status
});

new api.view.DimensionSelector({
    el : '#origin',
    model : mainModel,
    dimensionIndex: null
});

new api.view.OrderByView({
    el : '#orderby',
    model : mainModel
});

new api.view.DimensionView({
    el : '#dimension',
    model : mainModel,
    selectDimension : false,
});

var tableView = new squid_api.view.DataTableView ({
    el : '#tableView',
    model : tableAnalysis,
    mainModel : mainModel,
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
    model : mainModel,
    metricIndex: null
});

new api.view.MetricView({
    el : '#total',
    model : mainModel,
    displayMetricValue : false,
    selectMetric : false,
});

var exportView = new api.view.DataExport({
    el : '#export',
    renderTo : '#export-content',
    model : exportAnalysis,
    displayInAccordion : true,
});

new api.view.OrderByView({
    el : '#orderby',
    model : mainModel
});

// Controllers

var compute = function(analysis) {
    // get rid of previous errors
    api.model.status.set("error", null);
    // compute if the analysis is correct
    if ((analysis.get("facets") && analysis.get("facets").length>0) || (analysis.get("metrics") && analysis.get("metrics").length>0)) {
        api.compute(analysis);
    } else {
        api.model.status.set({"error" : {"reason" : "Please select at least a dimension or a metric"}});
    }
};

var refreshExportAnalysis = function() {
    var a = mainModel.get("exportAnalysis");
    if (a) {
        var silent = true;
        var changed = false;
        a.setFacets(mainModel.get("chosenDimensions"), silent);
        changed = changed || a.hasChanged();
        a.setMetricIds(mainModel.get("chosenMetrics"), silent);
        changed = changed || a.hasChanged();
        a.set({"orderBy" : null}, {"silent" : silent});
        changed = changed || a.hasChanged();
        a.set({"limit": null}, {"silent" : silent});
        changed = changed || a.hasChanged();
        a.setSelection(api.model.filters.get("selection"), silent);
        // only trigger change if the analysis has changed
        if (changed) {    
            a.trigger("change");
        }
    }
};

var refreshTableAnalysis = function() {
    var a = mainModel.get("tableAnalysis");
    var chosenDimensions = mainModel.get("chosenDimensions");
    var chosenMetrics = mainModel.get("chosenMetrics");
    if ((!chosenDimensions || chosenDimensions.length === 0) && (!chosenMetrics || chosenMetrics.length === 0)) {
        $("button.refresh-analysis").prop('disabled', true);
        $("button.refresh-analysis").removeClass("first-view");
    } else {
        $("button.refresh-analysis").prop('disabled', false);
    }
    if (a) {
        // apply the settings depending on the type of analysis
        var silent = true;
        var changed = false;
        
        a.setFacets(chosenDimensions, silent);
        changed = changed || a.hasChanged();
        a.setMetricIds(chosenMetrics, silent);
        changed = changed || a.hasChanged();
        a.set({"orderBy" : [{"col" : getOrderByIndex() , "direction" : mainModel.get("orderByDirection")}]}, {"silent" : silent});
        changed = changed || a.hasChanged();
        a.set({"limit": 1000}, {"silent" : silent});
        changed = changed || a.hasChanged();

        a.setSelection(api.model.filters.get("selection"), silent);
        // only trigger change if the analysis has changed
        if (changed) {
            me.mainModel.set("analysisRefreshNeeded", true);
        }
    }
};

var getOrderByIndex = function() {
    var index = mainModel.get("chosenDimensions").length;
    var selectedMetric = mainModel.get("selectedMetric");
    var metrics = mainModel.get("chosenMetrics");
    for (i=0; i<metrics.length; i++) {
        if (metrics[i] === selectedMetric) {
            index += i;
        }
    }
    return index;
};

mainModel.on("change:chosenDimensions", function(chosen) {
    if (mainModel.get("chosenDimensions").length === 0) {
        mainModel.set("selectedDimension", null);
    }
});

api.model.status.on('change:project', function(model) {
    if (model.get("project")) {
        preAppState.selectProject = true;
        $("#selectProject").addClass("hidden");
        $("#selectDomain").removeClass("hidden");
        // Make sure loading icon doesn't appear
        $("button.refresh-analysis .glyphicon").removeClass("loading");
        var projectId = model.get("project").projectId;
        tableAnalysis.setProjectId(projectId);
        exportAnalysis.setProjectId(projectId);
    } else {
        $("#selectProject").removeClass("hidden");
        // Make sure loading icon doesn't appear
        $("button.refresh-analysis .glyphicon").removeClass("loading");
        tableAnalysis.setProjectId(null);
        exportAnalysis.setProjectId(null);
    }
});

var saveState = function() {
    var config = [];
    config.push({"chosenDimensions" : me.mainModel.get("chosenDimensions")});
    config.push({"selectedDimensions" : me.mainModel.get("selectedDimensions")});
    config.push({"chosenMetrics" : me.mainModel.get("chosenMetrics")});
    config.push({"selectedMetric" : me.mainModel.get("selectedMetric")});
    config.push({"limit" : me.mainModel.get("limit")});
    config.push({"orderByDirection" : me.mainModel.get("orderByDirection")});
    api.saveState(config);
};

api.model.filters.on('change:selection', function() {
    me.saveState();
    me.mainModel.set("analysisRefreshNeeded", true);
});

var updateFilters = function(filters) {
    // apply to main filters
    api.model.filters.set("id", filters.get("id"));
    api.controller.facetjob.compute(api.model.filters, filters.get("selection"));
};

api.model.status.on('change:domain', function(model) {
    if (model.get("domain")) {
        setTimeout(function() {
        if ($(".noDataInTable").length > 0) {
            $(".noDataInTable").typed({
                strings: ["<span style='font-size: 22px'>Welcome to the export app </span> ^1500. <br> A recommended workflow is: ^1000 <br> <br>1. Configure preview in the panel above^1000 <br>2. Click the refresh preview button^1000 <br> 3. Click the export button to export"],
                typeSpeed: 5
            });
        }
        }, 2000);
        preAppState.selectDomain = true;
        $("#main").removeClass("hidden");
        $("#selectDomain").addClass("hidden");
        var domainId = model.get("domain").domainId;
        api.model.filters.setDomainIds([model.get("domain")]);

        // Set Table Analysis Limit
        mainModel.get("tableAnalysis").set({"limit" : 1000}, {silent : true});
        mainModel.get("tableAnalysis").set({"direction" : "DESC"}, {silent : true});
       
        // launch the default filters computation
        var filters = new api.model.FiltersJob();
        filters.set("id", {
            "projectId": model.get("domain").projectId
        });
        filters.setDomainIds([model.get("domain")]);
        var state = api.model.status.get("state");
        var defaultFilters;
        if (state && (state.domain.domainId == domainId)) {
            defaultFilters = state.selection;
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
            if (timeFacet && (timeFacet.done === false)) {
                // retrieve time facet's members
                $.when(api.controller.facetjob.getFacetMembers(filters, timeFacet.id))
                .always(function() {
                    console.log("selected time dimension = "+timeFacet.dimension.name);
                    if (timeFacet.selectedItems.length === 0) {
                        // set date range to -30 days
                        var endDate = moment.utc(timeFacet.items[0].upperBound);
                        var startDate = moment.utc(timeFacet.items[0].upperBound);
                        startDate = moment(startDate).subtract(30, 'days');
                        timeFacet.selectedItems = [ {
                                    "type" : "i",
                                    "lowerBound" : startDate.format("YYYY-MM-DDTHH:mm:ss.SSSZZ"),
                                    "upperBound" : timeFacet.items[0].upperBound
                                }];
                    }
                    me.updateFilters(filters);
                });
            } else {
                console.log("WARN: cannot use any time dimension to use for datepicker");
                me.updateFilters(filters);
            }

            // update the analyses
            tableAnalysis.setDomainIds([domainId]);
            exportAnalysis.setDomainIds([domainId]);
            
            // update the metrics
            var domain = squid_api.utils.find(squid_api.model.project.get("domains"), "oid", domainId);
            if (domain) {
                var domainMetrics = domain.metrics;
                if (domainMetrics && (domainMetrics.length>0)) {
                    // total metrics
                    var totalMetricIds = [];
                    for (var dmIdx=0; (dmIdx<domainMetrics.length && (dmIdx<5)); dmIdx++) {
                        totalMetricIds.push(domainMetrics[dmIdx].oid);
                    }
                }
            }

            // manage app state
            if ((!state) || (state.domain.domainId != domainId)) {
                // reset the settings
                mainModel.set({"chosenDimensions": []});
                mainModel.set({"selectedDimension": null});
                mainModel.set({"chosenMetrics": []});
                mainModel.set({"selectedMetric": null});
            } else {
                if (state.domain.domainId == domainId) {
                    mainModel.set({
                        "chosenDimensions" : (state.chosenDimensions || mainModel.get("chosenDimensions")),
                        "selectedDimension" :  (state.selectedDimension ||  mainModel.get("selectedDimension")),
                        "chosenMetrics" : (state.chosenMetrics || mainModel.get("chosenMetrics")),
                        "selectedMetric" : (state.selectedMetric || mainModel.get("selectedMetric")),
                        "limit" : (state.limit || mainModel.get("limit")),
                        "orderByDirection" : (state.orderByDirection || mainModel.get("orderByDirection"))
                    });
                }
            }
        });

        // Fade in main
        setTimeout(function() {
            $('#main').fadeIn();
        }, 1000);
       
    } else {
        $("#selectDomain").removeClass("hidden");
        $("#main").addClass("hidden");
        tableAnalysis.setDomainIds(null);
        exportAnalysis.setDomainIds(null);
    }
});

// check for new filter selection
api.model.filters.on('change:userSelection', function(filters) {
    squid_api.controller.facetjob.compute(filters, filters.get("userSelection"));
});

// Allow admin panel to be accessed when project / domain have not been chosen
var preAppState = {};
preAppState.selectProject = false;
preAppState.selectDomain = false;

$("#app #menu #export-app").click(function() {
    if (! preAppState.selectProject) {
        $("#selectProject").show();
    } else if (! preAppState.selectDomain) {
        $("#selectDomain").show();
    }
    $('#admin').fadeOut(200, function() {
        userAdminView.remove();
      $('#main').fadeIn(200, function () {
          
      });
   });
});

$("#app #menu #user-management").click(function() {
    if (! preAppState.selectProject) {
        $("#selectProject").hide();
    } else if (! preAppState.selectDomain) {
        $("#selectDomain").hide();
    }
    userAdminView.fetchModels();
    $('#admin').removeClass("hidden");
    $('#main').fadeOut(200, function() {
      $('#admin').fadeIn(200, function () {
          
      });
   });
});

// Trigger Sliding Nav
$('.menu-link').bigSlide();

// Hide Main and unhide domain is selected
$('#main').hide();

/*
* Start the App
*/
api.init();
