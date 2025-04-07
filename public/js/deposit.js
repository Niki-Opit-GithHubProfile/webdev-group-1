document.addEventListener('DOMContentLoaded', function() {
  const depositForm = document.getElementById('depositForm');
  const statusMessages = document.getElementById('statusMessages');
  const assetSelect = document.getElementById('assetId');
  const assetSymbol = document.getElementById('assetSymbol');
  const commissionSymbol = document.getElementById('commissionSymbol');
  const amountDisplay = document.getElementById('amountDisplay');
  const commissionDisplay = document.getElementById('commissionDisplay');
  const amount = document.getElementById('amount');
  const commission = document.getElementById('commission');
  const totalValue = document.getElementById('totalValue');

  // Initialize formatting for numeric inputs
  if (window.FormatUtils) {
    FormatUtils.autoInitParallelInputs();
  }
  
  // Calculate total deposit value
  function calculateTotal() {
    const amountValue = parseFloat(amount.value) || 0;
    const commissionValue = parseFloat(commission.value) || 0;
    const total = amountValue + commissionValue;
    
    // Update total value
    if (totalValue) {
      totalValue.value = total;
    }
  }

  // Attach input events to display fields
  if (amountDisplay) amountDisplay.addEventListener('input', function() {
    // Update hidden value when typing (optional, the blur handler will do this too)
    const cleanedValue = this.value.replace(/\./g, '').replace(',', '.');
    amount.value = parseFloat(cleanedValue) || 0;
    calculateTotal();
  });
  
  if (commissionDisplay) commissionDisplay.addEventListener('input', function() {
    // Update hidden value when typing
    const cleanedValue = this.value.replace(/\./g, '').replace(',', '.');
    commission.value = parseFloat(cleanedValue) || 0;
    calculateTotal();
  });
  
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
        amount: parseFloat(amount.value),
        commission: parseFloat(commission.value || 0),
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
        amountDisplay.value = '';
        commissionDisplay.value = '';
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