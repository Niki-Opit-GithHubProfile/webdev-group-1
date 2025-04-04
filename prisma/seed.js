const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedAssets() {
  // Common cryptocurrencies
  const assets = [
    { symbol: 'BTC', name: 'Bitcoin' },
    { symbol: 'ETH', name: 'Ethereum' },
    { symbol: 'USDT', name: 'Tether' },
    { symbol: 'BNB', name: 'Binance Coin' },
    { symbol: 'SOL', name: 'Solana' },
    { symbol: 'XRP', name: 'Ripple' },
    { symbol: 'ADA', name: 'Cardano' },
    { symbol: 'DOGE', name: 'Dogecoin' },
    { symbol: 'USDC', name: 'USD Coin' },
    { symbol: 'USD', name: 'US Dollar' }
  ];

  console.log('Seeding assets...');
  for (const asset of assets) {
    await prisma.asset.upsert({
      where: { symbol: asset.symbol },
      update: {},
      create: asset
    });
  }
}

async function seedTradingPairs() {
  // Get assets
  const assets = await prisma.asset.findMany();
  const assetMap = assets.reduce((map, asset) => {
    map[asset.symbol] = asset.id;
    return map;
  }, {});

  // Common trading pairs
  const tradingPairs = [
    { base: 'BTC', quote: 'USD' },
    { base: 'ETH', quote: 'USD' },
    { base: 'BTC', quote: 'USDT' },
    { base: 'ETH', quote: 'USDT' },
    { base: 'SOL', quote: 'USD' },
    { base: 'BNB', quote: 'USDT' },
    { base: 'XRP', quote: 'USD' },
    { base: 'ADA', quote: 'USD' },
    { base: 'DOGE', quote: 'USD' },
    { base: 'ETH', quote: 'BTC' },
  ];

  console.log('Seeding trading pairs...');
  for (const pair of tradingPairs) {
    const baseId = assetMap[pair.base];
    const quoteId = assetMap[pair.quote];
    
    if (!baseId || !quoteId) continue;
    
    await prisma.tradingPair.upsert({
      where: { 
        baseId_quoteId: {
          baseId,
          quoteId
        }
      },
      update: {},
      create: {
        baseId,
        quoteId
      }
    });
  }
}

async function main() {
  try {
    await seedAssets();
    await seedTradingPairs();
    console.log('Seed completed successfully!');
  } catch (error) {
    console.error('Error during seeding:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();