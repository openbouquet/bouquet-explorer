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
    "chosenDimensions" : [],
    "selectedDimension" :  null,
    "chosenMetrics" : [],
    "selectedMetric" : null,
    "limit" : null,
    "orderByDirection" : "DESC",
});

mainModel.on("change:selectedDimension", function() {
    refreshExportAnalysis();
    me.mainModel.set("analysisRefreshNeeded", true);
});

mainModel.on("change:chosenDimensions", function() {
    refreshExportAnalysis();
    me.mainModel.set("analysisRefreshNeeded", true);
});

mainModel.on("change:chosenMetrics", function() {
    refreshExportAnalysis();
    me.mainModel.set("analysisRefreshNeeded", true);
});

mainModel.on("change:orderByDirection", function() {
    refreshExportAnalysis();
    me.mainModel.set("analysisRefreshNeeded", true);
});

mainModel.on("change:limit", function() {
    refreshExportAnalysis();
    me.mainModel.set("analysisRefreshNeeded", true);
});

mainModel.on("change:selectedMetric", function() {
    refreshExportAnalysis();
    me.mainModel.set("analysisRefreshNeeded", true);
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

    if (analysisRefreshNeeded) {
        // Bind click event and tell the model a refresh is needed
        $("button.refresh-analysis").click(function() {
            me.mainModel.set("analysisRefreshNeeded", false);
            me.mainModel.set("refreshButtonPressed", true);
            refreshTableAnalysis();
        });
        // Dom manipulations
        $("button.refresh-analysis .glyphicon").show();
        $("button.refresh-analysis .glyphicon").removeClass("loading");
        $("button.refresh-analysis").removeClass("dataUpdated");
        $("button.refresh-analysis .text").html("Refresh Preview");
    } else {
        // Unbind Click event / Dom manipulations
        $("button.refresh-analysis").unbind("click");
        $("button.refresh-analysis").addClass("dataUpdated");
        $("button.refresh-analysis .glyphicon").removeClass("loading");
    }
});

// Views

userAdminView = new api.view.UsersAdminView({el : '#adminDisplay', status : api.model.status});

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
    searching : true,
    noDataMessage : " ",
    paging : true,
    ordering : true,
    reactiveState : true,
    reactiveMessage : "<i class='fa fa-table'></i><br>Click refresh to update",
});

new api.view.FiltersSelectionView({
    el : '#selection',
    filtersEl : $('#filters'),
    refreshOnChange : false
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
    if (analysis.get("dimensions") && analysis.get("metrics")) {
        api.compute(analysis);
    }
};

var refreshExportAnalysis = function() {
    var a = mainModel.get("exportAnalysis");
    if (a) {
        var silent = true;
        var changed = false;
        a.setDimensionIds(mainModel.get("chosenDimensions"), silent);
        changed = changed || a.hasChanged();
        a.setMetricIds(mainModel.get("chosenMetrics"), silent);
        changed = changed || a.hasChanged();
        a.set({"orderBy" : null}, {"silent" : silent});
        changed = changed || a.hasChanged();
        a.set({"limit": null}, {"silent" : silent});
        changed = changed || a.hasChanged();

        a.setSelection(api.model.filters.get("selection"), silent);

        // only re-compute if the analysis has changed
        if (changed) {    
            if (a != exportAnalysis) {
                compute(a);
            } else {
                // export analysis should not be computed
                a.trigger("change");
            }
        }
    }
};

var refreshTableAnalysis = function() {
    var a = mainModel.get("tableAnalysis");
    if (a) {
        // apply the settings depending on the type of analysis
        var silent = true;
        var changed = false;
        a.setDimensionIds(mainModel.get("chosenDimensions"), silent);
        changed = changed || a.hasChanged();
        a.setMetricIds(mainModel.get("chosenMetrics"), silent);
        changed = changed || a.hasChanged();
        a.set({"orderBy" : [{"col" : getOrderByIndex() , "direction" : mainModel.get("orderByDirection")}]}, {"silent" : silent});
        changed = changed || a.hasChanged();
        a.set({"limit": 1000}, {"silent" : silent});
        changed = changed || a.hasChanged();

        a.setSelection(api.model.filters.get("selection"), silent);

        compute(tableAnalysis);
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

api.model.filters.on('change:selection', function() {
    me.mainModel.set("analysisRefreshNeeded", true);
});

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

        // Set Table Analysis Limit
        mainModel.get("tableAnalysis").set({"limit" : 1000}, {silent : true});
        mainModel.get("tableAnalysis").set({"direction" : "DESC"}, {silent : true});
       
        // launch the default filters computation
        var filters = new api.controller.facetjob.FiltersModel();
        filters.set("id", {
            "projectId": model.get("domain").projectId
        });
        filters.setDomainIds([domainId]);
        filters.on("change:selection", function() {
            // filters computation done
            var sel = filters.get("selection");
            if (sel && sel.facets) {
                var facets = sel.facets;
                var timeFacet;
                for (var i = 0; i < facets.length; i++) {
                    var facet = facets[i];
                    if (facet.dimension.type == "CONTINUOUS" && facet.items.length>0) {
                        // set the time dimension
                        timeFacet = facet;
                        console.log("found time dimension = "+facet.dimension.name);
                    }
                }
                var defaultSelection;
                if (timeFacet && timeFacet.items.length>0) {
                    console.log("selected time dimension = "+timeFacet.dimension.name);
                    // set date range to -30 days
                    var endDate = moment.utc(timeFacet.items[0].upperBound);
                    var startDate = moment.utc(timeFacet.items[0].upperBound);
                    startDate = moment(startDate).subtract(30, 'days');
                    defaultSelection = {
                            "facets" : [ {
                                "dimension" : timeFacet.dimension,
                                "id" : timeFacet.id,
                                "selectedItems" : [ {
                                    "type" : "i",
                                    "lowerBound" : startDate.format("YYYY-MM-DDTHH:mm:ss.SSSZZ"),
                                    "upperBound" : timeFacet.items[0].upperBound
                                } ]
                            } ]
                    };
                    // apply to main filters
                    api.model.filters.set("id", {
                        "projectId": model.get("domain").projectId
                    });
                    api.model.filters.setDomainIds([domainId]);
                    api.model.filters.set("userSelection", defaultSelection);
                } else {
                    console.log("WARN: cannot use any time dimension to use for datepicker");
                }
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
                    // selections
                    mainModel.set({"chosenMetrics": totalMetricIds});
                    mainModel.set({"selectedMetric": totalMetricIds[0]});
                }
            }
            
            // update the dimensions
            mainModel.set({"chosenDimensions": []});
            mainModel.set({"selectedDimension": null});
        });

        // Fade in main
        setTimeout(function() {
            $('#main').fadeIn();
        }, 1000);

        api.controller.facetjob.compute(filters);
       
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

/* Trigger Admin Section */
$('#admin').hide();

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
