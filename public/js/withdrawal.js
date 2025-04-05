document.addEventListener('DOMContentLoaded', function() {
    const withdrawalForm = document.getElementById('withdrawalForm');
    const statusMessages = document.getElementById('statusMessages');
    const assetSelect = document.getElementById('assetId');
    const assetSymbol = document.getElementById('assetSymbol');
    const commissionSymbol = document.getElementById('commissionSymbol');
    const totalSymbol = document.getElementById('totalSymbol');
    const balanceInfo = document.getElementById('balanceInfo');
    const amountInput = document.getElementById('amount');
    const commissionInput = document.getElementById('commission');
    const totalAmountInput = document.getElementById('totalAmount');
    
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
    
    // Update total amount when amount or commission changes
    [amountInput, commissionInput].forEach(input => {
      input.addEventListener('input', updateTotalAmount);
    });
    
    function updateTotalAmount() {
      const amount = parseFloat(amountInput.value) || 0;
      const commission = parseFloat(commissionInput.value) || 0;
      const total = (amount + commission).toFixed(8);
      
      totalAmountInput.value = total;
      
      // Get selected asset balance
      const selectedOption = assetSelect.options[assetSelect.selectedIndex];
      if (selectedOption && selectedOption.value) {
        const balance = parseFloat(selectedOption.dataset.balance) || 0;
        
        // Validate against balance
        if (amount + commission > balance) {
          totalAmountInput.classList.add('border-red-500');
          balanceInfo.classList.add('text-red-500');
          balanceInfo.classList.remove('text-gray-400');
        } else {
          totalAmountInput.classList.remove('border-red-500');
          balanceInfo.classList.remove('text-red-500');
          balanceInfo.classList.add('text-gray-400');
        }
      }
    }
    
    // Form submission
    withdrawalForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      
      // Clear previous messages
      statusMessages.innerHTML = '';
      
      try {
        // Get form data
        const formData = new FormData(withdrawalForm);
        const withdrawalData = {
          assetId: formData.get('assetId'),
          amount: formData.get('amount'),
          commission: formData.get('commission'),
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
          totalAmountInput.value = '';
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