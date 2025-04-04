const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Get onboarding start page
exports.getOnboardingStart = async (req, res) => {
  try {
    return res.render('onboarding/start', {
      csrfToken: req.csrfToken()
    });
  } catch (error) {
    console.error('Error loading onboarding start:', error);
    return res.status(500).send('Server error');
  }
};

// Process onboarding choice (new investor or existing)
exports.processOnboardingChoice = async (req, res) => {
  try {
    const { investorType } = req.body;
    const userId = req.session.userId;
    
    if (!userId) {
      return res.redirect('/login');
    }
    
    if (investorType === 'new') {
      // New investor - create empty portfolio and complete onboarding
      await prisma.$transaction(async (tx) => {
        // Create portfolio if it doesn't exist
        const existingPortfolio = await tx.portfolio.findUnique({
          where: { userId }
        });
        
        if (!existingPortfolio) {
          await tx.portfolio.create({
            data: { userId }
          });
        }
        
        // Mark onboarding as complete
        await tx.user.update({
          where: { id: userId },
          data: { completedOnboarding: true }
        });
      });
      
      // Set success message flag
      req.session.onboardingComplete = true;
      return res.redirect('/dashboard');
    } else if (investorType === 'existing') {
      // Existing investor - needs to set up initial assets
      return res.redirect('/onboarding/initial-assets');
    } else {
      return res.redirect('/onboarding');
    }
  } catch (error) {
    console.error('Error processing onboarding choice:', error);
    return res.status(500).send('Server error');
  }
};

// Get initial assets page
exports.getInitialAssetsPage = async (req, res) => {
  try {
    const assets = await prisma.asset.findMany({
      orderBy: { symbol: 'asc' }
    });
    
    return res.render('onboarding/initial-assets', {
      assets,
      csrfToken: req.csrfToken()
    });
  } catch (error) {
    console.error('Error loading initial assets page:', error);
    return res.status(500).send('Server error');
  }
};

// Process initial assets
exports.processInitialAssets = async (req, res) => {
  try {
    const userId = req.session.userId;
    const initialAssets = req.body.assets || [];
    
    if (!userId) {
      return res.redirect('/login');
    }
    
    await prisma.$transaction(async (tx) => {
      // Create portfolio if it doesn't exist
      let portfolio = await tx.portfolio.findUnique({
        where: { userId }
      });
      
      if (!portfolio) {
        portfolio = await tx.portfolio.create({
          data: { userId }
        });
      }
      
      // Add initial assets to portfolio
      for (const asset of initialAssets) {
        if (!asset.assetId || !asset.amount || parseFloat(asset.amount) <= 0) {
          continue; // Skip invalid entries
        }
        
        // Check if holding already exists
        const existingHolding = await tx.portfolioHolding.findFirst({
          where: {
            portfolioId: portfolio.id,
            assetId: asset.assetId
          }
        });
        
        const amountDecimal = parseFloat(asset.amount);
        
        if (existingHolding) {
          // Update existing holding
          await tx.portfolioHolding.update({
            where: { id: existingHolding.id },
            data: {
              balance: { increment: amountDecimal }
            }
          });
        } else {
          // Create new holding
          await tx.portfolioHolding.create({
            data: {
              portfolioId: portfolio.id,
              assetId: asset.assetId,
              balance: amountDecimal,
              // For initial assets, we assume they were acquired at current market price
              averagePrice: 0, // Will be updated later with market data
              totalCost: 0     // Will be updated later with market data
            }
          });
        }
        
        // Create a deposit record for audit trail
        await tx.deposit.create({
          data: {
            userId,
            assetId: asset.assetId,
            amount: amountDecimal,
            commission: 0,
            date: new Date(),
            notes: 'Initial balance'
          }
        });
      }
      
      // Mark onboarding as complete
      await tx.user.update({
        where: { id: userId },
        data: { completedOnboarding: true }
      });
    });
    
    // Set success message flag
    req.session.onboardingComplete = true;
    return res.redirect('/dashboard');
  } catch (error) {
    console.error('Error processing initial assets:', error);
    return res.status(500).json({
      success: false,
      message: `Error processing initial assets: ${error.message}`
    });
  }
};