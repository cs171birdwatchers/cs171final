#!/usr/bin/env python3
"""
Split the large temperature CSV into biweekly JSON chunks for efficient web loading.
Each chunk contains temperature data for ~15 days, keeping file sizes under 25MB.

Output format: temp_chunk_YYYY-MM-A.json (A=first half) or temp_chunk_YYYY-MM-B.json (B=second half)
{
    "period": "2023-01-A",
    "startDate": "2023-01-01",
    "endDate": "2023-01-15",
    "days": [
        {
            "date": "2023-01-01",
            "points": [
                {"lat": -90.0, "lon": 0.0, "t": -23.4},
                ...
            ]
        },
        ...
    ]
}
"""

import json
import csv
from pathlib import Path
from collections import defaultdict
import shutil

def normalize_lon(lon):
    """Normalize longitude to -180 to 180 range."""
    lon = float(lon)
    return ((lon + 180) % 360) - 180

def get_period(date_str):
    """Return period key: YYYY-MM-A for days 1-15, YYYY-MM-B for days 16+"""
    day = int(date_str[8:10])
    month = date_str[:7]
    return f"{month}-A" if day <= 15 else f"{month}-B"

def main():
    data_dir = Path(__file__).parent.parent
    input_file = data_dir / 'temp_grid_daily_2023_2024.csv'
    output_dir = data_dir / 'temp_chunks'
    
    # Remove old chunks and recreate directory
    if output_dir.exists():
        shutil.rmtree(output_dir)
    output_dir.mkdir(exist_ok=True)
    
    print(f"Reading {input_file}...")
    
    # Group data by biweekly period
    period_data = defaultdict(lambda: defaultdict(list))
    
    row_count = 0
    with open(input_file, 'r') as f:
        reader = csv.DictReader(f)
        for row in reader:
            date = row['date']
            period = get_period(date)
            
            point = {
                'lat': float(row['lat']),
                'lon': normalize_lon(row['lon']),
                't': float(row['temp_c'])
            }
            
            period_data[period][date].append(point)
            row_count += 1
            
            if row_count % 1000000 == 0:
                print(f"  Processed {row_count:,} rows...")
    
    print(f"Total rows: {row_count:,}")
    print(f"Found {len(period_data)} biweekly periods")
    
    # Write biweekly JSON files
    manifest = {
        "chunks": [],
        "totalPeriods": len(period_data),
        "dateRange": {
            "start": min(period_data.keys()),
            "end": max(period_data.keys())
        }
    }
    
    for period in sorted(period_data.keys()):
        dates_data = period_data[period]
        sorted_dates = sorted(dates_data.keys())
        
        # Format for output
        days = []
        for date in sorted_dates:
            days.append({
                "date": date,
                "points": dates_data[date]
            })
        
        output_data = {
            "period": period,
            "startDate": sorted_dates[0] if sorted_dates else "",
            "endDate": sorted_dates[-1] if sorted_dates else "",
            "days": days
        }
        
        output_file = output_dir / f'temp_chunk_{period}.json'
        
        with open(output_file, 'w') as f:
            json.dump(output_data, f, separators=(',', ':'))
        
        file_size = output_file.stat().st_size / (1024 * 1024)
        
        manifest["chunks"].append({
            "period": period,
            "file": f"temp_chunks/temp_chunk_{period}.json",
            "startDate": sorted_dates[0] if sorted_dates else "",
            "endDate": sorted_dates[-1] if sorted_dates else "",
            "days": len(days),
            "sizeMB": round(file_size, 2)
        })
        
        print(f"  Wrote {output_file.name}: {len(days)} days, {file_size:.2f} MB")
    
    # Write manifest file
    manifest_file = data_dir / 'temp_chunks_manifest.json'
    with open(manifest_file, 'w') as f:
        json.dump(manifest, f, indent=2)
    
    print(f"\nWrote manifest: {manifest_file}")
    print("\nDone! Biweekly temperature chunks created successfully.")
    
    # Check for any files over 25MB
    large_files = [c for c in manifest["chunks"] if c["sizeMB"] > 25]
    if large_files:
        print(f"\n⚠️  Warning: {len(large_files)} files are over 25MB:")
        for f in large_files:
            print(f"  - {f['file']}: {f['sizeMB']} MB")
    else:
        print("\n✅ All chunk files are under 25MB - safe for GitHub!")

if __name__ == '__main__':
    main()
