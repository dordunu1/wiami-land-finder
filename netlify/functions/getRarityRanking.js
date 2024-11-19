import { readFile, utils } from 'xlsx';
import { join } from 'path';
import { cwd } from 'process';
import { existsSync } from 'fs';

let rankingsCache = null;

async function initializeRankings() {
    if (rankingsCache) return rankingsCache;
    
    const filePath = join(cwd(), 'netlify', 'functions', 'data', 'parcels.xlsx');
    
    if (!existsSync(filePath)) {
        throw new Error(`XLSX file not found at path: ${filePath}`);
    }

    const workbook = readFile(filePath);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    
    const data = utils.sheet_to_json(worksheet, {
        raw: true,
        defval: null
    });
    
    const rankings = {};
    
    data.forEach((row, index) => {
        // Skip the header row
        if (row.__EMPTY === 'Rank') return;
        
        const rank = row.__EMPTY;      // Rank is in __EMPTY
        const name = row.__EMPTY_1;    // Name is in __EMPTY_1
        
        if (name && rank && typeof rank === 'number') {
            const cleanName = name.trim();
            rankings[cleanName] = rank;
            rankings[cleanName.toUpperCase()] = rank;
            rankings[cleanName.toLowerCase()] = rank;
        }
    });

    console.log('Number of rankings loaded:', Object.keys(rankings).length);
    console.log('Sample of rankings:', Object.entries(rankings).slice(0, 10));
    
    if (Object.keys(rankings).length < 4000) {
        console.error('Warning: Less than 4000 rankings loaded. Expected 4444.');
    }

    rankingsCache = rankings;
    return rankings;
}

export const handler = async function() {
    try {
        // Force reload if cache is too small
        if (rankingsCache && Object.keys(rankingsCache).length < 4000) {
            rankingsCache = null;
        }
        
        if (!rankingsCache) {
            await initializeRankings();
        }
        
        if (!rankingsCache) {
            throw new Error('Failed to load rankings');
        }

        console.log('Serving cached rankings, total entries:', Object.keys(rankingsCache).length);
        
        // Add some test lookups
        console.log('Test lookups:');
        ['NX-1', 'FL-163', 'FL-192'].forEach(name => {
            console.log(`${name}: ${rankingsCache[name]}`);
        });

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify(rankingsCache)
        };
    } catch (error) {
        console.error('Error serving rankings:', error);
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({ 
                error: 'Failed to load rarity rankings',
                details: error.message,
                stack: error.stack
            })
        };
    }
};