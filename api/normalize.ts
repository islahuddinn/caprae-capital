import Papa from 'papaparse'
import type { VercelRequest, VercelResponse } from '@vercel/node'

type CsvRow = Record<string, string | undefined>

export default function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== 'POST') return response.status(405).json({ error: 'Method not allowed' })
  const body = typeof request.body === 'string' ? request.body : ''
  if (!body || body.length > 5_000_000) return response.status(400).json({ error: 'CSV is required and must be smaller than 5MB' })

  const result = Papa.parse<CsvRow>(body, { header: true, skipEmptyLines: true })
  if (result.errors.length) return response.status(422).json({ error: 'CSV could not be parsed', details: result.errors.slice(0, 3) })
  const rows = result.data.filter((row) => Object.values(row).some(Boolean))
  return response.status(200).json({ rows, count: rows.length, source: 'server-normalized' })
}
