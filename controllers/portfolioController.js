const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.getPortfolio = async (req, res) => {
  try {
    const userId = req.session.userId;
    
    const portfolio = await prisma.portfolio.findUnique({
      where: { userId },
      include: {
        holdings: {
          include: {
            asset: true
          }
        }
      }
    });
    
    if (!portfolio) {
      // Create portfolio if it doesn't exist
      const newPortfolio = await prisma.portfolio.create({
        data: {
          userId
        },
        include: {
          holdings: true
        }
      });
      
      return res.json({ success: true, data: newPortfolio });
    }
    
    return res.json({ success: true, data: portfolio });
  } catch (error) {
    console.error('Error fetching portfolio:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch portfolio' });
  }
};

exports.addFunds = async (req, res) => {
  try {
    const userId = req.session.userId;
    const { amount, assetId } = req.body;
    
    if (!amount || !assetId) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }
    
    const amountDecimal = parseFloat(amount);
    
    const portfolio = await prisma.portfolio.findUnique({
      where: { userId }
    });
    
    if (!portfolio) {
      return res.status(404).json({ success: false, message: 'Portfolio not found' });
    }
    
    // Check if holding exists
    const holding = await prisma.portfolioHolding.findFirst({
      where: {
        portfolioId: portfolio.id,
        assetId
      }
    });
    
    if (holding) {
      // Update existing holding
      await prisma.portfolioHolding.update({
        where: { id: holding.id },
        data: {
          balance: { increment: amountDecimal }
        }
      });
    } else {
      // Create new holding
      await prisma.portfolioHolding.create({
        data: {
          portfolioId: portfolio.id,
          assetId,
          balance: amountDecimal
        }
      });
    }
    
    return res.json({ 
      success: true, 
      message: 'Funds added successfully' 
    });
  } catch (error) {
    console.error('Error adding funds:', error);
    return res.status(500).json({ success: false, message: 'Failed to add funds' });
  }
};