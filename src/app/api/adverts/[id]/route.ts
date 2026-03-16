import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET single boat advert
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const advert = await db.boatAdvert.findUnique({
      where: { id: parseInt(id) },
      include: { location: true }
    })

    if (!advert) {
      return NextResponse.json({ error: 'Advert not found' }, { status: 404 })
    }

    return NextResponse.json(advert)
  } catch (error) {
    console.error('Error fetching advert:', error)
    return NextResponse.json({ error: 'Failed to fetch advert' }, { status: 500 })
  }
}

// PUT update boat advert
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { url, title, locationId, notes } = body

    if (!url || !locationId) {
      return NextResponse.json({ error: 'URL and locationId are required' }, { status: 400 })
    }

    const advert = await db.boatAdvert.update({
      where: { id: parseInt(id) },
      data: {
        url,
        title: title || 'Untitled Advert',
        locationId: parseInt(locationId),
        notes: notes || ''
      },
      include: { location: true }
    })

    return NextResponse.json(advert)
  } catch (error) {
    console.error('Error updating advert:', error)
    return NextResponse.json({ error: 'Failed to update advert' }, { status: 500 })
  }
}

// DELETE boat advert
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await db.boatAdvert.delete({
      where: { id: parseInt(id) }
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting advert:', error)
    return NextResponse.json({ error: 'Failed to delete advert' }, { status: 500 })
  }
}
