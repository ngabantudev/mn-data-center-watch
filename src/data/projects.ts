// src/data/projects.ts
import type { LatLngTuple } from 'leaflet';

export interface Project {
  name: string;
  description: string;
  coordinates: LatLngTuple;
  url: string;
  // Your trusted fallback scores
  fallbacks: {
    performance: number;
    accessibility: number;
    bestPractices: number;
    seo: number;
  };
  businessImpact: string;
}

export const clientProjects: Project[] = [
  {
    name: "Hmong Village - Wameng Deli #15",
    description: "An Astro website built for a local Hmong vendor at Hmong Village.",
    coordinates: [44.9715, -93.0451],
    url: "https://wameng-deli.pages.dev",
    fallbacks: {
      performance: 90,
      accessibility: 86,
      bestPractices: 100,
      seo: 92
    },
    // Adding field data highlights alongside the live badges
    businessImpact: "🚀 <strong>0ms Input Lag (INP)</strong> & <strong>0.0 Layout Shift (CLS)</strong>"
  },
  {
    name: "Cha Yes",
    description: "An Astro website built for a local boba shop in the Frogtown Neighborhood.",
    coordinates: [44.9554, -93.1338],
    url: "https://cha-yes.pages.dev",
    fallbacks: {
      performance: 66,
      accessibility: 86,
      bestPractices: 100,
      seo: 92
    },
    // Adding field data highlights alongside the live badges
    businessImpact: "🚀 <strong>0ms Input Lag (INP)</strong> & <strong>0.0 Layout Shift (CLS)</strong>"
  }
];