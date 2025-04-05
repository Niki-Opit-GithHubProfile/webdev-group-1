const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const cryptoApiService = require('../services/cryptoApiService');

// Get add transaction page
exports.getAddTransactionPage = async (req, res) => {
  try {
    const pairs = await prisma.tradingPair.findMany({
      include: {
        base: true,
        quote: true
      },
      orderBy: [
        { base: { symbol: 'asc' } },
        { quote: { symbol: 'asc' } }
      ]
    });
    
    return res.render('addTransaction', {
      TradingPair: pairs,
      csrfToken: req.csrfToken()
    });
  } catch (error) {
    console.error('Error loading add transaction page:', error);
    return res.status(500).send('Server error');
  }
};

// Get all transactions
exports.getAllTransactions = async (req, res) => {
  try {
    const userId = req.session.userId;
    
    const transactions = await prisma.transaction.findMany({
      where: { userId },
      include: {
        pair: {
          include: {
            base: true,
            quote: true
          }
        }
      },
      orderBy: { date: 'desc' }
    });
    
    return res.json({ success: true, data: transactions });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch transactions' });
  }
};

// Create transaction
exports.createTransaction = async (req, res) => {
  try {
    const userId = req.session.userId;
    const { pairId, type, price, amount, commission = 0, date, notes = '', total } = req.body;
    
    // Validate inputs
    if (!pairId || !type || !price || !amount || !date) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }
    
    if (!['BUY', 'SELL'].includes(type)) {
      return res.status(400).json({ success: false, message: 'Invalid transaction type' });
    }
    
    const priceDecimal = parseFloat(price);
    const amountDecimal = parseFloat(amount);
    const commissionDecimal = parseFloat(commission);
    const totalValue = parseFloat(total);
    
    if (isNaN(priceDecimal) || isNaN(amountDecimal) || isNaN(commissionDecimal) || isNaN(totalValue)) {
      return res.status(400).json({ success: false, message: 'Invalid numeric values' });
    }
    
    // Validate date is not in the future
    const transactionDate = new Date(date);
    const today = new Date();
    
    // Compare only the date parts, ignoring time
    const transactionDateOnly = new Date(transactionDate.getFullYear(), transactionDate.getMonth(), transactionDate.getDate());
    const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    
    if (transactionDateOnly > todayOnly) {
      return res.status(400).json({ success: false, message: 'Transaction date cannot be in the future' });
    }
    
    // Get pair details
    const pair = await prisma.tradingPair.findUnique({
      where: { id: pairId },
      include: {
        base: true,
        quote: true
      }
    });
    
    if (!pair) {
      return res.status(400).json({ success: false, message: 'Invalid trading pair' });
    }
    
    let transaction;
    
    await prisma.$transaction(async (tx) => {
      // Get user portfolio
      const portfolio = await tx.portfolio.findUnique({
        where: { userId }
      });
      
      if (!portfolio) {
        throw new Error('Portfolio not found');
      }
      
      // Validate funds for SELL transactions or availability of quote asset for BUY
      if (type === 'SELL') {
        // Check if user has enough base asset to sell
        const baseHolding = await tx.portfolioHolding.findFirst({
          where: {
            portfolioId: portfolio.id,
            assetId: pair.baseId
          }
        });
        
        if (!baseHolding || baseHolding.balance < amountDecimal) {
          throw new Error(`Insufficient ${pair.base.symbol} balance for this transaction`);
        }
      } else { // BUY
        // Check if user has enough quote asset to buy
        const quoteHolding = await tx.portfolioHolding.findFirst({
          where: {
            portfolioId: portfolio.id,
            assetId: pair.quoteId
          }
        });
        
        if (!quoteHolding || quoteHolding.balance < totalValue) {
          throw new Error(`Insufficient ${pair.quote.symbol} balance for this transaction`);
        }
      }
      
      // Create the transaction
      transaction = await tx.transaction.create({
        data: {
          userId,
          pairId,
          type,
          price: priceDecimal,
          amount: amountDecimal,
          total: totalValue,
          commission: commissionDecimal,
          date: transactionDate,
          notes
        }
      });
      
      // Update portfolio holdings based on transaction type
      if (type === 'BUY') {
        // Add base asset (the one being bought)
        const baseHolding = await tx.portfolioHolding.findFirst({
          where: {
            portfolioId: portfolio.id,
            assetId: pair.baseId
          }
        });
        
        if (baseHolding) {
          // Calculate new average price and total cost
          const newTotalQuantity = baseHolding.balance + amountDecimal;
          const newTotalCost = baseHolding.totalCost + totalValue;
          const newAveragePrice = newTotalCost / newTotalQuantity;
          
          await tx.portfolioHolding.update({
            where: { id: baseHolding.id },
            data: {
              balance: { increment: amountDecimal },
              averagePrice: newAveragePrice,
              totalCost: newTotalCost
            }
          });
        } else {
          await tx.portfolioHolding.create({
            data: {
              portfolioId: portfolio.id,
              assetId: pair.baseId,
              balance: amountDecimal,
              averagePrice: totalValue / amountDecimal,
              totalCost: totalValue
            }
          });
        }
        
        // Subtract quote asset (the one used to pay)
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
              balance: { decrement: totalValue }
            }
          });
        }
      } else { // SELL
        // Subtract base asset (the one being sold)
        const baseHolding = await tx.portfolioHolding.findFirst({
          where: {
            portfolioId: portfolio.id,
            assetId: pair.baseId
          }
        });
        
        if (baseHolding) {
          // Calculate proportion of cost being removed
          const proportionSold = amountDecimal / baseHolding.balance;
          const costRemoved = baseHolding.totalCost * proportionSold;
          
          await tx.portfolioHolding.update({
            where: { id: baseHolding.id },
            data: {
              balance: { decrement: amountDecimal },
              totalCost: { decrement: costRemoved }
            }
          });
          
          // Update average price if there's still a balance
          if (baseHolding.balance - amountDecimal > 0) {
            await tx.portfolioHolding.update({
              where: { id: baseHolding.id },
              data: {
                averagePrice: (baseHolding.totalCost - costRemoved) / (baseHolding.balance - amountDecimal)
              }
            });
          }
        }
        
        // Add quote asset (the one received from selling)
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
              balance: { increment: totalValue }
            }
          });
        } else {
          await tx.portfolioHolding.create({
            data: {
              portfolioId: portfolio.id,
              assetId: pair.quoteId,
              balance: totalValue,
              averagePrice: 0, // For received assets, we don't track acquisition cost
              totalCost: 0
            }
          });
        }
      }
    });
    
    return res.status(201).json({
      success: true,
      message: 'Transaction created successfully',
      data: transaction
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
    const { type, price, amount, commission, date, notes } = req.body;
    
    // Verify transaction exists and belongs to user
    const existingTransaction = await prisma.transaction.findFirst({
      where: {
        id,
        userId
      },
      include: {
        pair: {
          include: {
            base: true,
            quote: true
          }
        }
      }
    });
    
    if (!existingTransaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }
    
    // This is simplified - a real implementation would need to handle
    // the complex logic of updating portfolio balances based on the changes
    const priceDecimal = parseFloat(price);
    const amountDecimal = parseFloat(amount);
    const commissionDecimal = parseFloat(commission || 0);
    let total;
    
    if (type === 'BUY') {
      total = (priceDecimal * amountDecimal) + commissionDecimal;
    } else { // SELL
      total = (priceDecimal * amountDecimal) - commissionDecimal;
    }
    
    const updatedTransaction = await prisma.transaction.update({
      where: { id },
      data: {
        type,
        price: priceDecimal,
        amount: amountDecimal,
        commission: commissionDecimal,
        total,
        date: new Date(date),
        notes
      }
    });
    
    return res.json({ 
      success: true, 
      message: 'Transaction updated successfully',
      data: updatedTransaction 
    });
  } catch (error) {
    console.error('Error updating transaction:', error);
    return res.status(500).json({ success: false, message: 'Failed to update transaction' });
  }
};

// Delete transaction
exports.deleteTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.session.userId;
    
    // Verify transaction exists and belongs to user
    const existingTransaction = await prisma.transaction.findFirst({
      where: {
        id,
        userId
      },
      include: {
        pair: {
          include: {
            base: true,
            quote: true
          }
        }
      }
    });
    
    if (!existingTransaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }
    
    // This would need similar complex logic to reverse the portfolio changes
    // For simplicity, we're just deleting the transaction
    await prisma.transaction.delete({
      where: { id }
    });
    
    return res.json({ success: true, message: 'Transaction deleted successfully' });
  } catch (error) {
    console.error('Error deleting transaction:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete transaction' });
  }
};

// Get transaction by ID
exports.getTransactionById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.session.userId;
    
    const transaction = await prisma.transaction.findFirst({
      where: {
        id,
        userId
      },
      include: {
        pair: {
          include: {
            base: true,
            quote: true
          }
        }
      }
    });
    
    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }
    
    return res.json({ success: true, data: transaction });
  } catch (error) {
    console.error('Error fetching transaction:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch transaction' });
  }
};

// Calculate PnL for a single transaction
exports.calculateTransactionPnL = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.session.userId;
    
    const transaction = await prisma.transaction.findFirst({
      where: {
        id,
        userId
      },
      include: {
        pair: {
          include: {
            base: true,
            quote: true
          }
        }
      }
    });
    
    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }
    
    // Get current prices
    const baseSymbol = transaction.pair.base.symbol.toLowerCase();
    const quoteSymbol = transaction.pair.quote.symbol.toLowerCase();
    
    const prices = await cryptoApiService.getPrice([baseSymbol, quoteSymbol]);
    
    if (!prices[baseSymbol] || !prices[quoteSymbol]) {
      return res.status(400).json({ success: false, message: 'Unable to fetch current prices' });
    }
    
    const basePrice = prices[baseSymbol].usd;
    const quotePrice = prices[quoteSymbol].usd;
    
    let pnl = 0;
    
    if (transaction.type === 'BUY') {
      // PnL for BUY = (Current Base Price - Entry Cost) * Quantity
      const entryPriceInUsd = transaction.price * quotePrice;
      pnl = (basePrice - entryPriceInUsd) * transaction.amount;
    } else {
      // PnL for SELL = (Exit Price - Current Base Price) * Quantity
      const exitPriceInUsd = transaction.price * quotePrice;
      pnl = (exitPriceInUsd - basePrice) * transaction.amount;
    }
    
    return res.json({ 
      success: true, 
      data: {
        pnl,
        baseCurrentPrice: basePrice,
        quoteCurrentPrice: quotePrice,
        percentageChange: ((pnl / transaction.total) * 100).toFixed(2)
      }
    });
  } catch (error) {
    console.error('Error calculating transaction PnL:', error);
    return res.status(500).json({ success: false, message: 'Failed to calculate PnL' });
  }
};