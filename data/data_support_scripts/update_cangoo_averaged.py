#!/usr/bin/env python3
"""
Update cangoo_averaged.json from cangoo_combined.json
Properly handles the 'count' field in observations
"""

import json
from pathlib import Path
from collections import defaultdict

def update_cangoo_averaged():
    data_dir = Path(__file__).parent
    input_file = data_dir / 'cangoo_combined.json'
    output_file = data_dir / 'cangoo_averaged.json'
    
    print(f"Processing {input_file}...")
    
    with open(input_file, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    # Get observations from the combined JSON
    observations = data.get('observations', [])
    print(f"  Loaded {len(observations)} observations")
    
    # Group by (year, day-of-year)
    # Track: total count, all latitudes, all longitudes
    year_day_data = defaultdict(lambda: {
        'total_count': 0,
        'lats': [],
        'lons': []
    })
    
    for obs in observations:
        date_str = obs.get('date', '')
        if not date_str or len(date_str) < 10:
            continue
        
        try:
            year = date_str[:4]
            day_of_year = date_str[5:10]  # MM-DD
            
            # Get count (default to 1 if missing)
            count = obs.get('count', 1)
            if not isinstance(count, (int, float)) or count < 0:
                count = 1
            
            year_day_data[(year, day_of_year)]['total_count'] += count
            
            # Get latitude and longitude
            lat = obs.get('lat')
            lon = obs.get('lon')
            
            if lat is not None:
                try:
                    year_day_data[(year, day_of_year)]['lats'].append(float(lat))
                except (ValueError, TypeError):
                    pass
            
            if lon is not None:
                try:
                    year_day_data[(year, day_of_year)]['lons'].append(float(lon))
                except (ValueError, TypeError):
                    pass
                    
        except (IndexError, ValueError, KeyError):
            continue
    
    # Now average across years for each day-of-year
    day_averages = defaultdict(lambda: {
        'counts': [],
        'lats': [],
        'lons': []
    })
    
    for (year, day), data in year_day_data.items():
        day_averages[day]['counts'].append(data['total_count'])
        day_averages[day]['lats'].extend(data['lats'])
        day_averages[day]['lons'].extend(data['lons'])
    
    # Calculate final averages
    result = {}
    for day in sorted(day_averages.keys()):
        counts = day_averages[day]['counts']
        lats = day_averages[day]['lats']
        lons = day_averages[day]['lons']
        
        # Average count across years
        avg_count = sum(counts) / len(counts) if counts else 0
        avg_lat = sum(lats) / len(lats) if lats else None
        avg_lon = sum(lons) / len(lons) if lons else None
        
        result[day] = {
            'count': round(avg_count, 1),
            'avgLat': round(avg_lat, 4) if avg_lat is not None else None,
            'avgLon': round(avg_lon, 4) if avg_lon is not None else None
        }
    
    print(f"  Generated {len(result)} daily averages")
    
    # Write output
    output_data = {
        'speciesCode': 'cangoo',
        'speciesName': 'Canada Goose',
        'description': 'Averaged observation data by day-of-year across 2023-2024',
        'byDayOfYear': result
    }
    
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(output_data, f, separators=(',', ':'))
    
    file_size_kb = output_file.stat().st_size / 1024
    print(f"✓ Wrote {output_file} ({file_size_kb:.1f} KB)")

if __name__ == '__main__':
    update_cangoo_averaged()

