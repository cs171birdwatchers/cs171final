/**
 * Page Navigation Manager
 * Handles navigation between separate HTML pages
 */

(function() {
  'use strict';

  const pages = [
    { id: 1, file: 'index.html', label: 'Landing' },
    { id: 2, file: 'globe.html', label: 'Interactive Globe' },
    { id: 3, file: 'visualizations-1a.html', label: 'Migration vs Temperature' },
    { id: 4, file: 'visualizations-2a.html', label: 'Migration Timing' },
    { id: 5, file: 'visualizations-2b.html', label: 'Temperature Correlation' },
    { id: 6, file: 'visualizations-3.html', label: 'Heatmap' },
    { id: 7, file: 'cta.html', label: 'Get Involved' }
  ];

  // Get current page number from filename
  function getCurrentPage() {
    const filename = window.location.pathname.split('/').pop() || 'index.html';
    const page = pages.find(p => p.file === filename);
    return page ? page.id : 1;
  }

  // Navigate to a specific page
  function navigateToPage(pageNumber) {
    const page = pages.find(p => p.id === pageNumber);
    if (page) {
      window.location.href = page.file;
    }
  }

  // Setup navigation dots
  function setupDotNavigation() {
    const navDots = document.querySelectorAll('.nav-dot');
    const currentPage = getCurrentPage();

    navDots.forEach((dot, index) => {
      const pageNumber = index + 1;
      
      // Hide extra dots if there are more dots than pages
      if (pageNumber > pages.length) {
        dot.style.display = 'none';
        return;
      }
      
      // Set active state
      if (pageNumber === currentPage) {
        dot.classList.add('active');
        dot.setAttribute('aria-current', 'true');
      } else {
        dot.classList.remove('active');
        dot.setAttribute('aria-current', 'false');
      }

      // Add click handler
      dot.addEventListener('click', (e) => {
        e.preventDefault();
        navigateToPage(pageNumber);
      });

      // Keyboard navigation
      dot.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          navigateToPage(pageNumber);
        }
      });
    });
  }

  // Setup arrow navigation
  function setupArrowNavigation() {
    const currentPage = getCurrentPage();
    const prevArrow = document.getElementById('nav-arrow-prev');
    const nextArrow = document.getElementById('nav-arrow-next');

    // Previous arrow
    if (prevArrow) {
      if (currentPage > 1) {
        prevArrow.style.display = 'flex';
        prevArrow.addEventListener('click', () => {
          navigateToPage(currentPage - 1);
        });
      } else {
        prevArrow.style.display = 'none';
      }
    }

    // Next arrow
    if (nextArrow) {
      if (currentPage < pages.length) {
        nextArrow.style.display = 'flex';
        nextArrow.addEventListener('click', () => {
          navigateToPage(currentPage + 1);
        });
      } else {
        nextArrow.style.display = 'none';
      }
    }
  }

  // Initialize on page load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setupDotNavigation();
      setupArrowNavigation();
    });
  } else {
    setupDotNavigation();
    setupArrowNavigation();
  }

})();
