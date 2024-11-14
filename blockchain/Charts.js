export function createTraitCharts(analyticsData) {
    return {
        neighborhood: {
            series: Object.values(analyticsData.traits.neighborhood).map(n => parseFloat(n.percentage)),
            labels: Object.keys(analyticsData.traits.neighborhood),
            options: {
                chart: {
                    type: 'donut',
                    height: 380,
                    fontFamily: 'Inter, sans-serif',
                    background: 'transparent'
                },
                plotOptions: {
                    pie: {
                        donut: {
                            size: '65%',
                            labels: {
                                show: true,
                                total: {
                                    show: true,
                                    label: 'Total Plots',
                                    formatter: () => '4444'
                                }
                            }
                        }
                    }
                },
                colors: ['#008FFB', '#00E396', '#FEB019', '#FF4560', '#775DD0', '#546E7A', '#26a69a', '#D10CE8'],
                title: {
                    text: 'Neighborhood Distribution',
                    align: 'center',
                    style: {
                        fontSize: '18px',
                        fontWeight: 600,
                        color: '#fff'
                    }
                },
                legend: {
                    position: 'bottom',
                    labels: {
                        colors: '#fff'
                    }
                },
                dataLabels: {
                    enabled: true,
                    formatter: function(val) {
                        return val.toFixed(1) + '%';
                    }
                },
                responsive: [{
                    breakpoint: 480,
                    options: {
                        chart: {
                            height: 300
                        },
                        legend: {
                            position: 'bottom'
                        }
                    }
                }]
            }
        },
        zoning: {
            series: [{
                name: 'Plots',
                data: Object.values(analyticsData.traits.zoning).map(z => z.count)
            }],
            options: {
                chart: {
                    type: 'bar',
                    height: 350,
                    background: 'transparent',
                    fontFamily: 'Inter, sans-serif'
                },
                plotOptions: {
                    bar: {
                        borderRadius: 4,
                        horizontal: true,
                        distributed: true,
                        dataLabels: {
                            position: 'top'
                        }
                    }
                },
                colors: ['#0066FF', '#00FF00', '#FFD700', '#FF4500', '#9933CC'],
                dataLabels: {
                    enabled: true,
                    formatter: function(val) {
                        return val + ' plots';
                    },
                    style: {
                        colors: ['#fff']
                    }
                },
                xaxis: {
                    categories: Object.keys(analyticsData.traits.zoning),
                    labels: {
                        style: {
                            colors: '#fff'
                        }
                    }
                },
                yaxis: {
                    labels: {
                        style: {
                            colors: '#fff'
                        }
                    }
                },
                title: {
                    text: 'Zoning Distribution',
                    align: 'center',
                    style: {
                        fontSize: '18px',
                        fontWeight: 600,
                        color: '#fff'
                    }
                }
            }
        },
        plotSize: {
            series: [{
                name: 'Plots',
                data: Object.values(analyticsData.traits.plotSize).map(p => p.count)
            }],
            options: {
                chart: {
                    type: 'bar',
                    height: 350,
                    background: 'transparent',
                    fontFamily: 'Inter, sans-serif'
                },
                plotOptions: {
                    bar: {
                        borderRadius: 4,
                        horizontal: true,
                        distributed: true
                    }
                },
                colors: [
                    '#008FFB', '#00E396', '#FEB019', '#FF4560', '#775DD0',
                    '#546E7A', '#26a69a', '#D10CE8'
                ],
                dataLabels: {
                    enabled: true,
                    formatter: function(val) {
                        return val + ' plots';
                    },
                    style: {
                        colors: ['#fff']
                    }
                },
                title: {
                    text: 'Plot Size Distribution',
                    align: 'center',
                    style: {
                        fontSize: '18px',
                        fontWeight: 600,
                        color: '#fff'
                    }
                },
                xaxis: {
                    categories: Object.keys(analyticsData.traits.plotSize),
                    labels: {
                        style: {
                            colors: '#fff'
                        }
                    }
                },
                yaxis: {
                    labels: {
                        style: {
                            colors: '#fff'
                        }
                    }
                }
            }
        },
        buildingHeight: {
            series: [{
                name: 'Building Types',
                data: Object.values(analyticsData.traits.buildingSize).map(b => b.count)
            }],
            options: {
                chart: {
                    type: 'area',
                    height: 350,
                    background: 'transparent',
                    fontFamily: 'Inter, sans-serif'
                },
                dataLabels: {
                    enabled: true,
                    formatter: function(val) {
                        return val + ' plots';
                    }
                },
                stroke: {
                    curve: 'smooth'
                },
                title: {
                    text: 'Building Size Distribution',
                    align: 'center',
                    style: {
                        fontSize: '18px',
                        fontWeight: 600,
                        color: '#fff'
                    }
                },
                xaxis: {
                    categories: Object.keys(analyticsData.traits.buildingSize),
                    labels: {
                        style: {
                            colors: '#fff'
                        }
                    }
                },
                yaxis: {
                    labels: {
                        style: {
                            colors: '#fff'
                        }
                    }
                },
                theme: {
                    mode: 'dark'
                }
            }
        },
        distanceToOcean: {
            series: [{
                name: 'Plots',
                data: Object.values(analyticsData.traits.distanceToOcean).map(d => d.count)
            }],
            options: {
                chart: {
                    type: 'bar',
                    height: 350,
                    background: 'transparent',
                    fontFamily: 'Inter, sans-serif'
                },
                plotOptions: {
                    bar: {
                        borderRadius: 4,
                        distributed: true
                    }
                },
                dataLabels: {
                    enabled: true,
                    formatter: function(val) {
                        return val + ' plots';
                    }
                },
                title: {
                    text: 'Distance to Ocean Distribution',
                    align: 'center',
                    style: {
                        fontSize: '18px',
                        fontWeight: 600,
                        color: '#fff'
                    }
                },
                xaxis: {
                    categories: Object.keys(analyticsData.traits.distanceToOcean),
                    labels: {
                        style: { colors: '#fff' }
                    }
                },
                yaxis: {
                    labels: {
                        style: { colors: '#fff' }
                    }
                }
            }
        },
        distanceToBay: {
            series: [{
                name: 'Plots',
                data: Object.values(analyticsData.traits.distanceToBay).map(d => d.count)
            }],
            options: {
                chart: {
                    type: 'bar',
                    height: 350,
                    background: 'transparent',
                    fontFamily: 'Inter, sans-serif'
                },
                plotOptions: {
                    bar: {
                        borderRadius: 4,
                        distributed: true
                    }
                },
                dataLabels: {
                    enabled: true,
                    formatter: function(val) {
                        return val + ' plots';
                    }
                },
                title: {
                    text: 'Distance to Bay Distribution',
                    align: 'center',
                    style: {
                        fontSize: '18px',
                        fontWeight: 600,
                        color: '#fff'
                    }
                },
                xaxis: {
                    categories: Object.keys(analyticsData.traits.distanceToBay),
                    labels: {
                        style: { colors: '#fff' }
                    }
                },
                yaxis: {
                    labels: {
                        style: { colors: '#fff' }
                    }
                }
            }
        },
        numericalTraits: {
            series: [{
                name: 'Plot Area',
                data: [
                    analyticsData.traits.numericalTraits.plotArea.min,
                    analyticsData.traits.numericalTraits.plotArea.max,
                    parseFloat(analyticsData.traits.numericalTraits.plotArea.avg)
                ]
            }, {
                name: 'Building Height',
                data: [
                    analyticsData.traits.numericalTraits.buildingHeight.min.min,
                    analyticsData.traits.numericalTraits.buildingHeight.max.max,
                    parseFloat(analyticsData.traits.numericalTraits.buildingHeight.max.avg)
                ]
            }],
            options: {
                chart: {
                    type: 'bar',
                    height: 350,
                    background: 'transparent',
                    fontFamily: 'Inter, sans-serif'
                },
                plotOptions: {
                    bar: {
                        horizontal: false
                    }
                },
                dataLabels: {
                    enabled: true
                },
                title: {
                    text: 'Numerical Traits Distribution',
                    align: 'center',
                    style: {
                        fontSize: '18px',
                        fontWeight: 600,
                        color: '#fff'
                    }
                },
                xaxis: {
                    categories: ['Min', 'Max', 'Average'],
                    labels: {
                        style: { colors: '#fff' }
                    }
                },
                yaxis: {
                    labels: {
                        style: { colors: '#fff' }
                    }
                }
            }
        }
    };
}