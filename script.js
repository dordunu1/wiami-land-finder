const ZONE_COLORS = {
    'RESIDENTIAL': '#0066FF',    
    'COMMERCIAL': '#FF6600',     
    'INDUSTRIAL': '#FFD700',     
    'MIXED USE': '#FF3366',      
    'LEGENDARY': '#9933CC'       
};

async function loadParcelData() {
    try {
        const response = await fetch('./data/parcels.xlsx');
        const arrayBuffer = await response.arrayBuffer();
        const data = new Uint8Array(arrayBuffer);
        
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, {
            raw: true,
            header: 'A',
            range: 'A2:Q4446'
        });

        return jsonData.map(row => ({
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
            DISTANCE_TO_BAY_M: row.P,
            ADDITIONAL_DATA: row.Q
        }));
    } catch (error) {
        console.error('Error loading parcel data:', error);
        showError('Failed to load parcel data');
        return [];
    }
}

function filterDisplayedParcels(parcels, filterText) {
    if (!filterText) return parcels;
    
    filterText = filterText.toLowerCase();
    return parcels.filter(parcel => {
        // Convert all values to lowercase strings for comparison
        const searchableValues = {
            name: parcel.NAME?.toString().toLowerCase(),
            neighborhood: parcel.NEIGHBORHOOD?.toString().toLowerCase(),
            zoning: parcel.ZONING?.toString().toLowerCase(),
            plotSize: parcel.PLOT_SIZE?.toString().toLowerCase(),
            buildingSize: parcel.BUILDING_SIZE?.toString().toLowerCase(),
            distanceOcean: parcel.DISTANCE_TO_OCEAN?.toString().toLowerCase(),
            distanceBay: parcel.DISTANCE_TO_BAY?.toString().toLowerCase(),
            floors: `${parcel.MIN_FLOORS} - ${parcel.MAX_FLOORS}`.toLowerCase(),
            plotArea: parcel.PLOT_AREA?.toString().toLowerCase(),
            buildingHeight: `${parcel.MIN_BUILDING_HEIGHT} - ${parcel.MAX_BUILDING_HEIGHT}`.toLowerCase()
        };

        // Check if any value contains the filter text
        return Object.values(searchableValues).some(value => 
            value && value.includes(filterText)
        );
    });
}

function displayParcelDetails(parcels) {
    const detailsDiv = document.getElementById('parcelDetails');
    
    if (!parcels.length) {
        detailsDiv.innerHTML = '<div class="error-message">No parcels found. Please check the Plot IDs and try again.</div>';
        return;
    }

    detailsDiv.setAttribute('data-parcels', JSON.stringify(parcels));

    const html = `
        <div class="filter-container">
            <input 
                type="text" 
                id="filterInput" 
                placeholder="Filter results by any property (e.g., 'residential', 'large', 'nexus')"
            >
            <div class="filter-stats">
                Showing <span id="filteredCount">${parcels.length}</span> of <span id="totalCount">${parcels.length}</span> parcels
            </div>
        </div>
        <div class="results-container">
            ${generateParcelCards(parcels)}
        </div>
    `;

    detailsDiv.innerHTML = html;

    // Add filter functionality
    const filterInput = document.getElementById('filterInput');
    const filteredCount = document.getElementById('filteredCount');
    const totalCount = document.getElementById('totalCount');
    const resultsContainer = detailsDiv.querySelector('.results-container');

    filterInput.addEventListener('input', (e) => {
        const filterText = e.target.value;
        const storedParcels = JSON.parse(detailsDiv.getAttribute('data-parcels'));
        const filteredParcels = filterDisplayedParcels(storedParcels, filterText);
        
        resultsContainer.innerHTML = generateParcelCards(filteredParcels);
        filteredCount.textContent = filteredParcels.length;
    });
}

// Helper function to generate parcel cards HTML
function generateParcelCards(parcels) {
    return parcels.map(parcel => `
        <div class="parcel-card" style="border-left: 4px solid ${ZONE_COLORS[parcel.ZONING] || '#FFFFFF'}">
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
            <div class="parcel-detail">
                <span class="detail-label">Building Height:</span>
                <span class="detail-value">${parcel.MIN_BUILDING_HEIGHT} - ${parcel.MAX_BUILDING_HEIGHT} m</span>
            </div>
            <div class="parcel-detail">
                <span class="detail-label">Distance to Ocean (m):</span>
                <span class="detail-value">${parcel.DISTANCE_TO_OCEAN_M}</span>
            </div>
            <div class="parcel-detail">
                <span class="detail-label">Distance to Bay (m):</span>
                <span class="detail-value">${parcel.DISTANCE_TO_BAY_M}</span>
            </div>
        </div>
    `).join('');
}

function showError(message) {
    const detailsDiv = document.getElementById('parcelDetails');
    detailsDiv.innerHTML = `<div class="error-message">${message}</div>`;
}

async function initialize() {
    const parcelsData = await loadParcelData();
    console.log('Loaded parcels:', parcelsData[0]);

    const searchButton = document.getElementById('searchButton');
    const searchInput = document.getElementById('searchInput');

    searchButton.addEventListener('click', () => {
        const searchTerms = searchInput.value.trim().toUpperCase().split(/[\s,]+/);
        console.log('Searching for:', searchTerms);

        const foundParcels = searchTerms
            .map(term => parcelsData.find(p => p.NAME?.toString().toUpperCase() === term))
            .filter(Boolean);

        if (foundParcels.length) {
            displayParcelDetails(foundParcels);
        } else {
            showError(`No parcels found. Please check the Plot IDs and try again.`);
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