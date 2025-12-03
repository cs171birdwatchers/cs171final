# Miles from Home

An interactive data visualization project exploring bird migration patterns and their relationship with global temperature data. This web application features interactive globes, data visualizations, and storytelling elements to showcase the extraordinary journeys of migratory bird species.

## Quick Start

### Running the Project

1. **Clone or download the project** to your local machine

2. **Start a local web server** :

   **Option 1: Live Server**
      - right click index.html, select "Open with Live Server"
   
   **Option 2: Using Python 3**
   ```bash
   # Python 3
   python3 -m http.server 8000
   
   # Or Python 2
   python -m SimpleHTTPServer 8000
   ```
   
   **Option 3: Using Node.js (http-server)**
   ```bash
   npx http-server -p 8000
   ```

### Options 2 and 3 Only ###

3. **Open your browser** and navigate to:
   ```
   http://localhost:8000
   ```

4. **Navigate through the pages** using:
   - Navigation dots at the bottom of the page
   - Left/right arrow buttons
   - Direct URL navigation (e.g., `http://localhost:8000/globe.html`)

### Important Notes

- **Internet connection required** - The project loads external libraries and map data from CDNs
- **Large data files** - Some visualization pages may take time to load due to large JSON data files (especially Canada Goose data and initial temperature loading)

## Libraries and Dependencies

### Core Libraries (Loaded via CDN)

- **D3.js v7** (`https://cdn.jsdelivr.net/npm/d3@7`)
  - Data manipulation and visualization
  - Geographic projections (orthographic, mercator)
  - SVG rendering and animations
  - CSV/JSON data loading

- **Chart.js** (`https://cdn.jsdelivr.net/npm/chart.js`)
  - Interactive charts and graphs
  - Used for migration timelines, temperature correlations, and species comparisons

- **Chart.js Date Adapter** (`https://cdn.jsdelivr.net/npm/chartjs-adapter-date-fns`)
  - Date/time axis support for Chart.js
  - Enables proper time-series visualizations

- **TopoJSON Client v3** (`https://cdn.jsdelivr.net/npm/topojson-client@3`)
  - Converts TopoJSON to GeoJSON for map rendering
  - Used for rendering country boundaries and geographic features

### External Data Sources (CDN)

- **World Atlas** (`https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json`)
  - Country boundaries for globe visualization

- **US Atlas** (`https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json`)
  - US state boundaries (used in interactive globe)

## 📁 Project Structure

```
prototype_v6/
├── index.html              # Landing page with rotating globe
├── globe.html              # Interactive 3D globe visualization
├── story1-8.html           # Story pages (8 pages)
├── visualizations-1a.html  # Migration Latitude vs Temperature
├── visualizations-1b.html  # Multi-Species Migration Timeline
├── visualizations-2a.html  # Migration Timing by Species
├── visualizations-2b.html  # Temperature vs Migration Correlation
├── visualizations-3.html   # Additional visualizations
├── cta.html                # Call-to-action page
│
├── js/
│   ├── background-globe.js      # Rotating globe on landing page
│   ├── globe-interactions.js    # Interactive globe controls
│   ├── page-navigation.js       # Multi-page navigation system
│   └── scroll-manager.js        # Scroll behavior management
│
├── plots/
│   ├── latitude_temp_timeline.js      # Latitude vs temperature chart
│   ├── temp_migration_correlation.js # Temperature correlation chart
│   ├── migration_plot.js             # Migration timing chart
│   ├── stacked_migration.js          # Stacked migration chart
│   ├── heatmap_plot.js               # Heatmap visualization
│   └── temp_plot.js                  # Temperature plot
│
├── data/
│   ├── temp_chunks/                   # Chunked temperature data (48 files, ~7-19MB each)
│   │   └── temp_chunk_YYYY-MM-X.json  # Biweekly temperature chunks
│   ├── temp_chunks_manifest.json      # Index of temperature chunks
│   ├── temp_grid_averaged.csv         # Daily average temperatures (6KB)
│   ├── *_averaged.json                # Pre-averaged bird data by species
│   ├── *_heatmap.json                 # Heatmap data by species
│   ├── *_migration.json               # Migration path data by species
│   └── data_support_scripts/          # Python data processing scripts
│
├── styles.css              # Main stylesheet
└── img/                    # Bird species images
```

## Bird Species Data

The project includes data for 7 migratory bird species:

1. **Barn Swallow** (barswa) - 2.4M sightings, 56.4M birds
2. **Canada Goose** (cangoo) - 4.1M sightings, 156.5M birds
3. **Sandhill Crane** (sancra) - 472K sightings, 34.7M birds
4. **Red Knot** (redkno) - 56K sightings, 6.7M birds
5. **Western Tanager** (westan) - 240K sightings, 545K birds
6. **Wood Duck** (spwduc) - 555 sightings, 5K birds
7. **Great Snipe** (gresni) - 567 sightings, 1.2K birds

**Total**: 7.3M sightings, 254.7M birds reported

## Data Sources

### Temperature Data
- **Chunked Format**: `data/temp_chunks/temp_chunk_YYYY-MM-X.json` (where X is A or B for first/second half of month)
- **Manifest**: `data/temp_chunks_manifest.json` - Index of all temperature chunks with metadata
- **Coverage**: Daily temperature data for 23,719 unique locations worldwide (2023-2024)
- **Original Size**: ~11 million rows, 484MB (now split into 48 chunks of 7-19MB each)
- **Fields per point**: `lat`, `lon`, `t` (temperature in Celsius)

### Bird Observation Data
- **Pre-processed Format**: JSON files per species (`*_averaged.json`, `*_heatmap.json`, `*_migration.json`)
- **Source Data**: `*_combined.json` files (excluded from repo due to size - see .gitignore)
- **Fields**: `date`, `lat`, `lon`, `count`, `speciesCode`, `countryCode`, etc.

### File Size Optimization for GitHub
Large data files (>25MB) are handled as follows:
- **Temperature data**: Split into biweekly chunks (~15 days each), loaded sequentially during animation
- **Bird observation source data**: Excluded from repo (only pre-processed smaller files included)

## Features

### Interactive Globe
- **3D orthographic projection** with rotation
- **Draggable** for manual rotation
- **Zoom controls** for detailed exploration
- **Temperature data overlay** with color-coded visualization
- **Bird migration paths** visualization
- **Back-face culling** for data points (only shows front hemisphere)

### Data Visualizations
- **Migration Latitude vs Temperature**: Shows how bird migration patterns correlate with temperature changes
- **Multi-Species Migration Timeline**: Stacked area chart comparing migration timing across species
- **Migration Timing by Species**: Line chart showing observation counts by day of year
- **Temperature vs Migration Correlation**: Scatter plot showing relationship between temperature and observation frequency

### Navigation
- **16-page structure**: Landing → Stories → Visualizations → CTA
- **Staggered dot navigation**: Main pages and story pages visually distinguished
- **Arrow navigation**: Previous/Next buttons
- **Keyboard accessible**: Full keyboard navigation support

## Data Processing Scripts

The `data/support_scripts` directory contains Python scripts for data processing:

- `extract_locations.py` - Extracts unique temperature locations from CSV
- `split_cangoo_data.py` - Splits large Canada Goose file by year
- `count_bird_statistics.py` - Analyzes bird observation statistics
- `combine_2023_2024.py` - Combines temperature data files
- `build_heatmap.py` - Generates heatmap data from observations
- `build_migration_paths.py` - Creates migration path visualizations

## Browser Compatibility

- **Modern browsers required**: Chrome, Firefox, Safari, Edge (latest versions)
- **JavaScript enabled**: Required for all functionality
- **WebGL not required**: Uses SVG rendering (works on all devices)

## Development Notes

### File Size Considerations (GitHub Compatibility)
- All data files are under 25MB for GitHub compatibility
- Temperature data (originally 484MB) is split into 48 biweekly chunks loaded sequentially
- Large source data files (`*_combined.json`) are excluded from the repo via `.gitignore`
- Pre-processed smaller files (`*_averaged.json`, `*_heatmap.json`) are used for visualizations

## Additional Documentation

- `_data_dictionary.md` - Complete data schema documentation


