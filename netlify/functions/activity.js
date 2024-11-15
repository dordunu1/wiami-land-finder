import { Alchemy, Network } from "alchemy-sdk";
import { ActivityAPI } from './activityApi.js';

export const handler = async (event) => {
    try {
        console.log('Activity request received');
        
        // Handle both GET and POST requests
        const pageKey = event.httpMethod === 'POST' 
            ? JSON.parse(event.body || '{}').pageKey
            : event.queryStringParameters?.page;
            
        const result = await ActivityAPI.getRecentSales(50, pageKey);
        
        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                success: true,
                events: result.sales, // Changed to match frontend expectation
                nextPage: result.pageKey, // Changed to match frontend expectation
                totalCount: result.sales.length
            })
        };

    } catch (error) {
        console.error('Handler error:', error);
        return {
            statusCode: 500,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                success: false,
                error: 'Internal server error',
                message: error.message
            })
        };
    }
};