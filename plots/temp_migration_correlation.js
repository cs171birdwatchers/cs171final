/**
 * Temperature vs Migration Correlation Scatter Plot
 * Shows relationship between temperature and observation density by species
 * Uses pre-averaged data files for faster loading
 */

(async function() {
  'use strict';

  const speciesConfig = {
    barswa: { name: 'Barn Swallow', color: 'rgba(255, 107, 107, 0.8)' },
    cangoo: { name: 'Canada Goose', color: 'rgba(74, 222, 128, 0.8)' },
    sancra: { name: 'Sandhill Crane', color: 'rgba(251, 146, 60, 0.8)' },
    redkno: { name: 'Red Knot', color: 'rgba(239, 68, 68, 0.8)' },
    spwduc: { name: 'Wood Duck', color: 'rgba(168, 85, 247, 0.8)' },
    westan: { name: 'Western Tanager', color: 'rgba(234, 179, 8, 0.8)' },
    gresni: { name: 'Great Snipe', color: 'rgba(59, 130, 246, 0.8)' }
  };

  let chart = null;
  let temperatureData = null;
  const speciesDataCache = {};

  async function loadTemperatureData() {
    if (temperatureData) return temperatureData;
    
    const tempRows = await d3.csv('data/temp_grid_averaged.csv');
    
    // Create lookup by day-of-year (MM-DD)
    temperatureData = {};
    tempRows.forEach(row => {
      const dayKey = row.date.substring(5); // Extract MM-DD from 2024-MM-DD
      temperatureData[dayKey] = +row.temp_c;
    });
    
    return temperatureData;
  }

  async function loadSpeciesData(speciesKey) {
    if (speciesDataCache[speciesKey]) {
      return speciesDataCache[speciesKey];
    }

    try {
      const response = await fetch(`data/${speciesKey}_averaged.json`);
      if (!response.ok) return null;

      const data = await response.json();
      speciesDataCache[speciesKey] = data.byDayOfYear;
      return data.byDayOfYear;

    } catch (err) {
      console.warn(`Failed to load ${speciesKey}:`, err);
      return null;
    }
  }

  async function renderChart(selectedSpecies) {
    const canvas = document.getElementById('tempCorrelationChart');
    if (!canvas) {
      console.warn('Temperature correlation chart canvas not found');
      return;
    }

    try {
      const tempByDay = await loadTemperatureData();
      const datasets = [];

      // Load each selected species and correlate with temperature
      for (const speciesKey of selectedSpecies) {
        const byDay = await loadSpeciesData(speciesKey);
        if (!byDay) continue;

        // Create scatter points: {x: temp, y: observation count}
        const points = [];
        for (const [dayKey, data] of Object.entries(byDay)) {
          const temp = tempByDay[dayKey];
          if (temp !== undefined && !isNaN(temp) && data.count > 0) {
            points.push({ x: temp, y: data.count });
          }
        }

        if (points.length > 0) {
          datasets.push({
            label: speciesConfig[speciesKey].name,
            data: points,
            backgroundColor: speciesConfig[speciesKey].color,
            borderColor: speciesConfig[speciesKey].color,
            pointRadius: 4,
            pointHoverRadius: 6
          });
        }
      }

      if (datasets.length === 0) {
        console.error('No data for temperature correlation chart');
        return;
      }

      // Calculate max values for proper scaling
      let maxY = 0;
      let minX = Infinity;
      let maxX = -Infinity;
      
      for (const dataset of datasets) {
        for (const point of dataset.data) {
          maxY = Math.max(maxY, point.y);
          minX = Math.min(minX, point.x);
          maxX = Math.max(maxX, point.x);
        }
      }
      
      // Round Y-axis up to nearest 500
      const roundedMaxY = Math.ceil(maxY / 500) * 500;
      
      // Round X-axis to nice values
      const roundedMinX = Math.floor(minX / 5) * 5;
      const roundedMaxX = Math.ceil(maxX / 5) * 5;

      if (chart) {
        chart.destroy();
      }

      chart = new Chart(canvas, {
        type: 'scatter',
        data: {
          datasets: datasets
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: true,
              labels: {
                color: 'white',
                usePointStyle: true,
                padding: 12
              }
            },
            tooltip: {
              callbacks: {
                label: function(context) {
                  return `${context.dataset.label}: ${context.parsed.y.toFixed(0)} observations at ${context.parsed.x.toFixed(1)}°C`;
                }
              }
            }
          },
          scales: {
            x: {
              type: 'linear',
              position: 'bottom',
              min: roundedMinX,
              max: roundedMaxX,
              title: {
                display: true,
                text: 'Average Temperature (°C)',
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
            },
            y: {
              beginAtZero: true,
              max: roundedMaxY,
              title: {
                display: true,
                text: 'Observation Count (Daily Avg)',
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

    } catch (error) {
      console.error('Error creating temperature correlation chart:', error);
    }
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
    window.addEventListener('updateTempCorrelationChart', () => {
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
