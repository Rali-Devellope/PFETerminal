import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import DashboardLayout from '../../components/Layout/DashboardLayout'
import Card from '../../components/UI/Card'
import { getStatsGlobales, getStatsFilieres, getClassement, exportCSV, exportExcel, exportPDF } from '../../api/stats'
import { getAnnees } from '../../api/pfe'
import { useAuthStore } from '../../store/authStore'
import { ROLE_DASHBOARDS } from '../../components/ProtectedRoute'
import { COORD_NAV } from '../coordinateur/Dashboard'

const ANNEES_FALLBACK = ['', ...Array.from({ length: 6 }, (_, i) => String(new Date().getFullYear() - i))]

const MENTION_ORDER = [
  { label: 'Très bien',  min: 16, color: '#15803d', bg: '#f0fdf4' },
  { label: 'Bien',       min: 14, color: '#1d4ed8', bg: '#eff6ff' },
  { label: 'Assez bien', min: 12, color: '#0369a1', bg: '#f0f9ff' },
  { label: 'Passable',   min: 10, color: '#b45309', bg: '#fffbeb' },
  { label: 'Insuffisant',min: 0,  color: '#b91c1c', bg: '#fef2f2' },
]

function getMention(note) {
  return MENTION_ORDER.find((m) => note >= m.min) ?? MENTION_ORDER[MENTION_ORDER.length - 1]
}

function downloadBlob(data, filename, mime) {
  const url = URL.createObjectURL(new Blob([data], { type: mime }))
  const a = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

function Skeleton({ h = 'h-8', w = 'w-full' }) {
  return <div className={`${h} ${w} rounded-xl bg-gray-100 animate-pulse`} />
}

function KpiCard({ label, value, color, bg, icon, loading, sub }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
      <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: bg }}>
        <span style={{ color }}>{icon}</span>
      </div>
      <div className="min-w-0 flex-1">
        {loading
          ? <><Skeleton h="h-7" w="w-16" /><div className="mt-1"><Skeleton h="h-3" w="w-28" /></div></>
          : <>
              <p className="text-2xl font-bold tracking-tight" style={{ color: '#1a2744' }}>{value ?? '—'}</p>
              <p className="text-xs font-medium text-gray-500 mt-0.5">{label}</p>
              {sub && <p className="text-[11px] mt-0.5" style={{ color }}>{sub}</p>}
            </>
        }
      </div>
    </div>
  )
}

function FilièreBar({ filiere, total_global, en_cours, archives, total, moyenne, color }) {
  const pct = total_global > 0 ? Math.round((total / total_global) * 100) : 0
  return (
    <div className="group">
      <div className="flex items-center justify-between mb-1.5 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
          <span className="text-sm font-semibold truncate" style={{ color: '#1a2744' }}>{filiere}</span>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0 text-xs text-gray-400">
          <span className="font-semibold" style={{ color }}>{total} PFE ({pct}%)</span>
          {moyenne > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold"
              style={{ backgroundColor: color + '18', color }}>
              moy. {moyenne}/20
            </span>
          )}
        </div>
      </div>
      <div className="h-2.5 rounded-full bg-gray-100 overflow-hidden">
        <div className="h-2.5 rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <div className="flex gap-4 mt-1">
        <span className="text-[10px] text-gray-400">En cours : <strong>{en_cours}</strong></span>
        <span className="text-[10px] text-gray-400">Archivés : <strong>{archives}</strong></span>
      </div>
    </div>
  )
}

function MentionDistrib({ data }) {
  if (!data.length) return null
  const total = data.reduce((s, d) => s + d.count, 0)
  return (
    <div className="space-y-2.5">
      {data.map(({ label, count, color, bg }) => {
        const pct = total > 0 ? Math.round((count / total) * 100) : 0
        return (
          <div key={label}>
            <div className="flex justify-between text-xs mb-1">
              <span className="font-medium" style={{ color }}>{label}</span>
              <span className="text-gray-400">{count} ({pct}%)</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: bg }}>
              <div className="h-2 rounded-full transition-all duration-700"
                style={{ width: `${pct}%`, backgroundColor: color }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function Stats() {
  const { t } = useTranslation()
  const { user } = useAuthStore()
  const [filiere, setFiliere] = useState('')
  const [annee, setAnnee]     = useState('')
  const [exporting, setExporting] = useState(null)

  const homeRoute = ROLE_DASHBOARDS[user?.role] ?? '/login'
  const isCoord   = user?.role === 'coordinateur'

  const MINIMAL_NAV = [
    { to: homeRoute, end: true, label: t('nav.vue_ensemble'),
      icon: <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg> },
    { to: '/stats', label: t('nav.statistiques'),
      icon: <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg> },
  ]

  const navItems = isCoord ? COORD_NAV(t) : MINIMAL_NAV

  const { data: anneesRes } = useQuery({ queryKey: ['annees'], queryFn: getAnnees })
  const anneesArr = (() => {
    const r = anneesRes?.data?.results ?? anneesRes?.data?.data ?? anneesRes?.data ?? []
    return Array.isArray(r) ? r : []
  })()
  const anneeOptions = anneesArr.length
    ? ['', ...anneesArr.map((a) => a.libelle)]
    : ANNEES_FALLBACK

  const { data: statsRes, isLoading: statsLoading } = useQuery({
    queryKey: ['stats-globales'],
    queryFn: getStatsGlobales,
  })
  const { data: filieresRes } = useQuery({
    queryKey: ['stats-filieres'],
    queryFn: getStatsFilieres,
  })
  const { data: classRes, isLoading: classLoading } = useQuery({
    queryKey: ['classement', filiere, annee],
    queryFn: () => getClassement({ filiere: filiere || undefined, annee: annee || undefined }),
  })

  const s = statsRes?.data?.data ?? {}

  const filieresArr = (() => {
    const raw = filieresRes?.data?.data ?? []
    return Array.isArray(raw) ? raw : []
  })()

  const classArr = (() => {
    const raw = classRes?.data?.data ?? classRes?.data ?? []
    return Array.isArray(raw) ? raw : []
  })()

  const totalGlobal = filieresArr.reduce((sum, f) => sum + f.total, 0) || 1

  const tauxReussite = classArr.length > 0
    ? Math.round((classArr.filter((r) => r.note_finale >= 10).length / classArr.length) * 100)
    : 0

  const mentionDistrib = useMemo(() => {
    const counts = {}
    classArr.forEach((r) => {
      if (r.note_finale == null) return
      const m = getMention(r.note_finale)
      counts[m.label] = (counts[m.label] || 0) + 1
    })
    return MENTION_ORDER
      .filter((m) => counts[m.label] > 0)
      .map((m) => ({ ...m, count: counts[m.label] ?? 0 }))
  }, [classArr])

  const FILIERE_COLORS = ['#2db84b', '#0ea5e9', '#7e22ce', '#f59e0b', '#ef4444', '#ec4899']

  const handleExport = async (type) => {
    setExporting(type)
    try {
      if (type === 'csv')   { const { data } = await exportCSV();   downloadBlob(data, 'classement.csv',  'text/csv') }
      if (type === 'excel') { const { data } = await exportExcel(); downloadBlob(data, 'classement.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') }
      if (type === 'pdf')   { const { data } = await exportPDF();   downloadBlob(data, 'classement.pdf',  'application/pdf') }
    } catch { /* ignore */ } finally { setExporting(null) }
  }

  return (
    <DashboardLayout navItems={navItems}>

      {/* En-tête */}
      <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: '#1a2744' }}>
            {t('nav.statistiques')}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Bilan global des projets de fin d'études — ISCAE
          </p>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <KpiCard loading={statsLoading} label="PFE total" value={s.total_pfe}
          sub={s.pfe_archives ? `${s.pfe_archives} archivés` : undefined}
          color="#2db84b" bg="#f0fdf4"
          icon={<svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>} />
        <KpiCard loading={statsLoading} label="PFE en cours" value={s.pfe_en_cours}
          sub={s.total_pfe ? `${Math.round((s.pfe_en_cours / s.total_pfe) * 100)}% du total` : undefined}
          color="#0ea5e9" bg="#f0f9ff"
          icon={<svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>} />
        <KpiCard loading={statsLoading} label="Soutenances terminées" value={s.soutenances_terminees}
          color="#7e22ce" bg="#faf5ff"
          icon={<svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>} />
        <KpiCard loading={statsLoading} label="Moyenne générale" value={s.moyenne_notes ? `${s.moyenne_notes}/20` : null}
          sub={s.moyenne_notes >= 14 ? 'Bien ✓' : s.moyenne_notes >= 10 ? 'Passable' : undefined}
          color="#f59e0b" bg="#fffbeb"
          icon={<svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>} />
      </div>

      {/* Répartition par filière */}
      {filieresArr.length > 0 && (
        <Card title="Répartition par filière" className="mb-5"
          icon={<svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>}>
          <div className="space-y-4 py-1">
            {filieresArr.map((f, i) => (
              <FilièreBar key={f.filiere}
                filiere={f.filiere}
                total_global={totalGlobal}
                total={f.total}
                en_cours={f.en_cours}
                archives={f.archives}
                moyenne={f.moyenne}
                color={FILIERE_COLORS[i % FILIERE_COLORS.length]} />
            ))}
          </div>
        </Card>
      )}

      {/* Ligne : Distribution mentions + Taux réussite + Exports */}
      <div className="grid gap-5 lg:grid-cols-3 mb-5">

        <Card title="Distribution des mentions"
          icon={<svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>}>
          {mentionDistrib.length === 0
            ? <p className="text-sm text-gray-400 py-4 text-center">Aucune note disponible</p>
            : <div className="py-1"><MentionDistrib data={mentionDistrib} /></div>
          }
        </Card>

        <Card title="Taux de réussite"
          icon={<svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>}>
          <div className="flex flex-col items-center py-3">
            <div className="relative w-24 h-24 mb-4">
              <svg viewBox="0 0 36 36" className="w-24 h-24 -rotate-90">
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="#f3f4f6" strokeWidth="3.5" />
                <circle cx="18" cy="18" r="15.9" fill="none"
                  stroke={tauxReussite >= 70 ? '#2db84b' : tauxReussite >= 50 ? '#f59e0b' : '#ef4444'}
                  strokeWidth="3.5"
                  strokeDasharray={`${tauxReussite} ${100 - tauxReussite}`}
                  strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl font-black leading-tight" style={{ color: '#1a2744' }}>
                  {tauxReussite}%
                </span>
              </div>
            </div>
            <p className="text-xs text-gray-500 text-center">Étudiants ≥ 10/20</p>
            {classArr.length > 0 && (
              <p className="text-[11px] text-gray-400 mt-1">
                {classArr.filter((r) => r.note_finale >= 10).length} / {classArr.length} étudiants
              </p>
            )}
          </div>
        </Card>

        <Card title="Exporter"
          icon={<svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>}>
          <p className="text-xs text-gray-400 mb-3">Télécharger le classement complet</p>
          <div className="space-y-2">
            {[
              { type: 'csv',   label: 'CSV',   color: '#15803d', bg: '#f0fdf4' },
              { type: 'excel', label: 'Excel', color: '#047857', bg: '#ecfdf5' },
              { type: 'pdf',   label: 'PDF',   color: '#b91c1c', bg: '#fef2f2' },
            ].map(({ type, label, color, bg }) => (
              <button key={type} onClick={() => handleExport(type)} disabled={!!exporting}
                className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition"
                style={{ backgroundColor: bg, color, opacity: exporting && exporting !== type ? 0.5 : 1 }}>
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                {exporting === type ? 'Génération...' : `Exporter ${label}`}
              </button>
            ))}
          </div>
        </Card>
      </div>

      {/* Classement */}
      <Card title={`Classement${classArr.length > 0 ? ` — ${classArr.length} résultat${classArr.length > 1 ? 's' : ''}` : ''}`}
        icon={<svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/></svg>}>

        {/* Filtres */}
        <div className="flex flex-wrap gap-3 mb-5">
          <select value={filiere} onChange={(e) => setFiliere(e.target.value)}
            className="px-3 py-2 rounded-xl text-sm border outline-none bg-white"
            style={{ borderColor: '#e5e7eb' }}
            onFocus={(e) => (e.target.style.borderColor = '#1a2744')}
            onBlur={(e) => (e.target.style.borderColor = '#e5e7eb')}>
            <option value="">Toutes les filières</option>
            {filieresArr.map((f) => <option key={f.filiere} value={f.filiere}>{f.filiere}</option>)}
          </select>
          <select value={annee} onChange={(e) => setAnnee(e.target.value)}
            className="px-3 py-2 rounded-xl text-sm border outline-none bg-white"
            style={{ borderColor: '#e5e7eb' }}
            onFocus={(e) => (e.target.style.borderColor = '#1a2744')}
            onBlur={(e) => (e.target.style.borderColor = '#e5e7eb')}>
            {anneeOptions.map((a) => <option key={a} value={a}>{a || 'Toutes les années'}</option>)}
          </select>
          {(filiere || annee) && (
            <button onClick={() => { setFiliere(''); setAnnee('') }}
              className="text-xs px-3 py-2 rounded-xl font-medium"
              style={{ backgroundColor: '#f1f5f9', color: '#64748b' }}>
              Réinitialiser
            </button>
          )}
        </div>

        {classLoading && (
          <div className="space-y-2">
            {[1,2,3,4,5].map((i) => <div key={i} className="h-12 rounded-xl bg-gray-50 animate-pulse" />)}
          </div>
        )}

        {!classLoading && classArr.length === 0 && (
          <div className="text-center py-10">
            <svg className="mx-auto mb-3 text-gray-300" width="40" height="40" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
            </svg>
            <p className="text-sm text-gray-400">Aucun résultat — les notes finales apparaîtront ici après les soutenances.</p>
          </div>
        )}

        {!classLoading && classArr.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '2px solid #f1f5f9' }}>
                  {['#', 'Étudiant', 'Filière', 'Année', 'Titre PFE', 'Note', 'Mention', 'Plagiat'].map((h) => (
                    <th key={h} className="text-left py-3 px-2 text-xs font-semibold text-gray-400 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {classArr.map((row) => {
                  const mention = row.note_finale != null ? getMention(row.note_finale) : null
                  const rankColor = row.rang === 1 ? '#f59e0b' : row.rang === 2 ? '#94a3b8' : row.rang === 3 ? '#b45309' : '#e2e8f0'
                  const rankText  = row.rang <= 3 ? '#fff' : '#94a3b8'
                  const plagiatHigh = row.score_plagiat > 30
                  const plagiatMed  = row.score_plagiat > 20
                  return (
                    <tr key={row.rang} className="hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-2">
                        <span className="w-7 h-7 rounded-full inline-flex items-center justify-center text-xs font-bold"
                          style={{ backgroundColor: rankColor, color: rankText }}>
                          {row.rang}
                        </span>
                      </td>
                      <td className="py-3 px-2 font-semibold whitespace-nowrap" style={{ color: '#1a2744' }}>
                        {row.etudiant}
                      </td>
                      <td className="py-3 px-2 text-xs text-gray-500 whitespace-nowrap">{row.filiere}</td>
                      <td className="py-3 px-2 text-xs text-gray-500">{row.annee}</td>
                      <td className="py-3 px-2 text-xs text-gray-500 max-w-[200px] truncate">{row.titre}</td>
                      <td className="py-3 px-2 whitespace-nowrap">
                        <span className="font-bold text-base" style={{ color: row.note_finale >= 10 ? '#15803d' : '#b91c1c' }}>
                          {row.note_finale}
                        </span>
                        <span className="text-xs text-gray-400">/20</span>
                      </td>
                      <td className="py-3 px-2">
                        {mention && (
                          <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap"
                            style={{ backgroundColor: mention.bg, color: mention.color }}>
                            {mention.label}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-2">
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                          style={{
                            backgroundColor: plagiatHigh ? '#fef2f2' : plagiatMed ? '#fffbeb' : '#f0fdf4',
                            color:           plagiatHigh ? '#b91c1c' : plagiatMed ? '#b45309' : '#166534',
                          }}>
                          {row.score_plagiat}%
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </DashboardLayout>
  )
}
