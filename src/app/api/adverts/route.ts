import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET all boat adverts
export async function GET() {
  try {
    const adverts = await db.boatAdvert.findMany({
      include: {
        location: true
      },
      orderBy: { createdAt: 'desc' }
    })
    return NextResponse.json(adverts)
  } catch (error) {
    console.error('Error fetching adverts:', error)
    return NextResponse.json({ error: 'Failed to fetch adverts' }, { status: 500 })
  }
}

// POST create new boat advert
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { url, title, locationId, notes } = body

    if (!url || !locationId) {
      return NextResponse.json({ error: 'URL and locationId are required' }, { status: 400 })
    }

    const advert = await db.boatAdvert.create({
      data: {
        url,
        title: title || 'Untitled Advert',
        locationId: parseInt(locationId),
        notes: notes || ''
      },
      include: {
        location: true
      }
    })

    return NextResponse.json(advert, { status: 201 })
  } catch (error) {
    console.error('Error creating advert:', error)
    return NextResponse.json({ error: 'Failed to create advert' }, { status: 500 })
  }
}
