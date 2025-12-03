/**
 * Latitude vs Temperature Timeline
 * Shows how average sighting latitude changes over time compared to temperature
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
  let temperatureData = null;

  // Load averaged temperature data
  async function loadTemperatureData() {
    if (temperatureData) return temperatureData;
    
    const tempRows = await d3.csv('data/temp_grid_averaged.csv');
    temperatureData = tempRows.map(row => ({
      date: row.date,
      temp: +row.temp_c
    })).sort((a, b) => d3.ascending(a.date, b.date));
    
    return temperatureData;
  }

  // Load pre-averaged latitude data for a species
  async function getSpeciesLatitudeData(speciesKey) {
    try {
      const response = await fetch(`data/${speciesKey}_averaged.json`);
      if (!response.ok) {
        console.warn(`Failed to fetch ${speciesKey}_averaged.json`);
        return null;
      }

      const data = await response.json();
      const byDay = data.byDayOfYear;
      
      if (!byDay || Object.keys(byDay).length === 0) {
        console.warn(`No data found for ${speciesKey}`);
        return null;
      }

      // Convert to array format with reference year 2024
      const result = Object.entries(byDay)
        .filter(([_, d]) => d.avgLat !== null)
        .map(([dayKey, d]) => ({
          date: `2024-${dayKey}`,
          lat: d.avgLat
        }))
        .sort((a, b) => d3.ascending(a.date, b.date));

      console.log(`${speciesKey}: loaded ${result.length} daily averages`);
      return result;

    } catch (err) {
      console.error(`Failed to load ${speciesKey}:`, err);
      return null;
    }
  }

  // Render the chart
  async function renderChart(selectedSpecies) {
    const canvas = document.getElementById('latitudeTempChart');
    if (!canvas) {
      console.warn('Latitude-temperature chart canvas not found');
      return;
    }

    // Load temperature data
    const tempData = await loadTemperatureData();

    // Load latitude data for selected species
    const speciesDatasets = [];
    
    for (const speciesKey of selectedSpecies) {
      const latData = await getSpeciesLatitudeData(speciesKey);
      if (latData && latData.length > 0) {
        speciesDatasets.push({
          label: speciesConfig[speciesKey].name,
          data: latData.map(d => ({ x: d.date, y: d.lat })),
          borderColor: speciesConfig[speciesKey].color,
          backgroundColor: speciesConfig[speciesKey].color.replace('0.9', '0.3'),
          borderWidth: 2,
          fill: false,
          tension: 0.3,
          pointRadius: 0,
          yAxisID: 'y-latitude'
        });
      }
    }

    // Add temperature dataset
    const tempDataset = {
      label: 'Global Avg Temperature (°C)',
      data: tempData.map(d => ({ x: d.date, y: d.temp })),
      borderColor: 'rgba(147, 197, 253, 0.9)',
      backgroundColor: 'rgba(147, 197, 253, 0.2)',
      borderWidth: 2,
      fill: true,
      tension: 0.3,
      pointRadius: 0,
      yAxisID: 'y-temp'
    };

    // Destroy existing chart if present
    if (chart) {
      chart.destroy();
    }

    // Create new chart
    chart = new Chart(canvas, {
      type: 'line',
      data: {
        datasets: [...speciesDatasets, tempDataset]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false
        },
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
            mode: 'index',
            intersect: false,
            callbacks: {
              label: function(context) {
                const label = context.dataset.label || '';
                const value = context.parsed.y;
                if (context.dataset.yAxisID === 'y-latitude') {
                  return `${label}: ${value.toFixed(2)}° latitude`;
                } else {
                  return `${label}: ${value.toFixed(1)}°C`;
                }
              }
            }
          }
        },
        scales: {
          x: {
            type: 'time',
            time: {
              unit: 'month',
              displayFormats: {
                month: 'MMM'
              }
            },
            ticks: {
              color: 'white'
            },
            grid: {
              color: 'rgba(255, 255, 255, 0.1)'
            }
          },
          'y-latitude': {
            type: 'linear',
            position: 'left',
            title: {
              display: true,
              text: 'Average Latitude (°)',
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
          'y-temp': {
            type: 'linear',
            position: 'right',
            title: {
              display: true,
              text: 'Temperature (°C)',
              color: 'rgba(147, 197, 253, 0.9)',
              font: {
                size: 14
              }
            },
            ticks: {
              color: 'rgba(147, 197, 253, 0.9)'
            },
            grid: {
              display: false
            }
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

  // Setup species selection controls
  function setupControls() {
    const checkboxes = document.querySelectorAll('.species-checkbox-lat');
    
    if (checkboxes.length === 0) {
      console.warn('No species checkboxes found for latitude chart');
      return;
    }
    
    checkboxes.forEach(checkbox => {
      checkbox.addEventListener('change', () => {
        updateChart();
      });
    });

    // Listen for update button event
    window.addEventListener('updateLatitudeTempChart', () => {
      updateChart();
    });

    // Add resize handler
    addResizeHandler();

    // Initial render with default species
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
