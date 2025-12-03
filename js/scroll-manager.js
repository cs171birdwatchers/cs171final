/**
 * Scroll Manager
 * Handles scroll detection, section navigation, and dot navigation updates
 */

(function() {
  'use strict';

  const sections = document.querySelectorAll('.viewport-section');
  const navDots = document.querySelectorAll('.nav-dot');
  let isScrolling = false;

  // Intersection Observer for section detection
  const observerOptions = {
    root: null,
    rootMargin: '0px',
    threshold: 0.5 // Section is "active" when 50% visible
  };

  const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const sectionId = entry.target.id;
        updateActiveNavDot(sectionId);
      }
    });
  }, observerOptions);

  // Observe all sections
  sections.forEach(section => {
    sectionObserver.observe(section);
  });

  // Update active dot based on current section
  function updateActiveNavDot(sectionId) {
    const sectionIndex = parseInt(sectionId.replace('section-', '')) - 1;
    
    navDots.forEach((dot, index) => {
      if (index === sectionIndex) {
        dot.classList.add('active');
        dot.setAttribute('aria-current', 'true');
      } else {
        dot.classList.remove('active');
        dot.setAttribute('aria-current', 'false');
      }
    });
  }

  // Handle dot click navigation
  navDots.forEach((dot, index) => {
    dot.addEventListener('click', (e) => {
      e.preventDefault();
      const targetSection = document.getElementById(`section-${index + 1}`);
      
      if (targetSection) {
        targetSection.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }
    });

    // Keyboard navigation support
    dot.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        dot.click();
      }
    });
  });

  // Initialize - set first dot as active
  if (navDots.length > 0) {
    navDots[0].classList.add('active');
    navDots[0].setAttribute('aria-current', 'true');
  }

})();

