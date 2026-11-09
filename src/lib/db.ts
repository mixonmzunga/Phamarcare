import { PrismaClient } from '@prisma/client'
import { config } from 'dotenv'

// Explicitly load .env file with override to ensure it takes priority
// over any system environment variables that might be set incorrectly
config({ override: true })

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'production' ? ['error'] : ['query'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
