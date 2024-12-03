import fetch from 'node-fetch';

const RESERVOIR_API_URL = "https://api.reservoir.tools";
const RESERVOIR_API_KEY = process.env.RESERVOIR_API_KEY;
const WIAMI_CONTRACT = "0xd396ca541F501f5D303166C509e2045848df356b";
const WILD_TOKEN = "0x2a3bFF78B79A009976EeA096a51A948a3dC00e34";

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

export const handler = async (event) => {
    try {
        if (!RESERVOIR_API_KEY) {
            throw new Error('Reservoir API key is not configured');
        }

        let allListings = [];
        let continuation = null;
        let retryCount = 0;
        const maxRetries = 3;
        
        do {
            try {
                const params = new URLSearchParams({
                    contract: WIAMI_CONTRACT,
                    status: 'active',
                    sortBy: 'price',
                    limit: '10',
                    payment: WILD_TOKEN,
                    includeCriteriaMetadata: 'true',
                    includeRawData: 'false',
                    normalizeRoyalties: 'true'
                });

                if (continuation) {
                    params.append('continuation', continuation);
                }
                
                const url = `${RESERVOIR_API_URL}/orders/asks/v4?${params}`;
                console.log('Requesting URL:', url);
                
                const response = await fetch(url, {
                    headers: {
                        'accept': 'application/json',
                        'x-api-key': RESERVOIR_API_KEY
                    }
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    console.error('API Response:', errorText);
                    throw new Error(`Reservoir API error: ${response.status}`);
                }

                const data = await response.json();
                console.log('Response data:', JSON.stringify(data, null, 2));
                
                if (data.orders && data.orders.length > 0) {
                    const validOrders = data.orders.filter(order => 
                        order.currency?.contract?.toLowerCase() === WILD_TOKEN.toLowerCase() &&
                        order.status === 'active'
                    );
                    console.log('Valid orders found:', validOrders.length);
                    allListings = [...allListings, ...validOrders];
                }
                
                continuation = data.continuation;
                retryCount = 0;
                
                if (allListings.length >= 50) break;
                
                await delay(500);
                
            } catch (error) {
                console.error('Request error:', error);
                if (retryCount < maxRetries) {
                    retryCount++;
                    await delay(1000 * retryCount);
                    continue;
                }
                throw error;
            }
        } while (continuation && allListings.length < 50);

        console.log('Total listings fetched:', allListings.length);

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                listings: allListings
            })
        };
    } catch (error) {
        console.error('Error:', error);
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                error: error.message
            })
        };
    }
};