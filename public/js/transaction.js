document.addEventListener('DOMContentLoaded', function() {
  // Get form elements
  const form = document.getElementById('transactionForm');
  const typeSelect = document.getElementById('type');
  const pairSelect = document.getElementById('pairId');
  const amount = document.getElementById('amount');
  const price = document.getElementById('price');
  const commission = document.getElementById('commission');
  const amountDisplay = document.getElementById('amountDisplay');
  const priceDisplay = document.getElementById('priceDisplay');
  const commissionDisplay = document.getElementById('commissionDisplay');
  const totalValue = document.getElementById('totalValue');
  const quoteCurrencySpan = document.getElementById('quoteCurrency');
  const dateInput = document.getElementById('date');
  const statusMessages = document.getElementById('statusMessages');

  if (window.FormatUtils) {
    FormatUtils.autoInitParallelInputs();
  }
  
  // Store price data cache
  const priceCache = {};
  
  // Set default date to current date and time
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  dateInput.value = `${year}-${month}-${day}T${hours}:${minutes}`;
  
  // Update quote currency display and fetch prices when pair changes
  pairSelect.addEventListener('change', function() {
    const selectedOption = pairSelect.options[pairSelect.selectedIndex];
    if (selectedOption && selectedOption.value) {
      const quoteSymbol = selectedOption.dataset.quote;
      const quoteId = selectedOption.dataset.quoteId;
      const baseId = selectedOption.dataset.baseId;
      
      quoteCurrencySpan.textContent = quoteSymbol;
      fetchCoinPrices(baseId, quoteId);
      calculateTotal();
      
      // Check for available balance for SELL transactions
      if (typeSelect.value === 'SELL') {
        checkSellBalance(baseId);
      }
    } else {
      quoteCurrencySpan.textContent = '--';
    }
  });
  
  // Check balance on type change
  typeSelect.addEventListener('change', function() {
    const selectedOption = pairSelect.options[pairSelect.selectedIndex];
    if (selectedOption && selectedOption.value) {
      const baseId = selectedOption.dataset.baseId;
      const quoteId = selectedOption.dataset.quoteId;
      
      if (this.value === 'SELL') {
        checkSellBalance(baseId);
      } else {
        checkBuyBalance(quoteId);
      }
    }
    calculateTotal();
  });
  
  // Function to check if user has enough base asset to sell
  async function checkSellBalance(assetId) {
    if (!assetId || !amount.value) return;
    
    try {
      const response = await fetch(`/portfolio/balance/${assetId}`, {
        credentials: 'include'
      });
      if (!response.ok) return;
      
      const data = await response.json();
      if (!data.success) return;
      
      const balance = parseFloat(data.balance) || 0;
      const amountValue = parseFloat(amount.value) || 0;
      
      if (amountValue > balance) {
        const warning = document.getElementById('balanceWarning') || document.createElement('p');
        warning.id = 'balanceWarning';
        warning.className = 'text-red-500 text-xs mt-1';
        warning.textContent = `Warning: Insufficient balance. You have ${FormatUtils.formatNumber(balance)} units available.`;
        
        if (!document.getElementById('balanceWarning')) {
          amountDisplay.parentElement.appendChild(warning);
        }
      } else {
        const warning = document.getElementById('balanceWarning');
        if (warning) warning.remove();
      }
    } catch (error) {
      console.error('Error checking balance:', error);
    }
  }
  
  // Function to check if user has enough quote asset to buy
  async function checkBuyBalance(assetId) {
    if (!assetId || !amount.value || !price.value) return;
    
    try {
      const response = await fetch(`/portfolio/balance/${assetId}`, {
        credentials: 'include'
      });
      if (!response.ok) return;
      
      const data = await response.json();
      if (!data.success) return;
      
      const balance = parseFloat(data.balance) || 0;
      const amountValue = parseFloat(amount.value) || 0;
      const priceValue = parseFloat(price.value) || 0;
      const commissionValue = parseFloat(commission.value) || 0;
      const total = (amountValue * priceValue) + commissionValue;
      
      if (total > balance) {
        const warning = document.getElementById('balanceWarning') || document.createElement('p');
        warning.id = 'balanceWarning';
        warning.className = 'text-red-500 text-xs mt-1';
        warning.textContent = `Warning: Insufficient funds. You have ${FormatUtils.formatNumber(balance)} units available.`;
        
        if (!document.getElementById('balanceWarning')) {
          totalValue.parentElement.appendChild(warning);
        }
      } else {
        const warning = document.getElementById('balanceWarning');
        if (warning) warning.remove();
      }
    } catch (error) {
      console.error('Error checking balance:', error);
    }
  }
  
  // Function to calculate the total value  
  function calculateTotal() {
    const amountValue = parseFloat(amount.value) || 0;
    const priceValue = parseFloat(price.value) || 0;
    const commissionValue = parseFloat(commission.value) || 0;
    
    const subtotal = amountValue * priceValue;
    const total = subtotal + commissionValue;
    
    // Update total
    if (totalValue) {
      totalValue.value = total;
    }
  }

  // Add input listeners to update on typing
  if (amountDisplay) amountDisplay.addEventListener('input', function() {
    const cleanedValue = this.value.replace(/\./g, '').replace(',', '.');
    amount.value = parseFloat(cleanedValue) || 0;
    calculateTotal();
  });
  
  if (priceDisplay) priceDisplay.addEventListener('input', function() {
    const cleanedValue = this.value.replace(/\./g, '').replace(',', '.');
    price.value = parseFloat(cleanedValue) || 0;
    calculateTotal();
  });
  
  if (commissionDisplay) commissionDisplay.addEventListener('input', function() {
    const cleanedValue = this.value.replace(/\./g, '').replace(',', '.');
    commission.value = parseFloat(cleanedValue) || 0;
    calculateTotal();
  });
  
  // Fetch cryptocurrency prices from our API
  async function fetchCoinPrices(baseId, quoteId) {
    try {
      // Only fetch if we don't have recent data in cache
      const now = Date.now();
      const cacheTime = 60000; // 1 minute cache
      
      let coinIds = [];
      
      if (!baseId || !quoteId) {
        return;
      }
      
      // Add base and quote to the list of coins to fetch
      coinIds.push(baseId);
      
      // If quote is not USDT/USDC/USD, add it to fetch its USD value
      if (quoteId !== 'tether' && quoteId !== 'usd-coin' && quoteId !== 'usd') {
        coinIds.push(quoteId);
      }
      
      // Check if we need to fetch new data
      const shouldFetch = coinIds.some(id => {
        return !priceCache[id] || (now - priceCache[id].timestamp > cacheTime);
      });
      
      if (shouldFetch) {
        // Call API endpoint that wraps CoinGecko
        const response = await fetch(`/api/prices?coins=${coinIds.join(',')}`, {
          credentials: 'include'
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch cryptocurrency prices');
        }
        
        const data = await response.json();
        
        if (!data.success || !data.data) {
          throw new Error('Invalid price data received');
        }
        
        // Update cache with new prices and timestamp
        coinIds.forEach(id => {
          if (data.data[id]) {
            priceCache[id] = {
              price: data.data[id].usd,
              timestamp: now
            };
          }
        });
      }
            
    } catch (error) {
      console.error('Error fetching prices:', error);
      showMessage('error', `Error fetching prices: ${error.message}`);
    }
  }
  
  // Form submission
  form.addEventListener('submit', function(event) {
    event.preventDefault();
    
    // Clear previous error messages
    clearValidationMessages();
    
    // Validate form
    if (!validateForm()) {
      return;
    }
    
    // Check balance warnings
    const balanceWarning = document.getElementById('balanceWarning');
    if (balanceWarning) {
      showMessage('error', 'Please correct the balance issues before submitting');
      return;
    }
    
    // Prepare the form data
    const formData = new FormData(form);
    const jsonData = {};
    formData.forEach((value, key) => {
      jsonData[key] = value;
    });
    
    // Add total value
    jsonData.total = parseFloat(totalValue.value) || 0;
    
    // Send the data to the server
    fetch('/transactions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'CSRF-Token': formData.get('_csrf')
      },
      body: JSON.stringify(jsonData)
    })
    .then(response => {
      if (!response.ok) {
        return response.json().then(data => {
          throw new Error(data.message || 'Server error occurred');
        });
      }
      return response.json();
    })
    .then(data => {
      if (data.success) {
        showMessage('success', 'Transaction added successfully!');
        resetForm();
        
        // Redirect to dashboard after short delay
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 1500);
      } else {
        showMessage('error', data.message || 'An error occurred');
      }
    })
    .catch(error => {
      console.error('Error:', error);
      showMessage('error', error.message || 'An unexpected error occurred');
    });
  });
  
  // Form validation
  function validateForm() {
    let isValid = true;
    
    // Validate required fields
    const requiredFields = [
      { field: pairSelect, message: 'Please select a trading pair' },
      { field: amountDisplay, message: 'Please enter a quantity' },
      { field: priceDisplay, message: 'Please enter a price' },
      { field: dateInput, message: 'Please select a date' }
    ];
    
    requiredFields.forEach(({ field, message }) => {
      if (!field.value) {
        addValidationMessage(field, message);
        isValid = false;
      }
    });
    
    // Validate numeric fields are positive
    const numericFields = [
      { field: amountDisplay, message: 'Quantity must be a positive number' },
      { field: priceDisplay, message: 'Price must be a positive number' },
      { field: commissionDisplay, message: 'Commission must be a positive number' }
    ];
    
    numericFields.forEach(({ field, message }) => {
      const value = parseFloat(field.value);
      if (field.value && (isNaN(value) || value < 0)) {
        addValidationMessage(field, message);
        isValid = false;
      }
    });
    
    // Validate date is not in the future
    const selectedDate = new Date(dateInput.value);
    if (selectedDate > new Date()) {
      addValidationMessage(dateInput, 'Date cannot be in the future');
      isValid = false;
    }
    
    return isValid;
  }
  
  // Add validation message below a field
  function addValidationMessage(field, message) {
    // Check if message already exists
    const parentDiv = field.parentElement.closest('div');
    const existingMessage = parentDiv.querySelector('.text-red-500');
    
    if (!existingMessage) {
      const errorMessage = document.createElement('p');
      errorMessage.className = 'text-red-500 text-xs mt-1';
      errorMessage.textContent = message;
      
      // If the field has a relative parent (like the dropdown), add after that
      if (field.parentElement.classList.contains('relative')) {
        field.parentElement.parentElement.appendChild(errorMessage);
      } else {
        parentDiv.appendChild(errorMessage);
      }
    }
  }
  
  // Clear all validation messages
  function clearValidationMessages() {
    const errorMessages = document.querySelectorAll('.text-red-500');
    errorMessages.forEach(el => el.remove());
  }
  
  // Show status message
  function showMessage(type, messageText) {
    // Remove existing messages
    statusMessages.innerHTML = '';
    
    const messageDiv = document.createElement('div');
    messageDiv.className = type === 'success' 
      ? 'bg-green-500 border border-green-600 text-white p-3 rounded-md mb-4 relative'
      : 'bg-red-500 border border-red-600 text-white p-3 rounded-md mb-4 relative';
    
    // Add message content
    const messageContent = document.createElement('p');
    messageContent.className = 'pr-6';
    messageContent.textContent = messageText;
    messageDiv.appendChild(messageContent);
    
    // Add close button
    const closeButton = document.createElement('button');
    closeButton.className = 'absolute right-3 top-3 text-white';
    closeButton.innerHTML = '✕';
    closeButton.addEventListener('click', () => messageDiv.remove());
    messageDiv.appendChild(closeButton);
    
    // Add to DOM
    statusMessages.appendChild(messageDiv);
    
    // Auto-dismiss success messages after 5 seconds
    if (type === 'success') {
      setTimeout(() => {
        if (messageDiv.parentElement) {
          messageDiv.remove();
        }
      }, 5000);
    }
  }
  
  // Reset form after successful submission
  function resetForm() {
    // Reset form fields
    form.reset();
    
    // Set default date again
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    dateInput.value = `${year}-${month}-${day}T${hours}:${minutes}`;
    
    // Reset calculated fields
    totalValue.value = '';
    if (amountDisplay) amountDisplay.value = '';
    if (priceDisplay) priceDisplay.value = '';
    if (commissionDisplay) commissionDisplay.value = '';
    quoteCurrencySpan.textContent = '--';
    
    // Clear any validation messages
    clearValidationMessages();
  }
});