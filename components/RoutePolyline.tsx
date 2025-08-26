import React from 'react';
import { Polyline } from 'react-native-maps';
import { NavigationRoute } from '@/lib/navigationService';

interface RoutePolylineProps {
  route: NavigationRoute | null;
  color?: string;
  width?: number;
}

// Simple polyline decoding function
const decodePolyline = (encoded: string): Array<{ latitude: number; longitude: number }> => {
  const coords: Array<{ latitude: number; longitude: number }> = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let byte = 0;
    let shift = 0;
    let result = 0;

    // Decode latitude
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const deltaLat = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lat += deltaLat;

    shift = 0;
    result = 0;

    // Decode longitude
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const deltaLng = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lng += deltaLng;

    coords.push({
      latitude: lat / 1e5,
      longitude: lng / 1e5,
    });
  }

  return coords;
};

const RoutePolyline: React.FC<RoutePolylineProps> = ({
  route,
  color = '#007AFF',
  width = 5,
}) => {
  if (!route || !route.overview_polyline?.points) {
    return null;
  }

  try {
    const coordinates = decodePolyline(route.overview_polyline.points);
    
    if (coordinates.length < 2) {
      console.warn('🗺️ ROUTE - Not enough coordinates for polyline');
      return null;
    }

    console.log('🗺️ ROUTE - Rendering polyline with', coordinates.length, 'points');

    return (
      <Polyline
        coordinates={coordinates}
        strokeColor={color}
        strokeWidth={width}
        strokePattern={[1]} // Solid line
        lineCap="round"
        lineJoin="round"
      />
    );
  } catch (error) {
    console.error('🗺️ ROUTE - Error decoding polyline:', error);
    return null;
  }
};

export default RoutePolyline;
