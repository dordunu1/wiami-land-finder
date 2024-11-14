import fs from 'fs';
import path from 'path';
import { createTraitCharts } from '../../blockchain/Charts';


const METADATA_FILE = path.join(__dirname, 'data', 'metadata.json');
const CACHE_FILE = path.join(__dirname, '.cache', 'analytics.json');
const CACHE_DURATION = 3600 * 1000;
// Helper function to add delay between requests
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function getCachedData() {
    try {
        if (fs.existsSync(CACHE_FILE)) {
            const data = JSON.parse(fs.readFileSync(CACHE_FILE));
            
            // Add metadata about data completeness
            return {
                ...data.analytics,
                metadata: {
                    isPartialData: data.analytics.collection.processedNFTs < 4444,
                    processedCount: data.analytics.collection.processedNFTs,
                    totalExpected: 4444,
                    lastUpdated: new Date(data.timestamp).toISOString(),
                    completionPercentage: ((data.analytics.collection.processedNFTs / 4444) * 100).toFixed(1)
                }
            };
        }
    } catch (error) {
        console.error("Cache read error:", error);
    }
    return null;
}

async function saveToCache(analytics, isComplete = false) {
    try {
        if (!fs.existsSync('.cache')) {
            fs.mkdirSync('.cache');
        }
        fs.writeFileSync(CACHE_FILE, JSON.stringify({
            timestamp: Date.now(),
            analytics,
            isComplete,
            lastProcessedCount: analytics.collection.processedNFTs
        }));
    } catch (error) {
        console.error("Cache write error:", error);
    }
}

export async function handler(event, context) {
    try {
        console.log("1. Starting metadata processing...");
        
        // Debug file path
        console.log("Metadata file path:", METADATA_FILE);
        console.log("File exists:", fs.existsSync(METADATA_FILE));

        // Read file contents
        const fileContents = fs.readFileSync(METADATA_FILE, 'utf8');
        console.log("File size:", fileContents.length, "bytes");

        // Parse JSON with validation
        let rawData;
        try {
            rawData = JSON.parse(fileContents);
            console.log("Raw data type:", typeof rawData);
            console.log("Raw data keys:", Object.keys(rawData));
            console.log("NFTs array length:", rawData.nfts?.length);
            
            // Log first NFT for debugging
            if (rawData.nfts?.[0]) {
                console.log("First NFT structure:", JSON.stringify(rawData.nfts[0], null, 2));
            }
        } catch (parseError) {
            console.error("JSON parse error:", parseError);
            throw parseError;
        }

        if (!rawData.nfts || !Array.isArray(rawData.nfts)) {
            throw new Error(`Invalid data structure. Expected nfts array, got: ${typeof rawData.nfts}`);
        }

        // Initialize counters with debug logging
        let processedCount = 0;
        const traitCounts = {
            'Neighborhood': {},
            'Zoning Type': {},
            'Plot Size': {},
            'Building Size': {},
            'Distance To Ocean': {},
            'Distance To Bay': {},
            'Plot Area (M²)': {},
            'Min Building Height (M)': {},
            'Max Building Height (M)': {},
            'Min # Of Floors': {},
            'Max # Of Floors': {},
            'Distance To Ocean (M)': {},
            'Distance To Bay (M)': {}
        };

        // Process NFTs with detailed logging
        rawData.nfts.forEach((nft, index) => {
            console.log(`Processing NFT ${index + 1}/${rawData.nfts.length}`);
            
            if (!nft.metadata?.attributes) {
                console.log(`NFT ${index + 1} missing attributes:`, nft);
                return;
            }

            nft.metadata.attributes.forEach(attr => {
                const traitType = attr.trait_type;
                const value = attr.value.toString();
                
                if (traitCounts[traitType]) {
                    traitCounts[traitType][value] = (traitCounts[traitType][value] || 0) + 1;
                    console.log(`Added trait: ${traitType} = ${value} (count: ${traitCounts[traitType][value]})`);
                }
            });
            
            processedCount++;
            
            if (index === 0) {
                console.log("First NFT trait counts:", traitCounts);
            }
        });

        console.log("Final processed count:", processedCount);
        console.log("Final trait counts:", traitCounts);

        // Create analytics object
        const analytics = {
            collection: {
                name: "Wilder Land: The Island",
                symbol: "WIAMI",
                totalSupply: 4444,
                processedNFTs: processedCount
            },
            traits: {
                neighborhood: calculatePercentages(traitCounts['Neighborhood'], processedCount),
                zoning: calculatePercentages(traitCounts['Zoning Type'], processedCount),
                plotSize: calculatePercentages(traitCounts['Plot Size'], processedCount),
                buildingSize: calculatePercentages(traitCounts['Building Size'], processedCount),
                distanceToOcean: calculatePercentages(traitCounts['Distance To Ocean'], processedCount),
                distanceToBay: calculatePercentages(traitCounts['Distance To Bay'], processedCount),
                numericalTraits: {
                    plotArea: calculateAverages(traitCounts['Plot Area (M²)']),
                    buildingHeight: {
                        min: calculateAverages(traitCounts['Min Building Height (M)']),
                        max: calculateAverages(traitCounts['Max Building Height (M)'])
                    },
                    floors: {
                        min: calculateAverages(traitCounts['Min # Of Floors']),
                        max: calculateAverages(traitCounts['Max # Of Floors'])
                    },
                    exactDistances: {
                        ocean: calculateAverages(traitCounts['Distance To Ocean (M)']),
                        bay: calculateAverages(traitCounts['Distance To Bay (M)'])
                    }
                }
            }
        };

        console.log("Generated analytics:", analytics);

        // Save to cache
        await saveToCache(analytics, true);
        
        // Create charts configuration
        const chartConfigs = createTraitCharts(analytics);
        
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'public, max-age=3600'
            },
            body: JSON.stringify({
                success: true,
                data: analytics,
                chartConfigs: chartConfigs,
                isPartialData: false,
                dataCompleteness: "100%"
            })
        };

    } catch (error) {
        console.error("Detailed error:", error);
        console.error("Stack trace:", error.stack);
        return {
            statusCode: 500,
            body: JSON.stringify({
                success: false,
                error: "Failed to process analytics",
                details: error.message,
                stack: error.stack
            })
        };
    }
}

function calculatePercentages(traitCount, total) {
    console.log(`Calculating percentages for trait with ${Object.keys(traitCount).length} values`);
    console.log("Input trait count:", traitCount);
    console.log("Total:", total);
    
    const result = {};
    for (const [trait, count] of Object.entries(traitCount)) {
        result[trait] = {
            count,
            percentage: ((count / total) * 100).toFixed(2)
        };
    }
    console.log("Calculated percentages:", result);
    return result;
}

function calculateAverages(values) {
    // Convert string values to numbers and filter out any non-numeric values
    const numbers = Object.entries(values)
        .map(([key, count]) => ({ value: parseFloat(key), count }))
        .filter(item => !isNaN(item.value));

    if (numbers.length === 0) return { min: 0, max: 0, avg: 0 };
    
    // Calculate weighted average based on count
    const total = numbers.reduce((sum, item) => sum + (item.value * item.count), 0);
    const count = numbers.reduce((sum, item) => sum + item.count, 0);
    
    return {
        min: Math.min(...numbers.map(n => n.value)),
        max: Math.max(...numbers.map(n => n.value)),
        avg: (total / count).toFixed(2)
    };
}

