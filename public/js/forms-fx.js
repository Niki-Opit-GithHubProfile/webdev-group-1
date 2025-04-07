document.addEventListener('DOMContentLoaded', function() {
  // ===== Date input enhancements =====
  const dateInputs = document.querySelectorAll('input[type="date"]');

  dateInputs.forEach(input => {
    // Set the default date to today if no value is pre-set
    if (!input.value) {
        const today = new Date().toISOString().split('T')[0];
        input.value = today;
    }

    input.addEventListener('click', function(e) {
      const inputElement = this;
      const inputRect = inputElement.getBoundingClientRect();
      const clickX = e.clientX - inputRect.left; // Click position within the input
      const manualInputAreaWidth = inputRect.width * 0.20;

      // If the click is beyond the manual input area (on the right side)
      if (clickX > manualInputAreaWidth) {
        e.preventDefault();
        try {
          setTimeout(() => {
            inputElement.showPicker();
          }, 0);
        } catch (error) {
          console.error("Error showing date picker:", error);
          // Fallback: just focus the input if showPicker fails
          inputElement.focus();
        }
      }
    });
  });

  // ===== Number formatting utilities =====
  
  // Expose utilities globally
  window.FormatUtils = {
    /**
     * Format a number with locale-specific formatting and appropriate decimals
     * @param {number} value - The number to format
     * @param {Object} options - Configuration options
     * @returns {string} Formatted number string
     */
    formatNumber: function(value, options = {}) {
      // Default options
      const defaults = {
        minDecimals: 2,
        maxDecimals: 8,
        locale: navigator.language || 'en-US',
        trimInsignificantZeros: true
      };
      
      // Merge options
      const config = {...defaults, ...options};
      
      if (typeof value !== 'number') {
        value = parseFloat(value) || 0;
      }
      
      // For zero, just use minDecimals
      if (value === 0) {
        return value.toLocaleString(config.locale, {
          minimumFractionDigits: config.minDecimals,
          maximumFractionDigits: config.minDecimals
        });
      }
      
      // If we need to trim insignificant zeros
      if (config.trimInsignificantZeros) {
        // Determine appropriate number of decimal places by finding significant digits
        const valueStr = value.toString();
        const decimalPart = valueStr.includes('.') ? valueStr.split('.')[1] : '';
        
        if (decimalPart) {
          // Find trailing zeros
          const reversedDecimal = decimalPart.split('').reverse().join('');
          const nonZeroIndex = reversedDecimal.search(/[^0]/);
          const significantDecimals = nonZeroIndex === -1 ? 0 : decimalPart.length - nonZeroIndex;
          
          // Use the greater of minDecimals or significantDecimals, but cap at maxDecimals
          const effectiveDecimals = Math.max(
            config.minDecimals,
            Math.min(significantDecimals, config.maxDecimals)
          );
          
          return value.toLocaleString(config.locale, {
            minimumFractionDigits: config.minDecimals,
            maximumFractionDigits: effectiveDecimals
          });
        }
      }
      
      // Default formatting without trimming zeros
      return value.toLocaleString(config.locale, {
        minimumFractionDigits: config.minDecimals,
        maximumFractionDigits: config.maxDecimals
      });
    },
    
    /**
     * Format a currency value
     * @param {number} value - The value to format
     * @param {string} currency - Currency code (e.g., 'usd', 'btc')
     * @returns {string} Formatted currency string
     */
    formatCurrency: function(value, currency = 'usd') {
      const isFiat = currency === 'usd' || currency === 'eur' || currency === 'gbp';
      const options = {
        minDecimals: 2,
        maxDecimals: isFiat ? 2 : 8
      };
      
      const formattedValue = this.formatNumber(value, options);
      
      // Add currency symbol or code
      if (currency === 'usd') {
        return `$${formattedValue}`;
      } else {
        return `${formattedValue} ${currency.toUpperCase()}`;
      }
    },
    
    /**
     * Format crypto amount with appropriate precision
     * @param {number} amount - The amount to format
     * @param {string} symbol - Cryptocurrency symbol
     * @returns {string} Formatted crypto amount
     */
    formatCryptoAmount: function(amount, symbol) {
      const highValueCryptos = ['btc', 'eth', 'bnb'];
      const isHighValue = highValueCryptos.includes(symbol.toLowerCase());
      
      const options = {
        minDecimals: 2,
        maxDecimals: isHighValue ? 8 : (amount < 1 ? 6 : 2)
      };
      
      return `${this.formatNumber(amount, options)} ${symbol.toUpperCase()}`;
    },
    
    /**
   * Attach parallel hidden-input behavior to a display input
   * @param {HTMLInputElement} displayInput - The visible text input
   * @param {HTMLInputElement} hiddenInput - The hidden input that will be submitted
   * @param {Object} options - Additional formatting options
   */
    setupParallelInput: function(displayInput, hiddenInput, options = {}) {
      // On focus, show the raw numeric value
      displayInput.addEventListener('focus', function() {
        // Show the raw value from the hidden input when focusing
        displayInput.value = hiddenInput.value || "";
      });

      // On blur, parse input, update hidden field, then format display
      displayInput.addEventListener('blur', function() {
        if (!displayInput.value.trim()) {
          displayInput.value = "";
          hiddenInput.value = "";
          return;
        }

        // Convert commas to periods and remove thousand separators for parsing
        const cleanedValue = displayInput.value.replace(/\./g, '').replace(',', '.');
        const numericValue = parseFloat(cleanedValue);
        
        if (isNaN(numericValue)) {
          console.log("Could not parse value:", displayInput.value);
          // Could either clear the field or revert to previous value
          displayInput.value = hiddenInput.value || "";
          return;
        }
        
        // Store raw numeric value in hidden input
        hiddenInput.value = numericValue;
        
        // Format the display with nice locale-specific formatting
        const inputOptions = {...options};
        // Special case for crypto amounts
        if (displayInput.id === 'amountDisplay' || displayInput.id === 'cryptoAmountDisplay') {
          inputOptions.maxDecimals = 8;
        }
        
        // Apply formatted value to display input
        displayInput.value = FormatUtils.formatNumber(numericValue, inputOptions);
      });

      // Initialize if hidden input already has a value
      if (hiddenInput.value) {
        const numericValue = parseFloat(hiddenInput.value);
        if (!isNaN(numericValue)) {
          displayInput.value = FormatUtils.formatNumber(numericValue, options);
        }
      }
    },

    /**
     * Auto-initialize all parallel inputs by naming convention
     */
    autoInitParallelInputs: function() {
      const displayFields = document.querySelectorAll('input[id$="Display"]');
      displayFields.forEach(displayInput => {
        const hiddenId = displayInput.id.replace('Display', '');
        const hiddenInput = document.getElementById(hiddenId);
        if (hiddenInput) {
          this.setupParallelInput(displayInput, hiddenInput);
        }
      });
    }
  
  };
  
  // Auto-initialize known numeric inputs if they exist
  const commonInputIds = ['amount', 'price', 'commission', 'totalValue', 'cryptoAmount'];
  const numericInputs = commonInputIds
    .map(id => document.getElementById(id))
    .filter(el => el !== null);
  
  // Initialize parallel inputs
  if (FormatUtils.autoInitParallelInputs) {
    FormatUtils.autoInitParallelInputs();
  }
});