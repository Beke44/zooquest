import type { WorldZoo } from '@/types'

// Global roadmap. Budapest is the live pilot; the others are open
// "park packs" waiting for data (community + zoo partners).
export const WORLD_ZOOS: WorldZoo[] = [
  { id: 'budapest', name: 'Fővárosi Állat- és Növénykert', city: 'Budapest', country: 'HU', flag: '🇭🇺', lat: 47.5185, lon: 19.0789, status: 'live' },
  { id: 'nyiregyhaza', name: 'Nyíregyházi Állatpark', city: 'Nyíregyháza', country: 'HU', flag: '🇭🇺', lat: 47.9925, lon: 21.7275, status: 'soon' },
  { id: 'szeged', name: 'Szegedi Vadaspark', city: 'Szeged', country: 'HU', flag: '🇭🇺', lat: 46.2386, lon: 20.0985, status: 'soon' },
  { id: 'vienna', name: 'Tiergarten Schönbrunn', city: 'Wien', country: 'AT', flag: '🇦🇹', lat: 48.1823, lon: 16.3029, status: 'soon' },
  { id: 'berlin', name: 'Zoologischer Garten Berlin', city: 'Berlin', country: 'DE', flag: '🇩🇪', lat: 52.5079, lon: 13.3378, status: 'soon' },
  { id: 'leipzig', name: 'Zoo Leipzig', city: 'Leipzig', country: 'DE', flag: '🇩🇪', lat: 51.3489, lon: 12.3709, status: 'soon' },
  { id: 'prague', name: 'Zoo Praha', city: 'Praha', country: 'CZ', flag: '🇨🇿', lat: 50.1167, lon: 14.4063, status: 'soon' },
  { id: 'london', name: 'ZSL London Zoo', city: 'London', country: 'GB', flag: '🇬🇧', lat: 51.5353, lon: -0.1534, status: 'soon' },
  { id: 'beauval', name: 'ZooParc de Beauval', city: 'Saint-Aignan', country: 'FR', flag: '🇫🇷', lat: 47.2466, lon: 1.3530, status: 'soon' },
  { id: 'madrid', name: 'Zoo Aquarium de Madrid', city: 'Madrid', country: 'ES', flag: '🇪🇸', lat: 40.4093, lon: -3.7616, status: 'soon' },
  { id: 'barcelona', name: 'Zoo de Barcelona', city: 'Barcelona', country: 'ES', flag: '🇪🇸', lat: 41.3876, lon: 2.1883, status: 'soon' },
  { id: 'sandiego', name: 'San Diego Zoo', city: 'San Diego', country: 'US', flag: '🇺🇸', lat: 32.7353, lon: -117.1490, status: 'soon' },
  { id: 'bronx', name: 'Bronx Zoo', city: 'New York', country: 'US', flag: '🇺🇸', lat: 40.8506, lon: -73.8770, status: 'soon' },
  { id: 'singapore', name: 'Singapore Zoo', city: 'Singapore', country: 'SG', flag: '🇸🇬', lat: 1.4043, lon: 103.7930, status: 'soon' },
  { id: 'taronga', name: 'Taronga Zoo', city: 'Sydney', country: 'AU', flag: '🇦🇺', lat: -33.8431, lon: 151.2411, status: 'soon' },
  { id: 'ueno', name: 'Ueno Zoo', city: 'Tokyo', country: 'JP', flag: '🇯🇵', lat: 35.7166, lon: 139.7714, status: 'soon' },
]
