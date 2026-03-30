'use client'

import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'
import useSWR, { mutate } from 'swr'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Trash2, Plus, MapPin, Sailboat, Route, ArrowRight, X, Navigation, Pencil, Check, Link, Download, ExternalLink, Save, FolderOpen, Bookmark, Upload, Loader2 } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

// Fetcher for SWR
const fetcher = (url: string) => fetch(url).then(res => res.json())

// Dynamically import the map component to avoid SSR issues with Leaflet
const MapComponent = dynamic(() => import('@/components/MapComponent'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-gray-100 rounded-lg">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading map...</p>
      </div>
    </div>
  )
})

interface Location {
  id: number
  name: string
  lat: number
  lng: number
  description: string
  country: string
}

interface RouteStop {
  key: string
  locationId: number
}

interface SavedRoute {
  id: number
  name: string
  stops: { locationId: number }[]
  createdAt: string
}

interface BoatAdvert {
  id: number
  url: string
  title: string
  locationId: number
  notes: string
  createdAt: string
}

// Haversine formula to calculate distance between two points in km
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

export default function Home() {
  // Fetch data from API
  const { data: locations = [], error: locationsError, isLoading: locationsLoading } = useSWR<Location[]>('/api/locations', fetcher)
  const { data: savedRoutes = [], mutate: mutateRoutes } = useSWR<SavedRoute[]>('/api/routes', fetcher)
  const { data: adverts = [], mutate: mutateAdverts } = useSWR<BoatAdvert[]>('/api/adverts', fetcher)

  // Local state for current route (not persisted until saved)
  const [routeStops, setRouteStops] = useState<RouteStop[]>([])
  const [selectedId, setSelectedId] = useState('')

  // Form state for adding new location
  const [newLocation, setNewLocation] = useState({
    name: '',
    lat: '',
    lng: '',
    description: '',
    country: ''
  })
  const [formError, setFormError] = useState('')

  // Edit state
  const [editingLocation, setEditingLocation] = useState<Location | null>(null)
  const [editForm, setEditForm] = useState({
    name: '',
    lat: '',
    lng: '',
    description: '',
    country: ''
  })
  const [editError, setEditError] = useState('')

  // Boat adverts state
  const [newAdvert, setNewAdvert] = useState({
    url: '',
    title: '',
    locationId: '',
    notes: ''
  })
  const [advertError, setAdvertError] = useState('')
  const [editingAdvert, setEditingAdvert] = useState<BoatAdvert | null>(null)
  const [editAdvertForm, setEditAdvertForm] = useState({
    url: '',
    title: '',
    locationId: '',
    notes: ''
  })

  // Saved routes state
  const [newRouteName, setNewRouteName] = useState('')

  // File input ref for import
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Generate unique key for route stops
  const generateRouteKey = useCallback(() => `stop-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, [])

  // Calculate route details
  const routeDetails = useMemo(() => {
    const routeLocations = routeStops
      .map(stop => locations.find(loc => loc.id === stop.locationId))
      .filter((loc): loc is Location => loc !== undefined)

    if (routeLocations.length < 2) {
      return { totalDistance: 0, segments: [] }
    }

    const segments: { from: Location; to: Location; distance: number }[] = []
    let totalDistance = 0

    for (let i = 0; i < routeLocations.length - 1; i++) {
      const from = routeLocations[i]
      const to = routeLocations[i + 1]
      const distance = calculateDistance(from.lat, from.lng, to.lat, to.lng)
      segments.push({ from, to, distance })
      totalDistance += distance
    }

    return { totalDistance, segments, locations: routeLocations }
  }, [routeStops, locations])

  // Add new location
  const handleAddLocation = useCallback(async () => {
    if (!newLocation.name.trim()) {
      setFormError('Name is required')
      return
    }
    if (!newLocation.lat.trim() || isNaN(parseFloat(newLocation.lat))) {
      setFormError('Valid latitude is required')
      return
    }
    if (!newLocation.lng.trim() || isNaN(parseFloat(newLocation.lng))) {
      setFormError('Valid longitude is required')
      return
    }

    const lat = parseFloat(newLocation.lat)
    const lng = parseFloat(newLocation.lng)

    if (lat < -90 || lat > 90) {
      setFormError('Latitude must be between -90 and 90')
      return
    }
    if (lng < -180 || lng > 180) {
      setFormError('Longitude must be between -180 and 180')
      return
    }

    try {
      const res = await fetch('/api/locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newLocation.name.trim(),
          lat,
          lng,
          description: newLocation.description.trim() || 'No description provided',
          country: newLocation.country.trim() || 'Unknown'
        })
      })
      
      if (res.ok) {
        mutate('/api/locations')
        setNewLocation({ name: '', lat: '', lng: '', description: '', country: '' })
        setFormError('')
      } else {
        setFormError('Failed to add location')
      }
    } catch (error) {
      setFormError('Failed to add location')
    }
  }, [newLocation])

  // Remove location
  const handleRemoveLocation = useCallback(async (id: number) => {
    try {
      const res = await fetch(`/api/locations/${id}`, { method: 'DELETE' })
      if (res.ok) {
        mutate('/api/locations')
        setRouteStops(prev => prev.filter(stop => stop.locationId !== id))
      }
    } catch (error) {
      console.error('Failed to delete location:', error)
    }
  }, [])

  // Open edit dialog
  const openEditDialog = useCallback((location: Location) => {
    setEditingLocation(location)
    setEditForm({
      name: location.name,
      lat: location.lat.toString(),
      lng: location.lng.toString(),
      description: location.description,
      country: location.country
    })
    setEditError('')
  }, [])

  // Save edited location
  const handleSaveEdit = useCallback(async () => {
    if (!editingLocation) return

    if (!editForm.name.trim()) {
      setEditError('Name is required')
      return
    }
    if (!editForm.lat.trim() || isNaN(parseFloat(editForm.lat))) {
      setEditError('Valid latitude is required')
      return
    }
    if (!editForm.lng.trim() || isNaN(parseFloat(editForm.lng))) {
      setEditError('Valid longitude is required')
      return
    }

    const lat = parseFloat(editForm.lat)
    const lng = parseFloat(editForm.lng)

    if (lat < -90 || lat > 90) {
      setEditError('Latitude must be between -90 and 90')
      return
    }
    if (lng < -180 || lng > 180) {
      setEditError('Longitude must be between -180 and 180')
      return
    }

    try {
      const res = await fetch(`/api/locations/${editingLocation.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editForm.name.trim(),
          lat,
          lng,
          description: editForm.description.trim() || 'No description provided',
          country: editForm.country.trim() || 'Unknown'
        })
      })
      
      if (res.ok) {
        mutate('/api/locations')
        setEditingLocation(null)
        setEditError('')
      } else {
        setEditError('Failed to update location')
      }
    } catch (error) {
      setEditError('Failed to update location')
    }
  }, [editingLocation, editForm])

  // Add location to route
  const addToRoute = useCallback((id: number) => {
    setRouteStops(prev => [...prev, { key: generateRouteKey(), locationId: id }])
  }, [generateRouteKey])

  // Remove specific stop from route
  const removeFromRoute = useCallback((key: string) => {
    setRouteStops(prev => prev.filter(stop => stop.key !== key))
  }, [])

  // Add location by ID input
  const handleAddToRouteById = useCallback(() => {
    const id = parseInt(selectedId)
    if (isNaN(id)) return
    const location = locations.find(loc => loc.id === id)
    if (location) {
      setRouteStops(prev => [...prev, { key: generateRouteKey(), locationId: id }])
      setSelectedId('')
    }
  }, [selectedId, locations, generateRouteKey])

  // Move stop in route
  const moveInRoute = useCallback((key: string, direction: 'up' | 'down') => {
    const index = routeStops.findIndex(stop => stop.key === key)
    if (index === -1) return

    const newRoute = [...routeStops]
    if (direction === 'up' && index > 0) {
      [newRoute[index - 1], newRoute[index]] = [newRoute[index], newRoute[index - 1]]
    } else if (direction === 'down' && index < newRoute.length - 1) {
      [newRoute[index], newRoute[index + 1]] = [newRoute[index + 1], newRoute[index]]
    }
    setRouteStops(newRoute)
  }, [routeStops])

  // Clear route
  const clearRoute = useCallback(() => {
    setRouteStops([])
  }, [])

  // Save current route
  const handleSaveRoute = useCallback(async () => {
    if (routeStops.length === 0) return
    if (!newRouteName.trim()) {
      alert('Please enter a name for the route')
      return
    }

    try {
      const res = await fetch('/api/routes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newRouteName.trim(),
          stops: routeStops.map(stop => ({ locationId: stop.locationId }))
        })
      })
      
      if (res.ok) {
        mutate('/api/routes')
        setNewRouteName('')
      }
    } catch (error) {
      console.error('Failed to save route:', error)
    }
  }, [routeStops, newRouteName])

  // Load a saved route
  const handleLoadRoute = useCallback((savedRoute: SavedRoute) => {
    setRouteStops(savedRoute.stops.map(stop => ({
      key: generateRouteKey(),
      locationId: stop.locationId
    })))
  }, [generateRouteKey])

  // Delete a saved route
  const handleDeleteSavedRoute = useCallback(async (id: number) => {
    try {
      const res = await fetch(`/api/routes/${id}`, { method: 'DELETE' })
      if (res.ok) {
        mutate('/api/routes')
      }
    } catch (error) {
      console.error('Failed to delete route:', error)
    }
  }, [])

  // Add boat advert
  const handleAddAdvert = useCallback(async () => {
    if (!newAdvert.url.trim()) {
      setAdvertError('URL is required')
      return
    }
    if (!newAdvert.locationId.trim()) {
      setAdvertError('Location ID is required')
      return
    }

    const locationId = parseInt(newAdvert.locationId)
    const location = locations.find(loc => loc.id === locationId)
    if (!location) {
      setAdvertError('Invalid location ID')
      return
    }

    try {
      const res = await fetch('/api/adverts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: newAdvert.url.trim(),
          title: newAdvert.title.trim() || 'Untitled Advert',
          locationId,
          notes: newAdvert.notes.trim()
        })
      })
      
      if (res.ok) {
        mutate('/api/adverts')
        setNewAdvert({ url: '', title: '', locationId: '', notes: '' })
        setAdvertError('')
      } else {
        setAdvertError('Failed to add advert')
      }
    } catch (error) {
      setAdvertError('Failed to add advert')
    }
  }, [newAdvert, locations])

  // Delete boat advert
  const handleDeleteAdvert = useCallback(async (id: number) => {
    try {
      const res = await fetch(`/api/adverts/${id}`, { method: 'DELETE' })
      if (res.ok) {
        mutate('/api/adverts')
      }
    } catch (error) {
      console.error('Failed to delete advert:', error)
    }
  }, [])

  // Open edit advert dialog
  const openEditAdvertDialog = useCallback((advert: BoatAdvert) => {
    setEditingAdvert(advert)
    setEditAdvertForm({
      url: advert.url,
      title: advert.title,
      locationId: advert.locationId.toString(),
      notes: advert.notes
    })
    setAdvertError('')
  }, [])

  // Save edited advert
  const handleSaveAdvertEdit = useCallback(async () => {
    if (!editingAdvert) return

    if (!editAdvertForm.url.trim()) {
      setAdvertError('URL is required')
      return
    }
    if (!editAdvertForm.locationId.trim()) {
      setAdvertError('Location ID is required')
      return
    }

    const locationId = parseInt(editAdvertForm.locationId)
    const location = locations.find(loc => loc.id === locationId)
    if (!location) {
      setAdvertError('Invalid location ID')
      return
    }

    try {
      const res = await fetch(`/api/adverts/${editingAdvert.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: editAdvertForm.url.trim(),
          title: editAdvertForm.title.trim() || 'Untitled Advert',
          locationId,
          notes: editAdvertForm.notes.trim()
        })
      })
      
      if (res.ok) {
        mutate('/api/adverts')
        setEditingAdvert(null)
        setAdvertError('')
      } else {
        setAdvertError('Failed to update advert')
      }
    } catch (error) {
      setAdvertError('Failed to update advert')
    }
  }, [editingAdvert, editAdvertForm, locations])

  // Export all data
  const handleExportData = useCallback(() => {
    const exportData = {
      exportDate: new Date().toISOString(),
      locations: locations.map(loc => ({
        id: loc.id,
        name: loc.name,
        latitude: loc.lat,
        longitude: loc.lng,
        description: loc.description,
        country: loc.country
      })),
      currentRoute: routeStops.map(stop => ({
        locationId: stop.locationId,
        locationName: locations.find(l => l.id === stop.locationId)?.name || 'Unknown'
      })),
      savedRoutes: savedRoutes.map(route => ({
        id: route.id,
        name: route.name,
        stops: route.stops.map(stop => ({
          locationId: stop.locationId,
          locationName: locations.find(l => l.id === stop.locationId)?.name || 'Unknown'
        })),
        createdAt: route.createdAt
      })),
      boatAdverts: adverts.map(advert => ({
        id: advert.id,
        url: advert.url,
        title: advert.title,
        locationId: advert.locationId,
        locationName: locations.find(l => l.id === advert.locationId)?.name || 'Unknown',
        notes: advert.notes,
        createdAt: advert.createdAt
      }))
    }

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `yacht-data-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [locations, routeStops, savedRoutes, adverts])

  // Export as CSV
  const handleExportCSV = useCallback(() => {
    const locationsCSV = [
      ['ID', 'Name', 'Latitude', 'Longitude', 'Description', 'Country'],
      ...locations.map(loc => [loc.id, loc.name, loc.lat, loc.lng, loc.description, loc.country])
    ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n')

    const advertsCSV = [
      ['ID', 'URL', 'Title', 'Location ID', 'Location Name', 'Notes', 'Created At'],
      ...adverts.map(advert => [
        advert.id,
        advert.url,
        advert.title,
        advert.locationId,
        locations.find(l => l.id === advert.locationId)?.name || 'Unknown',
        advert.notes,
        advert.createdAt
      ])
    ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n')

    const routeCSV = [
      ['Stop Number', 'Location ID', 'Location Name'],
      ...routeStops.map((stop, index) => [
        index + 1,
        stop.locationId,
        locations.find(l => l.id === stop.locationId)?.name || 'Unknown'
      ])
    ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n')

    const savedRoutesCSV = savedRoutes.map(route => {
      const stopsCSV = route.stops.map((stop, index) => [
        route.name,
        route.id,
        index + 1,
        stop.locationId,
        locations.find(l => l.id === stop.locationId)?.name || 'Unknown'
      ])
      return stopsCSV
    }).flat()

    const savedRoutesHeader = ['Route Name', 'Route ID', 'Stop Number', 'Location ID', 'Location Name']

    const fullCSV = `LOCATIONS\n${locationsCSV}\n\nBOAT ADVERTS\n${advertsCSV}\n\nCURRENT ROUTE\n${routeCSV}\n\nSAVED ROUTES\n${savedRoutesHeader.map(c => `"${c}"`).join(',')}\n${savedRoutesCSV.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n')}`
    const blob = new Blob([fullCSV], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `yacht-data-${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [locations, adverts, routeStops, savedRoutes])

  // Import data from JSON file
  const handleImportData = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const content = e.target?.result as string
        const data = JSON.parse(content)

        // Import locations
        if (data.locations && Array.isArray(data.locations)) {
          for (const loc of data.locations) {
            const existing = locations.find(l => l.id === loc.id)
            if (!existing) {
              await fetch('/api/locations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  id: loc.id,
                  name: loc.name,
                  lat: loc.latitude,
                  lng: loc.longitude,
                  description: loc.description,
                  country: loc.country
                })
              })
            }
          }
          mutate('/api/locations')
        }

        // Import saved routes
        if (data.savedRoutes && Array.isArray(data.savedRoutes)) {
          for (const route of data.savedRoutes) {
            await fetch('/api/routes', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                name: route.name,
                stops: route.stops.map((s: { locationId: number }) => ({ locationId: s.locationId }))
              })
            })
          }
          mutate('/api/routes')
        }

        // Import boat adverts
        if (data.boatAdverts && Array.isArray(data.boatAdverts)) {
          for (const advert of data.boatAdverts) {
            await fetch('/api/adverts', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                url: advert.url,
                title: advert.title,
                locationId: advert.locationId,
                notes: advert.notes
              })
            })
          }
          mutate('/api/adverts')
        }

        // Import current route
        if (data.currentRoute && Array.isArray(data.currentRoute)) {
          setRouteStops(data.currentRoute.map((stop: { locationId: number }) => ({
            key: generateRouteKey(),
            locationId: stop.locationId
          })))
        }

        alert('Data imported successfully!')
      } catch (error) {
        alert('Error importing data. Please make sure the file is a valid JSON export.')
        console.error('Import error:', error)
      }
    }
    reader.readAsText(file)
    
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [locations, generateRouteKey])

  // Trigger file input click
  const handleUploadClick = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  // Loading state
  if (locationsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-red-500" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (locationsError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-red-500">Failed to load data</p>
          <Button onClick={() => mutate('/api/locations')} className="mt-4">Retry</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Sailboat className="h-8 w-8 text-red-500" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Boat Map</h1>
              <p className="text-sm text-gray-500">Interactive map with roadtrip planner (persistent)</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6 sm:px-6 lg:px-8 space-y-6">
        {/* Top Section: Add Location + All Locations side by side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Add Location Form */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Add Location
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    placeholder="Location name"
                    value={newLocation.name}
                    onChange={(e) => setNewLocation(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="country">Country</Label>
                  <Input
                    id="country"
                    placeholder="Netherlands"
                    value={newLocation.country}
                    onChange={(e) => setNewLocation(prev => ({ ...prev, country: e.target.value }))}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="lat">Latitude *</Label>
                  <Input
                    id="lat"
                    placeholder="53.1190"
                    value={newLocation.lat}
                    onChange={(e) => setNewLocation(prev => ({ ...prev, lat: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lng">Longitude *</Label>
                  <Input
                    id="lng"
                    placeholder="6.1050"
                    value={newLocation.lng}
                    onChange={(e) => setNewLocation(prev => ({ ...prev, lng: e.target.value }))}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  placeholder="Brief description"
                  value={newLocation.description}
                  onChange={(e) => setNewLocation(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>
              {formError && (
                <p className="text-sm text-red-500">{formError}</p>
              )}
              <Button onClick={handleAddLocation} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Add to Map
              </Button>
            </CardContent>
          </Card>

          {/* Locations List */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">All Locations</CardTitle>
              <CardDescription>{locations.length} location{locations.length !== 1 ? 's' : ''} • Click ✏️ to edit</CardDescription>
            </CardHeader>
            <CardContent>
              {locations.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <MapPin className="h-12 w-12 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No locations</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                  {locations.map((location) => {
                    const isInRoute = routeStops.some(stop => stop.locationId === location.id)
                    return (
                      <div
                        key={location.id}
                        className={`p-3 rounded-lg transition-colors group ${
                          isInRoute ? 'bg-red-50 border border-red-200' : 'bg-gray-50 hover:bg-gray-100'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <Badge variant={isInRoute ? 'default' : 'outline'} className="shrink-0 bg-red-500 mt-0.5">
                            ID:{location.id}
                          </Badge>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-sm text-gray-900">{location.name}</h3>
                            <p className="text-xs text-gray-500 truncate">{location.description}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="secondary" className="text-xs">{location.country}</Badge>
                              <span className="text-xs text-gray-400">
                                {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
                              </span>
                            </div>
                          </div>
                          <div className="flex gap-1 shrink-0">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-blue-600 hover:bg-blue-50"
                              onClick={() => openEditDialog(location)}
                              title="Edit location"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            {!isInRoute && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-green-600 hover:bg-green-50"
                                onClick={() => addToRoute(location.id)}
                                title="Add to route"
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            )}
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-gray-400 hover:text-red-500 hover:bg-red-50"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Remove Location</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Remove &quot;{location.name}&quot; from the map? This cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleRemoveLocation(location.id)}
                                    className="bg-red-500 hover:bg-red-600"
                                  >
                                    Remove
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Middle Section: Map */}
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <div className="h-[500px] lg:h-[550px]">
              <MapComponent locations={locations} routeLocationIds={routeStops.map(s => s.locationId)} />
            </div>
          </CardContent>
        </Card>

        {/* Bottom Section: Roadtrip Planner */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Route Builder */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Route className="h-5 w-5" />
                    Roadtrip Planner
                  </CardTitle>
                  <CardDescription>Add stops by ID (e.g., 1 → 2 → 4 → 3) to plan your route</CardDescription>
                </div>
                {routeStops.length > 0 && (
                  <Button variant="outline" size="sm" onClick={clearRoute}>
                    Clear All
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Add by ID input */}
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <Label htmlFor="routeId" className="text-sm text-gray-600 mb-1 block">Enter Location ID</Label>
                  <Input
                    id="routeId"
                    placeholder="e.g., 1"
                    value={selectedId}
                    onChange={(e) => setSelectedId(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddToRouteById()}
                  />
                </div>
                <Button onClick={handleAddToRouteById} disabled={!selectedId}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Stop
                </Button>
              </div>

              <Separator />

              {/* Route list */}
              {routeStops.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Navigation className="h-12 w-12 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No route planned</p>
                  <p className="text-xs mt-1">Click + on locations above or enter IDs</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {routeStops.map((stop, index) => {
                    const location = locations.find(loc => loc.id === stop.locationId)
                    if (!location) return null

                    return (
                      <div key={stop.key} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-red-500 text-white font-bold text-sm shrink-0">
                          {index + 1}
                        </div>
                        <Badge variant="outline" className="text-xs shrink-0">ID:{stop.locationId}</Badge>
                        <span className="font-medium text-sm flex-1 truncate">{location.name}</span>
                        <span className="text-xs text-gray-400 hidden sm:block">{location.country}</span>
                        <div className="flex gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => moveInRoute(stop.key, 'up')}
                            disabled={index === 0}
                            title="Move up"
                          >
                            ↑
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => moveInRoute(stop.key, 'down')}
                            disabled={index === routeStops.length - 1}
                            title="Move down"
                          >
                            ↓
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-500 hover:bg-red-50"
                            onClick={() => removeFromRoute(stop.key)}
                            title="Remove stop"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Save Route Section */}
              {routeStops.length >= 2 && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium flex items-center gap-2">
                      <Save className="h-4 w-4" />
                      Save Current Route
                    </h4>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Route name (e.g., Grand Tour)"
                        value={newRouteName}
                        onChange={(e) => setNewRouteName(e.target.value)}
                        className="flex-1"
                      />
                      <Button onClick={handleSaveRoute} disabled={!newRouteName.trim()}>
                        <Save className="h-4 w-4 mr-1" />
                        Save
                      </Button>
                    </div>
                  </div>
                </>
              )}

              {/* Saved Routes */}
              {savedRoutes.length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium flex items-center gap-2">
                      <Bookmark className="h-4 w-4" />
                      Saved Routes ({savedRoutes.length})
                    </h4>
                    <div className="space-y-2 max-h-[200px] overflow-y-auto">
                      {savedRoutes.map((route) => (
                        <div key={route.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors group">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{route.name}</p>
                            <p className="text-xs text-gray-500">
                              {route.stops.length} stops • {new Date(route.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-blue-600 hover:bg-blue-50"
                              onClick={() => handleLoadRoute(route)}
                            >
                              <FolderOpen className="h-3 w-3 mr-1" />
                              Load
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-red-500 hover:bg-red-50"
                              onClick={() => handleDeleteSavedRoute(route.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Trip Summary */}
          <Card className={routeStops.length >= 2 ? 'border-red-200 bg-red-50/50' : ''}>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Navigation className="h-5 w-5 text-red-500" />
                Trip Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              {routeStops.length < 2 ? (
                <div className="text-center py-6 text-gray-500">
                  <p className="text-sm">Add at least 2 stops</p>
                  <p className="text-xs mt-1">to see trip details</p>
                </div>
              ) : (
                <>
                  {/* Route segments */}
                  <div className="space-y-2 mb-4 max-h-[200px] overflow-y-auto">
                    {routeDetails.segments?.map((segment, index) => (
                      <div key={index} className="flex items-center gap-2 text-sm">
                        <Badge variant="outline" className="w-6 justify-center shrink-0">{index + 1}</Badge>
                        <span className="font-medium truncate flex-1 text-xs">{segment.from.name}</span>
                        <ArrowRight className="h-4 w-4 text-gray-400 shrink-0" />
                        <Badge variant="outline" className="w-6 justify-center shrink-0">{index + 2}</Badge>
                        <span className="font-medium truncate flex-1 text-xs">{segment.to.name}</span>
                        <Badge variant="secondary" className="shrink-0 text-xs">
                          {segment.distance.toFixed(1)} km
                        </Badge>
                      </div>
                    ))}
                  </div>

                  <Separator className="my-3" />

                  {/* Total distance */}
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 font-medium text-sm">Total Distance:</span>
                    <Badge className="text-base px-3 py-1 bg-red-500">
                      {routeDetails.totalDistance.toFixed(1)} km
                    </Badge>
                  </div>

                  {/* Estimated travel time */}
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-gray-600 font-medium text-sm">Est. Drive Time:</span>
                    <Badge variant="outline" className="text-sm px-3 py-1">
                      ~{(routeDetails.totalDistance / 80).toFixed(1)} hrs
                    </Badge>
                  </div>

                  {/* Stops count */}
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-gray-600 font-medium text-sm">Total Stops:</span>
                    <Badge variant="outline" className="text-sm px-3 py-1">
                      {routeStops.length} stops
                    </Badge>
                  </div>

                  {/* Quick tip */}
                  <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-xs text-blue-700">
                      <strong>💡 Tip:</strong> Use IDs to plan: 1 → 2 → 4 → 3
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Boat Adverts Section */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Link className="h-5 w-5" />
                  Boat Adverts
                </CardTitle>
                <CardDescription>Save boat advertisement URLs and associate them with locations</CardDescription>
              </div>
              <div className="flex gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".json"
                  onChange={handleImportData}
                  className="hidden"
                />
                <Button variant="outline" size="sm" onClick={handleUploadClick}>
                  <Upload className="h-4 w-4 mr-1" />
                  Import
                </Button>
                <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={locations.length === 0}>
                  <Download className="h-4 w-4 mr-1" />
                  Export CSV
                </Button>
                <Button variant="outline" size="sm" onClick={handleExportData} disabled={locations.length === 0}>
                  <Download className="h-4 w-4 mr-1" />
                  Export JSON
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Add Advert Form */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="space-y-1">
                <Label htmlFor="advert-url" className="text-xs">URL *</Label>
                <Input
                  id="advert-url"
                  placeholder="https://..."
                  value={newAdvert.url}
                  onChange={(e) => setNewAdvert(prev => ({ ...prev, url: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="advert-title" className="text-xs">Title</Label>
                <Input
                  id="advert-title"
                  placeholder="Boat title"
                  value={newAdvert.title}
                  onChange={(e) => setNewAdvert(prev => ({ ...prev, title: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="advert-location" className="text-xs">Location ID *</Label>
                <Input
                  id="advert-location"
                  placeholder="1"
                  value={newAdvert.locationId}
                  onChange={(e) => setNewAdvert(prev => ({ ...prev, locationId: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="advert-notes" className="text-xs">Notes</Label>
                <Input
                  id="advert-notes"
                  placeholder="Optional notes"
                  value={newAdvert.notes}
                  onChange={(e) => setNewAdvert(prev => ({ ...prev, notes: e.target.value }))}
                />
              </div>
              <div className="flex items-end">
                <Button onClick={handleAddAdvert} className="w-full">
                  <Plus className="h-4 w-4 mr-1" />
                  Add
                </Button>
              </div>
            </div>
            {advertError && (
              <p className="text-sm text-red-500">{advertError}</p>
            )}

            <Separator />

            {/* Adverts Table */}
            {adverts.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Link className="h-12 w-12 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No boat adverts saved</p>
                <p className="text-xs mt-1">Add URLs above to save boat advertisements</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-2 font-medium">ID</th>
                      <th className="text-left py-2 px-2 font-medium">Title</th>
                      <th className="text-left py-2 px-2 font-medium">URL</th>
                      <th className="text-left py-2 px-2 font-medium">Location</th>
                      <th className="text-left py-2 px-2 font-medium">Notes</th>
                      <th className="text-left py-2 px-2 font-medium">Added</th>
                      <th className="text-right py-2 px-2 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adverts.map((advert) => {
                      const location = locations.find(l => l.id === advert.locationId)
                      return (
                        <tr key={advert.id} className="border-b hover:bg-gray-50">
                          <td className="py-2 px-2">
                            <Badge variant="outline" className="text-xs">#{advert.id}</Badge>
                          </td>
                          <td className="py-2 px-2 font-medium truncate max-w-[150px]">{advert.title}</td>
                          <td className="py-2 px-2">
                            <a
                              href={advert.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline flex items-center gap-1 truncate max-w-[200px]"
                            >
                              <ExternalLink className="h-3 w-3 shrink-0" />
                              {advert.url.length > 30 ? advert.url.substring(0, 30) + '...' : advert.url}
                            </a>
                          </td>
                          <td className="py-2 px-2">
                            <Badge variant="secondary" className="text-xs">
                              ID:{advert.locationId} - {location?.name || 'Unknown'}
                            </Badge>
                          </td>
                          <td className="py-2 px-2 text-gray-500 max-w-[150px]">
                            <div className="relative group">
                              <span className="block truncate">{advert.notes || '-'}</span>
                              {advert.notes && (
                                <div className="absolute left-0 top-full z-10 mt-1 hidden w-64 rounded-md border border-gray-200 bg-white p-2 text-xs text-gray-700 shadow-lg group-hover:block">
                                  {advert.notes}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="py-2 px-2 text-gray-400 text-xs">
                            {new Date(advert.createdAt).toLocaleDateString()}
                          </td>
                          <td className="py-2 px-2 text-right">
                            <div className="flex gap-1 justify-end">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-blue-600 hover:bg-blue-50"
                                onClick={() => openEditAdvertDialog(advert)}
                                title="Edit"
                              >
                                <Pencil className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-red-500 hover:bg-red-50"
                                onClick={() => handleDeleteAdvert(advert.id)}
                                title="Delete"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-auto">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <p className="text-sm text-gray-500 text-center">
            Data is saved to database • Interactive map powered by OpenStreetMap and Leaflet
          </p>
        </div>
      </footer>

      {/* Edit Location Dialog */}
      <Dialog open={!!editingLocation} onOpenChange={(open) => !open && setEditingLocation(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Location</DialogTitle>
            <DialogDescription>
              Update the details for this location. Click save when done.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Name *</Label>
                <Input
                  id="edit-name"
                  value={editForm.name}
                  onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-country">Country</Label>
                <Input
                  id="edit-country"
                  value={editForm.country}
                  onChange={(e) => setEditForm(prev => ({ ...prev, country: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-lat">Latitude *</Label>
                <Input
                  id="edit-lat"
                  value={editForm.lat}
                  onChange={(e) => setEditForm(prev => ({ ...prev, lat: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-lng">Longitude *</Label>
                <Input
                  id="edit-lng"
                  value={editForm.lng}
                  onChange={(e) => setEditForm(prev => ({ ...prev, lng: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Input
                id="edit-description"
                value={editForm.description}
                onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>
            {editError && (
              <p className="text-sm text-red-500">{editError}</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingLocation(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit}>
              <Check className="h-4 w-4 mr-2" />
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Advert Dialog */}
      <Dialog open={!!editingAdvert} onOpenChange={(open) => !open && setEditingAdvert(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Boat Advert</DialogTitle>
            <DialogDescription>
              Update the details for this advert. Click save when done.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-advert-url">URL *</Label>
              <Input
                id="edit-advert-url"
                value={editAdvertForm.url}
                onChange={(e) => setEditAdvertForm(prev => ({ ...prev, url: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-advert-title">Title</Label>
                <Input
                  id="edit-advert-title"
                  value={editAdvertForm.title}
                  onChange={(e) => setEditAdvertForm(prev => ({ ...prev, title: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-advert-location">Location ID *</Label>
                <Input
                  id="edit-advert-location"
                  value={editAdvertForm.locationId}
                  onChange={(e) => setEditAdvertForm(prev => ({ ...prev, locationId: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-advert-notes">Notes</Label>
              <Input
                id="edit-advert-notes"
                value={editAdvertForm.notes}
                onChange={(e) => setEditAdvertForm(prev => ({ ...prev, notes: e.target.value }))}
              />
            </div>
            {advertError && (
              <p className="text-sm text-red-500">{advertError}</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingAdvert(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveAdvertEdit}>
              <Check className="h-4 w-4 mr-2" />
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
