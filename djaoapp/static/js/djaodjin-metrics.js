/* Copyright (c) 2018, Djaodjin Inc.
   see LICENSE
*/

// Calculate width of word
function marginLeftCalculation(text, defaultFont) {
  "use strict";
  var font = defaultFont || "normal 12px Arial";
  $("body").append("<div id=\"calculation_width\" style=\"font:" + font + ";\"><span>" + text + "</span></div>");
  var widthText = $("#calculation_width span").width();
  $("#calculation_width").remove();
  return widthText;
}

function drawChartBackground(chart){
  "use strict";

  $(".background-future").remove();
  var dateNow = (new Date()).getTime();
  var dateNowXpos = chart.xAxis.scale()(dateNow);
  var backHeight = chart.yAxis.scale()(chart.yAxis.scale().domain()[0]);
  var backWidth = chart.xAxis.scale()(chart.xAxis.scale().domain()[1]);

  if (dateNowXpos > backWidth){
    dateNowXpos = backWidth;
  }else if (dateNowXpos < 0){
    dateNowXpos = 0;
  }

  d3.select(".nv-groups").append("rect")
    .attr("class", "background-future")
    .attr("x", dateNowXpos)
    .attr("width", backWidth - dateNowXpos)
    .attr("height", backHeight)
    .attr("fill", "rgba(66,139,202, 0.2)");

  d3.select(".nv-groups").append("rect")
    .attr("class", "background-future")
    .attr("x", 0)
    .attr("width", dateNowXpos)
    .attr("height", backHeight)
    .attr("fill", "rgba(153,211,240, 0.2)");
}

// This function should be called with all parameters
// updateChart('#example', data, null, 1, [])
// Container should be a div, a svg element is automaticaly added
function updateChart(container, data, unit, dataScale, extra) {
    "use strict";

    dataScale = dataScale || 1;
    nv.addGraph(function() {
        // clear any previous chart elements before adding new ones
        // remove svg and append it again to remove all previous attached events
        d3.select(container).selectAll("*").remove();
        d3.select(container).append("svg").attr("class", "chart-area");
        var maxY = 0;
        var dateTicks = [];
        var values = data[0].values;
        var j = 0;
        var i = 0;
        for( j = 0; j < data.length; ++j ) {
            values = data[j].values;
            for( i = 0; i < values.length; ++i ) {
                values[i][0] = new Date(values[i][0]);
                if( values[i][1] > maxY ) { maxY = values[i][1]; }
            }
        }
        for( i = 0; i < data[0].values.length; ++i ) {
            dateTicks.push(data[0].values[i][0]);
        }

        var marginLeft = maxY * dataScale;
        if( unit ) {
            if (marginLeft > 1000000){
              marginLeft = d3.format(unit + ",.0f")(marginLeft / 1000000) + "M";
            }else if (marginLeft > 1000){
              marginLeft = d3.format(unit + ",.0f")(marginLeft / 1000) + "K";
            }else{
              marginLeft = d3.format(unit + ",.2f")(marginLeft);
            }
        }

        // Dynamic margin left to Optimize display
        marginLeft = marginLeftCalculation(marginLeft) + 5;
        /* force the yAxis to start at zero in all cases. */
        maxY = (maxY + 1) * dataScale;

        var chart = nv.models.lineChart()
            .x(function(d) { return d[0]; })
            .y(function(d) { return d[1] * dataScale; })
            .margin({top: 50, right: 20, bottom: 60, left: marginLeft})
            .useInteractiveGuideline(true);

        chart.interactiveLayer.tooltip.contentGenerator(function(d) {
            var hoverDate = d.value;

            // Get original tooltip html
            var html = nv.models.lineChart().interactiveLayer.tooltip.contentGenerator()(d);

            // Change data into it.
            var $html = $(html);

            // If unit format the exact number
            if (unit){
              $.each($html.find("td.value"), function(index, element){
                var value = $(element).text();
                $(element).text(d3.format(unit + ",.2f")(value));
              });
            }

            // if extra data add it to tooltip
            if (extra && extra.length > 0){
              $.each(extra, function(index, element){
                var extraKey = element.key;
                var extraValue = $.grep(element.values, function(v){
                  return hoverDate === d3.time.format("%x")(new Date(v[0]));
                })[0];
                if (extraValue){
                  var style = null;
                  if (index === 0){
                    style = "border-top:1px double black;";
                  }
                  var newRow = "<tr><td style=\"" + style + "\"></td><td class=\"key\"  style=\"" + style + "\">" + extraKey + "</td><td class=\"value\" style=\"" + style + "\">" + extraValue[1] + "</td></tr>";
                  $html.find("tbody").append(newRow);
                }
              });
            }
            // return html tooltip;
            return $html.prop("outerHTML");
        });

        // Pb on voronoi calculation when all value are zero
        // https://github.com/novus/nvd3/issues/873
        // disable voronoi until fix on nv.d3 2.0.0
        // https://github.com/novus/nvd3/pull/584
        chart.useVoronoi(false);

        chart.xAxis
            .axisLabel("Date")
            .showMaxMin(false)     // removes max and min as ticks in x-axis
            .tickValues(dateTicks) // forces ticks to match dates in tooltip
            .tickFormat(function(d) {
                if(d.getHours() !== 0 || d.getMinutes() !== 0
                   || d.getSeconds() !== 0 ) {
                    // XXX cannot add '*' suffix for incomplete months unless
                    // we can reliably get dates at midnight with/out timeoffset
                    return d3.time.format("%b'%y")(d);
                }
                return d3.time.format("%b'%y")(d);
            });
        chart.xScale(d3.time.scale());

        chart.yAxis
            .showMaxMin(false);  //remove max and min in x axe
        if( unit ) {
            // If we have a unit display it along the axis.
            chart.yAxis
                .tickFormat(function(d) {
                    if (d > 1000000){
                      return d3.format(unit + ",.0f")(d / 1000000) + "M";
                    }else if (d > 1000){
                      return d3.format(unit + ",.0f")(d / 1000) + "K";
                    }else{
                      return d3.format(unit + ",.2f")(d);
                    }
                });
        }
        chart.forceY(0); // Force only 0 but allow resize if unchecked chart

        d3.select(container + " svg")
            .datum(data)
            .transition().duration(100)
            .call(chart);

        drawChartBackground(chart);

        // XXX listening on the inner ``container`` does not trigger
        // the chart update so we listen to the event fired
        // in ``$(".dashboard-nav-toggle").click()``.
        $('.dashboard-container').resize(function(){
            chart.update();
            // Add timeout to update background correctly.
            setTimeout(function(){
                drawChartBackground(chart);
            }, 500);
        });

        nv.utils.windowResize(function(){
          chart.update();
          // Add timeout to update background correctly.
          setTimeout(function(){
            drawChartBackground(chart);
          }, 500);

        });

        return chart;
    });
}

function saveContent(dataType, fileContents, fileName){
    "use strict";
    var uri = "data:" + dataType + "," + fileContents;
//XXX old browsers:    window.open(uri);
    var link = document.createElement("a");
    link.download = fileName;
    link.href = uri;
    link.click();
}

function exportCSV(event) {
    "use strict";
    var self = $(this);
    event.preventDefault();
    var key = self.parents("section").find(".tab-pane.active").attr("id");
    var table = data[key].table; // XXX Use of global variable *data*
        // until we figure out how to get the data attached to the svg.
    var output = "";
    // Create the monthly headers
    var sep = ", ";
    output += "\t";
    for( var j = 0; j < table[0].values.length; ++j ) {
        var d = new Date(table[0].values[j][0]);
        output += sep + d.getFullYear() + "-" + (d.getMonth() + 1);
    }
    output += "\n";
    // Create the rows with numbers
    for( var i = 0; i < table.length; ++i ) {
        output += table[i].key;
        for( j = 0; j < table[i].values.length; ++j ) {
            output += sep + table[i].values[j][1];
        }
        output += "\n";
    }

    table = data.key.extra;

    for( i = 0; i < table.length; ++i ) {
        output += table[i].key;
        for( j = 0; j < table[i].values.length; ++j ) {
            output += sep + table[i].values[j][1];
        }
        output += "\n";
    }
    saveContent("application/csv;charset=UTF-8", encodeURIComponent(output),
        "download.csv");
}

function updateBarChart(container, data, unit, dataScale, extra) {
    "use strict";
    dataScale = dataScale || 1;
    nv.addGraph(function() {

        // clear any previous chart elements before adding new ones
        // remove svg and append it again to remove all previous attached events
        d3.select(container + " svg").remove();
        d3.select(container).append("svg").attr("class", "chart-area");
        var chart = nv.models.multiBarChart()
            .reduceXTicks(true)   // If 'false', every single x-axis tick
                                  // label will be rendered.
            .rotateLabels(0)      // Angle to rotate x-axis labels.
            .showControls(false)  // Allow user to switch between 'Grouped'
                                  // and 'Stacked' mode.
            .groupSpacing(0.1);   // Distance between each group of bars.
        chart.xAxis
            .tickFormat(function(d) {
                return d3.time.format("%x")(new Date(d)); });
        chart.yAxis
            .tickFormat(d3.format(",.2f"));
        chart.x(function(d) { return new Date(d[0]); })
            .y(function(d) { return d[1] / 100; });

        d3.select(container + " svg")
            .datum(data)
            .transition().duration(100)
            .call(chart);

        nv.utils.windowResize(chart.update);
        return chart;
    });
}