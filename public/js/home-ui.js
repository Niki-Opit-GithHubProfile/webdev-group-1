// Account dropdown functionality
function initializeDropdown() {
    const accountBtn = document.getElementById("account-btn");
    const accountDropdown = document.getElementById("account-dropdown");
    
    if (!accountBtn || !accountDropdown) return;
    
    accountBtn.addEventListener("click", function(e) {
      e.stopPropagation();
      accountDropdown.classList.toggle("show");
    });
    
    document.addEventListener("click", function(e) {
      if (!accountBtn.contains(e.target) && !accountDropdown.contains(e.target)) {
        accountDropdown.classList.remove("show");
      }
    });
  }
  
  // Carousel functionality
  function initializeCarousel() {
    const featuresCarousel = document.getElementById('features-carousel');
    const featureDots = document.querySelectorAll('#features-dots .dot');
    
    if (!featuresCarousel || !featureDots.length) return;
    
    let featureIndex = 0;
    const totalFeatures = featuresCarousel.children.length;
    
    function updateFeatureDots() {
      featureDots.forEach((dot, idx) => {
        if(idx === featureIndex) {
          dot.classList.remove('bg-gray-500');
          dot.classList.add('bg-blue-500');
        } else {
          dot.classList.remove('bg-blue-500');
          dot.classList.add('bg-gray-500');
        }
      });
    }
    
    featureDots.forEach(dot => {
      dot.addEventListener('click', () => {
        featureIndex = parseInt(dot.getAttribute('data-index'));
        featuresCarousel.style.transform = `translateX(-${featureIndex * 100}%)`;
        updateFeatureDots();
      });
    });
  
    // Navigation Arrows
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    
    if (prevBtn && nextBtn) {
      prevBtn.addEventListener('click', function() {
        featureIndex = (featureIndex - 1 + totalFeatures) % totalFeatures;
        featuresCarousel.style.transform = `translateX(-${featureIndex * 100}%)`;
        updateFeatureDots();
      });
      
      nextBtn.addEventListener('click', function() {
        featureIndex = (featureIndex + 1) % totalFeatures;
        featuresCarousel.style.transform = `translateX(-${featureIndex * 100}%)`;
        updateFeatureDots();
      });
    }
  }
  
  // Export functions
  window.MoneyTrailUI = {
    initializeDropdown,
    initializeCarousel
  };