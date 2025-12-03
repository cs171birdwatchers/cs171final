Data Dictionary: Weather and Bird Observation Datasets

## Weather Dataset ##

Overall Stats: 

      # of unique locations - 23,720
      # of rows - 110,851,182

Data Types: 

### date 
**Type** string (YYYY-MM-DD)
**Meaning** The date when the weather measurement was taken.
**Example** `2023-01-01`

### lat (latitude) 
**Type:** decimal number
**Meaning:** How far north or south the measurement location is.
**Range:** −90 to +90
**Example:** `-76.717`

### lon (longitude) 
- **Type:** decimal number
- **Meaning:** How far east or west the measurement location is.
- **Range:** −180 to +180
- **Example:** `163.75`

### temp_c 
- **Type:** decimal number
- **Meaning:** The air temperature at that location on that date, measured in degrees Celsius.
- **Example:** `-3.2`

-------------------------------------------------------------------

## Bird Observation Dataset

Overall Stats:

      # of bird species - 7
      # of sightings (total) - 7,283,553
      # of birds reported (total)  - 254,698,461

      Barn Swallow
        - 2,371,856 sightings 
        - 56,357,946 birds

      Sandhill Crane 
        - 472,828 sightings 
        - 34,669,264 birds

      Red Knot 
        - 55,952 sightings
        - 6,653,448 birds

      Western Tanager 
        - 240,300 sightings
        - 545,056 birds

      Wood Duck 
        - 555 sightings
        - 4,995 birds

      Great Snipe 
        - 567 sightings
        - 1,179 birds

      Canada Goose 
        - 4,141,495 sightings
        - 156,466,573 birds 

### metadata
- A section that holds summary information about the dataset for a specific bird species.

### metadata.speciesCode
**Type:** string
**Meaning:** A shorthand code identifying the bird species.
**Example:** `cangoo`

### metadata.records
**Type:** integer
**Meaning:** Total number of individual observations in the dataset.
**Example:** `128`

### metadata.monthly_counts
**Type:** dictionary
**Meaning:** Number of observations recorded per month.
**Example:**
```
{
  "1": 12,
  "2": 7,
  "3": 23
}
```

### observations
A list where each item describes one observation event.

### observations[i].date
**Type:** string (YYYY-MM-DD)
**Meaning:** The date the bird was observed.
**Example:** `2023-05-11`

### observations[i].lat
**Type:** decimal number
**Meaning:** Latitude of the observation location.
**Example:** `42.382`

### observations[i].lon
**Type:** decimal number
**Meaning:** Longitude of the observation location.
**Example:** `-71.126`

### observations[i].count (optional)
**Type:** integer
**Meaning:** Number of birds observed at that event.
**Example:** `3`

### observations[i].notes (optional)
**Type:** string
**Meaning:** Extra notes about the observation.
**Example:** `Feeding near shoreline.`
