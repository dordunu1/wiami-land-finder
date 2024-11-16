import fetch from 'node-fetch';

const collection_slug = 'wilder-land-the-island';

export const handler = async (event) => {
    try {
        if (!process.env.OPENSEA_API_KEY) {
            throw new Error('OpenSea API key is not configured');
        }

        let allListings = [];
        let next = null;
        
        do {
            // Build URL with cursor if we have one
            const url = `https://api.opensea.io/api/v2/listings/collection/${collection_slug}/all?limit=50${next ? `&next=${next}` : ''}`;
            
            console.log('Requesting URL:', url);

            const response = await fetch(url, {
                headers: {
                    'accept': 'application/json',
                    'x-api-key': process.env.OPENSEA_API_KEY
                }
            });

            if (!response.ok) {
                throw new Error(`OpenSea API responded with status ${response.status}`);
            }

            const data = await response.json();
            
            // Add listings to our collection
            if (data.listings) {
                allListings = [...allListings, ...data.listings];
            }
            
            // Get next cursor for pagination
            next = data.next;
            
            // Continue until we have no more pages or hit a reasonable limit
            // Adjust the 200 to a higher number if needed
        } while (next && allListings.length < 200);

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
            statusCode: 200,
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