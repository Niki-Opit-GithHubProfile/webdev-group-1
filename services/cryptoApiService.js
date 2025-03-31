const axios = require('axios');
const NodeCache = require('node-cache');
const Bottleneck = require('bottleneck');

// Cache with tiered TTL (different for different data types)
const cache = new NodeCache({ stdTTL: 300 });

// Rate limiter to prevent API quota issues
const limiter = new Bottleneck({
  minTime: 1500, // Minimum time between requests (1.5 seconds)
  maxConcurrent: 1, // Only process one request at a time
  reservoir: 50,    // Initial number of requests allowed
  reservoirRefreshAmount: 50, // How many requests to add back
  reservoirRefreshInterval: 60 * 1000 // Refresh interval (1 minute)
});

class CryptoApiService {
  constructor() {
    this.client = axios.create({
      baseURL: 'https://api.coingecko.com/api/v3',
      timeout: 10000,
      headers: {'Accept': 'application/json'}
    });
    
    // Initialize cache for frequently accessed data
    this.initializeCache();
  }

  // Initialize cache with frequently accessed data
  async initializeCache() {
    try {
      // Prime the cache with top cryptocurrencies
      const topCoins = ['bitcoin', 'ethereum', 'ripple', 'cardano', 'solana'];
      await this.getPrice(topCoins);
      
      // Prime historical data for bitcoin (most commonly viewed)
      await this.getHistoricalData('bitcoin', 7);
      
      console.log('Cache initialized with frequently accessed data');
    } catch (error) {
      console.error('Cache initialization error:', error.message);
    }
  }

  // Wrapper for API calls with rate limiting
  async makeRateLimitedRequest(endpoint, params = {}) {
    return limiter.schedule(() => this.client.get(endpoint, { params }));
  }

  async getPrice(coinIds) {
    const cacheKey = `prices_${coinIds.join('_')}`;
    const cachedData = cache.get(cacheKey);
    
    if (cachedData) return cachedData;
    
    try {
      const response = await this.makeRateLimitedRequest('/simple/price', {
        ids: coinIds.join(','),
        vs_currencies: 'usd',
        include_24h_change: true,
        include_market_cap: true
      });
      
      // Set a shorter TTL for price data since it changes frequently
      cache.set(cacheKey, response.data, 120); // 2 minutes TTL
      return response.data;
    } catch (error) {
      if (error.response) {
        const status = error.response.status;
        if (status === 429) {
          throw new Error('Rate limit exceeded. Please try again later.');
        } else if (status >= 500) {
          throw new Error('CoinGecko API server error. Please try again later.');
        }
      }
      console.error('CoinGecko API error:', error.message);
      throw new Error(`Failed to fetch cryptocurrency prices: ${error.message}`);
    }
  }

  async getCoinsList() {
    const cacheKey = 'coins_list';
    const cachedData = cache.get(cacheKey);
    
    if (cachedData) return cachedData;
    
    try {
      const response = await this.makeRateLimitedRequest('/coins/list');
      // Set a longer TTL for coins list as it doesn't change often
      cache.set(cacheKey, response.data, 86400); // 24 hours TTL
      return response.data;
    } catch (error) {
      if (error.response && error.response.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.');
      }
      console.error('CoinGecko API error:', error.message);
      throw new Error(`Failed to fetch coins list: ${error.message}`);
    }
  }

  async getHistoricalData(coinId, days = 7, currency = 'usd') {
    if (!coinId) {
      throw new Error('Coin ID is required');
    }
    
    // Validate days parameter
    const validDays = ['1', '7', '14', '30', '90', '180', '365', '1825', '1d', '7d', '14d', '30d', '90d', '180d', '365d', '1825d', 'max'];
    const daysParam = String(days);
    if (!validDays.includes(daysParam) && !Number.isInteger(Number(days))) {
      throw new Error('Invalid days parameter. Must be a valid number or timeframe string.');
    }
    
    const cacheKey = `history_${coinId}_${days}_${currency}`;
    const cachedData = cache.get(cacheKey);
    
    if (cachedData) return cachedData;
    
    try {
      const response = await this.makeRateLimitedRequest(`/coins/${coinId}/market_chart`, {
        vs_currency: currency,
        days: days
      });
      
      // Validate response data
      if (!response.data || !response.data.prices || !Array.isArray(response.data.prices)) {
        throw new Error('Invalid response format from API');
      }
      
      // Set TTL based on timeframe - shorter for recent data, longer for historical
      const ttl = days <= 7 ? 300 : days <= 30 ? 1800 : 3600; // 5min, 30min, or 1hr
      cache.set(cacheKey, response.data, ttl);
      
      return response.data;
    } catch (error) {
      if (error.response) {
        const status = error.response.status;
        if (status === 429) {
          throw new Error('Rate limit exceeded. Please try again later.');
        } else if (status === 404) {
          throw new Error(`Cryptocurrency with ID '${coinId}' not found`);
        } else if (status >= 500) {
          throw new Error('CoinGecko API server error. Please try again later.');
        }
      }
      console.error('CoinGecko API error:', error.message);
      throw new Error(`Failed to fetch historical data: ${error.message}`);
    }
  }
  
}

module.exports = new CryptoApiService();