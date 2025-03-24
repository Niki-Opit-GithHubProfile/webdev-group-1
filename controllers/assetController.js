const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.getAllAssets = async (req, res) => {
  try {
    const assets = await prisma.asset.findMany({
      orderBy: { symbol: 'asc' }
    });
    
    return res.json({ success: true, data: assets });
  } catch (error) {
    console.error('Error fetching assets:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch assets' });
  }
};

exports.getAssetDetails = async (req, res) => {
  try {
    const { id } = req.params;
    
    const asset = await prisma.asset.findUnique({
      where: { id },
      include: {
        pairs: {
          include: {
            base: true,
            quote: true
          }
        }
      }
    });
    
    if (!asset) {
      return res.status(404).json({ success: false, message: 'Asset not found' });
    }
    
    return res.render('assetDetails', { 
      asset,
      csrfToken: req.csrfToken()
    });
  } catch (error) {
    console.error('Error fetching asset details:', error);
    return res.status(500).send('Server error');
  }
};