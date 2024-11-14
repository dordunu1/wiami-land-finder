// @ts-nocheck
import ActivityAPI from '/js/activityApi.js';
import Utils from '/js/utils.js';

class AnalyticsGraph {
    constructor() {
        if (!window.Chart) {
            console.error('Chart.js is not loaded! Analytics will not work.');
            return;
        }

        if (AnalyticsGraph.instance) {
            return AnalyticsGraph.instance;
        }
        
        AnalyticsGraph.instance = this;
        this.charts = {};
        this.data = null;
    }

    async initializeCharts() {
        if (!window.Chart) {
            console.error('Chart.js is not loaded!');
            return;
        }

        try {
            const analyticsData = await ActivityAPI.getAnalytics();
            this.data = analyticsData;

            // Clear existing charts
            if (this.charts.zoning) this.charts.zoning.destroy();
            if (this.charts.neighborhood) this.charts.neighborhood.destroy();

            // Create new charts
            const zoningCtx = document.getElementById('zoning-chart');
            const neighborhoodCtx = document.getElementById('neighborhood-chart');

            if (zoningCtx) {
                this.charts.zoning = new Chart(zoningCtx, {
                    type: 'pie',
                    data: {
                        labels: Object.keys(this.data.holdingsByZone || {}),
                        datasets: [{
                            data: Object.values(this.data.holdingsByZone || {}),
                            backgroundColor: this.getChartColors()
                        }]
                    }
                });
            }

            if (neighborhoodCtx) {
                this.charts.neighborhood = new Chart(neighborhoodCtx, {
                    type: 'pie',
                    data: {
                        labels: Object.keys(this.data.holdingsByNeighborhood || {}),
                        datasets: [{
                            data: Object.values(this.data.holdingsByNeighborhood || {}),
                            backgroundColor: this.getChartColors()
                        }]
                    }
                });
            }
        } catch (error) {
            console.error('Error initializing charts:', error);
        }
    }

    getChartColors() {
        return [
            '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF',
            '#FF9F40', '#FF6384', '#C9CBCF', '#7BC225', '#B56DED'
        ];
    }

    async updateCharts(filters = {}) {
        try {
            const newData = await ActivityAPI.getAnalytics(filters);
            if (!newData) return;

            this.data = newData;
            
            if (this.charts.zoning) {
                this.updateChartData(this.charts.zoning, newData.holdingsByZone);
            }
            if (this.charts.neighborhood) {
                this.updateChartData(this.charts.neighborhood, newData.holdingsByNeighborhood);
            }
            if (this.charts.price) {
                this.updatePriceChart(this.charts.price, newData.priceHistory);
            }
        } catch (error) {
            console.error('Error updating charts:', error);
        }
    }

    updateChartData(chart, newData = {}) {
        if (!chart) return;
        
        chart.data.labels = Object.keys(newData);
        chart.data.datasets[0].data = Object.values(newData);
        chart.update();
    }
}

// Create and export a singleton instance
const analyticsGraph = new AnalyticsGraph();
export default analyticsGraph;