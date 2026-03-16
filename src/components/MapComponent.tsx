'use client'

import { useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix for default marker icons in React-Leaflet
const createIcon = (color: string = 'blue', numbers?: number[]) => {
  if (numbers && numbers.length > 0) {
    const displayNumber = numbers.length === 1 
      ? `${numbers[0]}` 
      : numbers.length <= 3 
        ? numbers.join(',') 
        : `${numbers[0]}+${numbers.length-1}`
    
    const html = `<div style="background: ${color}; width: ${numbers.length > 1 ? 36 : 30}px; height: 30px; border-radius: 15px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: ${numbers.length > 1 ? 11 : 14}px; border: 2px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);">${displayNumber}</div>`

    return L.divIcon({
      html,
      className: 'custom-marker',
      iconSize: [numbers.length > 1 ? 36 : 30, 30],
      iconAnchor: [numbers.length > 1 ? 18 : 15, 15],
      popupAnchor: [0, -20],
    })
  }

  return L.divIcon({
    html: `<img src="https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png" style="margin-left: -12px; margin-top: -41px;" />`,
    className: '',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
  })
}

const defaultIcon = createIcon()

export interface Location {
  id: number
  name: string
  lat: number
  lng: number
  description: string
  country?: string
}

interface MapComponentProps {
  locations: Location[]
  routeLocationIds?: number[]  // Ordered list of location IDs for the route (can have duplicates)
}

// Component to update map when locations change
function MapUpdater({ locations, routeLocationIds }: { locations: Location[], routeLocationIds?: number[] }) {
  const map = useMap()
  const prevLengthRef = useRef(locations.length)

  useEffect(() => {
    // Fit bounds when locations are added/removed
    if (locations.length !== prevLengthRef.current && locations.length > 0) {
      const bounds = L.latLngBounds(locations.map(loc => [loc.lat, loc.lng]))
      map.fitBounds(bounds, { padding: [50, 50] })
      prevLengthRef.current = locations.length
    }
  }, [locations, map])

  // Fit bounds when route changes
  useEffect(() => {
    if (routeLocationIds && routeLocationIds.length >= 2) {
      const routeLocations = routeLocationIds
        .map(id => locations.find(loc => loc.id === id))
        .filter((loc): loc is Location => loc !== undefined)
      
      if (routeLocations.length >= 2) {
        const bounds = L.latLngBounds(routeLocations.map(loc => [loc.lat, loc.lng]))
        map.fitBounds(bounds, { padding: [80, 80] })
      }
    }
  }, [routeLocationIds, locations, map])

  return null
}

// Calculate center based on all locations
const calculateCenter = (locations: Location[]): [number, number] => {
  if (locations.length === 0) return [50.5, 4.0] // Default center in Europe
  const avgLat = locations.reduce((sum, loc) => sum + loc.lat, 0) / locations.length
  const avgLng = locations.reduce((sum, loc) => sum + loc.lng, 0) / locations.length
  return [avgLat, avgLng]
}

export default function MapComponent({ locations, routeLocationIds = [] }: MapComponentProps) {
  const center = calculateCenter(locations)

  // Get ordered route locations
  const routeLocations = routeLocationIds
    .map(id => locations.find(loc => loc.id === id))
    .filter((loc): loc is Location => loc !== undefined)

  // Create polyline positions for the route
  const routePositions: [number, number][] = routeLocations.map(loc => [loc.lat, loc.lng])

  // Get ALL route indices for a location (handles duplicates)
  const getLocationRouteIndices = (id: number): number[] => {
    const indices: number[] = []
    routeLocationIds.forEach((routeId, index) => {
      if (routeId === id) {
        indices.push(index + 1) // 1-based numbering
      }
    })
    return indices
  }

  return (
    <div className="w-full h-full">
      <MapContainer
        center={[center[0], center[1]]}
        zoom={locations.length > 0 ? 6 : 4}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapUpdater locations={locations} routeLocationIds={routeLocationIds} />
        
        {/* Draw route polyline if we have at least 2 locations */}
        {routePositions.length >= 2 && (
          <Polyline
            positions={routePositions}
            color="#ef4444"
            weight={4}
            opacity={0.8}
            dashArray="10, 10"
          />
        )}
        
        {/* Markers */}
        {locations.map((location) => {
          const routeIndices = getLocationRouteIndices(location.id)
          const isInRoute = routeIndices.length > 0
          const markerIcon = isInRoute 
            ? createIcon('#ef4444', routeIndices) 
            : defaultIcon

          return (
            <Marker
              key={location.id}
              position={[location.lat, location.lng]}
              icon={markerIcon}
            >
              <Popup>
                <div className="text-center min-w-[150px]">
                  {isInRoute && (
                    <div className="inline-block bg-red-500 text-white text-xs px-2 py-0.5 rounded-full mb-1">
                      Stop{routeIndices.length > 1 ? 's' : ''} #{routeIndices.join(', #')}
                    </div>
                  )}
                  <strong className="text-sm font-semibold block">{location.name}</strong>
                  <span className="text-xs text-gray-500 block mt-1">ID: {location.id}</span>
                  <span className="text-xs text-gray-600 block mt-1">{location.description}</span>
                  <span className="text-xs text-gray-400 block mt-1">
                    {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
                  </span>
                </div>
              </Popup>
            </Marker>
          )
        })}
      </MapContainer>
    </div>
  )
}
