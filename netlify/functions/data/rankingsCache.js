import { readFile, utils } from 'xlsx';
import { join } from 'path';
import { cwd } from 'process';
import { writeFileSync, existsSync, readFileSync } from 'fs';

const CACHE_FILE = join(cwd(), 'netlify', 'functions', 'data', 'rankings-cache.json');
const XLSX_FILE = join(cwd(), 'netlify', 'functions', 'data', 'parcels.xlsx');

export async function getRankings() {
    try {
        // Try to read from JSON cache first
        if (existsSync(CACHE_FILE)) {
            const cached = JSON.parse(readFileSync(CACHE_FILE, 'utf8'));
            if (cached && Object.keys(cached).length >= 4000) {
                return cached;
            }
        }

        // If no cache or invalid cache, read from XLSX
        if (!existsSync(XLSX_FILE)) {
            throw new Error('XLSX file not found');
        }

        const workbook = readFile(XLSX_FILE);
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const data = utils.sheet_to_json(worksheet, { raw: true });
        
        const rankings = {};
        
        data.forEach(row => {
            if (row.__EMPTY === 'Rank') return;
            
            const rank = row.__EMPTY;
            const name = row.__EMPTY_1;
            
            if (name && rank && typeof rank === 'number') {
                rankings[name.trim()] = rank;
            }
        });

        // Save to cache file
        if (Object.keys(rankings).length >= 4000) {
            writeFileSync(CACHE_FILE, JSON.stringify(rankings));
        }

        return rankings;
    } catch (error) {
        console.error('Error loading rankings:', error);
        throw error;
    }
}