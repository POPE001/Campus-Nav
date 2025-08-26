import { Venue } from '@/constants/Venues';

// OAU Campus boundaries (approximate)
const OAU_CAMPUS_BOUNDS = {
  center: { lat: 7.5181, lng: 4.5284 },
  // Radius in meters - covers main campus area
  radius: 2000,
  // Bounding box for more precise search
  northeast: { lat: 7.5300, lng: 4.5400 },
  southwest: { lat: 7.5060, lng: 4.5160 },
};

export interface GooglePlacesResult {
  place_id: string;
  name: string;
  formatted_address: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  types: string[];
  business_status?: string;
  rating?: number;
  price_level?: number;
  photos?: Array<{
    photo_reference: string;
    height: number;
    width: number;
  }>;
}

export interface CampusLocation extends Venue {
  source: 'static' | 'places_api';
  place_id?: string;
  rating?: number;
  business_status?: string;
  address?: string;
}

class PlacesService {
  private apiKey: string;
  private baseUrl = 'https://maps.googleapis.com/maps/api/place';

  constructor() {
    this.apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || 'AIzaSyBYI2ZiWhDcWPV1Bk1-flCIhBKrbVZbQ7w';
  }

  /**
   * Search for places using Google Places Text Search API (generic search with OAU bias)
   */
  async searchLocations(query: string, centerLocation?: { lat: number, lng: number }): Promise<CampusLocation[]> {
    try {
      console.log('🔍 PLACES API - Searching for:', query);
      
      // Use provided location or default to OAU
      const searchCenter = centerLocation || OAU_CAMPUS_BOUNDS.center;
      
      // Open search with location bias (like Google Maps)
      const searchUrl = `${this.baseUrl}/textsearch/json?` + 
        `query=${encodeURIComponent(query)}&` +
        `location=${searchCenter.lat},${searchCenter.lng}&` +
        `radius=50000&` + // 50km radius - very broad but still works
        `key=${this.apiKey}`;

      const response = await fetch(searchUrl);
      
      if (!response.ok) {
        console.error('🔍 PLACES API - HTTP Error:', response.status, response.statusText);
        return [];
      }

      const data = await response.json();
      
      if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
        console.error('🔍 PLACES API - API Error:', data.status, data.error_message);
        if (data.status === 'REQUEST_DENIED') {
          console.error('🔍 PLACES API - Check your API key and billing');
        }
        return [];
      }

      const results = data.results || [];
      console.log('🔍 PLACES API - Found', results.length, 'results for query:', query);
      
      // Log a few result names for debugging
      if (results.length > 0) {
        console.log('🔍 PLACES API - Sample results:', results.slice(0, 3).map(r => r.name));
      } else {
        console.log('🔍 PLACES API - No results found for:', query);
        console.log('🔍 PLACES API - API response status:', data.status);
      }
      
      return this.convertPlacesToVenues(results);
    } catch (error) {
      console.error('🔍 PLACES API - Search error:', error);
      return [];
    }
  }

  /**
   * Search for places by category/type near a location
   */
  async searchByCategory(category: string, centerLocation?: { lat: number, lng: number }): Promise<CampusLocation[]> {
    try {
      const searchCenter = centerLocation || OAU_CAMPUS_BOUNDS.center;
      
      const nearbyUrl = `${this.baseUrl}/nearbysearch/json?` +
        `location=${searchCenter.lat},${searchCenter.lng}&` +
        `radius=50000&` + // 50km radius - broad search
        `type=${encodeURIComponent(category)}&` +
        `key=${this.apiKey}`;

      console.log('🔍 PLACES API - Searching category:', category);
      
      const response = await fetch(nearbyUrl);
      if (!response.ok) return [];
      
      const data = await response.json();
      if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') return [];
      
      console.log('🔍 PLACES API - Category search found', data.results?.length || 0, 'results');
      return this.convertPlacesToVenues(data.results || []);
      
    } catch (error) {
      console.error('🔍 PLACES API - Category search error:', error);
      return [];
    }
  }

  /**
   * Search for nearby places using Google Places Nearby Search API
   */
  async searchNearbyLocations(query?: string, types?: string[], centerLocation?: { lat: number, lng: number }): Promise<CampusLocation[]> {
    try {
      const searchCenter = centerLocation || OAU_CAMPUS_BOUNDS.center;
      console.log('🏛️ PLACES API - Searching nearby with query:', query, 'types:', types);

      let searchUrl = `${this.baseUrl}/nearbysearch/json?` +
        `location=${searchCenter.lat},${searchCenter.lng}&` +
        `radius=50000&` + // 50km radius - very broad search
        `key=${this.apiKey}`;

      // Add specific types if provided (e.g., 'university', 'school', 'hospital')
      if (types && types.length > 0) {
        searchUrl += `&type=${types[0]}`;
      }

      // Add keyword search if query provided
      if (query) {
        searchUrl += `&keyword=${encodeURIComponent(query)}`;
      }

      const response = await fetch(searchUrl);
      
      if (!response.ok) {
        console.error('🏛️ PLACES API - HTTP Error:', response.status, response.statusText);
        return [];
      }

      const data = await response.json();
      
      if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
        console.error('🏛️ PLACES API - API Error:', data.status, data.error_message);
        return [];
      }

      console.log('🏛️ PLACES API - Found', data.results?.length || 0, 'nearby results');
      
      return this.convertPlacesToVenues(data.results || []);
    } catch (error) {
      console.error('🏛️ PLACES API - Nearby search error:', error);
      return [];
    }
  }

  /**
   * Get place details including photos, reviews, etc.
   */
  async getPlaceDetails(placeId: string): Promise<GooglePlacesResult | null> {
    try {
      const detailsUrl = `${this.baseUrl}/details/json?` +
        `place_id=${placeId}&` +
        `fields=name,formatted_address,geometry,types,business_status,rating,price_level,photos,opening_hours&` +
        `key=${this.apiKey}`;

      const response = await fetch(detailsUrl);
      const data = await response.json();

      if (data.status === 'OK') {
        return data.result;
      }

      console.error('🔍 PLACES API - Details error:', data.status);
      return null;
    } catch (error) {
      console.error('🔍 PLACES API - Get details error:', error);
      return null;
    }
  }

  /**
   * Convert Google Places results to our Venue format
   */
  private convertPlacesToVenues(places: GooglePlacesResult[]): CampusLocation[] {
    return places
      .map((place, index) => {
        const venue: CampusLocation = {
          id: `places_${place.place_id}`,
          name: place.name,
          building: place.name,
          type: this.mapPlaceTypeToVenueType(place.types),
          category: this.mapPlaceTypeToCategory(place.types),
          coordinates: {
            latitude: place.geometry.location.lat,
            longitude: place.geometry.location.lng,
          },
          description: this.generateDescription(place),
          keywords: this.generateKeywords(place),
          source: 'places_api',
          place_id: place.place_id,
          rating: place.rating,
          business_status: place.business_status,
          address: place.formatted_address,
        };
        return venue;
      });
  }

  // Removed campus bounds restriction - now truly open like Google Maps!

  /**
   * Map Google Places types to our venue types
   */
  private mapPlaceTypeToVenueType(types: string[]): 
    'academic' | 'administration' | 'facilities' | 'health' | 'sports' | 'accommodation' | 'services' | 'food' | 'religious' | 'landmarks' | 'transportation' {
    
    // Priority mapping based on most relevant type
    if (types.includes('university') || types.includes('school') || types.includes('library')) {
      return 'academic';
    }
    if (types.includes('hospital') || types.includes('doctor') || types.includes('health')) {
      return 'health';
    }
    if (types.includes('gym') || types.includes('stadium')) {
      return 'sports';
    }
    if (types.includes('restaurant') || types.includes('food') || types.includes('meal_takeaway')) {
      return 'food';
    }
    if (types.includes('lodging') || types.includes('student_housing')) {
      return 'accommodation';
    }
    if (types.includes('place_of_worship') || types.includes('church') || types.includes('mosque')) {
      return 'religious';
    }
    if (types.includes('bank') || types.includes('atm') || types.includes('post_office')) {
      return 'services';
    }
    if (types.includes('local_government_office') || types.includes('courthouse')) {
      return 'administration';
    }
    if (types.includes('tourist_attraction') || types.includes('point_of_interest')) {
      return 'landmarks';
    }
    if (types.includes('bus_station') || types.includes('transit_station') || types.includes('parking')) {
      return 'transportation';
    }
    
    // Default to facilities
    return 'facilities';
  }

  /**
   * Map Google Places types to our categories
   */
  private mapPlaceTypeToCategory(types: string[]): string {
    const typeMap: { [key: string]: string } = {
      university: 'Academic',
      school: 'Academic',
      library: 'Academic',
      hospital: 'Health Services',
      doctor: 'Health Services',
      health: 'Health Services',
      gym: 'Sports',
      stadium: 'Sports',
      restaurant: 'Food Services',
      food: 'Food Services',
      meal_takeaway: 'Food Services',
      lodging: 'Accommodation',
      student_housing: 'Accommodation',
      place_of_worship: 'Religious',
      church: 'Religious',
      mosque: 'Religious',
      bank: 'Financial Services',
      atm: 'Financial Services',
      post_office: 'Services',
      local_government_office: 'Administration',
      courthouse: 'Administration',
      tourist_attraction: 'Landmarks',
      point_of_interest: 'Landmarks',
      bus_station: 'Transportation',
      transit_station: 'Transportation',
      parking: 'Transportation',
    };

    for (const type of types) {
      if (typeMap[type]) {
        return typeMap[type];
      }
    }

    return 'Facilities';
  }

  /**
   * Generate description from place data
   */
  private generateDescription(place: GooglePlacesResult): string {
    const parts = [];
    
    if (place.rating) {
      parts.push(`⭐ ${place.rating.toFixed(1)}`);
    }
    
    if (place.business_status === 'OPERATIONAL') {
      parts.push('Open');
    } else if (place.business_status === 'CLOSED_PERMANENTLY') {
      parts.push('Permanently Closed');
    }

    if (place.types.includes('university') || place.types.includes('school')) {
      parts.push('Educational Institution');
    }

    return parts.length > 0 ? parts.join(' • ') : 'Campus Location';
  }

  /**
   * Generate search keywords from place data
   */
  private generateKeywords(place: GooglePlacesResult): string[] {
    const keywords = [
      place.name.toLowerCase(),
      ...place.types,
    ];

    // Add common variations
    if (place.name.toLowerCase().includes('faculty')) {
      keywords.push('faculty', 'department', 'school');
    }
    if (place.name.toLowerCase().includes('hall')) {
      keywords.push('hall', 'hostel', 'residence');
    }
    if (place.name.toLowerCase().includes('library')) {
      keywords.push('library', 'books', 'study');
    }

    return [...new Set(keywords)]; // Remove duplicates
  }

  /**
   * Get campus-specific place types for nearby search
   */
  getCampusPlaceTypes(): string[] {
    return [
      'university',
      'school', 
      'library',
      'hospital',
      'doctor',
      'gym',
      'restaurant',
      'lodging',
      'place_of_worship',
      'bank',
      'atm',
      'post_office',
      'local_government_office',
      'tourist_attraction',
    ];
  }
}

export const placesService = new PlacesService();
export default placesService;
