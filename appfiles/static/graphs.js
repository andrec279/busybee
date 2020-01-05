$(document).ready(function () {
    var UNDF;
    Highcharts.chart(chart1ID, {
        chart: chart1,
        title: title1,
        yAxis: {
            allowDecimals: false,
            title: {
                text: 'Number of Tasks Completed'
            }
        },
        xAxis: xAxis1,
        series: series1
    });
    
    Highcharts.chart(chart2ID, {
        chart: chart2,
        title: title2,
        subtitle: subtitle2,
        series: series2,
        drilldown: drilldown2,
        
        // Additional graph configurations (independent of data)
        plotOptions: {
            series: {
                dataLabels: {
                    enabled: true,
                    formatter: function () {
                        console.log(this);
                        if (this.series.chart.drilldownLevels !== UNDF && this.series.chart.drilldownLevels.length > 0) {
                            if (this.y === 1) {
                                return this.point.name + ': ' + this.y.toFixed(0) + ' Task';
                            }
                            else {
                                return this.point.name + ': ' + this.y.toFixed(0) + ' Tasks';
                            }
                            
                        } else {
                            if (this.y === 1) {
                                return this.point.name + ': ' + this.y.toFixed(0) + ' Goal';
                            }
                            else {
                                return this.point.name + ': ' + this.y.toFixed(0) + ' Goals';
                            }
                        }
                    }
                }
            },
        },
    
        tooltip: {
            headerFormat: '<span style="font-size:11px">{series.name}</span><br>',
            pointFormatter: function () {
                if (this.series.chart.drilldownLevels !== UNDF && this.series.chart.drilldownLevels.length > 0) {
                    if (this.y === 1) {
                        return '<span style="color:' + this.color + '">' + this.name + '</span>: <b>' + this.y.toFixed(0) + '</b> Task<br/>';
                    }
                    else {
                        return '<span style="color:' + this.color + '">' + this.name + '</span>: <b>' + this.y.toFixed(0) + '</b> Tasks<br/>';
                    }
                } else {
                    if (this.y === 1) {
                        return '<span style="color:' + this.color + '">' + this.name + '</span>: <b>' + this.y.toFixed(0) + '</b> Goal<br/>';
                    }
                    else {
                        return '<span style="color:' + this.color + '">' + this.name + '</span>: <b>' + this.y.toFixed(0) + '</b> Goals<br/>';
                    }
                }
            }
        },
    });
});
    