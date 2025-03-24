const axios = require('axios');
const NodeCache = require('node-cache');

// Cache with 5 minute TTL
const cache = new NodeCache({ stdTTL: 300 });

class CryptoApiService {
  constructor() {
    this.client = axios.create({
      baseURL: 'https://api.coingecko.com/api/v3',
      timeout: 10000,
      headers: {'Accept': 'application/json'}
    });
  }

  async getPrice(coinIds) {
    const cacheKey = `prices_${coinIds.join('_')}`;
    const cachedData = cache.get(cacheKey);
    
    if (cachedData) return cachedData;
    
    try {
      const response = await this.client.get('/simple/price', {
        params: {
          ids: coinIds.join(','),
          vs_currencies: 'usd',
          include_24h_change: true,
          include_market_cap: true
        }
      });
      
      cache.set(cacheKey, response.data);
      return response.data;
    } catch (error) {
      console.error('CoinGecko API error:', error.message);
      throw new Error('Failed to fetch cryptocurrency prices');
    }
  }

  async getCoinsList() {
    const cacheKey = 'coins_list';
    const cachedData = cache.get(cacheKey);
    
    if (cachedData) return cachedData;
    
    try {
      const response = await this.client.get('/coins/list');
      cache.set(cacheKey, response.data);
      return response.data;
    } catch (error) {
      console.error('CoinGecko API error:', error.message);
      throw new Error('Failed to fetch coins list');
    }
  }

  async getHistoricalData(coinId, days = 7) {
    const cacheKey = `history_${coinId}_${days}`;
    const cachedData = cache.get(cacheKey);
    
    if (cachedData) return cachedData;
    
    try {
      const response = await this.client.get(`/coins/${coinId}/market_chart`, {
        params: {
          vs_currency: 'usd',
          days: days
        }
      });
      
      cache.set(cacheKey, response.data);
      return response.data;
    } catch (error) {
      console.error('CoinGecko API error:', error.message);
      throw new Error('Failed to fetch historical data');
    }
  }
}

module.exports = new CryptoApiService();