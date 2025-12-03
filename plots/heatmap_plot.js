// -------- GLOBAL STATE --------
let frames = [];
let projection = null;
let colorScale = null;
let radiusScale = null;
let worldTopo = null;
let currentSpeciesKey = null;
let currentFrameIndex = 0;

let playTimer = null;
let isPlaying = false;
let playSpeed = 1;

let playButtonEl = null;
let speedSelectEl = null;

// Debounce resize events
let resizeTimeout = null;

// DOM READY
document.addEventListener("DOMContentLoaded", () => {
  const speciesSelect = document.getElementById("species-select");
  const slider = document.getElementById("frame-slider");
  playButtonEl = document.getElementById("play-button");
  speedSelectEl = document.getElementById("speed-select");

  speciesSelect.addEventListener("change", () => {
    stopPlayback();
    loadHeatmap(speciesSelect.value);
  });

  slider.addEventListener("input", () => {
    renderFrame(+slider.value);
  });

  playButtonEl.addEventListener("click", () => {
    if (isPlaying) {
      stopPlayback();
    } else {
      startPlayback();
    }
  });

  speedSelectEl.addEventListener("change", e => {
    playSpeed = +e.target.value || 1;
    if (isPlaying) {
      startPlayback(); // restart with new speed
    }
  });

  // default
  loadHeatmap("redkno");

  // Add resize handler
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      if (currentSpeciesKey && frames.length > 0) {
        resizeHeatmap();
      }
    }, 250); // debounce 250ms
  });
});

// -------- PLAYBACK HELPERS --------
function startPlayback() {
  if (!frames || frames.length <= 1) return;

  stopPlayback(); // clear any existing timer

  isPlaying = true;
  playButtonEl.textContent = "Pause";

  const slider = document.getElementById("frame-slider");
  const baseInterval = 800; // ms for 1x
  const interval = baseInterval / playSpeed;

  playTimer = setInterval(() => {
    let idx = +slider.value;
    if (idx >= frames.length - 1) {
      idx = 0;
    } else {
      idx++;
    }
    slider.value = idx;
    renderFrame(idx);
  }, interval);
}

function stopPlayback() {
  if (playTimer !== null) {
    clearInterval(playTimer);
    playTimer = null;
  }
  isPlaying = false;
  if (playButtonEl) playButtonEl.textContent = "Play";
}

// -------- RESIZE FUNCTION --------
function resizeHeatmap() {
  if (!frames || frames.length === 0) return;
  
  const svg = d3.select("#heatmap-svg");
  const svgEl = svg.node();
  if (!svgEl) return;
  
  const width = svgEl.clientWidth;
  const height = svgEl.clientHeight;
  
  if (!width || !height) return;
  
  // Recalculate projection
  const lats = frames.flatMap(f => f.cells.map(c => c[1]));
  const lons = frames.flatMap(f => f.cells.map(c => c[0]));
  
  projection = d3.geoMercator().fitSize([width, height], {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        geometry: {
          type: "Polygon",
          coordinates: [[
            [d3.min(lons), d3.min(lats)],
            [d3.min(lons), d3.max(lats)],
            [d3.max(lons), d3.max(lats)],
            [d3.max(lons), d3.min(lats)],
            [d3.min(lons), d3.min(lats)]
          ]]
        }
      }
    ]
  });
  
  // Re-render current frame
  const slider = document.getElementById("frame-slider");
  currentFrameIndex = +slider.value;
  renderFrame(currentFrameIndex);
  
  // Re-draw legend
  if (colorScale) {
    const vals = frames.flatMap(f => f.cells.map(c => c[2]));
    const sortedVals = vals.slice().sort((a, b) => a - b);
    const p5 = d3.quantile(sortedVals, 0.05);
    const p95 = d3.quantile(sortedVals, 0.95);
    drawLegend(p5, p95);
  }
}

// -------- MAIN LOAD FUNCTION --------
async function loadHeatmap(speciesKey) {
  currentSpeciesKey = speciesKey;
  const label = document.getElementById("frame-label");
  const slider = document.getElementById("frame-slider");
  const svg = d3.select("#heatmap-svg");

  svg.selectAll("*").remove();
  label.textContent = "Week: loading…";
  slider.disabled = true;
  playButtonEl.disabled = true;

  const filePath = `data/${speciesKey}_heatmap.json`;

  try {
    const response = await fetch(filePath);
    if (!response.ok) {
      throw new Error(`Heatmap file not found: ${filePath}`);
    }
    const json = await response.json();

    if (!json.frames || !Array.isArray(json.frames) || json.frames.length === 0) {
      throw new Error("Heatmap JSON has no frames array.");
    }

    frames = json.frames;

    const vals = frames.flatMap(f => f.cells.map(c => c[2]));
    const lats = frames.flatMap(f => f.cells.map(c => c[1]));
    const lons = frames.flatMap(f => f.cells.map(c => c[0]));

    const minVal = d3.min(vals);
    const maxVal = d3.max(vals);

    // Use percentiles to make most points fall in the middle of the color scale
    const sortedVals = vals.slice().sort((a, b) => a - b);
    const p5 = d3.quantile(sortedVals, 0.05);  // 5th percentile
    const p95 = d3.quantile(sortedVals, 0.95); // 95th percentile

    // Grey to orange color scale
    colorScale = d3.scaleSequential()
      .domain([p5, p95])
      .interpolator(d3.interpolateRgb("#888888", "#ff6600"))
      .clamp(true);

    radiusScale = d3.scaleSqrt()
      .domain([minVal, maxVal])
      .range([2, 12]); // capped to avoid giant blobs

    // Get actual rendered size
    const svgEl = svg.node();
    const width = svgEl ? svgEl.clientWidth || +svg.attr("width") || 800 : 800;
    const height = svgEl ? svgEl.clientHeight || +svg.attr("height") || 400 : 400;

    projection = d3.geoMercator().fitSize([width, height], {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          geometry: {
            type: "Polygon",
            coordinates: [[
              [d3.min(lons), d3.min(lats)],
              [d3.min(lons), d3.max(lats)],
              [d3.max(lons), d3.max(lats)],
              [d3.max(lons), d3.min(lats)],
              [d3.min(lons), d3.min(lats)]
            ]]
          }
        }
      ]
    });

    if (!worldTopo) {
      worldTopo = await d3.json(
        "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json"
      );
    }

    slider.max = frames.length - 1;
    slider.value = 0;
    slider.disabled = frames.length <= 1;
    playButtonEl.disabled = frames.length <= 1;

    drawLegend(p5, p95);
    renderFrame(0);

  } catch (err) {
    console.error("Error loading heatmap:", err);
    label.textContent = "Week: no data available";

    svg.append("text")
      .attr("x", 20)
      .attr("y", 40)
      .attr("fill", "black")
      .text("No heatmap available for this species.");
  }
}

// -------- FRAME RENDERING --------
function renderFrame(index) {
  if (!frames || frames.length === 0 || !projection || !colorScale || !radiusScale) return;

  const svg = d3.select("#heatmap-svg");
  svg.selectAll("*").remove();

  drawBasemap(svg);

  const i = Math.max(0, Math.min(index, frames.length - 1));
  currentFrameIndex = i;
  const frame = frames[i];

  const points = frame.cells.map(c => {
    const lon = c[0];
    const lat = c[1];
    const val = c[2];
    const proj = projection([lon, lat]);
    return { lon, lat, val, proj };
  });

  svg.append("g")
    .attr("class", "points")
    .selectAll("circle")
    .data(points)
    .enter()
    .append("circle")
    .attr("cx", d => d.proj[0])
    .attr("cy", d => d.proj[1])
    .attr("r", d => radiusScale(d.val))
    .attr("fill", d => colorScale(d.val))
    .attr("opacity", 0.8);

  document.getElementById("frame-label").textContent = `Week: ${frame.week}`;
}

// -------- BASEMAP --------
function drawBasemap(svg) {
  if (!worldTopo) return;

  const countries = topojson.feature(worldTopo, worldTopo.objects.countries);
  const path = d3.geoPath().projection(projection);

  svg.append("g")
    .attr("class", "basemap")
    .selectAll("path")
    .data(countries.features)
    .enter()
    .append("path")
    .attr("d", path)
    .attr("fill", "#2a4a62")     // slightly lighter than ocean blue background
    .attr("stroke", "#4a6a82")   // lighter blue-grey for outlines
    .attr("stroke-width", 0.6)
    .attr("opacity", 1.0);
}

// -------- LEGEND --------
function drawLegend(minVal, maxVal) {
  const svg = d3.select("#legend-svg");
  svg.selectAll("*").remove();

  const svgEl = svg.node();
  const w = svgEl ? svgEl.clientWidth || +svg.attr("width") || 800 : 800;
  const h = +svg.attr("height") || 70;
  const gradId = "legend-gradient";

  const defs = svg.append("defs");
  const gradient = defs.append("linearGradient")
    .attr("id", gradId)
    .attr("x1", "0%")
    .attr("x2", "100%")
    .attr("y1", "0%")
    .attr("y2", "0%");

  for (let i = 0; i <= 100; i++) {
    const t = i / 100;
    const v = minVal + (maxVal - minVal) * t;
    gradient.append("stop")
      .attr("offset", `${i}%`)
      .attr("stop-color", colorScale(v));
  }

  const barX = 80;
  const barW = w - 160;

  svg.append("text")
    .attr("x", barX)
    .attr("y", 18)
    .attr("fill", "white")
    .attr("font-size", 12)
    .text("Relative observation density");

  svg.append("rect")
    .attr("x", barX)
    .attr("y", 24)
    .attr("width", barW)
    .attr("height", 14)
    .attr("rx", 4)
    .attr("fill", `url(#${gradId})`);

  const midVal = (minVal + maxVal) / 2;
  const fmt = d3.format(",.0f"); // comma-separated integer, no .0

  svg.append("text")
    .attr("x", barX)
    .attr("y", 50)
    .attr("fill", "white")
    .attr("font-size", 11)
    .text(fmt(minVal));

  svg.append("text")
    .attr("x", barX + barW / 2)
    .attr("y", 50)
    .attr("text-anchor", "middle")
    .attr("fill", "white")
    .attr("font-size", 11)
    .text(fmt(midVal));

  svg.append("text")
    .attr("x", barX + barW)
    .attr("y", 50)
    .attr("text-anchor", "end")
    .attr("fill", "white")
    .attr("font-size", 11)
    .text(fmt(maxVal));
}

