import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getDb } from '../src/lib/db'

const workspace = (request: VercelRequest) => {
  const value = request.headers['x-workspace-id']
  return typeof value === 'string' && /^[a-zA-Z0-9_-]{1,80}$/.test(value) ? value : 'demo'
}

const jsonTarget = (target: Record<string, unknown>) => ({
  workspace_id: 'demo',
  company_name: target.company,
  domain: target.domain,
  industry: target.industry,
  location: target.location,
  revenue: target.revenue || null,
  employees: target.employees || null,
  founded: target.founded || null,
  owner_name: target.owner || null,
  email: target.email || null,
  linkedin: target.linkedin || null,
  confidence: target.confidence || 'Medium',
  description: target.description || '',
  status: target.status || 'New',
  assignee: target.assignee || 'Unassigned',
  follow_up: target.followUp || null,
  next_action: target.nextAction || 'Research target',
  score: target.score,
  priority: target.priority,
  signals: JSON.stringify(target.signals || []),
  risks: JSON.stringify(target.risks || []),
})

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (!['GET', 'POST', 'PATCH'].includes(request.method || '')) return response.status(405).json({ error: 'Method not allowed' })
  try {
    const sql = getDb()
    const workspaceId = workspace(request)
    if (request.method === 'GET') {
      const rows = await sql`select * from targets where workspace_id = ${workspaceId} order by score desc, updated_at desc limit 500`
      return response.status(200).json({ targets: rows })
    }
    if (!Array.isArray(request.body) && request.method === 'POST') return response.status(400).json({ error: 'Expected an array of targets' })
    if (request.method === 'POST') {
      const targets = (request.body as Record<string, unknown>[]).slice(0, 500)
      for (const target of targets) {
        const row = jsonTarget(target)
        await sql`insert into targets (workspace_id, company_name, domain, industry, location, revenue, employees, founded, owner_name, email, linkedin, confidence, description, status, assignee, follow_up, next_action, score, priority, signals, risks) values (${workspaceId}, ${row.company_name}, ${row.domain}, ${row.industry}, ${row.location}, ${row.revenue}, ${row.employees}, ${row.founded}, ${row.owner_name}, ${row.email}, ${row.linkedin}, ${row.confidence}, ${row.description}, ${row.status}, ${row.assignee}, ${row.follow_up}, ${row.next_action}, ${row.score}, ${row.priority}, ${row.signals}::jsonb, ${row.risks}::jsonb) on conflict (workspace_id, domain) do update set updated_at = now(), score = excluded.score, priority = excluded.priority, status = excluded.status, assignee = excluded.assignee, follow_up = excluded.follow_up, next_action = excluded.next_action, signals = excluded.signals, risks = excluded.risks`
      }
      return response.status(201).json({ saved: targets.length })
    }
    const target = request.body as Record<string, unknown>
    if (typeof target.domain !== 'string') return response.status(400).json({ error: 'domain is required' })
    const result = await sql`update targets set status = coalesce(${target.status as string | null}, status), assignee = coalesce(${target.assignee as string | null}, assignee), follow_up = coalesce(${target.followUp as string | null}, follow_up), next_action = coalesce(${target.nextAction as string | null}, next_action), updated_at = now() where workspace_id = ${workspaceId} and domain = ${target.domain} returning *`
    return result.length ? response.status(200).json({ target: result[0] }) : response.status(404).json({ error: 'Target not found' })
  } catch (error) {
    console.error('targets_api_error', error instanceof Error ? error.message : 'unknown')
    return response.status(500).json({ error: 'Database request failed' })
  }
}
