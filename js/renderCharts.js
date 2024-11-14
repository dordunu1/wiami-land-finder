export function renderCharts(chartConfigs) {
    // Show the analytics container
    document.getElementById('analytics-container').style.display = 'block';

    // Neighborhood Chart
    new ApexCharts(
        document.getElementById('neighborhood-chart'),
        {
            ...chartConfigs.neighborhood.options,
            series: chartConfigs.neighborhood.series,
            labels: chartConfigs.neighborhood.labels
        }
    ).render();

    // Zoning Chart
    new ApexCharts(
        document.getElementById('zoning-chart'),
        {
            ...chartConfigs.zoning.options,
            series: chartConfigs.zoning.series
        }
    ).render();

    // Plot Size Chart
    new ApexCharts(
        document.getElementById('plot-size-chart'),
        {
            ...chartConfigs.plotSize.options,
            series: chartConfigs.plotSize.series
        }
    ).render();

    // Building Height Chart
    new ApexCharts(
        document.getElementById('building-height-chart'),
        {
            ...chartConfigs.buildingHeight.options,
            series: chartConfigs.buildingHeight.series
        }
    ).render();

    // Distance to Ocean Chart
    new ApexCharts(
        document.getElementById('distance-ocean-chart'),
        {
            ...chartConfigs.distanceToOcean.options,
            series: chartConfigs.distanceToOcean.series
        }
    ).render();

    // Distance to Bay Chart
    new ApexCharts(
        document.getElementById('distance-bay-chart'),
        {
            ...chartConfigs.distanceToBay.options,
            series: chartConfigs.distanceToBay.series
        }
    ).render();

    // Numerical Traits Chart
    new ApexCharts(
        document.getElementById('numerical-traits-chart'),
        {
            ...chartConfigs.numericalTraits.options,
            series: chartConfigs.numericalTraits.series
        }
    ).render();
}