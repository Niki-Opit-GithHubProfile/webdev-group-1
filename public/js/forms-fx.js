document.addEventListener('DOMContentLoaded', function() {
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

}); 