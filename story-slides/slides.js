/**
 * Story Slides Controller
 * Manages the display and transitions of narrative story slides
 */

(function() {
  'use strict';

  class StorySlideController {
    constructor(pageId) {
      this.pageId = pageId;
      this.slides = [];
      this.currentIndex = -1;
      this.isPlaying = false;
      this.container = null;
      this.progressBar = null;
      this.hasPlayedIntro = false;
      
      // Check if intro has already been shown this session
      this.introKey = `story-intro-shown-${pageId}`;
    }

    /**
     * Initialize the story slides for the current page
     */
    init() {
      // Get slides for this page
      if (!window.STORY_SLIDES || !window.STORY_SLIDES[this.pageId]) {
        console.log('No story slides for page:', this.pageId);
        return;
      }

      this.slides = window.STORY_SLIDES[this.pageId];
      
      // Check sessionStorage to see if we've shown intro already
      if (sessionStorage.getItem(this.introKey)) {
        this.hasPlayedIntro = true;
        console.log('Intro already shown this session for:', this.pageId);
        // Still add story-complete class for proper styling
        document.body.classList.add('story-complete');
        return;
      }

      // Hide page content initially
      document.body.classList.add('story-loading');

      // Create container
      this.createContainer();
      
      // Start the slide sequence
      this.start();
    }

    /**
     * Create the slide container
     */
    createContainer() {
      this.container = document.createElement('div');
      this.container.id = 'story-slides-container';
      this.container.setAttribute('role', 'region');
      this.container.setAttribute('aria-label', 'Story introduction');
      document.body.appendChild(this.container);
    }


    /**
     * Start the slide sequence
     */
    start() {
      this.isPlaying = true;
      this.showSlide(0);
      
      // Add click/key handler to skip
      this.addSkipHandler();
    }

    /**
     * Show a specific slide
     */
    showSlide(index) {
      if (index >= this.slides.length) {
        this.complete();
        return;
      }

      this.currentIndex = index;
      const slide = this.slides[index];
      
      // Create and show slide
      const slideEl = this.createSlideElement(slide);
      this.container.appendChild(slideEl);
      
      // Trigger animation
      requestAnimationFrame(() => {
        slideEl.classList.add('active');
      });

      // Handle click-to-start slides
      if (slide.waitForClick) {
        // Add waiting class for CSS
        slideEl.classList.add('story-slide--waiting');
        
        // Add click prompt
        const prompt = document.createElement('div');
        prompt.className = 'story-click-prompt';
        prompt.innerHTML = '<span>Click to begin</span>';
        slideEl.appendChild(prompt);
        
        // Wait for click to start animation
        const clickHandler = () => {
          slideEl.removeEventListener('click', clickHandler);
          slideEl.classList.add('clicked');
          prompt.classList.add('fade-out');
          setTimeout(() => prompt.remove(), 500);
          
          // Start the number animation
          const numberEl = slideEl.querySelector('.story-number');
          if (numberEl && numberEl.dataset.targetNumber) {
            numberEl.textContent = '0';
            this.animateNumber(numberEl, numberEl.dataset.targetNumber);
          }
          
          // Schedule auto-advance after animation completes
          if (slide.autoAdvance) {
            setTimeout(() => {
              if (this.isPlaying) {
                this.hideSlide(slideEl, slide, () => {
                  this.showSlide(index + 1);
                });
              }
            }, slide.duration || 2000);
          }
        };
        
        slideEl.addEventListener('click', clickHandler);
        slideEl.style.cursor = 'pointer';
        return;
      }

      // Handle auto-advance for non-click slides
      if (slide.autoAdvance) {
        // Start number animation immediately for non-click slides
        const numberEl = slideEl.querySelector('.story-number');
        if (numberEl && numberEl.dataset.targetNumber) {
          numberEl.textContent = '0';
          this.animateNumber(numberEl, numberEl.dataset.targetNumber);
        }
        
        setTimeout(() => {
          if (this.isPlaying) {
            this.hideSlide(slideEl, slide, () => {
              this.showSlide(index + 1);
            });
          }
        }, slide.duration || 2000);
      }
    }

    /**
     * Create DOM element for a slide
     */
    createSlideElement(slide) {
      const el = document.createElement('div');
      
      if (slide.type === 'fullscreen') {
        el.className = `story-slide story-slide--${slide.style || 'dark'}`;
        
        const content = document.createElement('div');
        content.className = 'story-content';
        
        // Build content based on slide data
        if (slide.content.label) {
          const label = document.createElement('div');
          label.className = 'story-label';
          label.textContent = slide.content.label;
          content.appendChild(label);
        }
        
        if (slide.content.number) {
          const number = document.createElement('div');
          number.className = 'story-number';
          
          // Animate counting if it's a number
          if (this.isNumericString(slide.content.number)) {
            number.textContent = '';
            number.dataset.targetNumber = slide.content.number;
          } else {
            number.textContent = slide.content.number;
          }
          
          content.appendChild(number);
        }
        
        if (slide.content.subtext) {
          const subtext = document.createElement('div');
          subtext.className = 'story-subtext';
          subtext.textContent = slide.content.subtext;
          content.appendChild(subtext);
        }
        
        if (slide.content.text) {
          const text = document.createElement('div');
          text.className = 'story-text';
          text.innerHTML = slide.content.text;
          content.appendChild(text);
        }
        
        el.appendChild(content);
        
        // Add continue indicator for non-auto-advance slides
        if (!slide.autoAdvance) {
          el.appendChild(this.createContinueIndicator());
        }
        
      } else if (slide.type === 'overlay') {
        el.className = `story-overlay story-overlay--${slide.position || 'bottom-center'}`;
        
        const text = document.createElement('p');
        text.className = 'story-overlay__text';
        text.innerHTML = slide.content.text;
        el.appendChild(text);
      }
      
      el.dataset.slideId = slide.id;
      return el;
    }

    /**
     * Create continue indicator
     */
    createContinueIndicator() {
      const cont = document.createElement('div');
      cont.className = 'story-continue';
      cont.innerHTML = `
        <span class="story-continue__text">Click or press any key to continue</span>
        <svg class="story-continue__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="9 18 15 12 9 6"></polyline>
        </svg>
      `;
      return cont;
    }

    /**
     * Hide a slide with exit animation
     */
    hideSlide(slideEl, slide, callback) {
      slideEl.classList.remove('active');
      slideEl.classList.add('exiting');
      
      setTimeout(() => {
        slideEl.remove();
        if (callback) callback();
      }, 800);
    }


    /**
     * Complete the slide sequence
     */
    complete() {
      this.isPlaying = false;
      
      // Mark as shown in sessionStorage
      sessionStorage.setItem(this.introKey, 'true');
      
      // Remove loading class, add complete class for fade-in
      document.body.classList.remove('story-loading');
      document.body.classList.add('story-complete');
      
      // Remove container after fade
      setTimeout(() => {
        if (this.container) {
          this.container.remove();
        }
      }, 100);
      
      // Remove skip handler
      this.removeSkipHandler();
    }

    /**
     * Skip to end
     */
    skip() {
      if (!this.isPlaying) return;
      
      // Remove all current slides
      const slides = this.container.querySelectorAll('.story-slide, .story-overlay');
      slides.forEach(s => s.remove());
      
      this.complete();
    }

    /**
     * Add handler for skipping
     */
    addSkipHandler() {
      this.skipHandler = (e) => {
        // Skip on Escape, Space, or Enter
        if (e.type === 'keydown' && !['Escape', ' ', 'Enter'].includes(e.key)) {
          return;
        }
        this.skip();
      };
      
      document.addEventListener('keydown', this.skipHandler);
      
      // Also allow clicking the continue button if present
      this.container.addEventListener('click', (e) => {
        if (e.target.closest('.story-continue')) {
          this.skip();
        }
      });
    }

    /**
     * Remove skip handler
     */
    removeSkipHandler() {
      if (this.skipHandler) {
        document.removeEventListener('keydown', this.skipHandler);
      }
    }

    /**
     * Check if string represents a number
     */
    isNumericString(str) {
      return /^[\d,]+$/.test(str.replace(/,/g, ''));
    }

    /**
     * Animate number counting up
     */
    animateNumber(element, targetStr) {
      const target = parseInt(targetStr.replace(/,/g, ''), 10);
      const duration = 8000; // Slowed to 1/4 speed (was 2000)
      const start = performance.now();
      
      const animate = (now) => {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        
        // Ease out cubic
        const eased = 1 - Math.pow(1 - progress, 3);
        const current = Math.round(target * eased);
        
        element.textContent = current.toLocaleString();
        
        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };
      
      requestAnimationFrame(animate);
    }
  }

  /**
   * Context Overlay Manager
   * Handles contextual overlays that appear on interaction
   */
  class ContextOverlayManager {
    constructor() {
      this.activeOverlay = null;
    }

    /**
     * Show a context overlay
     */
    show(config) {
      // Remove any existing overlay
      this.hide();
      
      const overlay = document.createElement('div');
      overlay.className = `story-overlay story-overlay--${config.position || 'bottom-center'}`;
      overlay.innerHTML = `<p class="story-overlay__text">${config.text}</p>`;
      
      document.body.appendChild(overlay);
      this.activeOverlay = overlay;
      
      // Trigger animation
      requestAnimationFrame(() => {
        overlay.classList.add('active');
      });
      
      // Auto-hide if specified
      if (config.autoHide && config.duration) {
        setTimeout(() => {
          this.hide();
        }, config.duration);
      }
      
      return overlay;
    }

    /**
     * Hide the active overlay
     */
    hide() {
      if (this.activeOverlay) {
        this.activeOverlay.classList.remove('active');
        const el = this.activeOverlay;
        setTimeout(() => el.remove(), 600);
        this.activeOverlay = null;
      }
    }
  }

  /**
   * Species Story Manager
   * Shows species-specific narratives on the globe page
   */
  class SpeciesStoryManager {
    constructor() {
      this.overlayManager = new ContextOverlayManager();
      this.shownSpecies = new Set();
    }

    /**
     * Initialize for globe page
     */
    init() {
      const speciesSelect = document.getElementById('speciesSelect');
      if (!speciesSelect) return;
      
      // Show story on species change
      speciesSelect.addEventListener('change', (e) => {
        this.showSpeciesStory(e.target.value);
      });
    }

    /**
     * Show story for a species
     */
    showSpeciesStory(speciesId) {
      // Only show once per species per session
      if (this.shownSpecies.has(speciesId)) return;
      this.shownSpecies.add(speciesId);
      
      const story = window.SPECIES_STORIES?.[speciesId];
      if (!story) return;
      
      // Small delay for the globe to update
      setTimeout(() => {
        this.overlayManager.show({
          text: story.narrative,
          position: 'bottom-center',
          autoHide: true,
          duration: 7000
        });
      }, 1000);
    }
  }

  // ========================================
  // INITIALIZATION
  // ========================================
  
  /**
   * Detect current page and initialize appropriate controller
   */
  function initStorySlides() {
    const filename = window.location.pathname.split('/').pop() || 'index.html';
    
    const pageMap = {
      'index.html': 'landing',
      'globe.html': 'globe',
      'visualizations-1a.html': 'viz-1a',
      'visualizations-2a.html': 'viz-2a',
      'visualizations-2b.html': 'viz-2b',
      'visualizations-3.html': 'viz-3',
      'cta.html': 'cta'
    };
    
    const pageId = pageMap[filename];
    
    if (pageId) {
      // Add page class to body
      document.body.classList.add(`page-${pageId.replace('-', '')}`);
      
      // Initialize slide controller
      const controller = new StorySlideController(pageId);
      controller.init();
      
      // Initialize species stories for globe page
      if (pageId === 'globe') {
        const speciesManager = new SpeciesStoryManager();
        speciesManager.init();
      }
      
      // Export for external use
      window.storySlides = {
        controller,
        overlay: new ContextOverlayManager(),
        reset: () => {
          // Clear sessionStorage to replay intro
          Object.keys(sessionStorage).forEach(key => {
            if (key.startsWith('story-intro-shown')) {
              sessionStorage.removeItem(key);
            }
          });
          location.reload();
        }
      };
    }
  }

  // Initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initStorySlides);
  } else {
    initStorySlides();
  }

})();

