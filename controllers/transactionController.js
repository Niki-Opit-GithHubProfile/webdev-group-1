const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

module.exports = {
  listTransactions: async (req, res) => {
    try {
      const transactions = await prisma.transaction.findMany({
        where: {
          userId: req.session.user.id
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
      return res.render('dashboard', {
        user: req.session.user,
        transactions
      });
    } catch (error) {
      console.error(error);
      return res.redirect('/dashboard');
    }
  },

  createTransaction: async (req, res) => {
    try {
      const { type, amount } = req.body;
      await prisma.transaction.create({
        data: {
          type,
          amount: parseFloat(amount),
          userId: req.session.user.id
        }
      });
      return res.redirect('/transactions');
    } catch (error) {
      console.error(error);
      return res.redirect('/dashboard');
    }
  },

  getTransaction: async (req, res) => {
    try {
      const { id } = req.params;
      const transaction = await prisma.transaction.findFirst({
        where: {
          id: parseInt(id),
          userId: req.session.user.id
        }
      });
      if (!transaction) {
        return res.redirect('/transactions');
      }
      return res.json(transaction);
    } catch (error) {
      console.error(error);
      return res.redirect('/dashboard');
    }
  },

  updateTransaction: async (req, res) => {
    try {
      const { id } = req.params;
      const { type, amount } = req.body;
      await prisma.transaction.updateMany({
        where: {
          id: parseInt(id),
          userId: req.session.user.id
        },
        data: {
          type,
          amount: parseFloat(amount)
        }
      });
      return res.redirect('/transactions');
    } catch (error) {
      console.error(error);
      return res.redirect('/dashboard');
    }
  },

  deleteTransaction: async (req, res) => {
    try {
      const { id } = req.params;
      await prisma.transaction.deleteMany({
        where: {
          id: parseInt(id),
          userId: req.session.user.id
        }
      });
      return res.redirect('/transactions');
    } catch (error) {
      console.error(error);
      return res.redirect('/dashboard');
    }
  }
};