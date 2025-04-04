const cryptoApiService = require('../services/cryptoApiService');

exports.getPrices = async (req, res) => {
  try {
    const { coins } = req.query;
    if (!coins) {
      return res.status(400).json({ success: false, message: 'Missing required parameter: coins' });
    }
    const coinIds = coins.split(',');
    const prices = await cryptoApiService.getPrice(coinIds);
    
    return res.json({ success: true, data: prices });
  } catch (error) {
    console.error('Error in getPrices controller:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getCoinsList = async (req, res) => {
  try {
    const coins = await cryptoApiService.getCoinsList();
    return res.json({ success: true, data: coins });
  } catch (error) {
    console.error('Error in getCoinsList controller:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getHistoricalData = async (req, res) => {
  try {
    const { coinId, days } = req.params;
    const historicalData = await cryptoApiService.getHistoricalData(coinId, parseInt(days));
    
    return res.json({ success: true, data: historicalData });
  } catch (error) {
    console.error('Error in getHistoricalData controller:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};