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

/**
 * Setup all navigation buttons with proper auth redirects
 */
function setupNavigationButtons() {
  // Get Started button - redirect to signup
  const getStartedBtn = document.getElementById('get-started-btn');
  if (getStartedBtn) {
    getStartedBtn.addEventListener('click', function() {
      window.location.href = '/auth/signup';
    });
  }
  
  // Dashboard button - redirect to dashboard or login
  const dashboardBtn = document.getElementById('dashboard-btn');
  const mobileDashboardBtn = document.getElementById('dashboard-btn-mobile');
  const personalDashboardBtn = document.getElementById('personal-dashboard-btn');
  
  [dashboardBtn, mobileDashboardBtn, personalDashboardBtn].forEach(btn => {
    if (btn) {
      btn.addEventListener('click', function() {
        window.location.href = '/auth/login';
      });
    }
  });
  
  // Convert Now button
  const convertBtn = document.querySelector(".min-w-full:nth-child(3) button");
  if (convertBtn) {
    convertBtn.addEventListener('click', function() {
      window.location.href = '/auth/login';
    });
  }
  
  // Learn More button
  const learnMoreBtn = document.querySelector(".min-w-full:nth-child(2) button");
  if (learnMoreBtn) {
    learnMoreBtn.addEventListener('click', function() {
      window.location.href = '/auth/login';
    });
  }
}