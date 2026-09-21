import 'dotenv/config'
import { readFile } from 'node:fs/promises'
import { neon } from '@neondatabase/serverless'

const url = process.env.DATABASE_URL
if (!url) throw new Error('DATABASE_URL is required. Set it in the shell or .env.local.')

const sql = neon(url)
const migration = await readFile(new URL('../db/migrations/001_initial.sql', import.meta.url), 'utf8')
const statements = migration.split(';').map((statement) => statement.trim()).filter(Boolean)
for (const statement of statements) await sql.query(statement)
console.log(`Applied ${statements.length} migration statements.`)
