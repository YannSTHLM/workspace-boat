import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const initialLocations = [
  {
    id: 1,
    name: 'Amsterdam Airport Schiphol',
    lat: 52.3105,
    lng: 4.7683,
    description: 'Main international airport - departure/arrival point',
    country: 'Netherlands'
  },
  {
    id: 2,
    name: 'Smelne Yachtcenter',
    lat: 53.1190,
    lng: 6.1050,
    description: 'Premium yacht center in the Netherlands',
    country: 'Netherlands'
  },
  {
    id: 3,
    name: 'Yacht Brokerage de Maas',
    lat: 51.7850,
    lng: 5.3150,
    description: 'Professional yacht brokerage services',
    country: 'Netherlands'
  },
  {
    id: 4,
    name: 'Floris Watersport',
    lat: 51.7150,
    lng: 4.9850,
    description: 'Watersport equipment and services',
    country: 'Netherlands'
  },
  {
    id: 5,
    name: 'Saint-Jean-de-Losne',
    lat: 47.0830,
    lng: 5.3670,
    description: 'Historic French port town on the Saône River',
    country: 'France'
  }
]

async function main() {
  console.log('Seeding database...')
  
  // Clear existing data
  await prisma.routeStop.deleteMany()
  await prisma.boatAdvert.deleteMany()
  await prisma.savedRoute.deleteMany()
  await prisma.location.deleteMany()
  
  // Insert initial locations
  for (const location of initialLocations) {
    await prisma.location.create({
      data: location
    })
  }
  
  console.log('Database seeded successfully!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
