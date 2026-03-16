import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET single saved route
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const route = await db.savedRoute.findUnique({
      where: { id: parseInt(id) },
      include: {
        stops: {
          orderBy: { order: 'asc' }
        }
      }
    })

    if (!route) {
      return NextResponse.json({ error: 'Route not found' }, { status: 404 })
    }

    return NextResponse.json(route)
  } catch (error) {
    console.error('Error fetching route:', error)
    return NextResponse.json({ error: 'Failed to fetch route' }, { status: 500 })
  }
}

// PUT update saved route
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { name, stops } = body

    // Delete existing stops
    await db.routeStop.deleteMany({
      where: { savedRouteId: parseInt(id) }
    })

    // Update route with new stops
    const route = await db.savedRoute.update({
      where: { id: parseInt(id) },
      data: {
        name,
        stops: {
          create: stops.map((stop: { locationId: number }, index: number) => ({
            locationId: stop.locationId,
            order: index + 1
          }))
        }
      },
      include: {
        stops: true
      }
    })

    return NextResponse.json(route)
  } catch (error) {
    console.error('Error updating route:', error)
    return NextResponse.json({ error: 'Failed to update route' }, { status: 500 })
  }
}

// DELETE saved route
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    // Delete stops first (cascade should handle this, but being explicit)
    await db.routeStop.deleteMany({
      where: { savedRouteId: parseInt(id) }
    })
    
    await db.savedRoute.delete({
      where: { id: parseInt(id) }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting route:', error)
    return NextResponse.json({ error: 'Failed to delete route' }, { status: 500 })
  }
}
