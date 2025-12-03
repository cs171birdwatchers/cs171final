/**
 * Background Globe
 * Non-interactive globe visualization for landing page background
 */

(function() {
  'use strict';

  const svg = d3.select('#background-globe');
  if (svg.empty()) return;

  const width = 900;
  const height = 900;
  const sphere = { type: 'Sphere' };

  const baseScale = 430;
  // 1. Move globe slightly to the left (more negative X)
  const initialViewOffsetX = -350; // Moved left from -300
  // 2. Raise the globe slightly (more negative Y raises it up)
  const initialViewOffsetY = 200;  // Raised from 250 (less positive = higher)
  // 3. Tilt on rotational axis (Earth's tilt is ~23.5°, using smaller ~12°)
  const tiltAngle = 12; // Tilt angle in degrees
  
  const projection = d3.geoOrthographic()
    .scale(baseScale)
    .translate([width / 2 + initialViewOffsetX, height / 2 + initialViewOffsetY])
    .clipAngle(90)
    .rotate([-100, -15, tiltAngle]); // Added tilt to rotation

  const path = d3.geoPath(projection);
  const g = svg.append('g');

  // Ocean gradient
  const defs = svg.append('defs');
  const grad = defs.append('radialGradient').attr('id', 'bgOceanGrad');
  grad.append('stop').attr('offset', '60%').attr('stop-color', '#1a3a52');
  grad.append('stop').attr('offset', '100%').attr('stop-color', '#0d2438');

  // Clip path for visible hemisphere
  defs.append('clipPath')
    .attr('id', 'bg-globe-clip')
    .append('path')
    .attr('d', path(sphere));

  // Ocean
  g.append('path')
    .attr('class', 'ocean')
    .attr('d', path(sphere))
    .attr('fill', 'url(#bgOceanGrad)')
    .attr('opacity', 0.4);

  // Graticule
  const graticule = d3.geoGraticule10();
  g.append('path')
    .attr('class', 'graticule')
    .attr('d', path(graticule))
    .attr('fill', 'none')
    .attr('stroke', '#a9bbda')
    .attr('stroke-width', 0.6)
    .attr('opacity', 0.4);

  // Store references for redraw
  let countryMeshDatum = null;
  let countriesData = null;

  // Function to redraw all layers
  function redraw() {
    // Update clip path
    defs.select('#bg-globe-clip path').attr('d', path(sphere));
    
    // Update ocean
    g.select('.ocean').attr('d', path(sphere));
    
    // Update graticule
    g.select('.graticule').attr('d', path(graticule));
    
    // Update countries if they exist
    const countriesGroup = g.select('.countries');
    if (!countriesGroup.empty() && countriesData) {
      countriesGroup.selectAll('path').attr('d', path);
    }
    
    // Update borders if they exist
    const bordersPath = g.select('.borders');
    if (!bordersPath.empty() && countryMeshDatum) {
      bordersPath.datum(countryMeshDatum).attr('d', path);
    }
  }

  // Load and render countries
  d3.json('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json').then(world => {
    const countries = topojson.feature(world, world.objects.countries);
    countryMeshDatum = topojson.mesh(world, world.objects.countries, (a, b) => a !== b);
    countriesData = countries.features;

    // Land
    g.append('g')
      .attr('class', 'countries')
      .selectAll('path')
      .data(countriesData)
      .enter()
      .append('path')
      .attr('d', path)
      .attr('fill', '#eef1f6')
      .attr('stroke', 'none')
      .attr('opacity', 0.25);

    // Borders
    g.append('path')
      .datum(countryMeshDatum)
      .attr('class', 'borders')
      .attr('d', path)
      .attr('fill', 'none')
      .attr('stroke', '#9aa3af')
      .attr('stroke-width', 0.6)
      .attr('opacity', 0.4);

    // 4. Make every layer rotate continuously
    let currentRotation = [-100, -15, tiltAngle];
    const rotationSpeed = 0.1; // degrees per frame
    
    function animate() {
      // Rotate around the Y axis (longitude)
      currentRotation[0] += rotationSpeed;
      projection.rotate(currentRotation);
      redraw();
      requestAnimationFrame(animate);
    }
    
    // Start animation
    animate();
  }).catch(err => {
    console.warn('Failed to load world map for background:', err);
  });

})();

