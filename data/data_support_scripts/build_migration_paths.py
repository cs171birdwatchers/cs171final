import argparse
import json
import math
from pathlib import Path
from typing import Any, Dict, List, Tuple
import numpy as np


def load_heatmap(heatmap_path: Path) -> Dict[str, Any]:
    """Load heatmap JSON file"""
    with open(heatmap_path, 'r', encoding='utf-8') as f:
        return json.load(f)


def aggregate_density_over_time(frames: List[Dict]) -> Dict[Tuple[float, float], float]:
    """
    Aggregate density across all time frames for each location.
    Returns dict: {(lon, lat): total_density}
    """
    density_map = {}
    for frame in frames:
        for cell in frame['cells']:
            lon, lat, density = cell[0], cell[1], cell[2]
            key = (lon, lat)
            density_map[key] = density_map.get(key, 0) + density
    return density_map


def normalize_densities(density_map: Dict[Tuple[float, float], float]) -> Dict[Tuple[float, float], float]:
    """Normalize densities to 0-1 range"""
    if not density_map:
        return {}
    max_density = max(density_map.values())
    if max_density == 0:
        return {k: 0 for k in density_map}
    return {k: v / max_density for k, v in density_map.items()}


def filter_geographic_regions(density_map: Dict[Tuple[float, float], float], 
                              exclude_regions: List[Tuple[Tuple[float, float], Tuple[float, float]]] = None) -> Dict[Tuple[float, float], float]:
    """
    Filter out specific geographic regions (e.g., New Zealand for Canada geese).
    
    exclude_regions: List of ((min_lon, max_lon), (min_lat, max_lat)) tuples
    """
    if not exclude_regions:
        return density_map
    
    filtered = {}
    for (lon, lat), density in density_map.items():
        exclude = False
        for (lon_range, lat_range) in exclude_regions:
            min_lon, max_lon = lon_range
            min_lat, max_lat = lat_range
            if min_lon <= lon <= max_lon and min_lat <= lat <= max_lat:
                exclude = True
                break
        if not exclude:
            filtered[(lon, lat)] = density
    
    return filtered


def cluster_by_longitude(density_map: Dict[Tuple[float, float], float], 
                         num_clusters: int = 2,
                         europe_only: bool = False,
                         americas_south_limit: float = None,
                         americas_only: bool = False,
                         africa_only_south: bool = False) -> List[Dict[Tuple[float, float], float]]:
    """
    Cluster points into separate flyways based on longitude using simple binning.
    
    Returns list of density maps, one per cluster.
    """
    if not density_map:
        return []
    
    # Get all longitudes weighted by density
    lon_density = {}
    for (lon, lat), density in density_map.items():
        lon_density[lon] = lon_density.get(lon, 0) + density
    
    # Find longitude ranges with significant density
    sorted_lons = sorted(lon_density.items())
    
    # Identify gaps in longitude distribution
    # Simple approach: split into western hemisphere (-180 to 0) and eastern (0 to 180)
    western = {}  # Americas
    eastern = {}  # Europe/Africa/Asia
    
    for (lon, lat), density in density_map.items():
        if lon < -20:  # Americas corridor
            # Apply southern limit filter if specified
            if americas_south_limit is None or lat >= americas_south_limit:
                western[(lon, lat)] = density
        else:  # Europe/Africa/Asia corridor
            if not americas_only:  # Skip eastern hemisphere if americas_only is True
                if europe_only:
                    # Limit to continental Europe: roughly -10 to 45 longitude, 35 to 72 latitude
                    if -10 <= lon <= 45 and 35 <= lat <= 72:
                        eastern[(lon, lat)] = density
                elif africa_only_south:
                    # Limit entire eastern flyway to Africa's longitude range: -20 to 51 longitude
                    if -20 <= lon <= 51:
                        eastern[(lon, lat)] = density
                else:
                    eastern[(lon, lat)] = density
    
    clusters = []
    if western:
        clusters.append(western)
    if eastern:
        clusters.append(eastern)
    
    return clusters


def find_extremes_in_cluster(density_map: Dict[Tuple[float, float], float]) -> Tuple[Tuple[float, float], Tuple[float, float]]:
    """
    Find the northernmost and southernmost points with significant density.
    Returns: ((lon_north, lat_north), (lon_south, lat_south))
    """
    if not density_map:
        raise ValueError("Empty density map")
    
    # Sort by latitude
    sorted_by_lat = sorted(density_map.items(), key=lambda x: x[0][1])
    
    # Get southernmost point (lowest latitude)
    south_point = sorted_by_lat[0][0]
    
    # Get northernmost point (highest latitude)
    north_point = sorted_by_lat[-1][0]
    
    return north_point, south_point


def calculate_migration_path(
    density_map: Dict[Tuple[float, float], float],
    north_point: Tuple[float, float],
    south_point: Tuple[float, float],
    num_waypoints: int = 20
) -> List[Tuple[float, float]]:
    """
    Calculate migration path from south to north following highest density points.
    
    Strategy:
    - Divide the latitude range into segments
    - For each segment, find the point with highest density
    - Connect these points to form the path
    """
    path = []
    
    lat_south = south_point[1]
    lat_north = north_point[1]
    lat_range = lat_north - lat_south
    
    if lat_range <= 0:
        # If north and south are same, just return both points
        return [south_point, north_point]
    
    # Create latitude bands
    lat_step = lat_range / (num_waypoints - 1)
    
    for i in range(num_waypoints):
        target_lat = lat_south + (i * lat_step)
        band_min = target_lat - lat_step / 2
        band_max = target_lat + lat_step / 2
        
        # Find all points in this latitude band
        band_points = [
            (loc, density) for loc, density in density_map.items()
            if band_min <= loc[1] <= band_max
        ]
        
        if band_points:
            # Choose point with highest density in this band
            best_point = max(band_points, key=lambda x: x[1])[0]
            path.append(best_point)
        else:
            # If no points in band, interpolate
            if path:
                # Use previous longitude
                path.append((path[-1][0], target_lat))
            else:
                # Use south point's longitude
                path.append((south_point[0], target_lat))
    
    # Ensure start and end points
    if path[0] != south_point:
        path[0] = south_point
    if path[-1] != north_point:
        path[-1] = north_point
    
    return path


def smooth_path(path: List[Tuple[float, float]], window_size: int = 3) -> List[Tuple[float, float]]:
    """
    Smooth the path using a moving average.
    """
    if len(path) <= window_size:
        return path
    
    smoothed = []
    half_window = window_size // 2
    
    for i in range(len(path)):
        # Handle boundaries
        start = max(0, i - half_window)
        end = min(len(path), i + half_window + 1)
        
        window = path[start:end]
        avg_lon = sum(p[0] for p in window) / len(window)
        avg_lat = sum(p[1] for p in window) / len(window)
        smoothed.append((avg_lon, avg_lat))
    
    return smoothed


def build_migration_json(heatmap_path: Path, species_name: str, output_path: Path, 
                         exclude_regions: List[Tuple[Tuple[float, float], Tuple[float, float]]] = None,
                         europe_only: bool = False,
                         americas_south_limit: float = None,
                         americas_only: bool = False,
                         africa_only_south: bool = False) -> None:
    """
    Build migration path JSON from heatmap data with multiple flyway support.
    """
    print(f"Loading heatmap: {heatmap_path}")
    heatmap = load_heatmap(heatmap_path)
    
    print(f"Processing {len(heatmap['frames'])} frames...")
    density_map = aggregate_density_over_time(heatmap['frames'])
    print(f"Found {len(density_map)} unique locations")
    
    if not density_map:
        print("⚠️ No density data found")
        return
    
    # Filter out excluded geographic regions
    if exclude_regions:
        print(f"Filtering {len(exclude_regions)} excluded region(s)...")
        density_map = filter_geographic_regions(density_map, exclude_regions)
        print(f"After filtering: {len(density_map)} locations")
    
    # Normalize densities
    normalized = normalize_densities(density_map)
    
    # Cluster into separate flyways
    if americas_only:
        print("🌎 Limiting to Americas flyway only (excluding eastern hemisphere)")
    if europe_only:
        print("🌍 Limiting eastern flyway to continental Europe only")
    if africa_only_south:
        print("🌍 Limiting eastern flyway southern hemisphere to Africa only")
    if americas_south_limit is not None:
        print(f"🌎 Limiting Americas flyway to latitudes >= {americas_south_limit}°")
    clusters = cluster_by_longitude(normalized, europe_only=europe_only, 
                                   americas_south_limit=americas_south_limit,
                                   americas_only=americas_only,
                                   africa_only_south=africa_only_south)
    print(f"Identified {len(clusters)} migration flyways")
    
    # Calculate path for each flyway
    paths = []
    for idx, cluster in enumerate(clusters):
        print(f"\nFlyway {idx + 1}:")
        print(f"  Points: {len(cluster)}")
        
        # Find extremes in this cluster
        north_point, south_point = find_extremes_in_cluster(cluster)
        print(f"  Northernmost: {north_point} (lat: {north_point[1]:.2f})")
        print(f"  Southernmost: {south_point} (lat: {south_point[1]:.2f})")
        
        # Calculate migration path
        raw_path = calculate_migration_path(cluster, north_point, south_point, num_waypoints=25)
        print(f"  Calculated path with {len(raw_path)} waypoints")
        
        # Smooth the path
        smoothed_path = smooth_path(raw_path, window_size=5)
        print(f"  Smoothed path to {len(smoothed_path)} points")
        
        # Format for output
        path_coords = [[round(lon, 3), round(lat, 3)] for lon, lat in smoothed_path]
        
        paths.append({
            "northPoint": [round(north_point[0], 3), round(north_point[1], 3)],
            "southPoint": [round(south_point[0], 3), round(south_point[1], 3)],
            "path": path_coords
        })
    
    output_data = {
        "speciesName": species_name,
        "color": "#8b0000",
        "paths": paths  # Changed from single path to array of paths
    }
    
    # Write output
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(output_data, f, ensure_ascii=False, indent=2)
    
    print(f"\n✅ Wrote migration paths: {output_path}")


def main():
    parser = argparse.ArgumentParser(
        description="Build migration path JSON from heatmap data"
    )
    parser.add_argument(
        "--input",
        "-i",
        type=str,
        required=True,
        help="Path to heatmap JSON file"
    )
    parser.add_argument(
        "--output",
        "-o",
        type=str,
        default=None,
        help="Output path for migration path JSON (default: <species>_migration.json)"
    )
    parser.add_argument(
        "--species-name",
        type=str,
        default=None,
        help="Species name to include in output"
    )
    parser.add_argument(
        "--exclude-new-zealand",
        action="store_true",
        help="Exclude New Zealand region (for Canada geese)"
    )
    parser.add_argument(
        "--europe-only",
        action="store_true",
        help="Limit eastern flyway to continental Europe only (for Canada geese)"
    )
    parser.add_argument(
        "--americas-south-limit",
        type=float,
        default=None,
        help="Southern latitude limit for Americas flyway (e.g., -35 to exclude extreme southern points)"
    )
    parser.add_argument(
        "--americas-only",
        action="store_true",
        help="Include only Americas flyway (exclude eastern hemisphere) - for Sandhill cranes"
    )
    parser.add_argument(
        "--africa-only-south",
        action="store_true",
        help="Limit eastern flyway southern hemisphere to Africa only - for Barn swallows"
    )
    
    args = parser.parse_args()
    
    input_path = Path(args.input)
    if not input_path.exists():
        raise FileNotFoundError(f"Input file not found: {input_path}")
    
    # Determine output path
    if args.output:
        output_path = Path(args.output)
    else:
        # Extract species code from input filename
        # e.g., "barswa_heatmap.json" -> "barswa_migration.json"
        species_code = input_path.stem.replace('_heatmap', '')
        output_path = input_path.parent / f"{species_code}_migration.json"
    
    species_name = args.species_name or "Unknown Species"
    
    # Build exclusion regions list
    exclude_regions = []
    if args.exclude_new_zealand:
        # New Zealand and surrounding Pacific islands: longitude 165-180, latitude -55 to -25
        exclude_regions.append(((165, 180), (-55, -25)))
        print("📍 Excluding New Zealand region")
    
    build_migration_json(input_path, species_name, output_path, exclude_regions, 
                        europe_only=args.europe_only,
                        americas_south_limit=args.americas_south_limit,
                        americas_only=args.americas_only,
                        africa_only_south=args.africa_only_south)


if __name__ == "__main__":
    main()
