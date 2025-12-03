#!/usr/bin/env python3
"""
Reduce 2023 temperature data by 50% while maintaining spatial and temporal distribution.
"""

import csv
import os
import random
from collections import defaultdict

def reduce_2023_data():
    """Reduce 2023 data by 50% with even spatial and temporal distribution."""
    data_dir = os.path.dirname(os.path.abspath(__file__))
    input_file = os.path.join(data_dir, 'temp_grid_daily_2023.csv')
    output_file = os.path.join(data_dir, 'temp_grid_daily_2023.csv')
    temp_output = os.path.join(data_dir, 'temp_grid_daily_2023.csv.tmp')
    
    print("Analyzing 2023 data structure...")
    
    # First pass: group data by spatial-temporal bins
    # Use rounded coordinates to create spatial bins
    spatial_temporal_bins = defaultdict(list)  # {(lat_bin, lon_bin, date): [rows]}
    
    with open(input_file, 'r', encoding='utf-8') as infile:
        reader = csv.DictReader(infile)
        
        rows_read = 0
        for row in reader:
            lat = float(row['lat'])
            lon = float(row['lon'])
            date = row['date']
            
            # Create spatial bins (round to 1 degree for spatial distribution)
            lat_bin = round(lat, 0)  # 1 degree bins
            lon_bin = round(lon, 0)
            
            spatial_temporal_bins[(lat_bin, lon_bin, date)].append(row)
            rows_read += 1
            
            if rows_read % 5000000 == 0:
                print(f"  Indexed {rows_read:,} rows...")
    
    print(f"  Total rows: {rows_read:,}")
    print(f"  Spatial-temporal bins: {len(spatial_temporal_bins):,}")
    
    # Calculate target: 50% of rows
    target_rows = rows_read // 2
    print(f"\nTarget: {target_rows:,} rows (50% reduction)")
    
    # Sample from each bin proportionally to maintain distribution
    print("\nSampling data to maintain distribution...")
    
    sampled_rows = []
    rows_sampled = 0
    
    # Sample 50% from each spatial-temporal bin
    for (lat_bin, lon_bin, date), rows in spatial_temporal_bins.items():
        # Sample 50% from each bin to maintain distribution
        num_to_sample = max(1, len(rows) // 2)  # At least 1 if bin has data
        if len(rows) > 0:
            sampled = random.sample(rows, min(num_to_sample, len(rows)))
            sampled_rows.extend(sampled)
            rows_sampled += len(sampled)
    
    print(f"  Sampled {rows_sampled:,} rows from {len(spatial_temporal_bins):,} bins")
    
    # Shuffle to avoid any ordering bias
    random.shuffle(sampled_rows)
    
    # Write sampled data
    print("\nWriting reduced dataset...")
    with open(temp_output, 'w', encoding='utf-8', newline='') as outfile:
        writer = csv.writer(outfile)
        writer.writerow(['date', 'lat', 'lon', 'temp_c'])
        
        for row in sampled_rows:
            writer.writerow([row['date'], row['lat'], row['lon'], row['temp_c']])
    
    # Replace original with reduced file
    os.replace(temp_output, output_file)
    
    print(f"\nReduction complete!")
    print(f"  Original rows: {rows_read:,}")
    print(f"  Reduced rows: {rows_sampled:,}")
    print(f"  Reduction: {(1 - rows_sampled/rows_read)*100:.1f}%")
    print(f"  File updated: {output_file}")

if __name__ == '__main__':
    # Set random seed for reproducibility
    random.seed(42)
    reduce_2023_data()

