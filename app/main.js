var api = squid_api, loginView, statusView, contentView, config;

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

var projects = new api.model.ProjectCollection({"id" : {"customerId" : squid_api.customerId}});

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
var barAnalysis = new api.model.AnalysisJob();
var timeAnalysis = new api.model.AnalysisJob();
var exportAnalysis = new api.model.AnalysisJob();

var totalAnalysis = new api.model.AnalysisJob();

// the main app model
// note model objects references contain oids
var mainModel = new Backbone.Model({
    "timeDimension": null,
    "currentAnalysis" : null,
    "totalAnalysis" : totalAnalysis,
    "chosenDimensions" : [],
    "selectedDimension" :  null,
    "chosenMetrics" : [],
    "selectedMetric" : null,
    "limit" : null,
    "orderByDirection" : "DESC",
    "currentPage" : null
});

// Views

new api.view.DimensionSelector({
    el : '#origin',
    model : mainModel,
    dimensionIndex: null
});

new api.view.DimensionView({
    el : '#dimension',
    model : mainModel
});

var tableView = new squid_api.view.DataTableView ({
    el : '#tableView',
    model : tableAnalysis,
    mainModel : mainModel
});

var timeView = new squid_api.view.TimeSeriesView ({
    el : '#timeView',
    model : timeAnalysis
});

var barView = new squid_api.view.BarChartView ({
    el : '#barView',
    model : barAnalysis
});

new api.view.DisplayTypeSelectorView({
    el : '#display-selector',
    model : mainModel,
    tableView : tableView,
    barView : barView,
    timeView : timeView
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
    model : mainModel
});

var exportView = new api.view.DataExport({
    el : '#export',
    renderTo : '#export-content',
    model : exportAnalysis
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

api.model.filters.on('change:selection', function() {
    refreshCurrentAnalysis();
    if (totalAnalysis.get("metrics")) {
        var sel = api.model.filters.get("selection");
        totalAnalysis.setSelection(sel);
        api.compute(totalAnalysis);
    }
});

var refreshCurrentAnalysis = function() {
    var a = mainModel.get("currentAnalysis");
    if (a) {
        // apply the settings depending on the type of analysis
        var silent = true;
        var changed = false;
        if (a == tableAnalysis) {
            a.setDimensionIds(mainModel.get("chosenDimensions"), silent);
            changed = changed || a.hasChanged();
            a.setMetricIds(mainModel.get("chosenMetrics"), silent);
            changed = changed || a.hasChanged();
            a.set({"orderBy" : [{"col" : getOrderByIndex() , "direction" : mainModel.get("orderByDirection")}]}, {"silent" : silent});
            changed = changed || a.hasChanged();
            a.set({"limit": 1000}, {"silent" : silent});
            changed = changed || a.hasChanged();
        }
        if (a == exportAnalysis) {
            a.setDimensionIds(mainModel.get("chosenDimensions"), silent);
            changed = changed || a.hasChanged();
            a.setMetricIds(mainModel.get("chosenMetrics"), silent);
            changed = changed || a.hasChanged();
            a.set({"orderBy" : null}, {"silent" : silent});
            changed = changed || a.hasChanged();
            a.set({"limit": null}, {"silent" : silent});
            changed = changed || a.hasChanged();
        }
        if (a == barAnalysis) {
            a.setDimensionIds([mainModel.get("selectedDimension")], silent);
            changed = changed || a.hasChanged();
            a.setMetricIds([mainModel.get("selectedMetric")], silent);
            changed = changed || a.hasChanged();
            a.set({"orderBy" : [{"col" : 1 , "direction" : mainModel.get("orderByDirection")}]}, {"silent" : silent});
            changed = changed || a.hasChanged();
            a.set({"limit": 10}, {"silent" : silent});
            changed = changed || a.hasChanged();
        }
        if (a == timeAnalysis) {
            var univariate = true;
            var selectedDimension = mainModel.get("selectedDimension");
            if (selectedDimension) {
                var dim = squid_api.utils.find(squid_api.model.project.get("domains"), "oid", selectedDimension);
                if (dim.type != "CONTINUOUS") {
                    univariate = false;
                }
            }
            
            if (univariate) {
                a.setDimensionIds([mainModel.get("timeDimension")], silent);
                changed = changed || a.hasChanged();
                a.set({"limit": null}, {"silent" : silent});
                changed = changed || a.hasChanged();
            } else {
                a.setDimensionIds([mainModel.get("selectedDimension"),mainModel.get("timeDimension")], silent);
                changed = changed || a.hasChanged();
                a.set({"orderBy" : [{"col" : 2 , "direction" : mainModel.get("orderByDirection")}]}, {"silent" : silent});
                changed = changed || a.hasChanged();
                a.set({"limit": 10}, {"silent" : silent});
                changed = changed || a.hasChanged();
            }
            a.setMetricIds([mainModel.get("selectedMetric")], silent);
            changed = changed || a.hasChanged();
        }
        a.setSelection(api.model.filters.get("selection"), silent);
        changed = changed || a.hasChanged();
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

mainModel.on("change:currentAnalysis", function() {
    refreshCurrentAnalysis();
    var a = mainModel.get("currentAnalysis");
    if (a == tableAnalysis) {
        tableView.$el.show();
    } else {
        tableView.$el.hide();
    }
    if (a == barAnalysis) {
        barView.$el.show();
    } else {
        barView.$el.hide();
    }
    if (a == timeAnalysis) {
        timeView.$el.show();
    } else {
        timeView.$el.hide();
    }
});

mainModel.on("change:selectedDimension", function() {
    refreshCurrentAnalysis();
});

mainModel.on("change:orderByDirection", function() {
    refreshCurrentAnalysis();
});

mainModel.on("change:limit", function() {
    refreshCurrentAnalysis();
});

mainModel.on("change:chosenMetrics", function() {
    refreshCurrentAnalysis();
});

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

mainModel.on("change:selectedMetric", function() {
    refreshCurrentAnalysis();
});

mainModel.on("change:chosenDimensions", function(chosen) {
    if (mainModel.get("chosenDimensions").length === 0) {
        mainModel.set({"selectedDimension": null}, {"silent" : true});
    }
    refreshCurrentAnalysis();
});

api.model.status.on('change:project', function(model) {
    if (model.get("project")) {
        $("#selectProject").addClass("hidden");
        $("#selectDomain").removeClass("hidden");
        var projectId = model.get("project").projectId;
        tableAnalysis.setProjectId(projectId);
        barAnalysis.setProjectId(projectId);
        timeAnalysis.setProjectId(projectId);
        totalAnalysis.setProjectId(projectId);
        exportAnalysis.setProjectId(projectId);
    } else {
        $("#selectProject").removeClass("hidden");
        tableAnalysis.setProjectId(null);
        barAnalysis.setProjectId(null);
        timeAnalysis.setProjectId(null);
        totalAnalysis.setProjectId(null);
        exportAnalysis.setProjectId(null);
    }
});

api.model.status.on('change:domain', function(model) {
    if (model.get("domain")) {
        $("#main").removeClass("hidden");
        $("#selectDomain").addClass("hidden");
        var domainId = model.get("domain").domainId;
        
        // update the analyses
        tableAnalysis.setDomainIds([domainId]);
        barAnalysis.setDomainIds([domainId]);
        timeAnalysis.setDomainIds([domainId]);
        exportAnalysis.setDomainIds([domainId]);
        
        // update the total Analysis
        totalAnalysis.setDomainIds([domainId]);
        
        // update the metrics
        var domain = squid_api.utils.find(squid_api.model.project.get("domains"), "oid", domainId);
        if (domain) {
            var domainMetrics = domain.metrics;
            if (domainMetrics && (domainMetrics.length>0)) {
                // total metrics
                var totalMetricIds = [];
                for (var i=0; (i<domainMetrics.length && (i<5)); i++) {
                    totalMetricIds.push(domainMetrics[i].oid);
                }
                totalAnalysis.setMetricIds(totalMetricIds);
                // selections
                mainModel.set({"chosenMetrics": totalMetricIds}, {"silent" : true});
                mainModel.set({"selectedMetric": totalMetricIds[0]}, {"silent" : true});
            }
        }
        
        // update the dimensions
        mainModel.set({"chosenDimensions": []}, {"silent" : true});
        mainModel.set({"selectedDimension": null}, {"silent" : true});
        
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
                    if (facet.dimension.type == "CONTINUOUS") {
                        // set the time dimension
                        mainModel.set("timeDimension",facet.dimension.oid);
                        timeFacet = facet;
                    }
                }
                // set date range to -30 days
                var endDate = moment.utc(timeFacet.items[0].upperBound);
                var startDate = moment.utc(timeFacet.items[0].upperBound);
                startDate = moment(startDate).subtract(30, 'days');
                var defaultSelection = {
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
            }
        });
        api.controller.facetjob.compute(filters);
       
    } else {
        $("#selectDomain").removeClass("hidden");
        $("#main").addClass("hidden");
        tableAnalysis.setDomainIds(null);
        barAnalysis.setDomainIds(null);
        timeAnalysis.setDomainIds(null);
        totalAnalysis.setDomainIds(null);
        exportAnalysis.setDomainIds(null);
    }
});

// check for new filter selection
api.model.filters.on('change:userSelection', function(filters) {
    squid_api.controller.facetjob.compute(filters, filters.get("userSelection"));
});

// handle preview/export switch
mainModel.on("change:currentPage", function() {
    if (mainModel.get("currentPage") == "preview") {
        mainModel.set("currentAnalysis", tableAnalysis);
    } else {
        mainModel.set("currentAnalysis", exportAnalysis);
    }
});

// Custom JS

// Make sure all panels are closed on launch
$(document).mouseup(function (e) {
    var container = $(".collapse");
    // Check to see if the target of the click is not container / descendant of container
    if (!container.is(e.target) && container.has(e.target).length === 0) {
        $('.collapse').each(function() {
            if ($(this).hasClass("in")) {
                $(this).collapse('hide');
            }
        });
    }
});

$(".nav-tabs li").click(function() {
    var pageActivated = $(this).find("a").attr("data-content");
    mainModel.set("currentPage", pageActivated);
});


/*
* Start the App
*/
api.init();
