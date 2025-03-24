const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Show add transaction page
exports.getAddTransactionPage = async (req, res) => {
  try {
    // Get all available assets for dropdowns
    const assets = await prisma.asset.findMany({
      orderBy: { symbol: 'asc' }
    });
    
    // Get common trading pairs
    const tradingPairs = await prisma.tradingPair.findMany({
      include: {
        base: true,
        quote: true
      },
      orderBy: {
        base: {
          symbol: 'asc'
        }
      }
    });
    
    return res.render('addTransaction', { 
      assets,
      tradingPairs,
      csrfToken: req.csrfToken()
    });
  } catch (error) {
    console.error('Error loading add transaction page:', error);
    return res.status(500).send('Server error');
  }
};

exports.getAllTransactions = async (req, res) => {
  try {
    const userId = req.session.userId;    
    const transactions = await prisma.transaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        pair: {
          include: {
            base: true,
            quote: true
          }
        }
      }
    });
    
    return res.json({ success: true, data: transactions });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch transactions' });
  }
};

exports.createTransaction = async (req, res) => {
  try {
    const userId = req.session.userId;
    const { pairId, type, price, amount } = req.body;
    
    // Calculate total value
    const priceDecimal = parseFloat(price);
    const amountDecimal = parseFloat(amount);
    const total = priceDecimal * amountDecimal;
    
    // Validation
    if (!['BUY', 'SELL'].includes(type)) {
      return res.status(400).json({ success: false, message: 'Invalid transaction type' });
    }
    
    if (!pairId || !price || !amount) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }
    
    // Get pair to verify it exists
    const pair = await prisma.tradingPair.findUnique({
      where: { id: pairId },
      include: { base: true, quote: true }
    });
    
    if (!pair) {
      return res.status(400).json({ success: false, message: 'Invalid trading pair' });
    }
    
    let createdTransaction;

    await prisma.$transaction(async (tx) => {
      // Create the transaction
      createdTransaction = await tx.transaction.create({
        data: {
          userId,
          pairId,
          type,
          price: priceDecimal,
          amount: amountDecimal,
          total
        }
      });
      
      // Find user's portfolio
      const portfolio = await tx.portfolio.findUnique({
        where: { userId }
      });
      
      if (!portfolio) {
        throw new Error('Portfolio not found');
      }
      
      // Update portfolio holdings based on transaction type
      if (type === 'BUY') {
        // Check if holding exists for base asset
        const holding = await tx.portfolioHolding.findFirst({
          where: {
            portfolioId: portfolio.id,
            assetId: pair.baseId
          }
        });
        
        if (holding) {
          // Update existing holding
          await tx.portfolioHolding.update({
            where: { id: holding.id },
            data: {
              balance: { increment: amountDecimal }
            }
          });
        } else {
          // Create new holding
          await tx.portfolioHolding.create({
            data: {
              portfolioId: portfolio.id,
              assetId: pair.baseId,
              balance: amountDecimal
            }
          });
        }
        
        // Decrease quote asset (e.g. USD, BTC, etc.)
        const quoteHolding = await tx.portfolioHolding.findFirst({
          where: {
            portfolioId: portfolio.id,
            assetId: pair.quoteId
          }
        });
        
        if (quoteHolding) {
          await tx.portfolioHolding.update({
            where: { id: quoteHolding.id },
            data: {
              balance: { decrement: total }
            }
          });
        }
      } 
      else if (type === 'SELL') {
        // Check if holding exists for base asset
        const baseHolding = await tx.portfolioHolding.findFirst({
          where: {
            portfolioId: portfolio.id,
            assetId: pair.baseId
          }
        });
        
        if (!baseHolding || baseHolding.balance < amountDecimal) {
          throw new Error('Insufficient balance');
        }
        
        // Update base asset holding
        await tx.portfolioHolding.update({
          where: { id: baseHolding.id },
          data: {
            balance: { decrement: amountDecimal }
          }
        });
        
        // Increase quote asset (e.g. USD, BTC, etc.)
        const quoteHolding = await tx.portfolioHolding.findFirst({
          where: {
            portfolioId: portfolio.id,
            assetId: pair.quoteId
          }
        });
        
        if (quoteHolding) {
          await tx.portfolioHolding.update({
            where: { id: quoteHolding.id },
            data: {
              balance: { increment: total }
            }
          });
        } else {
          await tx.portfolioHolding.create({
            data: {
              portfolioId: portfolio.id,
              assetId: pair.quoteId,
              balance: total
            }
          });
        }
      }
    });
    
    return res.status(201).json({ 
      success: true, 
      message: 'Transaction created successfully',
      data: createdTransaction
    });
  } catch (error) {
    console.error('Error creating transaction:', error);
    return res.status(500).json({ 
      success: false, 
      message: `Failed to create transaction: ${error.message}` 
    });
  }
};

// Update transaction
exports.updateTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.session.userId;
    const { type, price, amount } = req.body;
    
    // Verify transaction exists and belongs to user
    const existingTransaction = await prisma.transaction.findFirst({
      where: {
        id,
        userId
      }
    });
    
    if (!existingTransaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }
    
    const total = parseFloat(price) * parseFloat(amount);
    
    const updatedTransaction = await prisma.transaction.update({
      where: { id },
      data: {
        type,
        price: parseFloat(price),
        amount: parseFloat(amount),
        total
      }
    });
    
    return res.json({ success: true, data: updatedTransaction });
  } catch (error) {
    console.error('Error updating transaction:', error);
    return res.status(500).json({ success: false, message: 'Failed to update transaction' });
  }
};

exports.deleteTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.session.userId;
    
    // Verify transaction exists and belongs to user
    const existingTransaction = await prisma.transaction.findFirst({
      where: {
        id,
        userId
      }
    });
    
    if (!existingTransaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }
    
    await prisma.transaction.delete({
      where: { id }
    });
    
    return res.json({ success: true, message: 'Transaction deleted successfully' });
  } catch (error) {
    console.error('Error deleting transaction:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete transaction' });
  }
};