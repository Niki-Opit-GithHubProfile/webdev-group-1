/**
 * Normalize price data from CoinGecko API
 * @param {Object} data - Raw API response
 * @returns {Object} - Normalized price data
 */
exports.normalizePrice = function(data) {
  // Log the incoming data structure for debugging
  console.log('Raw data to normalize:', JSON.stringify(data).substring(0, 200) + '...');
  
  // Ensure we have data to process
  if (!data || typeof data !== 'object') {
    console.error('Invalid data format in normalizePrice:', data);
    return {};
  }
  
  const normalized = {};
  
  // Process each coin in the response
  Object.keys(data).forEach(coinId => {
    const coinData = data[coinId];
    if (coinData) {
      normalized[coinId] = {
        usd: coinData.usd || 0,
        usd_24h_change: coinData.usd_24h_change || 0,
        usd_market_cap: coinData.usd_market_cap || 0
      };
    }
  });
  
  console.log('Normalized price data:', JSON.stringify(normalized).substring(0, 200) + '...');
  return normalized;
};

/**
 * Normalize historical data from CoinGecko API
 * @param {Object} data - Raw API response 
 * @returns {Object} - Normalized historical data
 */
exports.normalizeHistoricalData = function(data) {
  // Ensure we have data to process with expected structure
  if (!data || !data.prices || !Array.isArray(data.prices)) {
    console.error('Invalid data format in normalizeHistoricalData:', data);
    return { prices: [] };
  }
  
  // Simply pass through the price data (already in [timestamp, price] format)
  // but ensure it's properly structured
  return {
    prices: data.prices.map(point => {
      // Ensure each point is an array with two elements
      if (Array.isArray(point) && point.length >= 2) {
        return [point[0], point[1]]; // timestamp, price
      } else {
        // Fallback if data point is malformed
        console.warn('Malformed data point:', point);
        return [Date.now(), 0];
      }
    })
  };
};

/**
 * Normalize coins list from CoinGecko API
 * @param {Array} data - Raw API response
 * @returns {Array} - Normalized coins list
 */
exports.normalizeCoinsList = function(data) {
  if (!Array.isArray(data)) {
    console.error('Invalid data format in normalizeCoinsList:', data);
    return [];
  }
  
  return data.map(coin => ({
    id: coin.id,
    symbol: coin.symbol,
    name: coin.name
  }));
};