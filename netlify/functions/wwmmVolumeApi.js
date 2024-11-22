import { ethers } from 'ethers';

const RESERVOIR_API_URL = "https://api.reservoir.tools";
const RESERVOIR_API_KEY = "ac3f642b-6b7a-5ed3-910c-9792832c9a6b";
const WWMM_CONTRACT = "0xd396ca541F501f5D303166C509e2045848df356b";
const WILD_TOKEN = "0x2a3bFF78B79A009976EeA096a51A948a3dC00e34";

class WWMMVolumeAPI {
    static async getWildPrice() {
        try {
            const response = await fetch(
                'https://api.coingecko.com/api/v3/simple/token_price/ethereum?contract_addresses=0x2a3bFF78B79A009976EeA096a51A948a3dC00e34&vs_currencies=usd'
            );
            const data = await response.json();
            return data['0x2a3bff78b79a009976eea096a51a948a3dc00e34'].usd;
        } catch (error) {
            console.warn('Failed to fetch WILD price:', error);
            return null;
        }
    }

    static async getVolumeStats() {
        try {
            const now = Math.floor(Date.now() / 1000);
            const oneDayAgo = now - 24 * 60 * 60;
            const sevenDaysAgo = now - 7 * 24 * 60 * 60;

            // Fetch all sales at once with a high limit
            let url = `${RESERVOIR_API_URL}/sales/v6?contract=${WWMM_CONTRACT}&limit=100&payment=${WILD_TOKEN}`;

            const response = await fetch(url, {
                headers: {
                    'accept': '*/*',
                    'x-api-key': RESERVOIR_API_KEY
                }
            });

            if (!response.ok) {
                throw new Error(`Reservoir API error: ${response.status}`);
            }

            const data = await response.json();
            
            const volumes = {
                oneDay: { volume: BigInt(0), count: 0 },
                sevenDay: { volume: BigInt(0), count: 0 },
                allTime: { volume: BigInt(0), count: 0 }
            };

            // Process all sales
            data.sales?.forEach(sale => {
                const isWildSale = sale.price?.currency?.contract?.toLowerCase() === WILD_TOKEN.toLowerCase();
                const isWWMMSale = sale.fillSource?.toLowerCase()?.includes('wilder') || 
                                 sale.orderSource?.toLowerCase()?.includes('wilder');

                if (isWildSale && isWWMMSale) {
                    const saleValue = BigInt(sale.price.amount.raw);
                    volumes.allTime.volume += saleValue;
                    volumes.allTime.count++;

                    if (sale.timestamp >= sevenDaysAgo) {
                        volumes.sevenDay.volume += saleValue;
                        volumes.sevenDay.count++;

                        if (sale.timestamp >= oneDayAgo) {
                            volumes.oneDay.volume += saleValue;
                            volumes.oneDay.count++;
                        }
                    }
                }
            });

            const wildPrice = await this.getWildPrice();
            
            return {
                oneDay: {
                    volume: ethers.formatEther(volumes.oneDay.volume.toString()),
                    volumeUSD: wildPrice ? (Number(ethers.formatEther(volumes.oneDay.volume.toString())) * wildPrice).toFixed(2) : null,
                    count: volumes.oneDay.count
                },
                sevenDay: {
                    volume: ethers.formatEther(volumes.sevenDay.volume.toString()),
                    volumeUSD: wildPrice ? (Number(ethers.formatEther(volumes.sevenDay.volume.toString())) * wildPrice).toFixed(2) : null,
                    count: volumes.sevenDay.count
                },
                allTime: {
                    volume: ethers.formatEther(volumes.allTime.volume.toString()),
                    volumeUSD: wildPrice ? (Number(ethers.formatEther(volumes.allTime.volume.toString())) * wildPrice).toFixed(2) : null,
                    count: volumes.allTime.count
                },
                wildPrice: wildPrice
            };
        } catch (error) {
            console.error("Error fetching volume stats:", error);
            return {
                oneDay: { volume: "0", volumeUSD: null, count: 0 },
                sevenDay: { volume: "0", volumeUSD: null, count: 0 },
                allTime: { volume: "0", volumeUSD: null, count: 0 },
                wildPrice: null
            };
        }
    }
}

export { WWMMVolumeAPI };