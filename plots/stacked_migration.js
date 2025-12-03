/**
 * Stacked Multi-Species Migration Timeline
 * Shows observation counts for all species across the year
 * Uses pre-averaged data files for faster loading
 */

(async function() {
  'use strict';

  const speciesConfig = {
    barswa: { name: 'Barn Swallow', color: 'rgba(255, 107, 107, 0.7)' },
    cangoo: { name: 'Canada Goose', color: 'rgba(74, 222, 128, 0.7)' },
    sancra: { name: 'Sandhill Crane', color: 'rgba(251, 146, 60, 0.7)' },
    redkno: { name: 'Red Knot', color: 'rgba(239, 68, 68, 0.7)' },
    spwduc: { name: 'Wood Duck', color: 'rgba(168, 85, 247, 0.7)' },
    westan: { name: 'Western Tanager', color: 'rgba(234, 179, 8, 0.7)' },
    gresni: { name: 'Great Snipe', color: 'rgba(59, 130, 246, 0.7)' }
  };

  let chart = null;
  const speciesDataCache = {};

  // Load pre-averaged data for a species
  async function loadSpeciesData(speciesKey) {
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

      // Convert to sorted array of {day, count}
      const result = Object.entries(byDay)
        .map(([dayKey, d]) => ({
          day: dayKey,
          count: d.count || 0
        }))
        .sort((a, b) => a.day.localeCompare(b.day));

      speciesDataCache[speciesKey] = result;
      return result;

    } catch (err) {
      console.warn(`Failed to load ${speciesKey}:`, err);
      return null;
    }
  }

  // Get all unique days across all species
  function getAllDays(speciesDataMap) {
    const allDays = new Set();
    for (const data of Object.values(speciesDataMap)) {
      if (data) {
        data.forEach(d => allDays.add(d.day));
      }
    }
    return Array.from(allDays).sort();
  }

  // Render the chart
  async function renderChart(selectedSpecies) {
    const canvas = document.getElementById('stackedMigrationChart');
    if (!canvas) {
      console.warn('Stacked migration chart canvas not found');
      return;
    }

    // Load data for selected species
    const speciesDataMap = {};
    for (const speciesKey of selectedSpecies) {
      speciesDataMap[speciesKey] = await loadSpeciesData(speciesKey);
    }

    // Get all unique days
    const allDays = getAllDays(speciesDataMap);
    
    if (allDays.length === 0) {
      console.error('No data loaded for stacked migration chart');
      return;
    }

    // Create datasets
    const datasets = [];
    for (const speciesKey of selectedSpecies) {
      const data = speciesDataMap[speciesKey];
      if (!data) continue;

      // Create a lookup map for this species
      const countByDay = {};
      data.forEach(d => { countByDay[d.day] = d.count; });

      // Get values for all days (0 if not present)
      const values = allDays.map(day => countByDay[day] || 0);

      datasets.push({
        label: speciesConfig[speciesKey].name,
        data: values,
        backgroundColor: speciesConfig[speciesKey].color,
        borderColor: speciesConfig[speciesKey].color.replace('0.7', '1'),
        borderWidth: 1,
        fill: true,
        tension: 0.3,
        pointRadius: 0
      });
    }

    if (datasets.length === 0) {
      console.error('No datasets created for stacked migration chart');
      return;
    }

    // Calculate maximum value across all datasets (stacked values)
    let maxValue = 0;
    for (let i = 0; i < allDays.length; i++) {
      let stackedValue = 0;
      for (const dataset of datasets) {
        stackedValue += dataset.data[i] || 0;
      }
      maxValue = Math.max(maxValue, stackedValue);
    }

    // Round up to nearest 500
    const roundedMax = Math.ceil(maxValue / 500) * 500;

    // Format labels to show month names - show month on the 1st of each month
    const labels = allDays.map(day => {
      const [month, dayNum] = day.split('-');
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthIdx = parseInt(month, 10) - 1;
      // Show month name on the 1st of each month
      if (dayNum === '01') {
        return monthNames[monthIdx];
      }
      return '';
    });

    // Destroy existing chart
    if (chart) {
      chart.destroy();
    }

    chart = new Chart(canvas, {
      type: 'line',
      data: {
        labels: labels,
        datasets: datasets
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false
        },
        plugins: {
          title: {
            display: false
          },
          legend: {
            display: true,
            labels: {
              color: 'white',
              usePointStyle: true,
              padding: 12
            }
          },
          tooltip: {
            mode: 'index',
            intersect: false,
            callbacks: {
              title: function(context) {
                const idx = context[0].dataIndex;
                return allDays[idx];
              }
            }
          }
        },
        scales: {
          x: {
            stacked: true,
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
            grid: {
              color: 'rgba(255, 255, 255, 0.1)'
            }
          },
          y: {
            stacked: true,
            beginAtZero: true,
            max: roundedMax,
            title: {
              display: true,
              text: 'Observation Count',
              color: 'white',
              font: {
                size: 14
              }
            },
            ticks: {
              color: 'white'
            },
            grid: {
              color: 'rgba(255, 255, 255, 0.1)'
            }
          }
        }
      }
    });
  }

  // Setup controls and initial render
  async function setup() {
    // Get initially checked species
    const checkboxes = document.querySelectorAll('.species-checkbox-lat:checked');
    const selectedSpecies = Array.from(checkboxes).map(cb => cb.value);
    
    if (selectedSpecies.length > 0) {
      await renderChart(selectedSpecies);
    } else {
      // Default to barswa if nothing selected
      await renderChart(['barswa']);
    }

    // Listen for update events
    window.addEventListener('updateStackedMigrationChart', async () => {
      const checkboxes = document.querySelectorAll('.species-checkbox-lat:checked');
      const selectedSpecies = Array.from(checkboxes).map(cb => cb.value);
      if (selectedSpecies.length > 0) {
        await renderChart(selectedSpecies);
      }
    });

    // Add resize handler
    window.addEventListener('resize', () => {
      if (chart) {
        chart.resize();
      }
    });
  }

  // Wait for DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(setup, 100);
    });
  } else {
    setTimeout(setup, 100);
  }

})();
