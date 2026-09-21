import { useEffect, useMemo, useRef, useState } from 'react'
import Papa from 'papaparse'
import './App.css'

type Status = 'New' | 'Researching' | 'Contacted' | 'Qualified'
type Priority = 'High' | 'Medium' | 'Low'
type Target = {
  id: number; company: string; domain: string; industry: string; location: string
  revenue: number; employees: number; founded: number; owner: string; email: string
  linkedin: string; confidence: 'High' | 'Medium' | 'Low'; description: string
  status: Status; assignee: string; followUp: string; nextAction: string
  score: number; priority: Priority; signals: string[]; risks: string[]
}
type CsvRow = Record<string, string | undefined>
type PanelMode = 'capture' | 'outreach' | null

const seedTargets: Target[] = [
  { id: 1, company: 'Brightline Safety Services', domain: 'brightlinesafety.com', industry: 'Business Services', location: 'Dallas, TX', revenue: 8.4, employees: 46, founded: 2008, owner: 'Maya Rodriguez', email: 'maya@brightlinesafety.com', linkedin: 'linkedin.com/in/mayarodriguez', confidence: 'High', description: 'Recurring compliance and workplace safety programs for regional manufacturers.', status: 'Researching', assignee: 'You', followUp: '2026-09-24', nextAction: 'Send founder outreach', score: 86, priority: 'High', signals: ['Target industry', 'Revenue in range', 'Owner identified', 'Established since 2008'], risks: ['Revenue estimate is not audited'] },
  { id: 2, company: 'Northstar Fleet Repair', domain: 'northstarfleet.com', industry: 'Industrial Services', location: 'Columbus, OH', revenue: 12.1, employees: 72, founded: 2012, owner: 'Daniel Kim', email: '', linkedin: 'linkedin.com/in/danielkim', confidence: 'Medium', description: 'Mobile and in-shop fleet maintenance for logistics operators across the Midwest.', status: 'New', assignee: 'Unassigned', followUp: '', nextAction: 'Verify owner email', score: 79, priority: 'High', signals: ['Target industry', 'Revenue in range', 'Owner identified'], risks: ['No verified owner email', 'Revenue confidence is medium'] },
  { id: 3, company: 'Cedar & Co. Accounting', domain: 'cedarcoaccounting.com', industry: 'Professional Services', location: 'Phoenix, AZ', revenue: 4.8, employees: 31, founded: 1999, owner: 'Priya Shah', email: 'priya@cedarcoaccounting.com', linkedin: 'linkedin.com/in/priyashah', confidence: 'High', description: 'Outsourced accounting and tax advisory firm serving lower-middle-market businesses.', status: 'Contacted', assignee: 'Ari', followUp: '2026-09-22', nextAction: 'Follow up on initial note', score: 74, priority: 'Medium', signals: ['Revenue in range', 'Owner identified', 'Established since 1999'], risks: ['Industry is adjacent to thesis'] },
  { id: 4, company: 'Harborview Dental Lab', domain: 'harborviewlab.com', industry: 'Healthcare', location: 'Portland, OR', revenue: 2.1, employees: 18, founded: 2018, owner: 'Evan Brooks', email: 'evan@harborviewlab.com', linkedin: '', confidence: 'Low', description: 'Digital dental laboratory focused on same-week prosthetics for independent practices.', status: 'New', assignee: 'Unassigned', followUp: '', nextAction: 'Research business model', score: 51, priority: 'Low', signals: ['Revenue in range', 'Contact available'], risks: ['Outside target industry', 'Low data confidence', 'No LinkedIn profile'] },
]
const statusOptions: Status[] = ['New', 'Researching', 'Contacted', 'Qualified']
const storageKey = 'dealflow-targets-v1'
const valueOf = (row: CsvRow, ...keys: string[]) => { const key = keys.find((candidate) => row[candidate] !== undefined); return key ? String(row[key] ?? '').trim() : '' }
const numberOf = (row: CsvRow, ...keys: string[]) => Number.parseFloat(valueOf(row, ...keys).replace(/[$,]/g, '')) || 0

function targetFromCsv(row: CsvRow, id: number): Target | null {
  const company = valueOf(row, 'company_name', 'company', 'Company', 'name')
  const domain = valueOf(row, 'website', 'domain', 'Website', 'Domain').replace(/^https?:\/\//, '').replace(/\/$/, '')
  if (!company || !domain) return null
  const industry = valueOf(row, 'industry', 'Industry') || 'Unknown industry'
  const location = valueOf(row, 'location', 'Location', 'city') || 'Unknown location'
  const revenue = numberOf(row, 'revenue_estimate', 'revenue', 'Revenue ($m)', 'revenue_m')
  const employees = numberOf(row, 'employee_count', 'employees', 'Employees')
  const owner = valueOf(row, 'owner_name', 'contact_name', 'owner', 'Contact name')
  const email = valueOf(row, 'contact_email', 'email', 'Email')
  const founded = numberOf(row, 'founded_year', 'founded', 'Founded') || 2000
  const confidence = valueOf(row, 'confidence', 'data_confidence', 'Confidence') as Target['confidence']
  const safeConfidence = ['High', 'Medium', 'Low'].includes(confidence) ? confidence : 'Medium'
  const signals = [industry !== 'Unknown industry' ? 'Industry captured' : '', revenue >= 2 && revenue <= 20 ? 'Revenue in range' : '', owner ? 'Owner identified' : '', founded <= 2015 ? `Established since ${founded}` : ''].filter(Boolean)
  const risks = [!owner ? 'No owner identified' : '', !email ? 'No verified owner email' : '', safeConfidence !== 'High' ? `Revenue confidence is ${safeConfidence.toLowerCase()}` : '', !employees ? 'Employee count unavailable' : ''].filter(Boolean)
  const score = Math.min(100, 25 + (revenue >= 2 && revenue <= 20 ? 20 : 5) + (location !== 'Unknown location' ? 10 : 0) + (employees >= 10 && employees <= 100 ? 10 : 0) + (owner ? 15 : 0) + (founded <= 2015 ? 10 : 3) + (safeConfidence === 'High' ? 5 : 2) + (email ? 5 : 0))
  return { id, company, domain, industry, location, revenue, employees, founded, owner, email, linkedin: valueOf(row, 'linkedin_url', 'linkedin', 'LinkedIn'), confidence: safeConfidence, description: valueOf(row, 'description', 'business_description', 'Description') || 'No company description provided.', status: 'New', assignee: 'Unassigned', followUp: '', nextAction: email ? 'Draft founder outreach' : 'Verify owner email', score, priority: score >= 78 ? 'High' : score >= 62 ? 'Medium' : 'Low', signals, risks }
}

function readStoredTargets() {
  try { const stored = localStorage.getItem(storageKey); return stored ? JSON.parse(stored) as Target[] : seedTargets } catch { return seedTargets }
}

function App() {
  const [targets, setTargets] = useState<Target[]>(readStoredTargets)
  const [selectedId, setSelectedId] = useState(1)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<'All' | Priority>('All')
  const [statusFilter, setStatusFilter] = useState<'All' | Status>('All')
  const [panelMode, setPanelMode] = useState<PanelMode>(null)
  const [importMessage, setImportMessage] = useState('')
  const [outreachDraft, setOutreachDraft] = useState('')
  const [outreachProvider, setOutreachProvider] = useState('')
  const [outreachLoading, setOutreachLoading] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)
  const selected = targets.find((target) => target.id === selectedId) ?? targets[0]

  useEffect(() => { localStorage.setItem(storageKey, JSON.stringify(targets)) }, [targets])
  const filteredTargets = useMemo(() => targets.filter((target) => filter === 'All' || target.priority === filter).filter((target) => statusFilter === 'All' || target.status === statusFilter).filter((target) => `${target.company} ${target.industry} ${target.location}`.toLowerCase().includes(query.toLowerCase())).sort((a, b) => b.score - a.score), [filter, query, statusFilter, targets])
  const updateSelected = (changes: Partial<Target>) => setTargets((current) => current.map((target) => target.id === selected.id ? { ...target, ...changes } : target))
  const resetWorkspace = () => { setTargets(seedTargets); setSelectedId(1); setPanelMode(null); setImportMessage('Workspace reset to the demo dataset.') }

  const importRows = (data: CsvRow[]) => {
    const domains = new Set(targets.map((target) => target.domain.toLowerCase()))
    let nextId = Math.max(0, ...targets.map((target) => target.id)) + 1
    const imported = data.map((row) => targetFromCsv(row, nextId++)).filter((target): target is Target => target !== null)
    const unique = imported.filter((target) => { const domain = target.domain.toLowerCase(); if (domains.has(domain)) return false; domains.add(domain); return true })
    setTargets((current) => [...current, ...unique]); if (unique.length) setSelectedId(unique[0].id)
    setImportMessage(`Imported ${unique.length} new target${unique.length === 1 ? '' : 's'}${imported.length !== unique.length ? `, skipped ${imported.length - unique.length} duplicate${imported.length - unique.length === 1 ? '' : 's'}` : ''}.`)
  }
  const importCsv = async (file: File) => {
    setImportMessage('Reading file...'); const csv = await file.text()
    try {
      const response = await fetch('/api/normalize', { method: 'POST', headers: { 'Content-Type': 'text/csv' }, body: csv })
      if (response.ok) { const payload = await response.json() as { rows: CsvRow[] }; importRows(payload.rows); return }
    } catch { /* Vite does not serve Vercel functions locally. */ }
    Papa.parse<CsvRow>(csv, { header: true, skipEmptyLines: true, complete: ({ data }) => importRows(data), error: () => setImportMessage('Could not read this file. Use a UTF-8 CSV with company and website columns.') })
  }
  const generateOutreach = async () => {
    setOutreachLoading(true); setOutreachDraft('')
    try {
      const response = await fetch('/api/draft-outreach', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(selected) })
      const payload = await response.json() as { draft?: string; provider?: string }
      if (!response.ok || !payload.draft) throw new Error('Draft unavailable')
      setOutreachDraft(payload.draft); setOutreachProvider(payload.provider || 'server')
    } catch {
      setOutreachDraft(`Subject: Exploring ${selected.company}\n\nHi ${selected.owner || 'there'},\n\nI came across ${selected.company} while researching established ${selected.industry.toLowerCase()} businesses in ${selected.location}. Your work stood out, especially the focus on ${selected.description.toLowerCase()}\n\nWould you be open to a short, confidential conversation about the next chapter for the business?\n\nBest,\nWaseem`); setOutreachProvider('local fallback')
    } finally { setOutreachLoading(false) }
  }
  const openOutreach = () => { setPanelMode('outreach'); void generateOutreach() }
  const exportTargets = () => {
    const headers = ['Company', 'Industry', 'Location', 'Revenue ($m)', 'Score', 'Priority', 'Status', 'Next action']
    const rows = filteredTargets.map((target) => [target.company, target.industry, target.location, target.revenue, target.score, target.priority, target.status, target.nextAction])
    const csv = [headers, ...rows].map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(',')).join('\n')
    const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); link.download = 'dealflow-targets.csv'; link.click(); URL.revokeObjectURL(link.href)
  }

  return <main className="app-shell">
    <header className="topbar"><div className="brand-lockup"><span className="brand-mark">D</span><span>DealFlow</span><small>CAPRAE OPS</small></div><div className="topbar-actions"><span className="sync-status"><span className="status-dot" /> Local workspace</span><button className="ghost-button" type="button" onClick={resetWorkspace}>Reset demo</button><button className="ghost-button" type="button" onClick={exportTargets}>Export queue</button><div className="avatar">WA</div></div></header>
    <section className="page-heading"><div><p className="eyebrow">TARGET PIPELINE / ACQUISITION THESIS</p><h1>Action queue</h1><p className="subheading">Move the right companies from research to a useful next step.</p></div><button className="primary-button" type="button" onClick={() => setPanelMode('capture')}>+ Import targets</button></section>
    <section className="metric-grid" aria-label="Pipeline summary"><Metric label="Active targets" value={targets.length} note="+4 this week" /><Metric label="High priority" value={targets.filter((target) => target.priority === 'High').length} note="Need attention" /><Metric label="Contacted" value={targets.filter((target) => target.status === 'Contacted').length} note="1 follow-up due" /><Metric label="Queue health" value="82%" note="Data confidence" accent /></section>
    <section className="workspace"><div className="queue-panel"><div className="panel-heading"><div><p className="eyebrow">YOUR NEXT BEST ACTION</p><h2>Target queue</h2></div><button className="icon-button" title="Export current queue" type="button" onClick={exportTargets}>CSV</button></div><div className="rubric-strip"><strong>Fit score</strong><span>Industry 25</span><span>Revenue 20</span><span>Contact 15</span><span>Confidence 5</span><span>+ signals 35</span></div><div className="toolbar"><label className="search-field"><span>Search</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Company, industry, location" /></label><select value={filter} onChange={(event) => setFilter(event.target.value as 'All' | Priority)} aria-label="Filter by priority"><option value="All">All priorities</option><option value="High">High priority</option><option value="Medium">Medium priority</option><option value="Low">Low priority</option></select><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as 'All' | Status)} aria-label="Filter by status"><option value="All">All statuses</option>{statusOptions.map((status) => <option key={status}>{status}</option>)}</select></div><div className="queue-list">{filteredTargets.map((target) => <TargetRow key={target.id} target={target} selected={selected.id === target.id} onClick={() => { setSelectedId(target.id); setPanelMode(null) }} />)}</div>{filteredTargets.length === 0 && <div className="empty-state">No targets match this view.</div>}</div>
      <aside className="detail-panel"><DetailPanel mode={panelMode} target={selected} importMessage={importMessage} fileInput={fileInput} outreachDraft={outreachDraft} outreachProvider={outreachProvider} outreachLoading={outreachLoading} onClose={() => setPanelMode(null)} onImport={importCsv} onGenerate={generateOutreach} onUpdate={updateSelected} onOutreach={openOutreach} /></aside></section>
    <footer><span>DealFlow prototype</span><span>Built for the five-hour AI-readiness challenge</span></footer>
  </main>
}

function Metric({ label, value, note, accent = false }: { label: string; value: string | number; note: string; accent?: boolean }) { return <div className={`metric-card ${accent ? 'accent-card' : ''}`}><span>{label}</span><strong>{value}</strong><small>{note}</small></div> }
function TargetRow({ target, selected, onClick }: { target: Target; selected: boolean; onClick: () => void }) { return <button className={`target-row ${selected ? 'selected' : ''}`} type="button" onClick={onClick}><div className="company-avatar">{target.company.slice(0, 1)}</div><div className="target-summary"><strong>{target.company}</strong><span>{target.industry} <i>/</i> {target.location}</span><small>{target.nextAction}</small></div><div className="target-score"><strong>{target.score}</strong><span className={`priority ${target.priority.toLowerCase()}`}>{target.priority}</span></div></button> }

function DetailPanel({ mode, target, importMessage, fileInput, outreachDraft, outreachProvider, outreachLoading, onClose, onImport, onGenerate, onUpdate, onOutreach }: { mode: PanelMode; target: Target; importMessage: string; fileInput: React.RefObject<HTMLInputElement | null>; outreachDraft: string; outreachProvider: string; outreachLoading: boolean; onClose: () => void; onImport: (file: File) => void; onGenerate: () => void; onUpdate: (changes: Partial<Target>) => void; onOutreach: () => void }) {
  if (mode === 'capture') return <div className="detail-content"><DetailHeader eyebrow="SAASQUATCH EXPORT" title="Import targets" onClose={onClose} /><p className="detail-intro">Bring in a company export, normalize it through the server boundary, and skip duplicate domains before they reach the queue.</p><input ref={fileInput} className="file-input" type="file" accept=".csv,text/csv" onChange={(event) => { const file = event.target.files?.[0]; if (file) onImport(file) }} /><button className="primary-button full-width" type="button" onClick={() => fileInput.current?.click()}>Choose CSV file</button>{importMessage && <div className="capture-note"><strong>{importMessage}</strong><span>Required columns: <code>company_name</code> and <code>website</code>. Optional fields include revenue, industry, location, owner, email, and confidence.</span></div>}</div>
  if (mode === 'outreach') return <div className="detail-content"><DetailHeader eyebrow="FOUNDER OUTREACH" title={target.company} onClose={onClose} /><p className="detail-intro">AI is used for language generation only. The score and evidence remain deterministic and auditable.</p><textarea className="outreach-draft" readOnly value={outreachLoading ? 'Generating a grounded draft...' : outreachDraft} /><small className="provider-note">Provider: {outreachProvider || 'waiting'} · Uses only evidence in this brief</small><button className="primary-button full-width" disabled={outreachLoading} type="button" onClick={onGenerate}>{outreachLoading ? 'Generating...' : 'Regenerate draft'}</button><button className="secondary-button full-width" type="button" onClick={() => { onUpdate({ status: 'Contacted', nextAction: 'Follow up on initial note' }); onClose() }}>Mark as contacted</button></div>
  return <div className="detail-content"><div className="detail-top"><div><p className="eyebrow">TARGET BRIEF</p><h2>{target.company}</h2><a href={`https://${target.domain}`} target="_blank" rel="noreferrer">{target.domain} ↗</a></div><span className={`priority large ${target.priority.toLowerCase()}`}>{target.priority}</span></div><p className="detail-intro">{target.description}</p><div className="score-block"><div><span>Acquisition fit</span><strong>{target.score}<small>/100</small></strong></div><div className="score-bar"><span style={{ width: `${target.score}%` }} /></div></div><Evidence target={target} /><div className="detail-section workflow-section"><div className="section-label"><span>Workflow</span><span>Next action</span></div><select value={target.status} onChange={(event) => onUpdate({ status: event.target.value as Status })}>{statusOptions.map((status) => <option key={status}>{status}</option>)}</select><div className="workflow-meta"><label>Owner<select value={target.assignee} onChange={(event) => onUpdate({ assignee: event.target.value })}><option>You</option><option>Ari</option><option>Unassigned</option></select></label><label>Follow up<input type="date" value={target.followUp} onChange={(event) => onUpdate({ followUp: event.target.value })} /></label></div></div><div className="detail-actions"><button className="primary-button" type="button" onClick={onOutreach}>Draft outreach</button><button className="secondary-button" type="button" onClick={() => onUpdate({ status: 'Qualified' })}>Mark qualified</button></div></div>
}
function DetailHeader({ eyebrow, title, onClose }: { eyebrow: string; title: string; onClose: () => void }) { return <div className="detail-top"><div><p className="eyebrow">{eyebrow}</p><h2>{title}</h2></div><button className="close-button" type="button" onClick={onClose}>Close</button></div> }
function Evidence({ target }: { target: Target }) { return <><div className="detail-section"><div className="section-label"><span>Why this target</span><span className="confidence">{target.confidence} confidence</span></div><ul className="signal-list">{target.signals.map((signal) => <li key={signal}><span className="check">+</span>{signal}</li>)}</ul></div><div className="detail-section"><div className="section-label"><span>Watch-outs</span><span className="risk-count">{target.risks.length} flags</span></div><ul className="risk-list">{target.risks.map((risk) => <li key={risk}><span>!</span>{risk}</li>)}</ul></div></>}

export default App
