#!/usr/bin/env python3
"""
Split cangoo_combined.json into two CSV files due to size limitations.
"""

import json
import csv
from pathlib import Path

def split_cangoo_combined():
    data_dir = Path(__file__).parent
    input_file = data_dir / 'cangoo_combined.json'
    output_file_1 = data_dir / 'cangoo_combined_part1.csv'
    output_file_2 = data_dir / 'cangoo_combined_part2.csv'
    
    print(f"Loading {input_file}...")
    
    # Read the JSON file in chunks to handle large files
    with open(input_file, 'r', encoding='utf-8') as f:
        # Read the entire file (it's a single JSON object)
        data = json.load(f)
    
    observations = data.get('observations', [])
    total_records = len(observations)
    split_point = total_records // 2
    
    print(f"Total records: {total_records:,}")
    print(f"Splitting at record {split_point:,}")
    
    # Define CSV columns
    fieldnames = ['lat', 'lon', 'date', 'count', 'comName', 'sciName', 'countryCode', 'stateCode', 'speciesCode']
    
    # Write first half
    print(f"Writing {output_file_1}...")
    with open(output_file_1, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for obs in observations[:split_point]:
            writer.writerow(obs)
    
    # Write second half
    print(f"Writing {output_file_2}...")
    with open(output_file_2, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for obs in observations[split_point:]:
            writer.writerow(obs)
    
    print(f"✓ Split complete!")
    print(f"  Part 1: {split_point:,} records")
    print(f"  Part 2: {total_records - split_point:,} records")

if __name__ == '__main__':
    split_cangoo_combined()

