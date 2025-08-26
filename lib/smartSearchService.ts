import { Venue } from '@/constants/Venues';
import { placesService, CampusLocation } from './placesService';

// Essential campus data - major locations that Google might miss
const ESSENTIAL_CAMPUS_LOCATIONS: Venue[] = [
  {
    id: 'oau-main',
    name: 'Obafemi Awolowo University',
    building: 'Main Campus',
    type: 'landmarks',
    category: 'Landmarks',
    coordinates: { latitude: 7.5181, longitude: 4.5284 },
    description: 'OAU Main Campus',
    keywords: ['oau', 'obafemi awolowo university', 'main campus', 'ile-ife'],
  },
  {
    id: 'student-union',
    name: 'Student Union Building',
    building: 'Student Union',
    type: 'facilities',
    category: 'Student Services',
    coordinates: { latitude: 7.5175, longitude: 4.5290 },
    description: 'Student Union Building and Activities',
    keywords: ['student union', 'union', 'students', 'activities'],
  },
  {
    id: 'health-centre',
    name: 'University Health Centre',
    building: 'Health Centre',
    type: 'health',
    category: 'Health Services',
    coordinates: { latitude: 7.5195, longitude: 4.5265 },
    description: 'Campus Medical Centre',
    keywords: ['health', 'medical', 'clinic', 'hospital', 'doctor'],
  },
  {
    id: 'sport-complex',
    name: 'Sports Complex',
    building: 'Sports Complex',
    type: 'sports',
    category: 'Sports',
    coordinates: { latitude: 7.5155, longitude: 4.5295 },
    description: 'University Sports and Recreation Complex',
    keywords: ['sports', 'gym', 'football', 'basketball', 'recreation'],
  },
  {
    id: 'amphitheatre',
    name: 'Amphitheatre',
    building: 'Amphitheatre',
    type: 'facilities',
    category: 'Facilities',
    coordinates: { latitude: 7.5170, longitude: 4.5285 },
    description: 'Outdoor Event Venue',
    keywords: ['amphitheatre', 'events', 'outdoor', 'gathering'],
  },
  {
    id: 'bookshop',
    name: 'University Bookshop',
    building: 'Bookshop',
    type: 'services',
    category: 'Student Services',
    coordinates: { latitude: 7.5180, longitude: 4.5270 },
    description: 'University Bookstore',
    keywords: ['bookshop', 'books', 'store', 'textbooks', 'stationery'],
  },
  {
    id: 'cafeteria',
    name: 'Main Cafeteria',
    building: 'Cafeteria',
    type: 'food',
    category: 'Food',
    coordinates: { latitude: 7.5188, longitude: 4.5278 },
    description: 'Student Cafeteria',
    keywords: ['cafeteria', 'food', 'dining', 'restaurant', 'meals'],
  },
  {
    id: 'post-office',
    name: 'Campus Post Office',
    building: 'Post Office',
    type: 'services',
    category: 'Student Services',
    coordinates: { latitude: 7.5185, longitude: 4.5272 },
    description: 'University Postal Services',
    keywords: ['post office', 'mail', 'postal', 'packages'],
  },
  {
    id: 'atm',
    name: 'ATM Point',
    building: 'Banking Hall',
    type: 'services',
    category: 'Student Services',
    coordinates: { latitude: 7.5190, longitude: 4.5275 },
    description: 'ATM and Banking Services',
    keywords: ['atm', 'bank', 'money', 'cash', 'banking'],
  },
  {
    id: 'pharmacy',
    name: 'Campus Pharmacy',
    building: 'Pharmacy',
    type: 'health',
    category: 'Health Services',
    coordinates: { latitude: 7.5192, longitude: 4.5268 },
    description: 'University Pharmacy',
    keywords: ['pharmacy', 'drugs', 'medicine', 'prescription'],
  },
  // Major Hostels/Halls
  {
    id: 'angola-hall',
    name: 'Angola Hall',
    building: 'Angola Hall',
    type: 'accommodation',
    category: 'Accommodation',
    coordinates: { latitude: 7.5120, longitude: 4.5250 },
    description: 'Student Hostel',
    keywords: ['angola hall', 'hostel', 'accommodation', 'residence', 'angola'],
  },
  {
    id: 'mozambique-hall',
    name: 'Mozambique Hall',
    building: 'Mozambique Hall',
    type: 'accommodation',
    category: 'Accommodation',
    coordinates: { latitude: 7.5115, longitude: 4.5245 },
    description: 'Student Hostel',
    keywords: ['mozambique hall', 'hostel', 'accommodation', 'residence', 'mozambique'],
  },
  {
    id: 'niger-hall',
    name: 'Niger Hall',
    building: 'Niger Hall',
    type: 'accommodation',
    category: 'Accommodation',
    coordinates: { latitude: 7.5125, longitude: 4.5255 },
    description: 'Student Hostel',
    keywords: ['niger hall', 'hostel', 'accommodation', 'residence', 'niger'],
  },
  {
    id: 'Ethiopia-hall',
    name: 'Ethiopia Hall',
    building: 'Ethiopia Hall',
    type: 'accommodation',
    category: 'Accommodation',
    coordinates: { latitude: 7.5130, longitude: 4.5240 },
    description: 'Student Hostel',
    keywords: ['ethiopia hall', 'hostel', 'accommodation', 'residence', 'ethiopia'],
  },
  // Major Academic Buildings
  {
    id: 'amphitheatre-complex',
    name: 'Amphitheatre Complex',
    building: 'Amphitheatre Complex',
    type: 'academic',
    category: 'Academic',
    coordinates: { latitude: 7.5170, longitude: 4.5280 },
    description: 'Large Lecture Complex',
    keywords: ['amphitheatre complex', 'lecture halls', 'classes', 'amp theatre'],
  },
  {
    id: 'fac-of-arts',
    name: 'Faculty of Arts',
    building: 'Faculty of Arts',
    type: 'academic',
    category: 'Academic',
    coordinates: { latitude: 7.5200, longitude: 4.5290 },
    description: 'Faculty of Arts Building',
    keywords: ['faculty of arts', 'arts', 'humanities', 'languages'],
  },
];

interface SmartSearchResult {
  results: CampusLocation[];
  totalCount: number;
  searchTime: number;
  query: string;
  source: 'places_api' | 'essential_only' | 'mixed';
}

class SmartSearchService {
  private cache: Map<string, SmartSearchResult> = new Map();
  private cacheTimeout = 10 * 60 * 1000; // 10 minutes

  /**
   * Simple open search - just like Google Maps, no restrictions!
   */
  async searchCampus(query: string, options?: {
    maxResults?: number;
  }): Promise<SmartSearchResult> {
    const maxResults = options?.maxResults || 25;
    const startTime = Date.now();

    // Simple cache check
    const cacheKey = query.toLowerCase();
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey)!;
      if (Date.now() - cached.searchTime < this.cacheTimeout) {
        return { ...cached, searchTime: Date.now() - startTime };
      }
    }

    console.log('🌍 OPEN SEARCH - Searching globally for:', query);

    try {
      // Just search Google Places - simple and open!
      const placesResults = await placesService.searchLocations(query);
      
      // Add a few campus locations if they match (no complex rules)
      const essentialMatches = this.searchEssentialLocations(query);
      
      // Combine results - campus first if they match, then everything else
      const allResults = [...essentialMatches, ...placesResults];
      
      // Remove duplicates and limit results
      const uniqueResults = this.removeDuplicates(allResults).slice(0, maxResults);

      const searchResult: SmartSearchResult = {
        results: uniqueResults,
        totalCount: uniqueResults.length,
        searchTime: Date.now() - startTime,
        query,
        source: essentialMatches.length > 0 && placesResults.length > 0 ? 'mixed' : 
                essentialMatches.length > 0 ? 'essential_only' : 'places_api',
      };

      // Cache it
      this.cache.set(cacheKey, searchResult);

      console.log('🌍 OPEN SEARCH - Found', uniqueResults.length, 'results');
      return searchResult;

    } catch (error) {
      console.error('🌍 OPEN SEARCH - Error:', error);
      
      // Fallback to campus locations only
      const essentialResults = this.searchEssentialLocations(query);
      return {
        results: essentialResults,
        totalCount: essentialResults.length,
        searchTime: Date.now() - startTime,
        query,
        source: 'essential_only',
      };
    }
  }

  /**
   * Simple duplicate removal
   */
  private removeDuplicates(results: CampusLocation[]): CampusLocation[] {
    const seen = new Set<string>();
    return results.filter(result => {
      const key = `${result.name.toLowerCase()}_${result.coordinates.latitude}_${result.coordinates.longitude}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  /**
   * Simple campus location search - no complex rules!
   */
  private searchEssentialLocations(query: string): CampusLocation[] {
    if (!query || query.length < 2) return [];
    
    const lowerQuery = query.toLowerCase();
    
    // Simple matching - if it contains the query, include it
    const matches = ESSENTIAL_CAMPUS_LOCATIONS
      .filter(location => {
        return location.name.toLowerCase().includes(lowerQuery) ||
               location.building.toLowerCase().includes(lowerQuery) ||
               location.description.toLowerCase().includes(lowerQuery) ||
               location.keywords.some(keyword => keyword.toLowerCase().includes(lowerQuery));
      })
      .map(location => ({
        ...location,
        source: 'static' as const,
      }));
    
    return matches;
  }
}

export const smartSearchService = new SmartSearchService();