// Define the columns based on your Excel header
const COLUMNS = {
    RANK: 0,           // Column B
    NAME: 1,          // Column C
    NEIGHBORHOOD: 2,   // Column D
    ZONING: 3,        // Column E
    PLOT_SIZE: 4,     // Column F
    BUILDING_SIZE: 5,  // Column G
    DISTANCE_TO_OCEAN: 6,  // Column H
    DISTANCE_TO_BAY: 7,    // Column I
    MAX_FLOORS: 8,        // Column J
    MIN_FLOORS: 9,        // Column K
    PLOT_AREA: 10,        // Column L
    MIN_BUILDING_HEIGHT: 11, // Column M
    MAX_BUILDING_HEIGHT: 12, // Column N
    DISTANCE_TO_OCEAN_M: 13, // Column O
    DISTANCE_TO_BAY_M: 14    // Column P
};

// Add zone colors for visualization
const ZONE_COLORS = {
    'RESIDENTIAL': '#0066FF',    // Blue
    'COMMERCIAL': '#FF6600',     // Orange
    'INDUSTRIAL': '#FFD700',     // Yellow
    'MIXED USE': '#FF3366',      // Pink
    'LEGENDARY': '#9933CC'       // Purple
};

// Define neighborhood centers
const NEIGHBORHOOD_CENTERS = {
    'NEXUS': [800, 1600],
    'FLASHING LIGHTS': [600, 1200],
    'SPACE MIND': [400, 800],
    'DISTRICT ZERO': [200, 400],
    'NORTH STAR': [700, 1400],
    'LITTLE MEOW': [300, 600],
    'HAVEN HEIGHTS': [500, 1000],
    'TRANQUILITY GARDENS': [900, 1800]
};

// Initialize the map
const map = L.map('map', {
    crs: L.CRS.Simple,
    minZoom: -2,
    maxZoom: 4
});

// Add your map image with better resolution settings
const imageUrl = 'images/map.jpg';
const imageBounds = [[0, 0], [1000, 2000]];
L.imageOverlay(imageUrl, imageBounds, {
    opacity: 1,
    interactive: true
}).addTo(map);

// Set initial view
map.fitBounds(imageBounds);

// Load and parse Excel data
async function loadParcelData() {
    try {
        const response = await fetch('data/parcels.xlsx');
        const arrayBuffer = await response.arrayBuffer();
        const data = new Uint8Array(arrayBuffer);
        
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        
        // Convert to JSON with specific options
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, {
            raw: true,
            header: 'A',
            range: 'B3:P4446'  // Start from B3 to skip headers
        });

        const parsedData = jsonData.map(row => ({
            RANK: row.B,
            NAME: row.C,
            NEIGHBORHOOD: row.D,
            ZONING: row.E,
            PLOT_SIZE: row.F,
            BUILDING_SIZE: row.G,
            DISTANCE_TO_OCEAN: row.H,
            DISTANCE_TO_BAY: row.I,
            MAX_FLOORS: row.J,
            MIN_FLOORS: row.K,
            PLOT_AREA: row.L,
            MIN_BUILDING_HEIGHT: row.M,
            MAX_BUILDING_HEIGHT: row.N,
            DISTANCE_TO_OCEAN_M: row.O,
            DISTANCE_TO_BAY_M: row.P
        }));

        console.log('First parsed parcel:', parsedData[0]);
        return parsedData;
    } catch (error) {
        console.error('Error loading parcel data:', error);
        showError('Failed to load parcel data');
        return [];
    }
}

function displayParcelDetails(parcel) {
    const detailsDiv = document.getElementById('parcelDetails');
    
    if (!parcel) {
        detailsDiv.innerHTML = '<div class="error-message">No parcel found. Please check the Plot ID and try again.</div>';
        return;
    }

    let html = `
        <div class="parcel-details">
            <h2>Plot ${parcel.NAME}</h2>
            <div class="parcel-detail">
                <span class="detail-label">Rank:</span>
                <span class="detail-value">${parcel.RANK}</span>
            </div>
            <div class="parcel-detail">
                <span class="detail-label">Neighborhood:</span>
                <span class="detail-value">${parcel.NEIGHBORHOOD}</span>
            </div>
            <div class="parcel-detail">
                <span class="detail-label">Zoning:</span>
                <span class="detail-value">${parcel.ZONING}</span>
            </div>
            <div class="parcel-detail">
                <span class="detail-label">Plot Size:</span>
                <span class="detail-value">${parcel.PLOT_SIZE}</span>
            </div>
            <div class="parcel-detail">
                <span class="detail-label">Building Size:</span>
                <span class="detail-value">${parcel.BUILDING_SIZE}</span>
            </div>
            <div class="parcel-detail">
                <span class="detail-label">Distance to Ocean:</span>
                <span class="detail-value">${parcel.DISTANCE_TO_OCEAN}</span>
            </div>
            <div class="parcel-detail">
                <span class="detail-label">Distance to Bay:</span>
                <span class="detail-value">${parcel.DISTANCE_TO_BAY}</span>
            </div>
            <div class="parcel-detail">
                <span class="detail-label">Floors:</span>
                <span class="detail-value">${parcel.MIN_FLOORS} - ${parcel.MAX_FLOORS}</span>
            </div>
            <div class="parcel-detail">
                <span class="detail-label">Plot Area:</span>
                <span class="detail-value">${parcel.PLOT_AREA} m²</span>
            </div>
        </div>
    `;

    detailsDiv.innerHTML = html;
}

function showError(message) {
    const detailsDiv = document.getElementById('parcelDetails');
    detailsDiv.innerHTML = `<div class="error-message">${message}</div>`;
}

function calculatePlotBounds(parcel) {
    const plotWidth = 20;
    const plotHeight = 20;
    const center = NEIGHBORHOOD_CENTERS[parcel.NEIGHBORHOOD] || [500, 500];

    return [
        [center[0] - plotHeight/2, center[1] - plotWidth/2],
        [center[0] + plotHeight/2, center[1] + plotWidth/2]
    ];
}

function zoomToParcel(parcel) {
    if (!parcel) return;

    const center = NEIGHBORHOOD_CENTERS[parcel.NEIGHBORHOOD] || [500, 1000];
    const plotBounds = [
        [center[0] - 50, center[1] - 50],
        [center[0] + 50, center[1] + 50]
    ];

    map.flyToBounds(plotBounds, {
        duration: 1,
        maxZoom: 2,
        padding: [50, 50]
    });

    if (window.currentHighlight) {
        map.removeLayer(window.currentHighlight);
    }

    const zoneColor = ZONE_COLORS[parcel.ZONING] || '#FFFFFF';
    window.currentHighlight = L.rectangle(plotBounds, {
        color: zoneColor,
        weight: 2,
        fillOpacity: 0.3
    }).addTo(map);
}

async function initialize() {
    const parcelsData = await loadParcelData();
    console.log('Loaded parcels:', parcelsData[0]);

    const searchButton = document.getElementById('searchButton');
    const searchInput = document.getElementById('searchInput');

    searchButton.addEventListener('click', () => {
        const searchTerm = searchInput.value.trim().toUpperCase();
        console.log('Searching for:', searchTerm);

        const parcel = parcelsData.find(p => p.NAME?.toString().toUpperCase() === searchTerm);

        if (parcel) {
            displayParcelDetails(parcel);
            zoomToParcel(parcel);
        } else {
            const availableNames = parcelsData
                .slice(0, 5)
                .map(p => p.NAME)
                .filter(Boolean)
                .join(', ');
            showError(`No parcel found for "${searchTerm}". First few available names: ${availableNames}`);
        }
    });

    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            searchButton.click();
        }
    });
}

// Start the application
initialize();