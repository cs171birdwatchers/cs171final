/**
 * Migration Timing Chart - Multi-species comparison
 * Shows observation counts by day of year for selected species
 * Uses pre-averaged data files for faster loading
 */

(async function() {
  'use strict';

  const speciesConfig = {
    barswa: { name: 'Barn Swallow', color: 'rgba(255, 107, 107, 0.9)' },
    cangoo: { name: 'Canada Goose', color: 'rgba(74, 222, 128, 0.9)' },
    sancra: { name: 'Sandhill Crane', color: 'rgba(251, 146, 60, 0.9)' },
    redkno: { name: 'Red Knot', color: 'rgba(239, 68, 68, 0.9)' },
    spwduc: { name: 'Wood Duck', color: 'rgba(168, 85, 247, 0.9)' },
    westan: { name: 'Western Tanager', color: 'rgba(234, 179, 8, 0.9)' },
    gresni: { name: 'Great Snipe', color: 'rgba(59, 130, 246, 0.9)' }
  };

  let chart = null;
  const speciesDataCache = {};

  async function loadSpeciesMigrationData(speciesKey) {
    if (speciesDataCache[speciesKey]) {
      return speciesDataCache[speciesKey];
    }

    try {
      const response = await fetch(`data/${speciesKey}_averaged.json`);
      if (!response.ok) return null;

      const data = await response.json();
      const byDay = data.byDayOfYear;
      
      if (!byDay || Object.keys(byDay).length === 0) {
        return null;
      }

      // Convert to sorted arrays
      const entries = Object.entries(byDay).sort((a, b) => a[0].localeCompare(b[0]));
      const labels = entries.map(([day]) => day);
      const values = entries.map(([_, d]) => d.count || 0);

      const result = { labels, values };
      speciesDataCache[speciesKey] = result;
      return result;

    } catch (err) {
      console.warn(`Failed to load ${speciesKey}:`, err);
      return null;
    }
  }

  async function renderChart(selectedSpecies) {
    const canvas = document.getElementById('migrationChart');
    if (!canvas) {
      console.warn('Migration chart canvas not found');
      return;
    }

    const datasets = [];
    let allLabels = [];

    for (const speciesKey of selectedSpecies) {
      const data = await loadSpeciesMigrationData(speciesKey);
      if (data) {
        // Keep track of longest labels array
        if (data.labels.length > allLabels.length) {
          allLabels = data.labels;
        }
        
        datasets.push({
          label: speciesConfig[speciesKey].name,
          data: data.values,
          borderColor: speciesConfig[speciesKey].color,
          backgroundColor: speciesConfig[speciesKey].color.replace('0.9', '0.25'),
          borderWidth: 2,
          fill: true,
          tension: 0.3,
          pointRadius: 0
        });
      }
    }

    if (datasets.length === 0) {
      console.warn('No data loaded for migration chart');
      return;
    }

    // Calculate maximum value across all datasets for proper scaling
    let maxValue = 0;
    for (const dataset of datasets) {
      const datasetMax = Math.max(...dataset.data);
      maxValue = Math.max(maxValue, datasetMax);
    }
    
    // Round up to nearest 500 for clean scaling
    const roundedMax = Math.ceil(maxValue / 500) * 500;

    // Format labels to show month names - show month on the 1st of each month
    const formattedLabels = allLabels.map(day => {
      const [month, dayNum] = day.split('-');
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthIdx = parseInt(month, 10) - 1;
      // Show month name on the 1st of each month
      if (dayNum === '01') {
        return monthNames[monthIdx];
      }
      return '';
    });

    if (chart) {
      chart.destroy();
    }

    chart = new Chart(canvas, {
      type: 'line',
      data: {
        labels: formattedLabels,
        datasets
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            labels: { color: 'white' },
            display: true
          },
          tooltip: {
            callbacks: {
              title: function(context) {
                const idx = context[0].dataIndex;
                return allLabels[idx];
              }
            }
          }
        },
        scales: {
          x: {
            title: {
              display: true,
              text: 'Month',
              color: 'white',
              font: {
                size: 14
              }
            },
            ticks: { 
              color: 'white',
              maxRotation: 0,
              autoSkip: false,
              callback: function(value, index) {
                const label = this.getLabelForValue(value);
                return label || '';
              }
            },
            grid: { color: 'rgba(255, 255, 255, 0.1)' }
          },
          y: {
            title: {
              display: true,
              text: 'Observation Count',
              color: 'white',
              font: {
                size: 14
              }
            },
            ticks: { color: 'white' },
            beginAtZero: true,
            max: roundedMax,
            grid: { color: 'rgba(255, 255, 255, 0.1)' }
          }
        }
      }
    });
  }

  // Add window resize handler
  function addResizeHandler() {
    window.addEventListener('resize', () => {
      if (chart) {
        chart.resize();
      }
    });
  }

  function setupControls() {
    const checkboxes = document.querySelectorAll('.species-checkbox-lat');
    
    if (checkboxes.length === 0) {
      console.warn('No species checkboxes found');
      return;
    }
    
    checkboxes.forEach(checkbox => {
      checkbox.addEventListener('change', () => {
        updateChart();
      });
    });

    // Listen for update button event
    window.addEventListener('updateMigrationChart', () => {
      updateChart();
    });

    addResizeHandler();
    updateChart();
  }

  function updateChart() {
    const checkboxes = document.querySelectorAll('.species-checkbox-lat:checked');
    const selectedSpecies = Array.from(checkboxes).map(cb => cb.value);
    
    if (selectedSpecies.length > 0) {
      renderChart(selectedSpecies);
    }
  }

  // Wait for DOM and Chart.js to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(setupControls, 100);
    });
  } else {
    setTimeout(setupControls, 100);
  }

})();
