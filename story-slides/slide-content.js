/**
 * Story Slide Content
 * All narrative text for the eBird data storytelling experience
 * 
 * BIRD OBSERVATION DATA:
 * - 3,142,058 total observations across 7 species
 * - 7,221 unique grid cells spanning -55.5° to 82.5° latitude
 * - Data from Dec 2022 to Dec 2024 (2 full years)
 * - 2,455+ scientific publications based on eBird data
 * - eBird receives ~100 million observations annually
 * - Over 1.5 billion cumulative observations in eBird
 * 
 * TEMPERATURE/WEATHER DATA:
 * - 11+ million temperature readings
 * - 725 days of daily measurements (2023-2024)
 * - 26,452 global grid cells
 * - Range from -82°C (Antarctic) to +45°C (tropical)
 * - Enables correlation of migration timing with climate patterns
 */

const STORY_SLIDES = {
  // ========================================
  // LANDING PAGE SLIDES
  // ========================================
  landing: [
    {
      id: 'opening-1',
      type: 'fullscreen',
      style: 'dark',
      content: {
        number: '3,142,058',
        subtext: 'moments of attention'
      },
      trigger: 'onclick',
      waitForClick: true,
      duration: 10000,
      autoAdvance: true
    },
    {
      id: 'opening-2', 
      type: 'fullscreen',
      style: 'dark',
      content: {
        text: 'Each one: a person, outside, <strong>looking up.</strong>'
      },
      trigger: 'after-previous',
      duration: 2200,
      autoAdvance: true,
      onComplete: 'fadeToContent'
    }
  ],

  // ========================================
  // GLOBE PAGE SLIDES
  // ========================================
  globe: [
    {
      id: 'globe-intro',
      type: 'fullscreen',
      style: 'dark',
      content: {
        text: 'Birds and weather, tracked together across <strong>26,000 locations.</strong>'
      },
      trigger: 'onload',
      duration: 2400,
      autoAdvance: true,
      onComplete: 'fadeToContent'
    }
  ],

  // ========================================
  // VISUALIZATION 1A PAGE SLIDES (Latitude vs Temperature)
  // ========================================
  'viz-1a': [
    {
      id: 'viz1a-intro',
      type: 'fullscreen',
      style: 'dark',
      content: {
        text: '<strong>11 million</strong> temperature readings. 725 days. Watch birds chase the warmth.'
      },
      trigger: 'onload',
      duration: 2800,
      autoAdvance: true,
      onComplete: 'fadeToContent'
    }
  ],

  // ========================================
  // VISUALIZATION 2A PAGE SLIDES (Migration Timing)
  // ========================================
  'viz-2a': [
    {
      id: 'viz2a-intro',
      type: 'fullscreen',
      style: 'dark',
      content: {
        text: 'Peak migration windows: when <strong>thousands</strong> of birds move in a single day.'
      },
      trigger: 'onload',
      duration: 2500,
      autoAdvance: true,
      onComplete: 'fadeToContent'
    }
  ],

  // ========================================
  // VISUALIZATION 2B PAGE SLIDES (Temp Correlation)
  // ========================================
  'viz-2b': [
    {
      id: 'viz2b-intro',
      type: 'fullscreen',
      style: 'dark',
      content: {
        text: 'Temperature rises. Birds follow. The <strong>correlation</strong> is unmistakable.'
      },
      trigger: 'onload',
      duration: 2500,
      autoAdvance: true,
      onComplete: 'fadeToContent'
    }
  ],

  // ========================================
  // VISUALIZATION 3 PAGE SLIDES
  // ========================================
  'viz-3': [
    {
      id: 'viz3-intro',
      type: 'fullscreen',
      style: 'dark',
      content: {
        text: 'From <strong>-82°C</strong> to <strong>+45°C</strong>. Migration mapped against a changing climate.'
      },
      trigger: 'onload',
      duration: 2500,
      autoAdvance: true,
      onComplete: 'fadeToContent'
    }
  ],

  // ========================================
  // CTA PAGE SLIDES
  // ========================================
  cta: [
    {
      id: 'cta-invite',
      type: 'fullscreen',
      style: 'dark',
      content: {
        text: 'Look to the <strong>skies.</strong>'
      },
      trigger: 'onload',
      duration: 2200,
      autoAdvance: true,
      onComplete: 'fadeToContent'
    }
  ]
};

// Species-specific narrative overlays for the globe
const SPECIES_STORIES = {
  barswa: {
    name: 'Barn Swallow',
    observations: '2,371,856',
    narrative: 'Follow the Barn Swallow. Someone watched it leave Argentina. Someone else watched it arrive in Alaska. <strong>7,000 miles apart.</strong>'
  },
  sancra: {
    name: 'Sandhill Crane',
    observations: '472,828', 
    narrative: '2.5 million years of migration memory. <strong>472,828</strong> human witnesses in just two years.'
  },
  westan: {
    name: 'Western Tanager',
    observations: '240,300',
    narrative: 'A flash of yellow from Yukon to Costa Rica. <strong>240,300</strong> moments of color captured.'
  },
  redkno: {
    name: 'Red Knot',
    observations: '55,952',
    narrative: '"Moonbird" B95 flew the distance to the moon in its lifetime. <strong>55,952</strong> observers tracked its kind.'
  },
  gresni: {
    name: 'Great Snipe',
    observations: '567',
    narrative: '4,200 miles nonstop at 60 mph. Only <strong>567</strong> recorded sightings—each one precious.'
  },
  spwduc: {
    name: 'Wood Duck',
    observations: '555',
    narrative: 'Nearly extinct a century ago. Now <strong>555</strong> observations celebrate their return.'
  }
};

// Export for use in slides.js
if (typeof window !== 'undefined') {
  window.STORY_SLIDES = STORY_SLIDES;
  window.SPECIES_STORIES = SPECIES_STORIES;
}

