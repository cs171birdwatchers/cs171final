#!/usr/bin/env python3
"""
Combine temp_grid_daily_2023.csv and temp_grid_daily_2024.csv into a single file.
Stacks the data chronologically (2023 first, then 2024).
"""

import csv
import os

def combine_2023_2024():
    """Combine 2023 and 2024 temperature data files."""
    data_dir = os.path.dirname(os.path.abspath(__file__))
    input_2023 = os.path.join(data_dir, 'temp_grid_daily_2023.csv')
    input_2024 = os.path.join(data_dir, 'temp_grid_daily_2024.csv')
    output_file = os.path.join(data_dir, 'temp_grid_daily_2023_2024.csv')
    
    print("Combining 2023 and 2024 temperature data...")
    print(f"  Input 2023: {input_2023}")
    print(f"  Input 2024: {input_2024}")
    print(f"  Output: {output_file}")
    
    rows_2023 = 0
    rows_2024 = 0
    
    with open(output_file, 'w', encoding='utf-8', newline='') as outfile:
        writer = csv.writer(outfile)
        
        # Write header
        writer.writerow(['date', 'lat', 'lon', 'temp_c'])
        
        # Read and write 2023 data
        print("\nProcessing 2023 data...")
        with open(input_2023, 'r', encoding='utf-8') as infile:
            reader = csv.reader(infile)
            next(reader)  # Skip header
            
            for row in reader:
                writer.writerow(row)
                rows_2023 += 1
                
                if rows_2023 % 1000000 == 0:
                    print(f"  Processed {rows_2023:,} rows from 2023...")
        
        print(f"  Completed 2023: {rows_2023:,} rows")
        
        # Read and write 2024 data
        print("\nProcessing 2024 data...")
        with open(input_2024, 'r', encoding='utf-8') as infile:
            reader = csv.reader(infile)
            next(reader)  # Skip header
            
            for row in reader:
                writer.writerow(row)
                rows_2024 += 1
                
                if rows_2024 % 1000000 == 0:
                    print(f"  Processed {rows_2024:,} rows from 2024...")
        
        print(f"  Completed 2024: {rows_2024:,} rows")
    
    total_rows = rows_2023 + rows_2024
    print(f"\n✅ Combination complete!")
    print(f"  Total rows: {total_rows:,}")
    print(f"  Rows from 2023: {rows_2023:,}")
    print(f"  Rows from 2024: {rows_2024:,}")
    print(f"  Output file: {output_file}")

if __name__ == '__main__':
    combine_2023_2024()

