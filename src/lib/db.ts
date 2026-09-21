import { neon } from '@neondatabase/serverless'

let client: ReturnType<typeof neon> | undefined

export function getDb() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not configured')
  client ??= neon(process.env.DATABASE_URL)
  return client
}
