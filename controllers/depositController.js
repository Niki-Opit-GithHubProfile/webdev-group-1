const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Get add deposit page
exports.getAddDepositPage = async (req, res) => {
  try {
    const assets = await prisma.asset.findMany({
      orderBy: { symbol: 'asc' }
    });
    
    return res.render('addDeposit', {
      assets,
      csrfToken: req.csrfToken()
    });
  } catch (error) {
    console.error('Error loading add deposit page:', error);
    return res.status(500).send('Server error');
  }
};

// Get all deposits
exports.getAllDeposits = async (req, res) => {
  try {
    const userId = req.session.userId;
    
    const deposits = await prisma.deposit.findMany({
      where: { userId },
      include: {
        asset: true
      },
      orderBy: { date: 'desc' }
    });
    
    return res.json({ success: true, data: deposits });
  } catch (error) {
    console.error('Error fetching deposits:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch deposits' });
  }
};

// Create deposit
exports.createDeposit = async (req, res) => {
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
    const depositDate = new Date(date);
    const today = new Date();
    
    // Compare only the date parts, ignoring time
    const depositDateOnly = new Date(depositDate.getFullYear(), depositDate.getMonth(), depositDate.getDate());
    const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    
    if (depositDateOnly > todayOnly) {
      return res.status(400).json({ success: false, message: 'Deposit date cannot be in the future' });
    }
    
    // Get asset details
    const asset = await prisma.asset.findUnique({
      where: { id: assetId }
    });
    
    if (!asset) {
      return res.status(400).json({ success: false, message: 'Invalid asset' });
    }
    
    let deposit;
    
    await prisma.$transaction(async (tx) => {
      // Get user portfolio
      const portfolio = await tx.portfolio.findUnique({
        where: { userId }
      });
      
      if (!portfolio) {
        throw new Error('Portfolio not found');
      }
      
      // Create the deposit record
      deposit = await tx.deposit.create({
        data: {
          userId,
          assetId,
          amount: amountDecimal,
          commission: commissionDecimal,
          date: depositDate,
          notes
        }
      });
      
      // Update portfolio holdings
      const holding = await tx.portfolioHolding.findFirst({
        where: {
          portfolioId: portfolio.id,
          assetId
        }
      });
      
      if (holding) {
        await tx.portfolioHolding.update({
          where: { id: holding.id },
          data: {
            balance: { increment: amountDecimal }
          }
        });
      } else {
        await tx.portfolioHolding.create({
          data: {
            portfolioId: portfolio.id,
            assetId,
            balance: amountDecimal,
            averagePrice: 0, // No change to average price for deposits
            totalCost: 0
          }
        });
      }
    });
    
    return res.status(201).json({
      success: true,
      message: 'Deposit recorded successfully',
      data: deposit
    });
    
  } catch (error) {
    console.error('Error creating deposit:', error);
    return res.status(500).json({
      success: false,
      message: `Failed to record deposit: ${error.message}`
    });
  }
};

// Delete deposit
exports.deleteDeposit = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.session.userId;
    
    // Verify deposit exists and belongs to user
    const existingDeposit = await prisma.deposit.findFirst({
      where: {
        id,
        userId
      },
      include: {
        asset: true
      }
    });
    
    if (!existingDeposit) {
      return res.status(404).json({ success: false, message: 'Deposit not found' });
    }
    
    await prisma.$transaction(async (tx) => {
      // Get portfolio
      const portfolio = await tx.portfolio.findUnique({
        where: { userId }
      });
      
      // Update holdings
      const holding = await tx.portfolioHolding.findFirst({
        where: {
          portfolioId: portfolio.id,
          assetId: existingDeposit.assetId
        }
      });
      
      if (holding) {
        if (holding.balance < existingDeposit.amount) {
          throw new Error(`Insufficient ${existingDeposit.asset.symbol} balance to delete this deposit`);
        }
        
        await tx.portfolioHolding.update({
          where: { id: holding.id },
          data: {
            balance: { decrement: existingDeposit.amount }
          }
        });
      }
      
      // Delete the deposit
      await tx.deposit.delete({
        where: { id }
      });
    });
    
    return res.json({ success: true, message: 'Deposit deleted successfully' });
  } catch (error) {
    console.error('Error deleting deposit:', error);
    return res.status(500).json({ success: false, message: `Failed to delete deposit: ${error.message}` });
  }
};