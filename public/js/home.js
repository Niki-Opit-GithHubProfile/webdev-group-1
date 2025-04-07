document.addEventListener('DOMContentLoaded', function () {
  // Initialize Lucide Icons
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  } else {
    console.warn("Lucide icons library not loaded");
  }
  
  // Initialize UI components
  if (window.MoneyTrailUI) {
    window.MoneyTrailUI.initializeDropdown();
    window.MoneyTrailUI.initializeCarousel();
  }
  
  // Initialize navigation buttons
  setupNavigationButtons();
});


function setupNavigationButtons() {

  const dashboardBtn = document.getElementById('dashboard-btn');
  if (dashboardBtn) {
    dashboardBtn.addEventListener('click', function () {
      window.location.href = '/onboarding/dashboard';
    });
  }

  // Get Started button - redirect to signup
  const getStartedBtn = document.getElementById('get-started-btn');
  if (getStartedBtn) {
    getStartedBtn.addEventListener('click', function() {
      window.location.href = '/auth/signup';
    });
  }
  
  // Convert Now button
  const convertBtn = document.getElementById('convert-btn');
  if (convertBtn) {
    convertBtn.addEventListener('click', function() {
      window.location.href = '/onboarding/quickConverter';
    });
  }
  
  // Learn More button
  const learnMoreBtn = document.querySelector("learn-more-btn");
  if (learnMoreBtn) {
    learnMoreBtn.addEventListener('click', function() {
      window.location.href = '/auth/signup';
    });
  }
}