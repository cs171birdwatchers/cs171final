#!/usr/bin/env python3
"""
Remove 60% of data points from Alberta evenly in temp_grid_daily_2024.csv.
Alberta bounds: 49°N to 60°N latitude, 110°W to 120°W longitude
"""

import csv
import os
import random
from collections import defaultdict

def reduce_alberta_2024():
    """Remove 60% of Alberta data points evenly while keeping all other data."""
    data_dir = os.path.dirname(os.path.abspath(__file__))
    input_file = os.path.join(data_dir, 'temp_grid_daily_2024.csv')
    output_file = os.path.join(data_dir, 'temp_grid_daily_2024.csv')
    temp_output = os.path.join(data_dir, 'temp_grid_daily_2024.csv.tmp')
    
    # Alberta geographic bounds
    ALBERTA_LAT_MIN = 49.0
    ALBERTA_LAT_MAX = 60.0
    ALBERTA_LON_MIN = -120.0  # 120°W
    ALBERTA_LON_MAX = -110.0  # 110°W
    
    print("Analyzing temp_grid_daily_2024.csv structure...")
    print(f"Alberta bounds: {ALBERTA_LAT_MIN}°N to {ALBERTA_LAT_MAX}°N, {ALBERTA_LON_MIN}°W to {ALBERTA_LON_MAX}°W")
    
    # First pass: separate Alberta and non-Alberta rows
    alberta_rows = []
    non_alberta_rows = []
    alberta_bins = defaultdict(list)  # {(lat_bin, lon_bin, date): [rows]}
    
    rows_read = 0
    alberta_count = 0
    
    with open(input_file, 'r', encoding='utf-8') as infile:
        reader = csv.DictReader(infile)
        
        for row in reader:
            lat = float(row['lat'])
            lon = float(row['lon'])
            date = row['date']
            
            # Check if row is in Alberta
            is_alberta = (ALBERTA_LAT_MIN <= lat <= ALBERTA_LAT_MAX and 
                         ALBERTA_LON_MIN <= lon <= ALBERTA_LON_MAX)
            
            if is_alberta:
                alberta_count += 1
                # Create spatial bins for even distribution
                lat_bin = round(lat, 1)  # 0.1 degree bins for finer distribution
                lon_bin = round(lon, 1)
                alberta_bins[(lat_bin, lon_bin, date)].append(row)
            else:
                non_alberta_rows.append(row)
            
            rows_read += 1
            
            if rows_read % 5000000 == 0:
                print(f"  Processed {rows_read:,} rows... (Alberta: {alberta_count:,})")
    
    print(f"\n  Total rows: {rows_read:,}")
    print(f"  Alberta rows: {alberta_count:,}")
    print(f"  Non-Alberta rows: {len(non_alberta_rows):,}")
    print(f"  Alberta spatial-temporal bins: {len(alberta_bins):,}")
    
    # Calculate target: keep 40% of Alberta rows (remove 60%)
    target_alberta_rows = int(alberta_count * 0.4)
    print(f"\nTarget: Keep {target_alberta_rows:,} Alberta rows (40%, removing 60%)")
    
    # Sample 40% from each Alberta bin evenly to maintain distribution
    print("\nSampling Alberta data to maintain even distribution...")
    
    sampled_alberta_rows = []
    rows_sampled = 0
    
    # Sample 40% from each spatial-temporal bin
    for (lat_bin, lon_bin, date), rows in alberta_bins.items():
        # Sample 40% from each bin to maintain distribution
        num_to_sample = max(1, int(len(rows) * 0.4))  # At least 1 if bin has data
        if len(rows) > 0:
            sampled = random.sample(rows, min(num_to_sample, len(rows)))
            sampled_alberta_rows.extend(sampled)
            rows_sampled += len(sampled)
    
    print(f"  Sampled {rows_sampled:,} Alberta rows from {len(alberta_bins):,} bins")
    print(f"  Removed {alberta_count - rows_sampled:,} Alberta rows ({(1 - rows_sampled/alberta_count)*100:.1f}%)")
    
    # Combine sampled Alberta rows with all non-Alberta rows
    all_rows = sampled_alberta_rows + non_alberta_rows
    
    # Shuffle to avoid any ordering bias
    random.shuffle(all_rows)
    
    # Write reduced data
    print("\nWriting reduced dataset...")
    with open(temp_output, 'w', encoding='utf-8', newline='') as outfile:
        writer = csv.writer(outfile)
        writer.writerow(['date', 'lat', 'lon', 'temp_c'])
        
        for row in all_rows:
            writer.writerow([row['date'], row['lat'], row['lon'], row['temp_c']])
    
    # Replace original with reduced file
    os.replace(temp_output, output_file)
    
    print(f"\nReduction complete!")
    print(f"  Original total rows: {rows_read:,}")
    print(f"  Original Alberta rows: {alberta_count:,}")
    print(f"  Kept Alberta rows: {rows_sampled:,}")
    print(f"  Final total rows: {len(all_rows):,}")
    print(f"  Alberta reduction: {(1 - rows_sampled/alberta_count)*100:.1f}%")
    print(f"  File updated: {output_file}")

if __name__ == '__main__':
    # Set random seed for reproducibility
    random.seed(42)
    reduce_alberta_2024()

