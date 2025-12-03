/**
 * Globe Interactions
 * Handles special features: Red Knot coastal emphasis, Canada Goose NZ pan, Voronoi explanation
 */

(function() {
  'use strict';

  // Will be initialized when globe is ready
  let globeProjection = null;
  let globeRedraw = null;
  let currentSpecies = null;

  // Initialize after globe is loaded
  window.initGlobeInteractions = function(projection, redrawFn) {
    globeProjection = projection;
    globeRedraw = redrawFn;
  };

  // Red Knot Coastal Emphasis
  window.emphasizeCoastalPaths = function() {
    // Add coastal-emphasis class to migration paths
    const migrationPaths = document.querySelectorAll('#globe .migration-path');
    migrationPaths.forEach(path => {
      path.classList.add('coastal-emphasis');
    });

    // Show coastal description with pulse indicator
    showCoastalDescription();
  };

  window.clearCoastalEmphasis = function() {
    const migrationPaths = document.querySelectorAll('#globe .migration-path');
    migrationPaths.forEach(path => {
      path.classList.remove('coastal-emphasis');
    });

    // Remove coastal description
    const coastalDesc = document.querySelector('.coastal-description');
    if (coastalDesc) {
      coastalDesc.remove();
    }
  };

  function showCoastalDescription() {
    const birdContent = document.getElementById('birdContent');
    if (!birdContent) return;

    // Remove existing if present
    const existing = document.querySelector('.coastal-description');
    if (existing) return; // Already shown

    // Add coastal migration description with pulse indicator
    const coastalDiv = document.createElement('div');
    coastalDiv.className = 'coastal-description';
    coastalDiv.innerHTML = `
      <div style="margin-top: 16px; padding: 12px; background: rgba(44, 123, 229, 0.1); border-left: 3px solid #2c7be5; border-radius: 4px;">
        <span class="pulse-indicator" style="margin-right: 8px;"></span>
        <strong>Coastal Migration Pattern:</strong> The Red Knot follows tight coastal corridors during migration, with dense concentrations along Atlantic and Pacific shorelines.
      </div>
    `;
    birdContent.appendChild(coastalDiv);
  }

  // Canada Goose New Zealand Pan
  window.setupNewZealandPan = function() {
    // Find and setup click handler for NZ link
    setTimeout(() => {
      const nzLinks = document.querySelectorAll('.nz-link');
      nzLinks.forEach(link => {
        link.addEventListener('click', (e) => {
          e.preventDefault();
          panToNewZealand();
        });
      });
    }, 100);
  };

  function panToNewZealand() {
    if (!globeProjection || !globeRedraw) {
      console.warn('Globe not initialized for NZ pan');
      return;
    }

    // Target: New Zealand coordinates
    const targetLon = 174.7762;
    const targetLat = -41.2865;

    // Get current rotation
    const currentRotation = globeProjection.rotate();
    
    // Calculate target rotation (invert for proper globe orientation)
    const targetRotation = [-targetLon, -targetLat, 0];

    // Smooth transition using D3
    d3.transition()
      .duration(2500)
      .ease(d3.easeCubicInOut)
      .tween('rotate', () => {
        const interpolate = d3.interpolate(currentRotation, targetRotation);
        return (t) => {
          globeProjection.rotate(interpolate(t));
          globeRedraw();
        };
      })
      .on('end', () => {
        // Optionally highlight NZ observation points
        highlightNZObservations();
      });
  }

  function highlightNZObservations() {
    // Add visual emphasis to New Zealand region
    // This could highlight specific observation points if available
    console.log('Highlighting New Zealand observations');
  }

  // Voronoi Explanation Panel
  window.setupVoronoiPanel = function() {
    const mapModeSelect = document.getElementById('mapMode');
    const panel = document.getElementById('voronoi-explanation-panel');
    const closeBtn = panel?.querySelector('.close-btn');

    if (!mapModeSelect || !panel) return;

    // Show panel when Voronoi mode is selected
    mapModeSelect.addEventListener('change', (e) => {
      if (e.target.value === 'voronoi') {
        showVoronoiPanel();
      } else {
        hideVoronoiPanel();
      }
    });

    // Close button handler
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        hideVoronoiPanel();
      });
    }

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && panel.classList.contains('visible')) {
        hideVoronoiPanel();
      }
    });
  };

  function showVoronoiPanel() {
    const panel = document.getElementById('voronoi-explanation-panel');
    if (panel) {
      panel.classList.remove('hidden');
      setTimeout(() => {
        panel.classList.add('visible');
      }, 10);
    }
  }

  function hideVoronoiPanel() {
    const panel = document.getElementById('voronoi-explanation-panel');
    if (panel) {
      panel.classList.remove('visible');
      setTimeout(() => {
        panel.classList.add('hidden');
      }, 300);
    }
  }

})();

