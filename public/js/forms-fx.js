document.addEventListener('DOMContentLoaded', function() {
  const dateInputs = document.querySelectorAll('input[type="date"]');
  
  dateInputs.forEach(input => {
    input.addEventListener('click', function(e) {
      // Get the text content area width (approximately first 70% of the input)
      const inputRect = this.getBoundingClientRect();
      const dateTextWidth = inputRect.width * 0.7;
      
      // Calculate click position relative to input field
      const clickPositionX = e.clientX - inputRect.left;
      
      // If click is NOT in the date text area (left side), open the date picker
      if (clickPositionX > dateTextWidth) {
        // Prevent default to block text selection
        e.preventDefault();
        // Focus and show date picker
        this.focus();
        // Trigger calendar open with a small delay
        setTimeout(() => {
          // Simulate a keyboard event that consistently opens the calendar
          const event = new KeyboardEvent('keydown', {
            key: 'ArrowDown',
            keyCode: 40,
            which: 40,
            bubbles: true
          });
          this.dispatchEvent(event);
        }, 50);
      }
    });
  });
});