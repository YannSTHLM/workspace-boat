import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET single location
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const location = await db.location.findUnique({
      where: { id: parseInt(id) }
    })

    if (!location) {
      return NextResponse.json({ error: 'Location not found' }, { status: 404 })
    }

    return NextResponse.json(location)
  } catch (error) {
    console.error('Error fetching location:', error)
    return NextResponse.json({ error: 'Failed to fetch location' }, { status: 500 })
  }
}

// PUT update location
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { name, lat, lng, description, country } = body

    const location = await db.location.update({
      where: { id: parseInt(id) },
      data: {
        name,
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        description,
        country
      }
    })

    return NextResponse.json(location)
  } catch (error) {
    console.error('Error updating location:', error)
    return NextResponse.json({ error: 'Failed to update location' }, { status: 500 })
  }
}

// DELETE location
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    // Delete related data first
    await db.routeStop.deleteMany({
      where: { locationId: parseInt(id) }
    })
    await db.boatAdvert.deleteMany({
      where: { locationId: parseInt(id) }
    })
    
    await db.location.delete({
      where: { id: parseInt(id) }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting location:', error)
    return NextResponse.json({ error: 'Failed to delete location' }, { status: 500 })
  }
}
