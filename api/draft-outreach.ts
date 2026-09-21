import type { VercelRequest, VercelResponse } from '@vercel/node'

const fallback = (target: Record<string, string>) => `Subject: Exploring ${target.company}\n\nHi ${target.owner || 'there'},\n\nI came across ${target.company} while researching established ${(target.industry || 'business')} businesses in ${target.location || 'your area'}. Your work stood out, especially the focus on ${(target.description || 'building a durable operating business').toLowerCase()}\n\nWould you be open to a short, confidential conversation about the next chapter for the business?\n\nBest,\nWaseem`

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== 'POST') return response.status(405).json({ error: 'Method not allowed' })
  const target = request.body as Record<string, string> | undefined
  if (!target?.company) return response.status(400).json({ error: 'A target company is required' })

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return response.status(200).json({ draft: fallback(target), provider: 'deterministic-fallback' })

  try {
    const model = process.env.OPENAI_MODEL || 'gpt-4o-mini'
    const completion = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        temperature: 0.3,
        max_tokens: 260,
        messages: [
          { role: 'system', content: 'Write concise, respectful founder outreach for a confidential acquisition conversation. Use only the supplied facts. Never invent metrics, claims, or urgency. Return a subject line and email body, no markdown.' },
          { role: 'user', content: JSON.stringify({ company: target.company, owner: target.owner, industry: target.industry, location: target.location, description: target.description, evidence: target.signals, risks: target.risks }) },
        ],
      }),
    })
    if (!completion.ok) throw new Error(`LLM request failed: ${completion.status}`)
    const payload = await completion.json() as { choices?: Array<{ message?: { content?: string } }> }
    const draft = payload.choices?.[0]?.message?.content?.trim()
    if (!draft) throw new Error('LLM returned an empty draft')
    return response.status(200).json({ draft, provider: model })
  } catch {
    return response.status(200).json({ draft: fallback(target), provider: 'deterministic-fallback' })
  }
}
