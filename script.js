// Constants for colors and basic icons
const ZONE_COLORS = {
    'RESIDENTIAL': '#0066FF',
    'COMMERCIAL': '#00FF00',
    'INDUSTRIAL': '#FFD700',
    'MIXED USE': '#FF4500',
    'LEGENDARY': '#9933CC'
};

const RANK_ICON = '⭐';
const NEIGHBORHOOD_ICON = '📍';

// Function to get zoning icon
function getZoningIcon(zoning) {
    switch(zoning.toUpperCase()) {
        case 'LEGENDARY': return '💎';
        case 'MIXED USE': return '🏆';
        case 'RESIDENTIAL': return '🏠';
        case 'COMMERCIAL': return '🏢';
        case 'INDUSTRIAL': return '🏭';
        default: return '';
    }
}

async function loadParcelData() {
    try {
        const response = await fetch('./data/parcels.xlsx');
        const arrayBuffer = await response.arrayBuffer();
        const data = new Uint8Array(arrayBuffer);
        
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        
        return XLSX.utils.sheet_to_json(firstSheet, {
            raw: true,
            header: ['RANK', 'NAME', 'NEIGHBORHOOD', 'ZONING', 'PLOT_SIZE', 'BUILDING_SIZE', 
                    'DISTANCE_TO_OCEAN', 'DISTANCE_TO_BAY', 'MAX_FLOORS', 'MIN_FLOORS', 
                    'PLOT_AREA', 'MIN_BUILDING_HEIGHT', 'MAX_BUILDING_HEIGHT', 
                    'DISTANCE_TO_OCEAN_M', 'DISTANCE_TO_BAY_M'],
            range: 1
        });
    } catch (error) {
        console.error('Error loading parcel data:', error);
        throw new Error('Failed to load parcel data');
    }
}

function generateParcelCard(parcel) {
    const zoneColor = ZONE_COLORS[parcel.ZONING.toUpperCase()] || '#1E1E1E';
    
    return `
        <div class="parcel-card" style="
            background-color: ${zoneColor}99;
            backdrop-filter: blur(8px);
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);">
            <div class="card-header">
                <h2>Plot ${parcel.NAME}</h2>
                <div class="zone-icon">${getZoningIcon(parcel.ZONING)}</div>
            </div>
            <div class="parcel-detail">
                <span class="detail-label">
                    <span class="icon">${RANK_ICON}</span>
                    Rank:
                </span>
                <span class="detail-value">${parcel.RANK}</span>
            </div>
            <div class="parcel-detail">
                <span class="detail-label">
                    <span class="icon">${NEIGHBORHOOD_ICON}</span>
                    Neighborhood:
                </span>
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
            <div class="parcel-detail">
                <span class="detail-label">Building Height:</span>
                <span class="detail-value">${parcel.MIN_BUILDING_HEIGHT} - ${parcel.MAX_BUILDING_HEIGHT} m</span>
            </div>
        </div>
    `;
}

function displayParcelDetails(parcels) {
    const detailsDiv = document.getElementById('parcelDetails');
    
    if (!parcels.length) {
        detailsDiv.innerHTML = '<div class="error-message">No parcels found. Please check the Plot IDs and try again.</div>';
        return;
    }

    detailsDiv.innerHTML = `
        <div class="results-container">
            ${parcels.map(generateParcelCard).join('')}
        </div>
    `;
}

function showError(message) {
    const detailsDiv = document.getElementById('parcelDetails');
    detailsDiv.innerHTML = `<div class="error-message">${message}</div>`;
}

async function initialize() {
    try {
        const parcelsData = await loadParcelData();
        const searchButton = document.getElementById('searchButton');
        const searchInput = document.getElementById('searchInput');

        searchButton.addEventListener('click', () => {
            const searchTerms = searchInput.value.trim().toUpperCase().split(/[\s,]+/);
            
            const foundParcels = searchTerms
                .map(term => {
                    const cleanTerm = term.replace(/\s+/g, '-');
                    return parcelsData.find(p => p && p.NAME && p.NAME.toString().toUpperCase() === cleanTerm);
                })
                .filter(Boolean);

            if (foundParcels.length) {
                displayParcelDetails(foundParcels);
            } else {
                showError('No parcels found. Please check the Plot IDs and try again.');
            }
        });

        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                searchButton.click();
            }
        });
    } catch (error) {
        showError('Failed to initialize the application. Please try again later.');
        console.error('Initialization error:', error);
    }
}

// Add this helper function to convert hex to RGB
function getColorRGB(hex) {
    // Remove the # if present
    hex = hex.replace('#', '');
    
    // Convert hex to RGB
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    
    return `${r}, ${g}, ${b}`;
}

// Start the application
initialize();