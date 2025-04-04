const axios = require('axios');
const NodeCache = require('node-cache');
const Bottleneck = require('bottleneck');
const { normalizePrice, normalizeHistoricalData, normalizeCoinsList } = require('../utils/dataNormalizers');

// Cache with tiered TTL (different for different data types)
const cache = new NodeCache({ stdTTL: 300 });

// Rate limiter to prevent API quota issues - more conservative for free tier
const limiter = new Bottleneck({
  minTime: 3000,     // Minimum time between requests (3 seconds for free tier)
  maxConcurrent: 1,  // Only process one request at a time
  reservoir: 10,     // Initial number of requests allowed (CoinGecko free tier is ~10-50/min)
  reservoirRefreshAmount: 10, // How many requests to add back
  reservoirRefreshInterval: 60 * 1000, // Refresh interval (1 minute)
  // Add exponential backoff for failures
  retryOptions: {
    retries: 3,
    minTimeout: 5000,
    maxTimeout: 60000,
    backoffFactor: 2
  }
});

// Track remaining API calls and adjust rate limiter dynamically
let remainingAPICalls = 10; // Start conservative

class CryptoApiService {
  constructor() {
    // Load environment variables or use defaults
    const apiKey = process.env.COINGECKO_API_KEY || '';
    const apiUrl = process.env.COINGECKO_API_URL || 'https://api.coingecko.com/api/v3';
    const apiTimeout = parseInt(process.env.COINGECKO_API_TIMEOUT || '10000', 10);

    // Create axios client with environment configuration
    this.client = axios.create({
      baseURL: apiUrl,
      timeout: apiTimeout,
      headers: {
        'Accept': 'application/json',
        ...(apiKey && {'x-cg-pro-api-key': apiKey})  // Only add API key if it exists
      }
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
    try {
      const response = await limiter.schedule(() => this.client.get(endpoint, { params }));
      
      // Check response headers for rate limit information
      const remaining = parseInt(response.headers['x-ratelimit-remaining'] || remainingAPICalls, 10);
      
      // Update our understanding of remaining calls
      remainingAPICalls = remaining;
      
      // Adjust limiter settings based on remaining calls
      if (remaining < 3) {
        // Very low remaining calls, increase delay significantly
        limiter.updateSettings({ minTime: 10000 });
      } else if (remaining < 10) {
        // Low remaining calls, increase delay
        limiter.updateSettings({ minTime: 5000 });
      } else {
        // Normal operation
        limiter.updateSettings({ minTime: 3000 });
      }
      
      return response;
    } catch (error) {
      // Check if it's a rate limit error
      if (error.response && error.response.status === 429) {
        // Reduce limits dramatically on rate limit error
        limiter.updateSettings({ 
          minTime: 30000,
          reservoir: Math.max(1, remainingAPICalls - 1)
        });
        remainingAPICalls = Math.max(0, remainingAPICalls - 1);
      }
      throw error;
    }
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
      
      // Log raw response for debugging
      console.log('CoinGecko raw response:', JSON.stringify(response.data).substring(0, 200) + '...');
      
      // Map API response to our DTO format using normalizer
      const normalizedData = normalizePrice(response.data);
      
      // Set a shorter TTL for price data since it changes frequently
      cache.set(cacheKey, normalizedData, 120); // 2 minutes TTL
      return normalizedData;

    } catch (error) {
      if (error.response) {
        const status = error.response.status;
        if (status === 429) {
          throw new Error('Rate limit exceeded. Please try again later.');
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
      
      // Map API response to our DTO format
      const normalizedData = normalizeCoinsList(response.data);
      
      // Set a longer TTL for coins list as it doesn't change often
      cache.set(cacheKey, normalizedData, 86400); // 24 hours TTL
      return normalizedData;

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
      
      // Map API response to DTO format
      const normalizedData = normalizeHistoricalData(response.data);
      
      // Set TTL based on timeframe - shorter for recent data, longer for historical
      const ttl = days <= 7 ? 300 : days <= 30 ? 1800 : 3600; // 5min, 30min, or 1hr
      cache.set(cacheKey, normalizedData, ttl);
      
      return normalizedData;

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