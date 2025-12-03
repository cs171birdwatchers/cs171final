import argparse
import json
import math
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import pandas as pd


# ------------------------------
# Helpers
# ------------------------------

def clamp_lon(lon: float) -> float:
    """Normalize longitude to [-180, 180)"""
    return ((lon + 180.0) % 360.0) - 180.0


def round_float(x: float, ndigits: int) -> float:
    return round(float(x), ndigits)


def bin_index(lon: float, lat: float, step: float) -> Tuple[int, int]:
    return (math.floor(lon / step), math.floor(lat / step))


def _detect_df_col(columns: List[str], candidates: List[str]) -> Optional[str]:
    """Case-insensitive column detection"""
    lower_to_actual: Dict[str, str] = {c.lower(): c for c in columns}
    for c in candidates:
        if c.lower() in lower_to_actual:
            return lower_to_actual[c.lower()]
    return None


# ------------------------------
# Heatmap construction from DataFrame
# ------------------------------

def build_heatmap_from_dataframe(
    df: pd.DataFrame,
    *,
    date_col: str = "date",
    lat_candidates: List[str] = ["lat", "latitude", "y"],
    lon_candidates: List[str] = ["lon", "longitude", "x", "long"],
    value_candidates: List[str] = ["count", "bird_density", "density", "value"],
    grid_deg: float = 1.0,
    week_freq: str = "W-MON",
) -> List[Dict[str, Any]]:
    """
    Aggregate bird observations by week and spatial grid cells.
    Returns a list of frames: [{"week": "YYYY-MM-DD", "cells": [[lon, lat, density], ...]}, ...]
    """
    cols = list(df.columns)
    lat_col = _detect_df_col(cols, lat_candidates)
    lon_col = _detect_df_col(cols, lon_candidates)
    val_col = _detect_df_col(cols, value_candidates)
    
    if date_col not in df.columns or not lat_col or not lon_col or not val_col:
        raise ValueError(
            f"Missing required columns: date='{date_col}', lat candidates {lat_candidates}, "
            f"lon candidates {lon_candidates}, value candidates {value_candidates}. "
            f"Available: {cols}"
        )

    work = df.copy()
    # Parse date
    work[date_col] = pd.to_datetime(work[date_col], format="%Y-%m-%d", errors="coerce")
    work = work.dropna(subset=[date_col, lat_col, lon_col, val_col])
    
    # Filter non-finite numbers
    work = work[pd.to_numeric(work[lat_col], errors="coerce").notna()]
    work = work[pd.to_numeric(work[lon_col], errors="coerce").notna()]
    work = work[pd.to_numeric(work[val_col], errors="coerce").notna()]
    
    # Compute week start
    work["week_start"] = work[date_col].dt.to_period(week_freq).apply(lambda p: p.start_time)
    
    # Bin spatial coordinates
    work["bin_lon"] = work[lon_col].apply(lambda x: math.floor(float(x) / grid_deg))
    work["bin_lat"] = work[lat_col].apply(lambda x: math.floor(float(x) / grid_deg))
    
    # Aggregate by (week, bin_lon, bin_lat) summing value
    grouped = (
        work.groupby(["week_start", "bin_lon", "bin_lat"], as_index=False)[val_col]
        .sum()
        .rename(columns={val_col: "density"})
    )
    grouped = grouped.sort_values(["week_start", "bin_lon", "bin_lat"]).reset_index(drop=True)
    
    # Build frames per week
    frames: List[Dict[str, Any]] = []
    for week_value, sub in grouped.groupby("week_start"):
        week_key = week_value.strftime("%Y-%m-%d")
        cells: List[List[float]] = []
        for _, r in sub.iterrows():
            # Cell center
            lon_center = clamp_lon((r["bin_lon"] + 0.5) * grid_deg)
            lat_center = (r["bin_lat"] + 0.5) * grid_deg
            density = float(r["density"])
            cells.append([lon_center, lat_center, density])
        if cells:
            frames.append({"week": week_key, "cells": cells})
    
    frames.sort(key=lambda x: x["week"])
    return frames


# ------------------------------
# I/O and main
# ------------------------------

def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Build a compact heatmap (density over time) from bird observation JSON."
    )
    parser.add_argument(
        "--input",
        "-i",
        type=str,
        required=True,
        help="Path to input JSON (e.g., barswa_combined.json)",
    )
    parser.add_argument(
        "--output",
        "-o",
        type=str,
        default=None,
        help="Output JSON path (default: same directory as input, 'heatmap.json').",
    )
    parser.add_argument(
        "--date-col",
        type=str,
        default="date",
        help="Date column name (default: 'date' in YYYY-MM-DD format).",
    )
    parser.add_argument(
        "--species-code",
        type=str,
        default=None,
        help="Optional filter: only include records with this speciesCode (e.g., 'barswa').",
    )
    parser.add_argument(
        "--species-name",
        type=str,
        default=None,
        help="Optional: species name to include in output JSON (e.g., 'Barn Swallow').",
    )
    parser.add_argument(
        "--country-code",
        type=str,
        default=None,
        help="Optional filter: only include records with this countryCode.",
    )
    parser.add_argument(
        "--grid-deg",
        type=float,
        default=1.0,
        help="Grid cell size in degrees for spatial binning (default: 1.0).",
    )
    parser.add_argument(
        "--week-freq",
        type=str,
        default="W-MON",
        help="Pandas week frequency for temporal aggregation (default: 'W-MON').",
    )
    parser.add_argument(
        "--round",
        dest="round_digits",
        type=int,
        default=3,
        help="Round floats in output to N digits (default: 3).",
    )
    parser.add_argument(
        "--max-weeks",
        type=int,
        default=None,
        help="Optionally limit the number of weeks processed (useful for testing).",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    input_path = Path(args.input)
    if not input_path.exists():
        raise FileNotFoundError(f"Input file not found: {input_path}")

    # Load JSON
    with open(input_path, "r", encoding="utf-8") as f:
        raw = json.load(f)

    # Preview: load into a DataFrame
    df_all: Optional[pd.DataFrame] = None
    if isinstance(raw, list):
        dict_rows = [r for r in raw if isinstance(r, dict)]
        if dict_rows:
            df_all = pd.DataFrame(dict_rows)
    elif isinstance(raw, dict):
        # Flatten dict-of-lists into a single list of dicts
        rows: List[Dict[str, Any]] = []
        for v in raw.values():
            if isinstance(v, list):
                rows.extend([r for r in v if isinstance(r, dict)])
        if rows:
            df_all = pd.DataFrame(rows)

    if df_all is None or df_all.empty:
        raise ValueError("Unable to construct DataFrame from input JSON.")

    print("JSON preview (head):")
    print(df_all.head().to_string(index=False))
    print(f"Columns: {list(df_all.columns)}")
    print(f"Total rows: {len(df_all)}")

    # Optional filters
    if args.species_code and "speciesCode" in df_all.columns:
        df_all = df_all[df_all["speciesCode"].astype(str).str.lower() == args.species_code.lower()]
        print(f"Filtered to species: {args.species_code} ({len(df_all)} rows)")
    if args.country_code and "countryCode" in df_all.columns:
        df_all = df_all[df_all["countryCode"].astype(str).str.upper() == args.country_code.upper()]
        print(f"Filtered to country: {args.country_code} ({len(df_all)} rows)")

    # Build heatmap frames
    frames = build_heatmap_from_dataframe(
        df_all,
        date_col=args.date_col,
        lat_candidates=["lat", "latitude", "y"],
        lon_candidates=["lon", "longitude", "x", "long"],
        value_candidates=["count", "bird_density", "density", "value"],
        grid_deg=args.grid_deg,
        week_freq=args.week_freq,
    )

    if not frames:
        raise ValueError("No heatmap frames generated.")

    if args.max_weeks is not None:
        frames = frames[: args.max_weeks]

    # Round all cell values
    for frame in frames:
        frame["cells"] = [
            [
                round_float(lon, args.round_digits),
                round_float(lat, args.round_digits),
                round_float(density, args.round_digits),
            ]
            for lon, lat, density in frame["cells"]
        ]

    # Determine output path
    output_path = Path(args.output) if args.output else (input_path.parent / "heatmap.json")
    output_path.parent.mkdir(parents=True, exist_ok=True)

    # Write heatmap JSON with metadata for color gradient
    output_data = {
        "colorGradient": {
            "min": "#808080",  # grey
            "max": "#FF8C00"   # saturated orange
        },
        "frames": frames
    }
    
    # Add species name if provided
    if args.species_name:
        output_data["speciesName"] = args.species_name

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(output_data, f, ensure_ascii=False, separators=(",", ":"))

    print(f"Wrote heatmap JSON with {len(frames)} frames: {output_path}")


if __name__ == "__main__":
    main()

