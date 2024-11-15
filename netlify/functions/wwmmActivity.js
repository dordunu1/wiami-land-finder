import { WWMMActivityAPI } from './wwmmActivityApi.js';

// Use ES module export syntax instead of CommonJS
export const handler = async (event, context) => {
    // Enable CORS
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, OPTIONS'
    };

    // Handle preflight requests
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: ''
        };
    }

    try {
        // Extract query parameters
        const params = event.queryStringParameters || {};
        const limit = parseInt(params.limit) || 25;
        const pageKey = params.pageKey || null;

        // Get WWMM activity data
        const activityData = await WWMMActivityAPI.getRecentActivity(limit, pageKey);

        return {
            statusCode: 200,
            headers: {
                ...headers,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(activityData)
        };
    } catch (error) {
        console.error('WWMM Activity Error:', error);
        
        return {
            statusCode: 500,
            headers: {
                ...headers,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                error: 'Error fetching WWMM activity',
                message: error.message
            })
        };
    }
};