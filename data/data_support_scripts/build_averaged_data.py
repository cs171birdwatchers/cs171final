#!/usr/bin/env python3
"""
Build Averaged Year Data
Creates smaller JSON files with data averaged by day-of-year across 2023-2024.
These files are much smaller and faster to load in visualizations.
"""

import json
import csv
from pathlib import Path
from collections import defaultdict
from typing import Dict, List, Any

# Species to process
SPECIES = ['barswa', 'cangoo', 'sancra', 'redkno', 'spwduc', 'westan', 'gresni']

SPECIES_NAMES = {
    'barswa': 'Barn Swallow',
    'cangoo': 'Canada Goose',
    'sancra': 'Sandhill Crane',
    'redkno': 'Red Knot',
    'spwduc': 'Wood Duck',
    'westan': 'Western Tanager',
    'gresni': 'Great Snipe'
}


def process_combined_json(input_path: Path) -> Dict[str, Any]:
    """
    Process a combined JSON file and return averaged data by day-of-year.
    Returns dict with:
    - byDayOfYear: {MM-DD: {count: avg_count, avgLat: avg_latitude, avgLon: avg_longitude}}
    """
    print(f"Processing {input_path}...")
    
    with open(input_path, 'r', encoding='utf-8') as f:
        raw = json.load(f)
    
    # Handle different JSON structures
    if isinstance(raw, list):
        rows = raw
    elif isinstance(raw, dict):
        rows = raw.get('records', raw.get('observations', []))
    else:
        rows = []
    
    print(f"  Loaded {len(rows)} records")
    
    # Aggregate by day-of-year (MM-DD)
    # Track: count, sum of latitudes, sum of longitudes, number of years seen
    day_data = defaultdict(lambda: {
        'counts': [],  # List of counts per year
        'lats': [],    # All latitudes seen
        'lons': []     # All longitudes seen
    })
    
    # Group by (year, day-of-year) first
    year_day_counts = defaultdict(lambda: defaultdict(int))
    year_day_lats = defaultdict(lambda: defaultdict(list))
    year_day_lons = defaultdict(lambda: defaultdict(list))
    
    for r in rows:
        # Get date
        date_str = r.get("OBSERVATION DATE") or r.get("date") or r.get("observationDate")
        if not date_str:
            continue
        
        # Parse year and day-of-year
        try:
            year = date_str[:4]
            day_of_year = date_str[5:]  # MM-DD
            
            if len(day_of_year) != 5:  # Should be "MM-DD"
                continue
                
            year_day_counts[year][day_of_year] += 1
            
            # Get latitude if available
            lat = r.get("LATITUDE") or r.get("latitude") or r.get("lat")
            if lat is not None:
                try:
                    year_day_lats[year][day_of_year].append(float(lat))
                except (ValueError, TypeError):
                    pass
            
            # Get longitude if available
            lon = r.get("LONGITUDE") or r.get("longitude") or r.get("lon") or r.get("long")
            if lon is not None:
                try:
                    year_day_lons[year][day_of_year].append(float(lon))
                except (ValueError, TypeError):
                    pass
                    
        except (IndexError, ValueError):
            continue
    
    # Now average across years for each day-of-year
    all_days = set()
    for year in year_day_counts:
        all_days.update(year_day_counts[year].keys())
    
    result = {}
    for day in sorted(all_days):
        counts = []
        all_lats = []
        all_lons = []
        
        for year in year_day_counts:
            if day in year_day_counts[year]:
                counts.append(year_day_counts[year][day])
            if day in year_day_lats[year]:
                all_lats.extend(year_day_lats[year][day])
            if day in year_day_lons[year]:
                all_lons.extend(year_day_lons[year][day])
        
        # Average count across years
        avg_count = sum(counts) / len(counts) if counts else 0
        avg_lat = sum(all_lats) / len(all_lats) if all_lats else None
        avg_lon = sum(all_lons) / len(all_lons) if all_lons else None
        
        result[day] = {
            'count': round(avg_count, 1),
            'avgLat': round(avg_lat, 4) if avg_lat is not None else None,
            'avgLon': round(avg_lon, 4) if avg_lon is not None else None
        }
    
    print(f"  Generated {len(result)} daily averages")
    return result


def process_heatmap_json(input_path: Path) -> Dict[str, Any]:
    """
    Process a heatmap JSON file and return averaged data by week-of-year.
    """
    print(f"Processing heatmap {input_path}...")
    
    with open(input_path, 'r', encoding='utf-8') as f:
        raw = json.load(f)
    
    color_gradient = raw.get('colorGradient', {'min': '#808080', 'max': '#FF8C00'})
    frames = raw.get('frames', [])
    
    print(f"  Loaded {len(frames)} frames")
    
    # Group frames by week-of-year (MM-DD of week start)
    week_cells = defaultdict(lambda: defaultdict(list))  # {week_MM-DD: {(lon,lat): [densities]}}
    
    for frame in frames:
        week_str = frame.get('week', '')
        if len(week_str) < 10:
            continue
        
        # Extract MM-DD from the week string
        week_of_year = week_str[5:10]  # MM-DD
        
        for cell in frame.get('cells', []):
            if len(cell) >= 3:
                lon, lat, density = cell[0], cell[1], cell[2]
                key = (round(lon, 1), round(lat, 1))
                week_cells[week_of_year][key].append(density)
    
    # Average densities for each cell across years
    averaged_frames = []
    for week_of_year in sorted(week_cells.keys()):
        cells = []
        for (lon, lat), densities in week_cells[week_of_year].items():
            avg_density = sum(densities) / len(densities)
            cells.append([lon, lat, round(avg_density, 1)])
        
        if cells:
            # Use a reference year (2024) for the week date
            averaged_frames.append({
                'week': f'2024-{week_of_year}',
                'cells': cells
            })
    
    print(f"  Generated {len(averaged_frames)} averaged frames")
    
    return {
        'colorGradient': color_gradient,
        'frames': averaged_frames
    }


def process_temperature_csv(input_path: Path, output_path: Path):
    """
    Process temperature CSV and create averaged version by day-of-year.
    """
    print(f"Processing temperature data {input_path}...")
    
    # Read all temperature data
    day_temps = defaultdict(list)
    
    with open(input_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            date_str = row.get('date', '')
            temp_str = row.get('temp_c', '')
            
            if len(date_str) >= 10 and temp_str:
                day_of_year = date_str[5:10]  # MM-DD
                try:
                    temp = float(temp_str)
                    day_temps[day_of_year].append(temp)
                except ValueError:
                    pass
    
    # Write averaged data
    with open(output_path, 'w', encoding='utf-8', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(['date', 'temp_c'])
        
        for day in sorted(day_temps.keys()):
            temps = day_temps[day]
            avg_temp = sum(temps) / len(temps) if temps else 0
            # Use reference year 2024
            writer.writerow([f'2024-{day}', round(avg_temp, 2)])
    
    print(f"  Wrote averaged temperature data to {output_path}")


def main():
    data_dir = Path(__file__).parent
    
    # Process each species' combined JSON
    for species in SPECIES:
        input_file = data_dir / f'{species}_combined.json'
        output_file = data_dir / f'{species}_averaged.json'
        
        if not input_file.exists():
            print(f"Skipping {species}: {input_file} not found")
            continue
        
        try:
            averaged_data = process_combined_json(input_file)
            
            output_data = {
                'speciesCode': species,
                'speciesName': SPECIES_NAMES.get(species, species),
                'description': 'Averaged observation data by day-of-year across 2023-2024',
                'byDayOfYear': averaged_data
            }
            
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(output_data, f, separators=(',', ':'))
            
            print(f"  Wrote {output_file} ({output_file.stat().st_size / 1024:.1f} KB)")
            
        except Exception as e:
            print(f"Error processing {species}: {e}")
    
    # Process heatmap files
    for species in SPECIES:
        input_file = data_dir / f'{species}_heatmap.json'
        output_file = data_dir / f'{species}_heatmap_averaged.json'
        
        if not input_file.exists():
            print(f"Skipping heatmap for {species}: {input_file} not found")
            continue
        
        try:
            averaged_data = process_heatmap_json(input_file)
            averaged_data['speciesName'] = SPECIES_NAMES.get(species, species)
            
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(averaged_data, f, separators=(',', ':'))
            
            print(f"  Wrote {output_file} ({output_file.stat().st_size / 1024:.1f} KB)")
            
        except Exception as e:
            print(f"Error processing heatmap for {species}: {e}")
    
    # Process temperature CSV
    temp_input = data_dir / 'temp_grid_daily_2023_2024.csv'
    temp_output = data_dir / 'temp_grid_averaged.csv'
    
    if temp_input.exists():
        try:
            process_temperature_csv(temp_input, temp_output)
        except Exception as e:
            print(f"Error processing temperature data: {e}")
    else:
        print(f"Temperature file not found: {temp_input}")
    
    print("\nDone! Averaged data files have been created.")


if __name__ == '__main__':
    main()

