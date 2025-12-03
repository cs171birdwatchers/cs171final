#!/usr/bin/env python3
"""
Convert cangoo CSV files back to JSON format
"""

import json
import csv
from pathlib import Path
from collections import defaultdict

def convert_csv_to_json():
    data_dir = Path(__file__).parent
    csv_file_1 = data_dir / 'cangoo_combined_part1.csv'
    csv_file_2 = data_dir / 'cangoo_combined_part2.csv'
    output_file = data_dir / 'cangoo_combined.json'
    
    observations = []
    
    # Read first CSV
    print(f"Reading {csv_file_1}...")
    with open(csv_file_1, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            observations.append({
                'lat': float(row['lat']),
                'lon': float(row['lon']),
                'date': row['date'],
                'count': int(row['count']),
                'comName': row['comName'],
                'sciName': row['sciName'],
                'countryCode': row['countryCode'],
                'stateCode': row['stateCode'],
                'speciesCode': row['speciesCode']
            })
    
    print(f"  Loaded {len(observations)} records from part 1")
    
    # Read second CSV
    print(f"Reading {csv_file_2}...")
    with open(csv_file_2, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            observations.append({
                'lat': float(row['lat']),
                'lon': float(row['lon']),
                'date': row['date'],
                'count': int(row['count']),
                'comName': row['comName'],
                'sciName': row['sciName'],
                'countryCode': row['countryCode'],
                'stateCode': row['stateCode'],
                'speciesCode': row['speciesCode']
            })
    
    print(f"  Loaded {len(observations)} total records")
    
    # Calculate metadata
    dates = [obs['date'] for obs in observations]
    lats = [obs['lat'] for obs in observations]
    lons = [obs['lon'] for obs in observations]
    counts = [obs['count'] for obs in observations]
    
    # Group by month for monthly counts
    monthly_counts = defaultdict(int)
    for date in dates:
        month_key = date[:7]  # YYYY-MM
        monthly_counts[month_key] += 1
    
    # Get unique country and state codes
    country_codes = set(obs['countryCode'] for obs in observations)
    state_codes = set(obs['stateCode'] for obs in observations)
    
    # Build metadata
    metadata = {
        'speciesCode': 'cangoo',
        'generatedAt': '2025-12-03T00:00:00Z',
        'records': len(observations),
        'missing_lat': {'count': 0, 'percent': 0.0},
        'missing_lon': {'count': 0, 'percent': 0.0},
        'missing_date': {'count': 0, 'percent': 0.0},
        'missing_count': {'count': sum(1 for c in counts if c == 0), 'percent': round(sum(1 for c in counts if c == 0) / len(counts) * 100, 2)},
        'missing_countryCode': {'count': 0, 'percent': 0.0},
        'missing_stateCode': {'count': 0, 'percent': 0.0},
        'missing_comName': {'count': 0, 'percent': 0.0},
        'missing_sciName': {'count': 0, 'percent': 0.0},
        'date_min': min(dates),
        'date_max': max(dates),
        'lat_min': min(lats),
        'lat_max': max(lats),
        'lon_min': min(lons),
        'lon_max': max(lons),
        'monthly_counts': dict(sorted(monthly_counts.items())),
        'unique_countryCode': len(country_codes),
        'unique_stateCode': len(state_codes)
    }
    
    # Build final JSON structure
    output_data = {
        'metadata': metadata,
        'observations': observations
    }
    
    # Write JSON file
    print(f"Writing {output_file}...")
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(output_data, f, separators=(',', ':'))
    
    file_size_mb = output_file.stat().st_size / (1024 * 1024)
    print(f"✓ Created {output_file} ({file_size_mb:.1f} MB)")
    
    # Delete CSV files
    print(f"\nDeleting CSV files...")
    csv_file_1.unlink()
    csv_file_2.unlink()
    print(f"✓ Deleted {csv_file_1}")
    print(f"✓ Deleted {csv_file_2}")

if __name__ == '__main__':
    convert_csv_to_json()

