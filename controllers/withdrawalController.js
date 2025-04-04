const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Get add withdrawal page
exports.getAddWithdrawalPage = async (req, res) => {
  try {
    const userId = req.session.userId;
    
    // Get user portfolio with holdings
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
    
    // Only show assets that user has in portfolio
    const assets = portfolio.holdings.map(holding => holding.asset);
    
    return res.render('addWithdrawal', {
      assets,
      portfolio,
      csrfToken: req.csrfToken()
    });
  } catch (error) {
    console.error('Error loading add withdrawal page:', error);
    return res.status(500).send('Server error');
  }
};

// Get all withdrawals
exports.getAllWithdrawals = async (req, res) => {
  try {
    const userId = req.session.userId;
    
    const withdrawals = await prisma.withdrawal.findMany({
      where: { userId },
      include: {
        asset: true
      },
      orderBy: { date: 'desc' }
    });
    
    return res.json({ success: true, data: withdrawals });
  } catch (error) {
    console.error('Error fetching withdrawals:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch withdrawals' });
  }
};

// Create withdrawal
exports.createWithdrawal = async (req, res) => {
  try {
    const userId = req.session.userId;
    const { assetId, amount, commission = 0, date, notes = '' } = req.body;
    
    // Validate inputs
    if (!assetId || !amount || !date) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }
    
    const amountDecimal = parseFloat(amount);
    const commissionDecimal = parseFloat(commission);
    
    if (isNaN(amountDecimal) || isNaN(commissionDecimal)) {
      return res.status(400).json({ success: false, message: 'Invalid numeric values' });
    }
    
    if (amountDecimal <= 0) {
      return res.status(400).json({ success: false, message: 'Amount must be greater than zero' });
    }
    
    // Validate date is not in the future
    const withdrawalDate = new Date(date);
    if (withdrawalDate > new Date()) {
      return res.status(400).json({ success: false, message: 'Withdrawal date cannot be in the future' });
    }
    
    // Get asset details
    const asset = await prisma.asset.findUnique({
      where: { id: assetId }
    });
    
    if (!asset) {
      return res.status(400).json({ success: false, message: 'Invalid asset' });
    }
    
    let withdrawal;
    
    await prisma.$transaction(async (tx) => {
      // Get user portfolio
      const portfolio = await tx.portfolio.findUnique({
        where: { userId }
      });
      
      if (!portfolio) {
        throw new Error('Portfolio not found');
      }
      
      // Check if user has enough balance
      const holding = await tx.portfolioHolding.findFirst({
        where: {
          portfolioId: portfolio.id,
          assetId
        }
      });
      
      const totalAmountNeeded = amountDecimal + commissionDecimal;
      
      if (!holding || holding.balance < totalAmountNeeded) {
        throw new Error(`Insufficient ${asset.symbol} balance for this withdrawal`);
      }
      
      // Create the withdrawal record
      withdrawal = await tx.withdrawal.create({
        data: {
          userId,
          assetId,
          amount: amountDecimal,
          commission: commissionDecimal,
          date: withdrawalDate,
          notes
        }
      });
      
      // Update portfolio holdings
      await tx.portfolioHolding.update({
        where: { id: holding.id },
        data: {
          balance: { decrement: totalAmountNeeded }
        }
      });
    });
    
    return res.status(201).json({
      success: true,
      message: 'Withdrawal recorded successfully',
      data: withdrawal
    });
    
  } catch (error) {
    console.error('Error creating withdrawal:', error);
    return res.status(500).json({
      success: false,
      message: `Failed to record withdrawal: ${error.message}`
    });
  }
};

// Delete withdrawal
exports.deleteWithdrawal = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.session.userId;
    
    // Verify withdrawal exists and belongs to user
    const existingWithdrawal = await prisma.withdrawal.findFirst({
      where: {
        id,
        userId
      },
      include: {
        asset: true
      }
    });
    
    if (!existingWithdrawal) {
      return res.status(404).json({ success: false, message: 'Withdrawal not found' });
    }
    
    await prisma.$transaction(async (tx) => {
      // Get portfolio
      const portfolio = await tx.portfolio.findUnique({
        where: { userId }
      });
      
      // Update holdings
      const totalAmount = existingWithdrawal.amount + existingWithdrawal.commission;
      
      const holding = await tx.portfolioHolding.findFirst({
        where: {
          portfolioId: portfolio.id,
          assetId: existingWithdrawal.assetId
        }
      });
      
      if (holding) {
        await tx.portfolioHolding.update({
          where: { id: holding.id },
          data: {
            balance: { increment: totalAmount }
          }
        });
      } else {
        await tx.portfolioHolding.create({
          data: {
            portfolioId: portfolio.id,
            assetId: existingWithdrawal.assetId,
            balance: totalAmount,
            averagePrice: 0,
            totalCost: 0
          }
        });
      }
      
      // Delete the withdrawal
      await tx.withdrawal.delete({
        where: { id }
      });
    });
    
    return res.json({ success: true, message: 'Withdrawal deleted successfully' });
  } catch (error) {
    console.error('Error deleting withdrawal:', error);
    return res.status(500).json({ success: false, message: `Failed to delete withdrawal: ${error.message}` });
  }
};