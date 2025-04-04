document.addEventListener('DOMContentLoaded', function() {
  // Global variables for asset data and currency conversion
  let conversionRates = {};
  let selectedCurrency = 'usd';
  let portfolioHoldings = [];
  let totalPortfolioValue = 0;
  let portfolioChart = null;
  let cryptoChart = null;
  let rightSidebar = 'preview'; // Default state
  let cachedTransactions = [];
  let cachedDeposits = [];
  let cachedWithdrawals = [];

  
  // Initialize Lucide icons
  lucide.createIcons();

   // Apply initial preview state
   initializePreviewState();
  
  // Initialize data
  fetchAssetHoldings();
  fetchTransactions();
  fetchDeposits();
  fetchWithdrawals();

  // Initialize UI components
  setupEventListeners();
  setupTabNavigation();

  /**
   * Initialize the preview state of the right sidebar
  */
  function initializePreviewState() {
      document.getElementById('t-commission').classList.add('hidden');
      document.getElementById('t-notes').classList.add('hidden');
      document.getElementById('d-commission').classList.add('hidden');
      document.getElementById('d-notes').classList.add('hidden');
      document.getElementById('w-commission').classList.add('hidden');
      document.getElementById('w-notes').classList.add('hidden');
      document.getElementById('composition-chart').classList.remove('hidden');
      document.getElementById('time-chart').classList.remove('hidden');
  }
  
  /**
   * Set up all event listeners
   */
  function setupEventListeners() {
    // Currency selector
    const cryptoSelector = document.getElementById('crypto-selector');
    if (cryptoSelector) {
      cryptoSelector.addEventListener('change', function() {
        selectedCurrency = this.value;
        updateAssetDisplay();
      });
    }
    
    // Right sidebar toggle
    const rightSidebarBtn = document.getElementById('right-sidebar-btn');

    if (rightSidebarBtn) {
      rightSidebarBtn.addEventListener('click', function() {
        if (rightSidebar === 'preview') {
          rightSidebar = 'expanded';

          document.getElementById('t-commission').classList.remove('hidden');
          document.getElementById('t-notes').classList.remove('hidden');
          document.getElementById('d-commission').classList.remove('hidden');
          document.getElementById('d-notes').classList.remove('hidden');
          document.getElementById('w-commission').classList.remove('hidden');
          document.getElementById('w-notes').classList.remove('hidden');
          document.getElementById('composition-chart').classList.add('hidden');
          document.getElementById('time-chart').classList.add('hidden');
          
        } else {
          rightSidebar = 'preview';

          document.getElementById('t-commission').classList.add('hidden');
          document.getElementById('t-notes').classList.add('hidden');
          document.getElementById('d-commission').classList.add('hidden');
          document.getElementById('d-notes').classList.add('hidden');
          document.getElementById('w-commission').classList.add('hidden');
          document.getElementById('w-notes').classList.add('hidden');
          document.getElementById('composition-chart').classList.remove('hidden');
          document.getElementById('time-chart').classList.remove('hidden');
        }

        // Re-render tables with cached data
        renderTransactions(cachedTransactions);
        renderDeposits(cachedDeposits);
        renderWithdrawals(cachedWithdrawals);
      });
    }

    // Button click events
    const addTransactionBtn = document.getElementById('addTransactionBtn');
    if (addTransactionBtn) {
      addTransactionBtn.addEventListener('click', function() {
        window.location.href = '/transactions/add';
      });
    }
    
    const addDepositBtn = document.getElementById('addDepositBtn');
    if (addDepositBtn) {
      addDepositBtn.addEventListener('click', function() {
        window.location.href = '/deposits/add';
      });
    }
    
    const addWithdrawalBtn = document.getElementById('addWithdrawalBtn');
    if (addWithdrawalBtn) {
      addWithdrawalBtn.addEventListener('click', function() {
        window.location.href = '/withdrawals/add';
      });
    }
    
    // Account dropdown toggle
    const accountBtn = document.getElementById('account-btn');
    const accountDropdown = document.getElementById('account-dropdown');
    
    if (accountBtn && accountDropdown) {
      accountBtn.addEventListener('click', function() {
        accountDropdown.classList.toggle('show');
      });
      
      // Close dropdown when clicking outside
      document.addEventListener('click', function(e) {
        if (!accountBtn.contains(e.target) && !accountDropdown.contains(e.target)) {
          accountDropdown.classList.remove('show');
        }
      });
    }
    
    // Mobile menu toggle
    const menuToggle = document.getElementById('menu-toggle');
    const mobileMenu = document.getElementById('mobile-menu');
    
    if (menuToggle && mobileMenu) {
      menuToggle.addEventListener('click', function() {
        mobileMenu.classList.toggle('hidden');
        menuToggle.setAttribute('aria-expanded', 
          menuToggle.getAttribute('aria-expanded') === 'false' ? 'true' : 'false'
        );
      });
    }
    
    // Timeframe buttons
    const timeframeButtons = document.querySelectorAll("[onclick^='updateChart']");
    timeframeButtons.forEach(button => {
      const period = button.getAttribute('onclick').match(/'([^']+)'/)[1];
      button.removeAttribute('onclick');
      button.addEventListener('click', function() {
        updateChart(period);
      });
    });
  }
  
  /**
   * Set up tab navigation for transactions, deposits, withdrawals
   */
  function setupTabNavigation() {
    const tabs = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        // Remove active class from all tabs
        tabs.forEach(t => {
          t.classList.remove('bg-blue-600', 'text-white');
          t.classList.add('bg-gray-700', 'text-gray-300');
        });
        
        // Add active class to clicked tab
        tab.classList.remove('bg-gray-700', 'text-gray-300');
        tab.classList.add('bg-blue-600', 'text-white');
        
        // Hide all tab contents
        tabContents.forEach(content => {
          content.classList.add('hidden');
        });
        
        // Show content for the clicked tab
        const contentId = tab.getAttribute('data-tab');
        document.getElementById(contentId).classList.remove('hidden');
      });
    });
    
    // Set default active tab
    if (tabs.length > 0) {
      tabs[0].click();
    }
  }
  
  /**
   * Fetch asset holdings and prices
   */
  async function fetchAssetHoldings() {
    try {
      // Get portfolio data
      const portfolioResponse = await fetch('/portfolio');
      const portfolioData = await portfolioResponse.json();
      
      if (!portfolioData.success) {
        displayErrorMessage('asset-holdings-list', 'Failed to load portfolio data');
        return;
      }
      
      if (!portfolioData.data.holdings || portfolioData.data.holdings.length === 0) {
        document.getElementById('asset-holdings-list').innerHTML = 
          '<div class="text-center py-4 text-gray-400">No assets found in your portfolio</div>';
        return;
      }
      
      // Store holdings for later use
      portfolioHoldings = portfolioData.data.holdings;
      
      // Get symbols for price lookup
      const symbols = portfolioHoldings.map(holding => holding.asset.symbol.toLowerCase());
      const coinIds = symbols.map(symbol => getCoingeckoId(symbol));

      // Fetch current prices from API
      try {
        console.log('API request for prices:', `/api/prices?coins=${coinIds.join(',')}`);

        const priceResponse = await fetch(`/api/prices?coins=${coinIds.join(',')}`);
        const priceResult = await priceResponse.json();

        console.log('Raw price response:', priceResult);
        console.log('Price response stringified:', JSON.stringify(priceResult));
        console.log('Price data structure:', priceResult.data);

        if (!priceResult.success) {
          throw new Error(priceResult.message || 'Failed to fetch prices');
        }
        
        // Process price data
        if (priceResult.data && typeof priceResult.data === 'object') {
          // Convert from CoinGecko IDs to symbols for consistent access
          conversionRates = {};
          for (const [coinId, priceData] of Object.entries(priceResult.data)) {
            const symbol = getSymbolFromCoinId(coinId);
            conversionRates[symbol] = priceData;
          }
        } else {
          console.error('Invalid price data structure:', priceResult.data);
          conversionRates = {}; // Default empty object
        }
        
        // Calculate total portfolio value in USD
        totalPortfolioValue = calculateTotalPortfolioValue();
        
        // Update display with fetched data
        updatePortfolioValueDisplay();
        renderAssetHoldings();
        updatePortfolioChart();
        initCryptoChart();
      } catch (error) {
        console.error('Error fetching crypto prices:', error);
        displayErrorMessage('asset-holdings-list', 'Failed to load current prices');
      }
    } catch (error) {
      console.error('Error fetching portfolio:', error);
      displayErrorMessage('asset-holdings-list', 'Failed to load asset data');
    }
  }
  
  /**
   * Calculate total portfolio value in USD
   */
  function calculateTotalPortfolioValue() {
    console.log('Portfolio holdings for calculation:', portfolioHoldings);
    console.log('Conversion rates for calculation:', conversionRates);
    return portfolioHoldings.reduce((total, holding) => {
      const symbol = holding.asset.symbol.toLowerCase();
      const price = conversionRates[symbol]?.usd || 0;
      const holdingValue = holding.balance * price;
      console.log(`Holding: ${symbol}, Balance: ${holding.balance}, Price: ${price}, Value: ${holdingValue}`);
      return total + holdingValue;
    }, 0);
  }
  
  /**
   * Update the portfolio value display with the current selected currency
   */
  function updatePortfolioValueDisplay() {
    const valueElement = document.getElementById('converted-value');
    
    if (selectedCurrency === 'usd') {
      valueElement.textContent = formatCurrency(totalPortfolioValue, 'usd');
    } else {
      // Convert from USD to selected crypto
      const cryptoRate = conversionRates[selectedCurrency]?.usd;
      if (cryptoRate && cryptoRate > 0) {
        const convertedValue = totalPortfolioValue / cryptoRate;
        valueElement.textContent = formatCryptoAmount(convertedValue, selectedCurrency);
      } else {
        valueElement.textContent = formatCurrency(totalPortfolioValue, 'usd');
      }
    }
  }
  
  /**
   * Format currency values
   */
  function formatCurrency(value, currency = 'usd') {
    if (currency === 'usd') {
      return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return `${value.toLocaleString('en-US', { minimumFractionDigits: 6, maximumFractionDigits: 8 })} ${currency.toUpperCase()}`;
  }
  
  /**
   * Format crypto amounts with appropriate precision
   */
  function formatCryptoAmount(amount, symbol) {
    // Use more decimal places for smaller value cryptos
    const highValueCryptos = ['btc', 'eth', 'bnb'];
    const precision = highValueCryptos.includes(symbol) ? 8 : 2;
    
    return `${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: precision })} ${symbol.toUpperCase()}`;
  }

  /**
 * Convert cryptocurrency symbol to CoinGecko ID
 */
  function getCoingeckoId(symbol) {
    // Map common symbols to CoinGecko IDs
    const symbolToId = {
      'btc': 'bitcoin',
      'eth': 'ethereum',
      'sol': 'solana',
      'bnb': 'binancecoin',
      'ada': 'cardano',
      'doge': 'dogecoin',
      'xrp': 'ripple',
      'usdt': 'tether',
      'usdc': 'usd-coin'
    };
    
    return symbolToId[symbol.toLowerCase()] || symbol.toLowerCase();
  }

  /**
 * Convert CoinGecko ID to cryptocurrency symbol
 */
  function getSymbolFromCoinId(coinId) {
    // Map CoinGecko IDs to common symbols (inverse of getCoingeckoId)
    const idToSymbol = {
      'bitcoin': 'btc',
      'ethereum': 'eth',
      'solana': 'sol',
      'binancecoin': 'bnb',
      'cardano': 'ada',
      'dogecoin': 'doge',
      'ripple': 'xrp',
      'tether': 'usdt',
      'usd-coin': 'usdc'
    };
    
    return idToSymbol[coinId.toLowerCase()] || coinId.toLowerCase();
  }
  
  /**
   * Calculate profit/loss percentage
   */
  function calculateProfitLoss(holding) {
    const symbol = holding.asset.symbol.toLowerCase();
    const currentPrice = conversionRates[symbol]?.usd || 0;
    
    if (currentPrice === 0 || !holding.averagePrice || holding.averagePrice === 0) {
      return 0;
    }
    
    return ((currentPrice - holding.averagePrice) / holding.averagePrice) * 100;
  }
  
  /**
   * Format profit/loss display
   */
  function formatProfitLoss(percentage) {
    const sign = percentage >= 0 ? '+' : '';
    return `${sign}${percentage.toFixed(2)}%`;
  }
  
  /**
   * Render asset holdings with logos and P&L information
   */
  function renderAssetHoldings() {
    const holdingsList = document.getElementById('asset-holdings-list');
    holdingsList.innerHTML = '';
    
    portfolioHoldings.forEach(holding => {
      const symbol = holding.asset.symbol.toLowerCase();
      const profitLoss = calculateProfitLoss(holding);
      const isProfitable = profitLoss >= 0;
      
      // Get asset value in current selected currency
      let assetValue;
      if (selectedCurrency === 'usd') {
        const usdValue = holding.balance * (conversionRates[symbol]?.usd || 0);
        assetValue = formatCurrency(usdValue, 'usd');
      } else {
        // If selected currency is a crypto, we need to convert
        const usdValue = holding.balance * (conversionRates[symbol]?.usd || 0);
        const cryptoRate = conversionRates[selectedCurrency]?.usd;
        
        if (cryptoRate && cryptoRate > 0) {
          const cryptoValue = usdValue / cryptoRate;
          assetValue = formatCryptoAmount(cryptoValue, selectedCurrency);
        } else {
          // Fallback if conversion rate is not available
          assetValue = `${holding.balance} ${holding.asset.symbol}`;
        }
      }
      
      // Create the asset item element with compact layout
      const holdingItem = document.createElement('div');
      holdingItem.className = 'p-2 rounded-lg bg-gray-700 hover:bg-gray-600 transition cursor-pointer';
      
      holdingItem.innerHTML = `
        <div class="flex items-center justify-between">
          <div class="flex items-center">
            <div class="w-5 h-5 mr-2 flex-shrink-0">
              <img src="./assets-icon/${symbol}.svg" alt="${symbol}" class="w-full h-full object-contain" 
                  onerror="this.onerror=null; this.src='./assets-icon/generic.svg';">
            </div>
            <span class="font-medium">${holding.asset.symbol}</span>
          </div>
          <div class="flex items-center ${isProfitable ? 'text-green-400' : 'text-red-400'} text-xs">
            <i data-lucide="${isProfitable ? 'trending-up' : 'trending-down'}" class="w-3 h-3 mr-1"></i>
            <span>${formatProfitLoss(profitLoss)}</span>
          </div>
        </div>
        <div class="mt-1 text-right text-xs font-medium text-gray-300">${assetValue}</div>
      `;
      
      holdingsList.appendChild(holdingItem);
    });

    console.log('Portfolio holdings:', portfolioHoldings);
    console.log('Conversion rates:', conversionRates);
    
    // Refresh Lucide icons
    lucide.createIcons();
  }
  
  /**
   * Update the asset display when currency selection changes
   */
  function updateAssetDisplay() {
    updatePortfolioValueDisplay();
    renderAssetHoldings();
  }
  
  /**
   * Display error message in container
   */
  function displayErrorMessage(containerId, message) {
    const container = document.getElementById(containerId);
    if (container) {
      container.innerHTML = `<div class="text-center py-4 text-red-400">${message}</div>`;
    }
  }
  
  /**
   * Update portfolio pie chart
   */
  function updatePortfolioChart() {
    const ctx = document.getElementById('portfolioChart');
    if (!ctx) return;
    
    // Prepare data for chart
    const labels = [];
    const data = [];
    const backgroundColors = generateChartColors(portfolioHoldings.length);
    
    portfolioHoldings.forEach((holding, index) => {
      const symbol = holding.asset.symbol.toLowerCase();
      const price = conversionRates[symbol]?.usd || 0;
      const value = holding.balance * price;
      
      labels.push(holding.asset.symbol);
      data.push(value);
    });
    
    // If we already have a chart, destroy it before creating a new one
    if (portfolioChart) {
      portfolioChart.destroy();
    }
    
    // Create new chart
    portfolioChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: data,
          backgroundColor: backgroundColors,
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: 'right',
            labels: {
              color: '#fff',
              font: {
                size: 12
              }
            }
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                const value = context.raw;
                const percentage = (value / totalPortfolioValue * 100).toFixed(1);
                return `${context.label}: ${formatCurrency(value)} (${percentage}%)`;
              }
            }
          }
        }
      }
    });
  }
  
  /**
   * Generate colors for chart
   */
  function generateChartColors(count) {
    const baseColors = [
      'rgba(54, 162, 235, 0.8)',
      'rgba(255, 99, 132, 0.8)',
      'rgba(255, 206, 86, 0.8)',
      'rgba(75, 192, 192, 0.8)',
      'rgba(153, 102, 255, 0.8)',
      'rgba(255, 159, 64, 0.8)',
      'rgba(199, 199, 199, 0.8)',
      'rgba(83, 102, 255, 0.8)',
      'rgba(40, 167, 69, 0.8)',
      'rgba(255, 99, 71, 0.8)'
    ];
    
    // If we need more colors than we have in baseColors, generate them
    const colors = [...baseColors];
    if (count > baseColors.length) {
      for (let i = baseColors.length; i < count; i++) {
        const r = Math.floor(Math.random() * 255);
        const g = Math.floor(Math.random() * 255);
        const b = Math.floor(Math.random() * 255);
        colors.push(`rgba(${r}, ${g}, ${b}, 0.8)`);
      }
    }
    
    return colors.slice(0, count);
  }
  
  /**
   * Initialize crypto price chart
   */
  function initCryptoChart() {
    const ctx = document.getElementById('cryptoChart');
    if (!ctx) return;
    
    // Default data - will be updated by updateChart()
    cryptoChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: [],
        datasets: [{
          label: 'Portfolio Value',
          data: [],
          borderColor: 'rgba(54, 162, 235, 1)',
          backgroundColor: 'rgba(54, 162, 235, 0.1)',
          tension: 0.4,
          fill: true
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            labels: {
              color: '#fff'
            }
          },
          tooltip: {
            mode: 'index',
            intersect: false,
            callbacks: {
              label: function(context) {
                return `${context.dataset.label}: ${formatCurrency(context.raw)}`;
              }
            }
          }
        },
        scales: {
          x: {
            ticks: {
              color: '#9ca3af'
            },
            grid: {
              color: 'rgba(75, 85, 99, 0.2)'
            }
          },
          y: {
            ticks: {
              color: '#9ca3af',
              callback: function(value) {
                return formatCurrency(value);
              }
            },
            grid: {
              color: 'rgba(75, 85, 99, 0.2)'
            }
          }
        },
        interaction: {
          mode: 'nearest',
          axis: 'x',
          intersect: false
        }
      }
    });
    
    // Initial update with default period
    updateChart('30d');
  }
  
  /**
   * Update crypto price chart with data for specified period
   */
  async function updateChart(period) {
    if (!cryptoChart) return;
    
    const days = {
      '1d': 1,
      '7d': 7,
      '30d': 30,
      '180d': 180,
      '1y': 365,
      '1825d': 1825
    }[period] || 30;
    
    const labels = [];
    const data = [];
    
    try {
      // Get the main asset (highest value) from portfolio for historical data
      let mainAsset = 'bitcoin';  // Default fallback
      if (portfolioHoldings.length > 0) {
        // Sort by USD value and get the highest value asset
        const sortedHoldings = [...portfolioHoldings].sort((a, b) => {
          const aValue = a.balance * (conversionRates[a.asset.symbol.toLowerCase()]?.usd || 0);
          const bValue = b.balance * (conversionRates[b.asset.symbol.toLowerCase()]?.usd || 0);
          return bValue - aValue;
        });
        const topSymbol = sortedHoldings[0].asset.symbol.toLowerCase();
        mainAsset = getCoingeckoId(topSymbol);
      }
      
      // Fetch historical data from backend
      const historyResponse = await fetch(`/api/history/${mainAsset}/${days}`);
      const historyResult = await historyResponse.json();
      
      if (!historyResult.success) {
        throw new Error(historyResult.message || 'Failed to fetch historical data');
      }
      console.log('Raw history response:', JSON.stringify(historyResult).substring(0, 500));
      console.log('Historical data structure:', historyResult.data);
      console.log('Prices array available:', historyResult.data?.prices ? 'Yes' : 'No');
      console.log('Prices array length:', historyResult.data?.prices?.length || 0);
      // Process the historical price data
      const historicalData = historyResult.data.prices;
      
      historicalData.forEach(dataPoint => {
        const date = new Date(dataPoint[0]);
        labels.push(date.toLocaleDateString());
        data.push(dataPoint[1] * (totalPortfolioValue / conversionRates[mainAsset]?.usd));
      });
    } catch (error) {
      console.error('Error fetching historical data:', error);
      // Fallback to generate some placeholder data if API fails
      const endDate = new Date();
      const baseValue = totalPortfolioValue;
      
      for (let i = days; i >= 0; i--) {
        const date = new Date(endDate);
        date.setDate(date.getDate() - i);
        labels.push(date.toLocaleDateString());
        
        // Generate some random fluctuation
        const randomFactor = 0.95 + (Math.random() * 0.1);
        const value = baseValue * randomFactor;
        data.push(value);
      }
    }
    
    // Update chart data
    cryptoChart.data.labels = labels;
    cryptoChart.data.datasets[0].data = data;
    cryptoChart.update();
  }
  
  /**
   * Fetch and display transaction data
   */
  async function fetchTransactions() {
    try {
      const response = await fetch('/transactions');
      const data = await response.json();
      
      if (data.success) {
        cachedTransactions = data.data; // Cache the data
        renderTransactions(cachedTransactions);
      } else {
        console.error('Failed to fetch transactions:', data.message);
        displayErrorMessage('transactionTable', 'Failed to load transactions');
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
      displayErrorMessage('transactionTable', 'Error loading transactions');
    }
  }
  
  /**
   * Render transactions table with P/L information
   */
  function renderTransactions(transactions) {
    const transactionTable = document.getElementById('transactionTable');
    if (!transactionTable) return;
    
    transactionTable.innerHTML = '';
    
    if (!transactions || transactions.length === 0) {
      transactionTable.innerHTML = '<tr><td colspan="9" class="text-center px-4 py-4">No transactions found</td></tr>';
      return;
    }
    
    transactions.forEach(tx => {
      const symbol = tx.pair.base.symbol.toLowerCase();
      const currentPrice = conversionRates[symbol]?.usd || 0;
      let profitLoss = 0;
      
      // Calculate P/L for buy transactions (only relevant for the base asset)
      if (tx.type === 'BUY' && currentPrice > 0 && tx.price > 0) {
        profitLoss = ((currentPrice - tx.price) / tx.price) * 100;
      }

      const userLocale = navigator.language || "en-US"; // Default to en-US if unavailable
      const row = document.createElement('tr');
      if (rightSidebar === 'expanded') {
      // For expanded right sidebar
      row.innerHTML = `
        <td class="px-4 py-2 border border-gray-600">${new Date(tx.date).toLocaleDateString(userLocale)}</td>
        <td class="px-4 py-2 border border-gray-600">${tx.pair.base.symbol}/${tx.pair.quote.symbol}</td>
        <td class="px-4 py-2 border border-gray-600">${tx.type}</td>
        <td class="px-4 py-2 border border-gray-600">${tx.price.toFixed(2)}</td>
        <td class="px-4 py-2 border border-gray-600">${tx.amount.toFixed(8)}</td>
        <td class="px-4 py-2 border border-gray-600">${tx.commission ? tx.commission.toFixed(2) : '0.00'}</td>
        <td class="px-4 py-2 border border-gray-600">${tx.total.toFixed(2)}</td>
        <td class="px-4 py-2 border border-gray-600 ${profitLoss >= 0 ? 'text-green-400' : 'text-red-400'}">
          ${profitLoss ? formatProfitLoss(profitLoss) : '-'}
        </td>
        <td class="px-4 py-2 border border-gray-600">${tx.notes ? tx.notes.substring(0, 30) + (tx.notes.length > 30 ? '...' : '') : ''}</td>
      `;
      } else {
      // For preview right sidebar
      row.innerHTML = `
        <td class="px-4 py-2 border border-gray-600">${new Date(tx.date).toLocaleDateString(userLocale)}</td>
        <td class="px-4 py-2 border border-gray-600">${tx.pair.base.symbol}/${tx.pair.quote.symbol}</td>
        <td class="px-4 py-2 border border-gray-600">${tx.type}</td>
        <td class="px-4 py-2 border border-gray-600">${tx.price.toFixed(2)}</td>
        <td class="px-4 py-2 border border-gray-600">${tx.amount.toFixed(8)}</td>
        <td class="hidden px-4 py-2 border border-gray-600"></td> 
        <td class="px-4 py-2 border border-gray-600">${tx.total.toFixed(2)}</td>
        <td class="px-4 py-2 border border-gray-600 ${profitLoss >= 0 ? 'text-green-400' : 'text-red-400'}">
          ${profitLoss ? formatProfitLoss(profitLoss) : '-'}
        </td>
        <td class="hidden px-4 py-2 border border-gray-600"></td>
      `;
      }

      // Append the row to the table
      transactionTable.appendChild(row);
    });
  }
  
  /**
   * Fetch and display deposit data
   */
  async function fetchDeposits() {
    try {
      const response = await fetch('/deposits');
      const data = await response.json();
      
      if (data.success) {
        cachedDeposits = data.data; // Cache the data
        renderDeposits(cachedDeposits);
      } else {
        console.error('Failed to fetch deposits:', data.message);
        displayErrorMessage('depositTable', 'Failed to load deposits');
      }
    } catch (error) {
      console.error('Error fetching deposits:', error);
      displayErrorMessage('depositTable', 'Error loading deposits');
    }
  }
  
  /**
   * Render deposits table
   */
  function renderDeposits(deposits) {
    const depositTable = document.getElementById('depositTable');
    if (!depositTable) return;
    
    depositTable.innerHTML = '';
    
    if (!deposits || deposits.length === 0) {
      depositTable.innerHTML = '<tr><td colspan="6" class="text-center px-4 py-4">No deposits found</td></tr>';
      return;
    }
    
    deposits.forEach(deposit => {
      const row = document.createElement('tr');
      if (rightSidebar === 'expanded') {
        // For expanded right sidebar
        row.innerHTML = `
          <td class="px-4 py-2 border border-gray-600">${new Date(deposit.date).toLocaleDateString()}</td>
          <td class="px-4 py-2 border border-gray-600">${deposit.asset.symbol}</td>
          <td class="px-4 py-2 border border-gray-600">${deposit.amount.toFixed(8)}</td>
          <td class="px-4 py-2 border border-gray-600">${deposit.commission.toFixed(8)}</td>
          <td class="px-4 py-2 border border-gray-600">${(deposit.amount + deposit.commission).toFixed(8)}</td>
          <td class="px-4 py-2 border border-gray-600">${deposit.notes ? deposit.notes.substring(0, 30) + (deposit.notes.length > 30 ? '...' : '') : ''}</td>
        `;
      } else {
        // For preview right sidebar
        row.innerHTML = `
          <td class="px-4 py-2 border border-gray-600">${new Date(deposit.date).toLocaleDateString()}</td>
          <td class="px-4 py-2 border border-gray-600">${deposit.asset.symbol}</td>
          <td class="px-4 py-2 border border-gray-600">${deposit.amount.toFixed(8)}</td>
          <td class="hidden px-4 py-2 border border-gray-600"></td>
          <td class="px-4 py-2 border border-gray-600">${(deposit.amount + deposit.commission).toFixed(8)}</td>
          <td class="hidden px-4 py-2 border border-gray-600"></td>
        `;
      }

      // Append the row to the table
      depositTable.appendChild(row);
    });
  }
  
  /**
   * Fetch and display withdrawal data
   */
  async function fetchWithdrawals() {
    try {
      const response = await fetch('/withdrawals');
      const data = await response.json();
      
      if (data.success) {
        cachedWithdrawals = data.data; // Cache the data
        renderWithdrawals(cachedWithdrawals);
      } else {
        console.error('Failed to fetch withdrawals:', data.message);
        displayErrorMessage('withdrawalTable', 'Failed to load withdrawals');
      }
    } catch (error) {
      console.error('Error fetching withdrawals:', error);
      displayErrorMessage('withdrawalTable', 'Error loading withdrawals');
    }
  }
  
  /**
   * Render withdrawals table
   */
  function renderWithdrawals(withdrawals) {
    const withdrawalTable = document.getElementById('withdrawalTable');
    if (!withdrawalTable) return;
    
    withdrawalTable.innerHTML = '';
    
    if (!withdrawals || withdrawals.length === 0) {
      withdrawalTable.innerHTML = '<tr><td colspan="6" class="text-center px-4 py-4">No withdrawals found</td></tr>';
      return;
    }
    
    withdrawals.forEach(withdrawal => {
      const row = document.createElement('tr');

      if (rightSidebar === 'expanded') {
        // For expanded right sidebar
        row.innerHTML = `
          <td class="px-4 py-2 border border-gray-600">${new Date(withdrawal.date).toLocaleDateString()}</td>
          <td class="px-4 py-2 border border-gray-600">${withdrawal.asset.symbol}</td>
          <td class="px-4 py-2 border border-gray-600">${withdrawal.amount.toFixed(8)}</td>
          <td class="px-4 py-2 border border-gray-600">${withdrawal.commission.toFixed(8)}</td>
          <td class="px-4 py-2 border border-gray-600">${(withdrawal.amount + withdrawal.commission).toFixed(8)}</td>
          <td class="px-4 py-2 border border-gray-600">${withdrawal.notes ? withdrawal.notes.substring(0, 30) + (withdrawal.notes.length > 30 ? '...' : '') : ''}</td>
        `;
      } else {
        // For preview right sidebar
        row.innerHTML = `
          <td class="px-4 py-2 border border-gray-600">${new Date(withdrawal.date).toLocaleDateString()}</td>
          <td class="px-4 py-2 border border-gray-600">${withdrawal.asset.symbol}</td>
          <td class="px-4 py-2 border border-gray-600">${withdrawal.amount.toFixed(8)}</td>
          <td class="hidden px-4 py-2 border border-gray-600"></td>
          <td class="px-4 py-2 border border-gray-600">${(withdrawal.amount + withdrawal.commission).toFixed(8)}</td>
          <td class="hidden px-4 py-2 border border-gray-600"></td>
        `;
      }
      // Append the row to the table
      withdrawalTable.appendChild(row);
    });
  }

  
});