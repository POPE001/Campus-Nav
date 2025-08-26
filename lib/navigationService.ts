import * as Location from 'expo-location';
import { CampusLocation } from './placesService';

// Navigation types
export type TravelMode = 'walking' | 'driving' | 'transit';
export type NavigationStatus = 'idle' | 'calculating' | 'navigating' | 'arrived' | 'off_route';

export interface RouteStep {
  instruction: string;
  distance: {
    text: string;
    value: number; // meters
  };
  duration: {
    text: string;
    value: number; // seconds
  };
  start_location: {
    lat: number;
    lng: number;
  };
  end_location: {
    lat: number;
    lng: number;
  };
  maneuver?: string; // turn-left, turn-right, straight, etc.
  polyline: {
    points: string;
  };
}

export interface NavigationRoute {
  legs: Array<{
    distance: {
      text: string;
      value: number;
    };
    duration: {
      text: string;
      value: number;
    };
    steps: RouteStep[];
    start_address: string;
    end_address: string;
    start_location: {
      lat: number;
      lng: number;
    };
    end_location: {
      lat: number;
      lng: number;
    };
  }>;
  overview_polyline: {
    points: string;
  };
  summary: string;
  warnings: string[];
}

export interface NavigationState {
  status: NavigationStatus;
  currentRoute: NavigationRoute | null;
  currentStep: RouteStep | null;
  stepIndex: number;
  userLocation: Location.LocationObject | null;
  destination: CampusLocation | null;
  distanceRemaining: number; // meters
  timeRemaining: number; // seconds
  travelMode: TravelMode;
  isOffRoute: boolean;
  routeProgress: number; // 0-1
}

interface NavigationEvents {
  onStatusChange: (status: NavigationStatus) => void;
  onRouteUpdate: (route: NavigationRoute) => void;
  onStepChange: (step: RouteStep, stepIndex: number) => void;
  onDistanceUpdate: (distance: number, time: number) => void;
  onArrival: () => void;
  onOffRoute: () => void;
}

type NavigationEventCallback = (state: NavigationState) => void;

class NavigationService {
  private apiKey: string;
  private navigationState: NavigationState;
  private locationSubscription: Location.LocationSubscription | null = null;
  private events: Partial<NavigationEvents> = {};
  private routeCheckInterval: NodeJS.Timeout | null = null;
  private stateCallbacks: Set<NavigationEventCallback> = new Set();

  constructor() {
    this.apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || 'AIzaSyBYI2ZiWhDcWPV1Bk1-flCIhBKrbVZbQ7w';
    this.navigationState = {
      status: 'idle',
      currentRoute: null,
      currentStep: null,
      stepIndex: 0,
      userLocation: null,
      destination: null,
      distanceRemaining: 0,
      timeRemaining: 0,
      travelMode: 'walking',
      isOffRoute: false,
      routeProgress: 0,
    };
  }

  /**
   * Start navigation to a destination
   */
  async startNavigation(
    destination: CampusLocation,
    travelMode: TravelMode = 'walking',
    events?: Partial<NavigationEvents>
  ): Promise<boolean> {
    try {
      console.log('🧭 NAVIGATION - Starting navigation to:', destination.name);
      
      // Store events
      this.events = events || {};
      
      // Update state
      this.navigationState = {
        ...this.navigationState,
        status: 'calculating',
        destination,
        travelMode,
        isOffRoute: false,
        routeProgress: 0,
      };
      
      this.emitStatusChange('calculating');

      // Get user location
      const userLocation = await this.getCurrentLocation();
      if (!userLocation) {
        throw new Error('Could not get user location');
      }

      this.navigationState.userLocation = userLocation;

      // Calculate route
      const route = await this.calculateRoute(
        {
          lat: userLocation.coords.latitude,
          lng: userLocation.coords.longitude,
        },
        {
          lat: destination.coordinates.latitude,
          lng: destination.coordinates.longitude,
        },
        travelMode
      );

      if (!route) {
        throw new Error('Could not calculate route');
      }

      // Start navigation
      this.navigationState.currentRoute = route;
      this.navigationState.currentStep = route.legs[0]?.steps[0] || null;
      this.navigationState.stepIndex = 0;
      this.navigationState.status = 'navigating';
      this.navigationState.distanceRemaining = route.legs[0]?.distance?.value || 0;
      this.navigationState.timeRemaining = route.legs[0]?.duration?.value || 0;

      console.log('🧭 NAVIGATION - Started with route:', {
        destination: destination.name,
        totalDistance: `${((route.legs[0]?.distance?.value || 0) / 1000).toFixed(2)} km`,
        totalTime: `${Math.round((route.legs[0]?.duration?.value || 0) / 60)} min`,
        totalSteps: route.legs[0]?.steps?.length || 0
      });

      // Emit events
      this.emitStatusChange('navigating');
      this.emitRouteUpdate(route);
      if (this.navigationState.currentStep) {
        this.emitStepChange(this.navigationState.currentStep, 0);
      }

      // Start real-time tracking
      await this.startLocationTracking();

      console.log('🧭 NAVIGATION - Navigation started successfully');
      return true;

    } catch (error) {
      console.error('🧭 NAVIGATION - Start navigation error:', error);
      this.navigationState.status = 'idle';
      this.emitStatusChange('idle');
      return false;
    }
  }

  /**
   * Calculate route using Google Directions API
   */
  private async calculateRoute(
    origin: { lat: number; lng: number },
    destination: { lat: number; lng: number },
    travelMode: TravelMode
  ): Promise<NavigationRoute | null> {
    try {
      const mode = travelMode === 'walking' ? 'walking' : travelMode === 'driving' ? 'driving' : 'transit';
      
      const url = `https://maps.googleapis.com/maps/api/directions/json?` +
        `origin=${origin.lat},${origin.lng}&` +
        `destination=${destination.lat},${destination.lng}&` +
        `mode=${mode}&` +
        `key=${this.apiKey}`;

      console.log('🧭 NAVIGATION - Calculating route for mode:', mode);

      const response = await fetch(url);
      const data = await response.json();

      if (data.status !== 'OK') {
        console.error('🧭 NAVIGATION - Directions API error:', data.status, data.error_message);
        return null;
      }

      if (!data.routes || data.routes.length === 0) {
        console.error('🧭 NAVIGATION - No routes found');
        return null;
      }

      const googleRoute = data.routes[0];
      
      // Parse Google Directions API response into our format
      const route: NavigationRoute = {
        legs: googleRoute.legs.map((leg: any) => ({
          distance: leg.distance,
          duration: leg.duration,
          steps: leg.steps.map((step: any) => ({
            instruction: step.html_instructions?.replace(/<[^>]*>/g, '') || step.maneuver || 'Continue straight',
            distance: step.distance,
            duration: step.duration,
            start_location: step.start_location,
            end_location: step.end_location,
            maneuver: step.maneuver,
            polyline: step.polyline
          })),
          start_address: leg.start_address,
          end_address: leg.end_address,
          start_location: leg.start_location,
          end_location: leg.end_location,
        })),
        overview_polyline: googleRoute.overview_polyline,
        summary: googleRoute.summary,
        warnings: googleRoute.warnings || []
      };

      console.log('🧭 NAVIGATION - Route calculated:', {
        distance: route.legs[0]?.distance?.text,
        duration: route.legs[0]?.duration?.text,
        steps: route.legs[0]?.steps?.length,
        firstStep: route.legs[0]?.steps?.[0]?.instruction
      });

      return route;

    } catch (error) {
      console.error('🧭 NAVIGATION - Calculate route error:', error);
      return null;
    }
  }

  /**
   * Start real-time location tracking
   */
  private async startLocationTracking(): Promise<void> {
    try {
      // Request location permissions
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Location permission denied');
      }

      // Start watching location
      this.locationSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 2000, // Update every 2 seconds
          distanceInterval: 5, // Update every 5 meters
        },
        (location) => {
          this.handleLocationUpdate(location);
        }
      );

      // Start route monitoring
      this.routeCheckInterval = setInterval(() => {
        this.checkRouteProgress();
      }, 5000); // Check every 5 seconds

      console.log('🧭 NAVIGATION - Location tracking started');

    } catch (error) {
      console.error('🧭 NAVIGATION - Location tracking error:', error);
    }
  }

  /**
   * Handle location updates during navigation
   */
  private handleLocationUpdate(location: Location.LocationObject): void {
    this.navigationState.userLocation = location;

    if (this.navigationState.status !== 'navigating' || !this.navigationState.currentRoute) {
      return;
    }

    // Calculate distance to destination
    const distanceToDestination = this.calculateDistance(
      location.coords.latitude,
      location.coords.longitude,
      this.navigationState.destination!.coordinates.latitude,
      this.navigationState.destination!.coordinates.longitude
    );

    // Check if arrived (within 20 meters)
    if (distanceToDestination < 20) {
      this.handleArrival();
      return;
    }

    // Update remaining distance and time
    this.updateNavigationProgress(location);

    // Check if user is on route
    this.checkIfOnRoute(location);

    console.log('🧭 NAVIGATION - Location update:', {
      distance: `${distanceToDestination.toFixed(0)}m`,
      step: this.navigationState.stepIndex + 1,
      progress: `${(this.navigationState.routeProgress * 100).toFixed(1)}%`,
    });
  }

  /**
   * Update navigation progress and remaining distance/time
   */
  private updateNavigationProgress(location: Location.LocationObject): void {
    if (!this.navigationState.currentRoute || !this.navigationState.currentStep) {
      return;
    }

    const currentStep = this.navigationState.currentStep;
    
    // Calculate distance to current step end
    const distanceToStepEnd = this.calculateDistance(
      location.coords.latitude,
      location.coords.longitude,
      currentStep.end_location.lat,
      currentStep.end_location.lng
    );

    // If close to step end (within 30 meters), move to next step
    if (distanceToStepEnd < 30) {
      this.advanceToNextStep();
      return; // Exit early since step advancement will trigger its own update
    }

    // Calculate ROUTE-BASED remaining distance using Google's step data
    const route = this.navigationState.currentRoute;
    const steps = route.legs[0]?.steps || [];
    const currentStepIndex = this.navigationState.stepIndex;
    
    // Calculate remaining distance by summing up remaining steps
    let remainingDistance = 0;
    
    // Add remaining distance of current step 
    const stepFromArray = steps[currentStepIndex];
    if (stepFromArray && stepFromArray.distance?.value) {
      // Use the actual step distance (more accurate than crow-flies calculation)
      remainingDistance += stepFromArray.distance.value; // Just use the full step distance for now
    }
    
    // Add distance of all subsequent steps
    for (let i = currentStepIndex + 1; i < steps.length; i++) {
      remainingDistance += steps[i].distance?.value || 0;
    }

    // Calculate progress based on original route distance
    const totalDistance = route.legs[0]?.distance?.value || 0;
    const routeProgress = totalDistance > 0 ? Math.max(0, Math.min(1, 1 - (remainingDistance / totalDistance))) : 0;

    // Calculate remaining time based on route progress and original duration
    const originalTime = route.legs[0]?.duration?.value || 0;
    const remainingTime = Math.round(originalTime * (1 - routeProgress));

    // Update state with ACCURATE route-based calculations
    this.navigationState.distanceRemaining = remainingDistance;
    this.navigationState.timeRemaining = remainingTime;
    this.navigationState.routeProgress = routeProgress;

    console.log('🧭 NAVIGATION - Progress update:', {
      currentStep: currentStepIndex + 1,
      totalSteps: steps.length,
      originalDistance: `${((totalDistance || 0) / 1000).toFixed(2)} km`,
      remainingDistance: `${(remainingDistance / 1000).toFixed(2)} km`,
      remainingTime: `${Math.round(remainingTime / 60)} min`,
      routeProgress: `${(routeProgress * 100).toFixed(1)}%`,
      stepDistances: steps.map(s => `${((s.distance?.value || 0) / 1000).toFixed(2)}km`).join(', ')
    });

    // Emit distance update
    this.emitDistanceUpdate(this.navigationState.distanceRemaining, this.navigationState.timeRemaining);
  }

  /**
   * Advance to the next step in navigation
   */
  private advanceToNextStep(): void {
    if (!this.navigationState.currentRoute) return;

    const steps = this.navigationState.currentRoute.legs[0]?.steps || [];
    const nextIndex = this.navigationState.stepIndex + 1;

    if (nextIndex < steps.length) {
      this.navigationState.stepIndex = nextIndex;
      this.navigationState.currentStep = steps[nextIndex];
      
      console.log('🧭 NAVIGATION - Advanced to step', nextIndex + 1, ':', this.navigationState.currentStep.instruction);
      
      this.emitStepChange(this.navigationState.currentStep, nextIndex);
    }
  }

  /**
   * Check if user is still on the calculated route
   */
  private checkIfOnRoute(location: Location.LocationObject): void {
    if (!this.navigationState.currentRoute || !this.navigationState.currentStep) return;

    // Calculate distance from user to current step path
    // Simplified: check if user is within reasonable distance of step start/end
    const distanceToStepStart = this.calculateDistance(
      location.coords.latitude,
      location.coords.longitude,
      this.navigationState.currentStep.start_location.lat,
      this.navigationState.currentStep.start_location.lng
    );

    const distanceToStepEnd = this.calculateDistance(
      location.coords.latitude,
      location.coords.longitude,
      this.navigationState.currentStep.end_location.lat,
      this.navigationState.currentStep.end_location.lng
    );

    // If user is more than 100 meters from both step start and end, consider off-route
    const isOffRoute = distanceToStepStart > 100 && distanceToStepEnd > 100;

    if (isOffRoute && !this.navigationState.isOffRoute) {
      this.navigationState.isOffRoute = true;
      console.log('🧭 NAVIGATION - User is off route, recalculating...');
      this.emitOffRoute();
      this.recalculateRoute();
    } else if (!isOffRoute && this.navigationState.isOffRoute) {
      this.navigationState.isOffRoute = false;
      console.log('🧭 NAVIGATION - User is back on route');
    }
  }

  /**
   * Recalculate route when user goes off-route
   */
  private async recalculateRoute(): Promise<void> {
    if (!this.navigationState.userLocation || !this.navigationState.destination) return;

    try {
      console.log('🧭 NAVIGATION - Recalculating route...');

      const newRoute = await this.calculateRoute(
        {
          lat: this.navigationState.userLocation.coords.latitude,
          lng: this.navigationState.userLocation.coords.longitude,
        },
        {
          lat: this.navigationState.destination.coordinates.latitude,
          lng: this.navigationState.destination.coordinates.longitude,
        },
        this.navigationState.travelMode
      );

      if (newRoute) {
        this.navigationState.currentRoute = newRoute;
        this.navigationState.currentStep = newRoute.legs[0]?.steps[0] || null;
        this.navigationState.stepIndex = 0;
        this.navigationState.isOffRoute = false;

        this.emitRouteUpdate(newRoute);
        if (this.navigationState.currentStep) {
          this.emitStepChange(this.navigationState.currentStep, 0);
        }

        console.log('🧭 NAVIGATION - Route recalculated successfully');
      }
    } catch (error) {
      console.error('🧭 NAVIGATION - Recalculate route error:', error);
    }
  }

  /**
   * Handle arrival at destination
   */
  private handleArrival(): void {
    console.log('🧭 NAVIGATION - Arrived at destination!');
    
    this.navigationState.status = 'arrived';
    this.navigationState.distanceRemaining = 0;
    this.navigationState.timeRemaining = 0;
    this.navigationState.routeProgress = 1;

    this.emitStatusChange('arrived');
    this.emitArrival();
    
    // Stop navigation
    this.stopNavigation();
  }

  /**
   * Stop navigation and cleanup
   */
  stopNavigation(): void {
    console.log('🧭 NAVIGATION - Stopping navigation');

    // Stop location tracking
    if (this.locationSubscription) {
      this.locationSubscription.remove();
      this.locationSubscription = null;
    }

    // Stop route checking
    if (this.routeCheckInterval) {
      clearInterval(this.routeCheckInterval);
      this.routeCheckInterval = null;
    }

    // Reset state
    this.navigationState = {
      ...this.navigationState,
      status: 'idle',
      currentRoute: null,
      currentStep: null,
      stepIndex: 0,
      distanceRemaining: 0,
      timeRemaining: 0,
      isOffRoute: false,
      routeProgress: 0,
    };

    this.emitStatusChange('idle');
  }

  /**
   * Get current user location
   */
  private async getCurrentLocation(): Promise<Location.LocationObject | null> {
    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        timeout: 10000,
      });
      return location;
    } catch (error) {
      console.error('🧭 NAVIGATION - Get current location error:', error);
      return null;
    }
  }

  /**
   * Calculate distance between two coordinates in meters
   */
  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371000; // Earth's radius in meters
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
   * Check route progress periodically
   */
  private checkRouteProgress(): void {
    if (this.navigationState.status === 'navigating' && this.navigationState.userLocation) {
      this.updateNavigationProgress(this.navigationState.userLocation);
    }
  }

  // Event emitters
  private emitStatusChange(status: NavigationStatus): void {
    this.events.onStatusChange?.(status);
    this.notifyStateCallbacks();
  }

  private emitRouteUpdate(route: NavigationRoute): void {
    this.events.onRouteUpdate?.(route);
    this.notifyStateCallbacks();
  }

  private emitStepChange(step: RouteStep, stepIndex: number): void {
    this.events.onStepChange?.(step, stepIndex);
    this.notifyStateCallbacks();
  }

  private emitDistanceUpdate(distance: number, time: number): void {
    this.events.onDistanceUpdate?.(distance, time);
    this.notifyStateCallbacks();
  }

  private emitArrival(): void {
    this.events.onArrival?.();
    this.notifyStateCallbacks();
  }

  private emitOffRoute(): void {
    this.events.onOffRoute?.();
    this.notifyStateCallbacks();
  }

  private notifyStateCallbacks(): void {
    const state = this.getNavigationState();
    this.stateCallbacks.forEach(callback => {
      try {
        callback(state);
      } catch (error) {
        console.error('🧭 NAVIGATION - Error in state callback:', error);
      }
    });
  }

  // Public getters
  getNavigationState(): NavigationState {
    return { ...this.navigationState };
  }

  isNavigating(): boolean {
    return this.navigationState.status === 'navigating';
  }

  getCurrentStep(): RouteStep | null {
    return this.navigationState.currentStep;
  }

  getDistanceRemaining(): number {
    return this.navigationState.distanceRemaining;
  }

  getTimeRemaining(): number {
    return this.navigationState.timeRemaining;
  }

  getRouteProgress(): number {
    return this.navigationState.routeProgress;
  }

  // Event subscription methods
  subscribeToState(callback: NavigationEventCallback): () => void {
    this.stateCallbacks.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.stateCallbacks.delete(callback);
    };
  }

  // Force stop navigation (useful for UI components)
  forceStopNavigation(): void {
    console.log('🧭 NAVIGATION - Force stopping navigation');
    this.stopNavigation();
  }
}

export const navigationService = new NavigationService();
export default navigationService;
