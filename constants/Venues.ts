export interface Venue {
  id: string;
  name: string;
  code?: string;
  type: 'academic' | 'administration' | 'facilities' | 'health' | 'sports' | 'accommodation' | 'services' | 'food' | 'religious' | 'landmarks';
  building: string;
  faculty?: string;
  category: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  description: string;
  keywords: string[];
}

// OAU Campus Venues Database - Extracted from actual map data
export const OAU_VENUES: Venue[] = [
  // Main Buildings & Facilities
  {
    id: 'great-ife',
    name: 'Great Ife',
    building: 'Great Ife',
    type: 'facilities',
    category: 'Facilities',
    coordinates: { latitude: 7.5165, longitude: 4.5275 },
    description: 'Main Auditorium',
    keywords: ['auditorium', 'hall', 'events', 'graduation'],
  },
  {
    id: 'library',
    name: 'Kenneth Dike Library',
    building: 'Kenneth Dike Library',
    type: 'academic',
    category: 'Academic',
    coordinates: { latitude: 7.5185, longitude: 4.5275 },
    description: 'University Library',
    keywords: ['library', 'books', 'study', 'research'],
  },
  {
    id: 'admin',
    name: 'Administrative Building',
    building: 'Administrative Building',
    type: 'administration',
    category: 'Administration',
    coordinates: { latitude: 7.5190, longitude: 4.5280 },
    description: 'University Administration',
    keywords: ['admin', 'office', 'registrar', 'vc office'],
  },
  {
    id: 'sub',
    name: 'Student Union Building',
    building: 'Student Union Building',
    type: 'facilities',
    category: 'Student Services',
    coordinates: { latitude: 7.5175, longitude: 4.5265 },
    description: 'SUB',
    keywords: ['sub', 'student union', 'activities'],
  },

  // Faculties
  {
    id: 'science',
    name: 'Faculty of Science',
    building: 'Faculty of Science',
    type: 'academic',
    category: 'Academic',
    faculty: 'Faculty of Science',
    coordinates: { latitude: 7.5195, longitude: 4.5295 },
    description: 'Science Complex',
    keywords: ['science', 'physics', 'chemistry', 'biology', 'mathematics'],
  },
  {
    id: 'arts',
    name: 'Faculty of Arts',
    building: 'Faculty of Arts',
    type: 'academic',
    category: 'Academic',
    faculty: 'Faculty of Arts',
    coordinates: { latitude: 7.5205, longitude: 4.5305 },
    description: 'Arts Complex',
    keywords: ['arts', 'literature', 'languages', 'philosophy', 'history'],
  },
  {
    id: 'engineering',
    name: 'Faculty of Engineering',
    building: 'Faculty of Engineering',
    type: 'academic',
    category: 'Academic',
    faculty: 'Faculty of Engineering and Technology',
    coordinates: { latitude: 7.5210, longitude: 4.5290 },
    description: 'Engineering Complex',
    keywords: ['engineering', 'technology', 'mechanical', 'electrical', 'civil'],
  },
  {
    id: 'law',
    name: 'Faculty of Law',
    building: 'Faculty of Law',
    type: 'academic',
    category: 'Academic',
    faculty: 'Faculty of Law',
    coordinates: { latitude: 7.5170, longitude: 4.5260 },
    description: 'Law Faculty',
    keywords: ['law', 'legal', 'jurisprudence'],
  },
  {
    id: 'education',
    name: 'Faculty of Education',
    building: 'Faculty of Education',
    type: 'academic',
    category: 'Academic',
    faculty: 'Faculty of Education',
    coordinates: { latitude: 7.5200, longitude: 4.5270 },
    description: 'Education Faculty',
    keywords: ['education', 'teaching', 'pedagogy'],
  },
  {
    id: 'social-sciences',
    name: 'Faculty of Social Sciences',
    building: 'Faculty of Social Sciences',
    type: 'academic',
    category: 'Academic',
    faculty: 'Faculty of Social Sciences',
    coordinates: { latitude: 7.5180, longitude: 4.5290 },
    description: 'Social Sciences',
    keywords: ['social sciences', 'psychology', 'sociology', 'economics'],
  },
  {
    id: 'agriculture',
    name: 'Faculty of Agriculture',
    building: 'Faculty of Agriculture',
    type: 'academic',
    category: 'Academic',
    faculty: 'Faculty of Agriculture',
    coordinates: { latitude: 7.5220, longitude: 4.5320 },
    description: 'Agriculture Faculty',
    keywords: ['agriculture', 'farming', 'crop science'],
  },
  {
    id: 'medicine',
    name: 'Faculty of Medicine',
    building: 'Faculty of Medicine',
    type: 'academic',
    category: 'Academic',
    faculty: 'Faculty of Medicine',
    coordinates: { latitude: 7.5160, longitude: 4.5270 },
    description: 'Medical School',
    keywords: ['medicine', 'medical', 'doctor', 'health'],
  },
  {
    id: 'pharmacy',
    name: 'Faculty of Pharmacy',
    building: 'Faculty of Pharmacy',
    type: 'academic',
    category: 'Academic',
    faculty: 'Faculty of Pharmacy',
    coordinates: { latitude: 7.5165, longitude: 4.5285 },
    description: 'Pharmacy School',
    keywords: ['pharmacy', 'drugs', 'pharmaceutical'],
  },
  {
    id: 'dentistry',
    name: 'Faculty of Dentistry',
    building: 'Faculty of Dentistry',
    type: 'academic',
    category: 'Academic',
    faculty: 'Faculty of Dentistry',
    coordinates: { latitude: 7.5170, longitude: 4.5290 },
    description: 'Dental School',
    keywords: ['dentistry', 'dental', 'teeth'],
  },

  // Services & Facilities
  {
    id: 'health',
    name: 'University Health Centre',
    building: 'University Health Centre',
    type: 'health',
    category: 'Health Services',
    coordinates: { latitude: 7.5155, longitude: 4.5285 },
    description: 'Medical Services',
    keywords: ['health centre', 'clinic', 'medical', 'doctor', 'hospital'],
  },
  {
    id: 'sports',
    name: 'Sports Complex',
    building: 'Sports Complex',
    type: 'sports',
    category: 'Sports',
    coordinates: { latitude: 7.5140, longitude: 4.5300 },
    description: 'Sports Facilities',
    keywords: ['sports', 'gym', 'football', 'basketball', 'athletics'],
  },
  {
    id: 'bookshop',
    name: 'University Bookshop',
    building: 'University Bookshop',
    type: 'services',
    category: 'Shopping',
    coordinates: { latitude: 7.5175, longitude: 4.5270 },
    description: 'Academic Bookstore',
    keywords: ['bookshop', 'books', 'stationery', 'supplies'],
  },
  {
    id: 'bank',
    name: 'Campus Bank',
    building: 'Campus Bank',
    type: 'services',
    category: 'Financial Services',
    coordinates: { latitude: 7.5180, longitude: 4.5275 },
    description: 'Banking Services',
    keywords: ['bank', 'atm', 'money', 'banking'],
  },
  {
    id: 'post-office',
    name: 'Post Office',
    building: 'Post Office',
    type: 'services',
    category: 'Services',
    coordinates: { latitude: 7.5185, longitude: 4.5280 },
    description: 'Postal Services',
    keywords: ['post office', 'mail', 'courier'],
  },
  {
    id: 'cafeteria',
    name: 'Main Cafeteria',
    building: 'Main Cafeteria',
    type: 'food',
    category: 'Food Services',
    coordinates: { latitude: 7.5175, longitude: 4.5285 },
    description: 'Dining Hall',
    keywords: ['cafeteria', 'food', 'dining', 'restaurant', 'meals'],
  },

  // Hostels & Accommodation
  {
    id: 'angola-hall',
    name: 'Angola Hall',
    building: 'Angola Hall',
    type: 'accommodation',
    category: 'Accommodation',
    coordinates: { latitude: 7.5120, longitude: 4.5250 },
    description: 'Student Hostel',
    keywords: ['angola hall', 'hostel', 'accommodation', 'residence'],
  },
  {
    id: 'mozambique-hall',
    name: 'Mozambique Hall',
    building: 'Mozambique Hall',
    type: 'accommodation',
    category: 'Accommodation',
    coordinates: { latitude: 7.5110, longitude: 4.5260 },
    description: 'Student Hostel',
    keywords: ['mozambique hall', 'hostel', 'accommodation'],
  },
  {
    id: 'queens-hall',
    name: 'Queen Elizabeth II Hall',
    building: 'Queen Elizabeth II Hall',
    type: 'accommodation',
    category: 'Accommodation',
    coordinates: { latitude: 7.5130, longitude: 4.5240 },
    description: 'Female Hostel',
    keywords: ['queens hall', 'female hostel', 'ladies'],
  },

  // Other Important Locations
  {
    id: 'main-gate',
    name: 'Main Gate',
    building: 'Main Gate',
    type: 'landmarks',
    category: 'Landmarks',
    coordinates: { latitude: 7.5200, longitude: 4.5250 },
    description: 'University Entrance',
    keywords: ['main gate', 'entrance', 'security'],
  },
  {
    id: 'senate-building',
    name: 'Senate Building',
    building: 'Senate Building',
    type: 'administration',
    category: 'Administration',
    coordinates: { latitude: 7.5185, longitude: 4.5285 },
    description: 'University Senate',
    keywords: ['senate', 'governance', 'council'],
  },
  {
    id: 'chapel',
    name: 'University Chapel',
    building: 'University Chapel',
    type: 'religious',
    category: 'Religious',
    coordinates: { latitude: 7.5190, longitude: 4.5270 },
    description: 'Religious Center',
    keywords: ['chapel', 'church', 'worship', 'prayer'],
  },
  {
    id: 'mosque',
    name: 'University Mosque',
    building: 'University Mosque',
    type: 'religious',
    category: 'Religious',
    coordinates: { latitude: 7.5195, longitude: 4.5275 },
    description: 'Islamic Center',
    keywords: ['mosque', 'islamic center', 'prayer'],
  },
];

// Search function to find venues by query
export const searchVenues = (query: string): Venue[] => {
  const lowerQuery = query.toLowerCase();
  return OAU_VENUES.filter(venue => 
    venue.name.toLowerCase().includes(lowerQuery) ||
    venue.building.toLowerCase().includes(lowerQuery) ||
    venue.description.toLowerCase().includes(lowerQuery) ||
    venue.category.toLowerCase().includes(lowerQuery) ||
    venue.faculty?.toLowerCase().includes(lowerQuery) ||
    venue.keywords.some(keyword => keyword.toLowerCase().includes(lowerQuery))
  );
};

// Get venue by ID
export const getVenueById = (id: string): Venue | undefined => {
  return OAU_VENUES.find(venue => venue.id === id);
};

// Get venues by type
export const getVenuesByType = (type: Venue['type']): Venue[] => {
  return OAU_VENUES.filter(venue => venue.type === type);
};

// Get venues by faculty
export const getVenuesByFaculty = (faculty: string): Venue[] => {
  return OAU_VENUES.filter(venue => venue.faculty?.toLowerCase() === faculty.toLowerCase());
};

// Calculate distance between two coordinates (simplified)
export const getDistanceToVenue = (venue: Venue, userLatitude: number, userLongitude: number): number => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (venue.coordinates.latitude - userLatitude) * Math.PI / 180;
  const dLon = (venue.coordinates.longitude - userLongitude) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(userLatitude * Math.PI / 180) * Math.cos(venue.coordinates.latitude * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c; // Distance in kilometers
  return Math.round(distance * 1000); // Return distance in meters
};

// Navigation utilities
export const generateMapNavigationUrl = (venue: Venue): string => {
  const { latitude, longitude } = venue.coordinates;
  
  // Create a deep link to the map with navigation to the venue
  // This will work with the map's navigation system
  return `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}&destination_place_id=${venue.id}`;
};

// Generate navigation URL for the campus map specifically
export const generateCampusMapNavigation = (venue: Venue): string => {
  // This creates a URL that can be used to trigger navigation in the campus map
  const { latitude, longitude } = venue.coordinates;
  return `campus-nav://navigate?lat=${latitude}&lng=${longitude}&name=${encodeURIComponent(venue.name)}&id=${venue.id}`;
};