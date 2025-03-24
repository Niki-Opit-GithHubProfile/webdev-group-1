const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.getAllTransactions = async (req, res) => {
  try {
    const userId = req.session.userId;    
    const transactions = await prisma.transaction.findMany({
      where: { userId },
      orderBy: { date: 'desc' },
      include: {
        user: true
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
    const { type, fromAssetId, toAssetId, fromAmount, toAmount, price, date } = req.body;
    
    // Validation
    if (!['buy', 'sell', 'transfer'].includes(type)) {
      return res.status(400).json({ success: false, message: 'Invalid transaction type' });
    }
    
    if (!fromAssetId || !toAssetId || !fromAmount || !toAmount || !price) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }
    
    const transaction = await prisma.transaction.create({
      data: {
        userId,
        transactionType: type,
        assetName,
        quantity: parseFloat(quantity),
        price: parseFloat(price),
        totalValue: parseFloat(totalValue),
        sourceAsset,
        transactionDate: date ? new Date(date) : new Date(),
      }
    });
    
    return res.status(201).json({ success: true, data: transaction });
  } catch (error) {
    console.error('Error creating transaction:', error);
    return res.status(500).json({ success: false, message: 'Failed to create transaction' });
  }
};

exports.updateTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { type, fromAssetId, toAssetId, fromAmount, toAmount, price, date } = req.body;
    
    // Check if transaction exists and belongs to user
    const existingTransaction = await prisma.transaction.findFirst({
      where: { id: parseInt(id), userId }
    });
    
    if (!existingTransaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }
    
    const transaction = await prisma.transaction.update({
      where: { id: parseInt(id) },
      data: {
        type,
        fromAmount: parseFloat(fromAmount),
        toAmount: parseFloat(toAmount),
        price: parseFloat(price),
        date: date ? new Date(date) : existingTransaction.date,
        fromAsset: fromAssetId ? { connect: { id: fromAssetId } } : undefined,
        toAsset: toAssetId ? { connect: { id: toAssetId } } : undefined
      }
    });
    
    return res.json({ success: true, data: transaction });
  } catch (error) {
    console.error('Error updating transaction:', error);
    return res.status(500).json({ success: false, message: 'Failed to update transaction' });
  }
};

exports.deleteTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    // Check if transaction exists and belongs to user
    const existingTransaction = await prisma.transaction.findFirst({
      where: { id: parseInt(id), userId }
    });
    
    if (!existingTransaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }
    
    await prisma.transaction.delete({
      where: { id: parseInt(id) }
    });
    
    return res.json({ success: true, message: 'Transaction deleted successfully' });
  } catch (error) {
    console.error('Error deleting transaction:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete transaction' });
  }
};