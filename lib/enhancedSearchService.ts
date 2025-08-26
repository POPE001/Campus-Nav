import { Venue, OAU_VENUES, searchVenues as searchStaticVenues } from '@/constants/Venues';
import { placesService, CampusLocation } from './placesService';

export interface EnhancedSearchResult {
  staticResults: Venue[];
  placesResults: CampusLocation[];
  combinedResults: CampusLocation[];
  totalCount: number;
  searchTime: number;
  query: string;
}

class EnhancedSearchService {
  private cache: Map<string, EnhancedSearchResult> = new Map();
  private cacheTimeout = 5 * 60 * 1000; // 5 minutes

  /**
   * Perform enhanced search combining static venues and Places API
   */
  async searchCampusLocations(query: string, options?: {
    includeStatic?: boolean;
    includePlaces?: boolean;
    maxResults?: number;
    cacheResults?: boolean;
  }): Promise<EnhancedSearchResult> {
    const searchOptions = {
      includeStatic: true,
      includePlaces: true,
      maxResults: 20,
      cacheResults: true,
      ...options,
    };

    const cacheKey = `${query.toLowerCase()}_${JSON.stringify(searchOptions)}`;
    const startTime = Date.now();

    // Check cache first
    if (searchOptions.cacheResults && this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey)!;
      if (Date.now() - cached.searchTime < this.cacheTimeout) {
        console.log('🔍 ENHANCED SEARCH - Using cached results for:', query);
        return cached;
      }
    }

    console.log('🔍 ENHANCED SEARCH - Starting search for:', query);

    try {
      // Parallel search execution
      const searchPromises: Promise<any>[] = [];

      // Search static venues
      if (searchOptions.includeStatic) {
        searchPromises.push(this.searchStaticVenues(query));
      } else {
        searchPromises.push(Promise.resolve([]));
      }

      // Search Google Places
      if (searchOptions.includePlaces && query.length >= 3) { // Minimum query length for API
        searchPromises.push(placesService.searchLocations(query));
      } else {
        searchPromises.push(Promise.resolve([]));
      }

      const [staticResults, placesResults] = await Promise.all(searchPromises);

      // Combine and deduplicate results
      const combinedResults = this.combineAndDeduplicate(
        staticResults, 
        placesResults, 
        searchOptions.maxResults
      );

      const searchResult: EnhancedSearchResult = {
        staticResults,
        placesResults,
        combinedResults,
        totalCount: combinedResults.length,
        searchTime: Date.now() - startTime,
        query,
      };

      // Cache the result
      if (searchOptions.cacheResults) {
        this.cache.set(cacheKey, {
          ...searchResult,
          searchTime: Date.now(), // Cache timestamp
        });
      }

      console.log('🔍 ENHANCED SEARCH - Completed in', searchResult.searchTime, 'ms');
      console.log('🔍 ENHANCED SEARCH - Results:', {
        static: staticResults.length,
        places: placesResults.length,
        combined: combinedResults.length,
      });

      return searchResult;

    } catch (error) {
      console.error('🔍 ENHANCED SEARCH - Error:', error);
      
      // Fallback to static search only
      const staticResults = searchOptions.includeStatic ? this.searchStaticVenues(query) : [];
      
      return {
        staticResults,
        placesResults: [],
        combinedResults: staticResults.map(venue => ({ ...venue, source: 'static' as const })),
        totalCount: staticResults.length,
        searchTime: Date.now() - startTime,
        query,
      };
    }
  }

  /**
   * Search static venues with enhanced matching
   */
  private searchStaticVenues(query: string): Venue[] {
    const basicResults = searchStaticVenues(query);
    
    // Enhanced matching with fuzzy search and phonetic similarities
    if (basicResults.length === 0) {
      return this.fuzzySearchStaticVenues(query);
    }

    return basicResults;
  }

  /**
   * Fuzzy search for static venues (handles typos and partial matches)
   */
  private fuzzySearchStaticVenues(query: string): Venue[] {
    const lowerQuery = query.toLowerCase();
    const words = lowerQuery.split(' ').filter(word => word.length > 2);
    
    if (words.length === 0) return [];

    const scoredResults = OAU_VENUES.map(venue => {
      let score = 0;
      const searchableText = `${venue.name} ${venue.building} ${venue.description} ${venue.category} ${venue.faculty || ''} ${venue.keywords.join(' ')}`.toLowerCase();

      // Exact phrase match (highest score)
      if (searchableText.includes(lowerQuery)) {
        score += 100;
      }

      // Word matches
      words.forEach(word => {
        if (searchableText.includes(word)) {
          score += 10;
        }
        
        // Partial word matches
        const partialMatches = searchableText.split(' ').filter(text => 
          text.includes(word) || word.includes(text.substring(0, 3))
        );
        score += partialMatches.length * 3;
      });

      // Category/type matches
      if (venue.category.toLowerCase().includes(lowerQuery) || 
          venue.type.toLowerCase().includes(lowerQuery)) {
        score += 15;
      }

      return { venue, score };
    });

    return scoredResults
      .filter(result => result.score > 5) // Minimum threshold
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .map(result => result.venue);
  }

  /**
   * Combine static and Places API results, removing duplicates
   */
  private combineAndDeduplicate(
    staticResults: Venue[], 
    placesResults: CampusLocation[], 
    maxResults: number
  ): CampusLocation[] {
    const combined: CampusLocation[] = [];
    const seenNames = new Set<string>();
    const seenCoordinates = new Set<string>();

    // Add static results first (prioritize our curated data)
    staticResults.forEach(venue => {
      const normalizedName = venue.name.toLowerCase().trim();
      const coordKey = `${venue.coordinates.latitude.toFixed(4)},${venue.coordinates.longitude.toFixed(4)}`;
      
      if (!seenNames.has(normalizedName) && !seenCoordinates.has(coordKey)) {
        combined.push({
          ...venue,
          source: 'static',
        });
        seenNames.add(normalizedName);
        seenCoordinates.add(coordKey);
      }
    });

    // Add Places API results, checking for duplicates
    placesResults.forEach(place => {
      const normalizedName = place.name.toLowerCase().trim();
      const coordKey = `${place.coordinates.latitude.toFixed(4)},${place.coordinates.longitude.toFixed(4)}`;
      
      // Check if it's already in our static data
      const isDuplicate = seenNames.has(normalizedName) || 
                         seenCoordinates.has(coordKey) ||
                         this.isSimilarLocation(place, combined);
      
      if (!isDuplicate && combined.length < maxResults) {
        combined.push(place);
        seenNames.add(normalizedName);
        seenCoordinates.add(coordKey);
      }
    });

    return combined.slice(0, maxResults);
  }

  /**
   * Check if a Places API result is similar to existing results
   */
  private isSimilarLocation(place: CampusLocation, existing: CampusLocation[]): boolean {
    return existing.some(existingPlace => {
      // Name similarity check
      const nameSimilarity = this.calculateStringSimilarity(
        place.name.toLowerCase(),
        existingPlace.name.toLowerCase()
      );
      
      // Distance check (within 50 meters)
      const distance = this.calculateDistance(
        place.coordinates.latitude,
        place.coordinates.longitude,
        existingPlace.coordinates.latitude,
        existingPlace.coordinates.longitude
      );

      return nameSimilarity > 0.8 || distance < 0.05; // 50 meters
    });
  }

  /**
   * Calculate string similarity using Levenshtein distance
   */
  private calculateStringSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 1;

    const distance = this.levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Calculate distance between two coordinates in kilometers
   */
  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  /**
   * Get popular/recent search suggestions
   */
  getSearchSuggestions(query?: string): string[] {
    const baseSuggestions = [
      'Faculty of Science',
      'Faculty of Arts', 
      'Faculty of Engineering',
      'Library',
      'Health Centre',
      'Great Ife',
      'SUB',
      'Angola Hall',
      'Queens Hall',
      'Sports Complex',
      'Main Gate',
      'Cafeteria',
      'Post Office',
      'Bank',
    ];

    if (!query || query.length < 2) {
      return baseSuggestions.slice(0, 8);
    }

    const lowerQuery = query.toLowerCase();
    const filtered = baseSuggestions.filter(suggestion =>
      suggestion.toLowerCase().includes(lowerQuery)
    );

    return filtered.slice(0, 6);
  }

  /**
   * Clear search cache
   */
  clearCache(): void {
    this.cache.clear();
    console.log('🔍 ENHANCED SEARCH - Cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; entries: string[] } {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.keys()),
    };
  }
}

export const enhancedSearchService = new EnhancedSearchService();
export default enhancedSearchService;
