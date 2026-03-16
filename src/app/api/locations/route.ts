import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET all locations
export async function GET() {
  try {
    const locations = await db.location.findMany({
      orderBy: { id: 'asc' }
    })
    return NextResponse.json(locations)
  } catch (error) {
    console.error('Error fetching locations:', error)
    return NextResponse.json({ error: 'Failed to fetch locations' }, { status: 500 })
  }
}

// POST create new location
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, lat, lng, description, country } = body

    if (!name || lat === undefined || lng === undefined) {
      return NextResponse.json({ error: 'Name, lat, and lng are required' }, { status: 400 })
    }

    // Get the max ID to continue sequence
    const maxLocation = await db.location.findFirst({
      orderBy: { id: 'desc' },
      select: { id: true }
    })
    const nextId = (maxLocation?.id || 0) + 1

    const location = await db.location.create({
      data: {
        id: nextId,
        name,
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        description: description || '',
        country: country || 'Unknown'
      }
    })

    return NextResponse.json(location, { status: 201 })
  } catch (error) {
    console.error('Error creating location:', error)
    return NextResponse.json({ error: 'Failed to create location' }, { status: 500 })
  }
}
