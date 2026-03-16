import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET all saved routes
export async function GET() {
  try {
    const routes = await db.savedRoute.findMany({
      include: {
        stops: {
          orderBy: { order: 'asc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    })
    return NextResponse.json(routes)
  } catch (error) {
    console.error('Error fetching routes:', error)
    return NextResponse.json({ error: 'Failed to fetch routes' }, { status: 500 })
  }
}

// POST create new saved route
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, stops } = body

    if (!name || !stops || !Array.isArray(stops)) {
      return NextResponse.json({ error: 'Name and stops array are required' }, { status: 400 })
    }

    // Create the route with stops
    const route = await db.savedRoute.create({
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

    return NextResponse.json(route, { status: 201 })
  } catch (error) {
    console.error('Error creating route:', error)
    return NextResponse.json({ error: 'Failed to create route' }, { status: 500 })
  }
}
