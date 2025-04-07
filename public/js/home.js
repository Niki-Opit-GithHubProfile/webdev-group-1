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
  const dashboardBtns = [
  document.getElementById('dashboard-btn'),
  document.getElementById('dashboard-btn-mobile'),
  document.getElementById('personal-dashboard')
  ];

  dashboardBtns.forEach(btn => {
    if (btn) {
      btn.addEventListener('click', function () {
        window.location.href = '/onboarding/dashboard';
      });
    }
  });

  const convertBtns = [
  document.getElementById('convert-btn'),
  document.getElementById('convert-btn-mobile'),
  document.getElementById('convert-now-btn')
  ];

  convertBtns.forEach(btn => {
    if (btn) {
      btn.addEventListener('click', function () {
        window.location.href = '/onboarding/quickConverter';
      });
    }
  });


  // Get Started button - redirect to signup
  const getStartedBtn = document.getElementById('get-started-btn');
  if (getStartedBtn) {
    getStartedBtn.addEventListener('click', function() {
      window.location.href = '/auth/signup';
    });
  }
  

  // Learn More button
  const learnMoreBtn = document.getElementById("learn-more-btn");
  if (learnMoreBtn) {
    learnMoreBtn.addEventListener('click', function() {
      window.location.href = '/auth/signup';
    });
  }
}