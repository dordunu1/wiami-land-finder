import { Alchemy, Network } from "alchemy-sdk";
import { ActivityAPI } from '../../js/activityApi.js';

export const handler = async (event) => {
    try {
        if (event.httpMethod === 'POST') {
            console.log('Activity request received');
            
            const body = JSON.parse(event.body || '{}');
            const pageKey = body.pageKey; // Get pageKey from request
            
            const result = await ActivityAPI.getRecentSales(50, pageKey);
            
            return {
                statusCode: 200,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    success: true,
                    activity: result.sales,
                    nextPageKey: result.pageKey,
                    totalCount: result.sales.length
                })
            };
        }
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