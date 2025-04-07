document.addEventListener('DOMContentLoaded', function() {
    const withdrawalForm = document.getElementById('withdrawalForm');
    const statusMessages = document.getElementById('statusMessages');
    const assetSelect = document.getElementById('assetId');
    const assetSymbol = document.getElementById('assetSymbol');
    const commissionSymbol = document.getElementById('commissionSymbol');
    const totalSymbol = document.getElementById('totalSymbol');
    const balanceInfo = document.getElementById('balanceInfo');
    const amountDisplay = document.getElementById('amountDisplay');
    const commissionDisplay = document.getElementById('commissionDisplay');
    const amount = document.getElementById('amount');
    const commission = document.getElementById('commission');
    const totalAmount = document.getElementById('totalAmount');
    
    // Initialize formatting for numeric inputs
    if (window.FormatUtils) {
      FormatUtils.autoInitParallelInputs();
    }

    // Update asset symbol and available balance when asset is selected
    assetSelect.addEventListener('change', function() {
      const selectedOption = assetSelect.options[assetSelect.selectedIndex];
      const symbol = selectedOption.dataset.symbol || '--';
      const balance = selectedOption.dataset.balance || '0';
      
      assetSymbol.textContent = symbol;
      commissionSymbol.textContent = symbol;
      totalSymbol.textContent = symbol;
      balanceInfo.textContent = `Available: ${balance} ${symbol}`;
      
      updateTotalAmount();
    });
    
    function updateTotalAmount() {
      const amountValue = parseFloat(amount.value) || 0;
      const commissionValue = parseFloat(commission.value) || 0;
      const total = amountValue + commissionValue;
      
      // Update display and hidden fields if they exist
      if (totalAmount) {
        totalAmount.value = total;
      }
      if (document.getElementById('totalAmountDisplay')) {
        document.getElementById('totalAmountDisplay').value = FormatUtils.formatNumber(total);
      }
    }

    // Event listeners to recalculate on typing
    if (amountDisplay) amountDisplay.addEventListener('input', function() {
      const cleanedValue = this.value.replace(/\./g, '').replace(',', '.');
      amount.value = parseFloat(cleanedValue) || 0;
      updateTotalAmount();
    });
    
    if (commissionDisplay) commissionDisplay.addEventListener('input', function() {
      const cleanedValue = this.value.replace(/\./g, '').replace(',', '.');
      commission.value = parseFloat(cleanedValue) || 0;
      updateTotalAmount();
    });
    
    // Form submission
    withdrawalForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      
      // Clear previous messages
      statusMessages.innerHTML = '';
      
      try {
        // Get form data using raw values
        const formData = new FormData(withdrawalForm);
        const withdrawalData = {
          assetId: formData.get('assetId'),
          amount: parseFloat(amount.value),
          commission: parseFloat(commission.value || 0),
          date: formData.get('date'),
          notes: formData.get('notes')
        };
        
        // Validation
        if (!withdrawalData.assetId) {
          showError('Please select an asset');
          return;
        }
        
        if (!withdrawalData.amount || parseFloat(withdrawalData.amount) <= 0) {
          showError('Please enter a valid amount greater than zero');
          return;
        }
        
        if (withdrawalData.commission && parseFloat(withdrawalData.commission) < 0) {
          showError('Commission cannot be negative');
          return;
        }
        
        if (!withdrawalData.date) {
          showError('Please select a date');
          return;
        }
        
        // Check if total exceeds balance
        const selectedOption = assetSelect.options[assetSelect.selectedIndex];
        const balance = parseFloat(selectedOption.dataset.balance) || 0;
        const total = parseFloat(withdrawalData.amount) + parseFloat(withdrawalData.commission || 0);
        
        if (total > balance) {
          showError(`Total amount exceeds available balance of ${balance} ${selectedOption.dataset.symbol}`);
          return;
        }
        
        // Add CSRF token
        const csrfToken = formData.get('_csrf');
        
        // Submit the withdrawal
        const response = await fetch('/withdrawals', {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': csrfToken
          },
          body: JSON.stringify(withdrawalData)
        });
        
        const result = await response.json();
        
        if (result.success) {
          showSuccess(result.message);
          withdrawalForm.reset();
          assetSymbol.textContent = '--';
          commissionSymbol.textContent = '--';
          totalSymbol.textContent = '--';
          balanceInfo.textContent = 'Available: --';
          totalAmount.value = '';
          amountDisplay.value = '';
          commissionDisplay.value = '';
        } else {
          showError(result.message);
        }
      } catch (error) {
        console.error('Error submitting withdrawal:', error);
        showError('An unexpected error occurred. Please try again.');
      }
    });
    
    function showError(message) {
      statusMessages.innerHTML = `
        <div class="bg-red-500 text-white p-3 rounded-md">
          <p>${message}</p>
        </div>
      `;
    }
    
    function showSuccess(message) {
      statusMessages.innerHTML = `
        <div class="bg-green-500 text-white p-3 rounded-md">
          <p>${message}</p>
        </div>
      `;
    }
  });