document.addEventListener('DOMContentLoaded', function() {
  const depositForm = document.getElementById('depositForm');
  const statusMessages = document.getElementById('statusMessages');
  const assetSelect = document.getElementById('assetId');
  const assetSymbol = document.getElementById('assetSymbol');
  const commissionSymbol = document.getElementById('commissionSymbol');
  const amountInput = document.getElementById('amount');
  const commissionInput = document.getElementById('commission');
  const totalValueInput = document.getElementById('totalValue');

  // Initialize formatting for numeric inputs
  if (window.FormatUtils) {
    FormatUtils.setupNumericInputs([amountInput, commissionInput, totalValueInput]);
  }
  
  // Calculate total when amount or commission changes
  [amountInput, commissionInput].forEach(input => {
    input.addEventListener('input', calculateTotal);
  });
  
  // Calculate total deposit value
  function calculateTotal() {
    if (!amountInput.value) {
      totalValueInput.value = '';
      return;
    }
    
    // Use raw values for calculation
    const amount = parseFloat(amountInput.dataset.rawValue || amountInput.value) || 0;
    const commission = parseFloat(commissionInput.dataset.rawValue || commissionInput.value) || 0;
    
    // Calculate total (amount minus commission)
    const total = amount - commission;
    
    // Store raw value and display formatted value
    totalValueInput.dataset.rawValue = total;
    totalValueInput.value = FormatUtils.formatNumber(total, {minDecimals: 2, maxDecimals: 8});
  }
  
  // Update asset symbol when asset is selected
  assetSelect.addEventListener('change', function() {
    const selectedOption = assetSelect.options[assetSelect.selectedIndex];
    const symbol = selectedOption.dataset.symbol || '--';
    
    assetSymbol.textContent = symbol;
    commissionSymbol.textContent = symbol;
  });
  
  // Form submission
  depositForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    // Clear previous messages
    statusMessages.innerHTML = '';
    
    try {
      // Get form data using raw values
      const formData = new FormData(depositForm);
      const depositData = {
        assetId: formData.get('assetId'),
        amount: parseFloat(amountInput.dataset.rawValue || formData.get('amount')),
        commission: parseFloat(commissionInput.dataset.rawValue || formData.get('commission') || 0),
        date: formData.get('date'),
        notes: formData.get('notes')
      };
      
      // Validation
      if (!depositData.assetId) {
        showError('Please select an asset');
        return;
      }
      
      if (!depositData.amount || parseFloat(depositData.amount) <= 0) {
        showError('Please enter a valid amount greater than zero');
        return;
      }
      
      if (depositData.commission && parseFloat(depositData.commission) < 0) {
        showError('Commission cannot be negative');
        return;
      }
      
      if (!depositData.date) {
        showError('Please select a date');
        return;
      }
      
      // Add CSRF token
      const csrfToken = formData.get('_csrf');
      
      // Submit the deposit
      const response = await fetch('/deposits', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken
        },
        body: JSON.stringify(depositData)
      });
      
      const result = await response.json();
      
      if (result.success) {
        showSuccess(result.message);
        depositForm.reset();
        assetSymbol.textContent = '--';
        commissionSymbol.textContent = '--';
      } else {
        showError(result.message);
      }
    } catch (error) {
      console.error('Error submitting deposit:', error);
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