#!/usr/bin/env python3
"""
Analyze 2024 temp data and create a matching 2023 dataset with similar size and location distribution.
"""

import csv
import os
import random
from collections import defaultdict

def analyze_2024_data():
    """Analyze the 2024 temperature data structure."""
    data_dir = os.path.dirname(os.path.abspath(__file__))
    file_2024 = os.path.join(data_dir, 'temp_grid_daily_2024.csv')
    
    print("Analyzing 2024 temperature data...")
    
    locations = set()  # Unique (lat, lon) pairs
    dates = set()  # Unique dates
    location_date_counts = defaultdict(int)  # Count per location-date combination
    total_rows = 0
    
    with open(file_2024, 'r', encoding='utf-8') as infile:
        reader = csv.DictReader(infile)
        
        for row in reader:
            lat = float(row['lat'])
            lon = float(row['lon'])
            date = row['date']
            
            locations.add((lat, lon))
            dates.add(date)
            location_date_counts[(lat, lon, date)] += 1
            total_rows += 1
            
            if total_rows % 500000 == 0:
                print(f"  Processed {total_rows:,} rows...")
    
    print(f"\n2024 Data Analysis:")
    print(f"  Total rows: {total_rows:,}")
    print(f"  Unique locations: {len(locations):,}")
    print(f"  Unique dates: {len(dates):,}")
    print(f"  Date range: {min(dates)} to {max(dates)}")
    
    # Analyze location distribution
    lat_distribution = defaultdict(int)
    lon_distribution = defaultdict(int)
    
    for lat, lon in locations:
        # Round to 1 decimal for distribution analysis
        lat_rounded = round(lat, 1)
        lon_rounded = round(lon, 1)
        lat_distribution[lat_rounded] += 1
        lon_distribution[lon_rounded] += 1
    
    print(f"\nLocation Distribution:")
    print(f"  Latitude range: {min(lat_distribution.keys()):.1f} to {max(lat_distribution.keys()):.1f}")
    print(f"  Longitude range: {min(lon_distribution.keys()):.1f} to {max(lon_distribution.keys()):.1f}")
    
    return {
        'total_rows': total_rows,
        'locations': locations,
        'dates': dates,
        'location_date_counts': location_date_counts,
        'lat_distribution': lat_distribution,
        'lon_distribution': lon_distribution
    }

def create_matching_2023_data(analysis_2024):
    """Create a 2023 dataset matching 2024's size and location distribution."""
    data_dir = os.path.dirname(os.path.abspath(__file__))
    file_2023_full = os.path.join(data_dir, 'temp_grid_daily_2023.csv')
    file_2023_matched = os.path.join(data_dir, 'temp_grid_daily_2023_matched.csv')
    
    print(f"\nCreating matching 2023 dataset...")
    print(f"  Target size: {analysis_2024['total_rows']:,} rows")
    print(f"  Target locations: {len(analysis_2024['locations']):,} unique locations")
    
    # Build index of 2023 data by location
    print("\nIndexing 2023 data by location...")
    data_by_location = defaultdict(list)  # {(lat, lon): [rows]}
    
    with open(file_2023_full, 'r', encoding='utf-8') as infile:
        reader = csv.DictReader(infile)
        
        rows_indexed = 0
        for row in reader:
            lat = float(row['lat'])
            lon = float(row['lon'])
            # Round to match 2024 precision (or use exact match)
            location_key = (round(lat, 2), round(lon, 2))  # Round to 2 decimals for matching
            data_by_location[location_key].append(row)
            rows_indexed += 1
            
            if rows_indexed % 5000000 == 0:
                print(f"  Indexed {rows_indexed:,} rows...")
    
    print(f"  Total 2023 rows indexed: {rows_indexed:,}")
    print(f"  Unique locations in 2023: {len(data_by_location):,}")
    
    # Match 2024 locations to 2023 data
    print("\nMatching locations and sampling data...")
    
    # Convert 2024 locations to rounded keys for matching
    target_locations_rounded = {(round(lat, 2), round(lon, 2)) for lat, lon in analysis_2024['locations']}
    
    # Find matching locations in 2023
    matched_locations = {}
    for loc_2024 in target_locations_rounded:
        # Try exact match first
        if loc_2024 in data_by_location:
            matched_locations[loc_2024] = loc_2024
        else:
            # Try to find closest match (within 0.1 degree)
            best_match = None
            min_distance = float('inf')
            for loc_2023 in data_by_location.keys():
                distance = ((loc_2023[0] - loc_2024[0])**2 + (loc_2023[1] - loc_2024[1])**2)**0.5
                if distance < min_distance and distance < 0.15:  # Within ~0.1 degree
                    min_distance = distance
                    best_match = loc_2023
            if best_match:
                matched_locations[loc_2024] = best_match
    
    print(f"  Matched {len(matched_locations):,} locations ({len(matched_locations)/len(target_locations_rounded)*100:.1f}%)")
    
    # Sample data to match 2024 size
    print("\nSampling data to match target size...")
    
    # Get all available data from matched locations
    available_data = []
    for loc_2024, loc_2023 in matched_locations.items():
        available_data.extend(data_by_location[loc_2023])
    
    print(f"  Available rows from matched locations: {len(available_data):,}")
    
    # Sample to match target size
    target_size = analysis_2024['total_rows']
    if len(available_data) >= target_size:
        # Randomly sample
        sampled_data = random.sample(available_data, target_size)
    else:
        # Use all available data (might be less than target)
        sampled_data = available_data
        print(f"  Warning: Only {len(sampled_data):,} rows available (less than target)")
    
    # Write sampled data
    print(f"\nWriting matched 2023 dataset...")
    with open(file_2023_matched, 'w', encoding='utf-8', newline='') as outfile:
        writer = csv.writer(outfile)
        writer.writerow(['date', 'lat', 'lon', 'temp_c'])
        
        for row in sampled_data:
            writer.writerow([row['date'], row['lat'], row['lon'], row['temp_c']])
    
    print(f"  Created: {file_2023_matched}")
    print(f"  Rows written: {len(sampled_data):,}")
    
    return file_2023_matched

def main():
    # Set random seed for reproducibility
    random.seed(42)
    
    # Analyze 2024 data
    analysis_2024 = analyze_2024_data()
    
    # Create matching 2023 dataset
    create_matching_2023_data(analysis_2024)
    
    print("\nDone!")

if __name__ == '__main__':
    main()

