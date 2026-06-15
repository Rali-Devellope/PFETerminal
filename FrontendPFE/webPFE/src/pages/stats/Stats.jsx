import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import DashboardLayout from '../../components/Layout/DashboardLayout'
import { getStatsGlobales, getStatsFilieres, getClassement, getStatsEncadrantMe, exportCSV, exportExcel, exportPDF } from '../../api/stats'
import { useAuthStore } from '../../store/authStore'
import { ROLE_DASHBOARDS } from '../../components/ProtectedRoute'
import { COORD_NAV } from '../coordinateur/Dashboard'

/* ─── mentions ───────────────────────────────────────────────── */

const MENTION_ORDER = [
  { label: 'Très bien',   min: 16, color: '#15803d', bg: '#f0fdf4' },
  { label: 'Bien',        min: 14, color: '#1d4ed8', bg: '#eff6ff' },
  { label: 'Assez bien',  min: 12, color: '#0369a1', bg: '#f0f9ff' },
  { label: 'Passable',    min: 10, color: '#b45309', bg: '#fffbeb' },
  { label: 'Insuffisant', min: 0,  color: '#b91c1c', bg: '#fef2f2' },
]

const FILIERE_COLORS = ['#2db84b','#0ea5e9','#7e22ce','#f59e0b','#ef4444','#ec4899','#14b8a6','#8b5cf6']

function getMention(note) {
  return MENTION_ORDER.find((m) => note >= m.min) ?? MENTION_ORDER[MENTION_ORDER.length - 1]
}

function downloadBlob(data, filename, mime) {
  const url = URL.createObjectURL(new Blob([data], { type: mime }))
  const a = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

/* ─── composants locaux ──────────────────────────────────────── */

function Sk({ h = 'h-6', w = 'w-full' }) {
  return <div className={`${h} ${w} rounded-xl bg-gray-100 animate-pulse`} />
}

function KpiCard({ label, value, sub, color, bg, icon, loading, small }) {
  return (
    <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3 ${small ? '' : ''}`}>
      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
           style={{ backgroundColor: bg }}>
        <span style={{ color, fontSize: 18 }}>{icon}</span>
      </div>
      <div className="min-w-0 flex-1">
        {loading
          ? <><Sk h="h-6" w="w-14" /><div className="mt-1"><Sk h="h-3" w="w-24" /></div></>
          : <>
              <p className="text-xl font-black tracking-tight leading-tight" style={{ color: '#1a2744' }}>
                {value ?? '—'}
              </p>
              <p className="text-[11px] font-medium text-gray-400 mt-0.5">{label}</p>
              {sub && <p className="text-[10px] mt-0.5 font-semibold" style={{ color }}>{sub}</p>}
            </>
        }
      </div>
    </div>
  )
}

/* ─── page ────────────────────────────────────────────────────── */

export default function Stats() {
  const { t } = useTranslation()
  const { user } = useAuthStore()
  const [filiere, setFiliere] = useState('')
  const [annee, setAnnee]     = useState('')
  const [exporting, setExporting] = useState(null)

  const homeRoute = ROLE_DASHBOARDS[user?.role] ?? '/login'
  const isCoord   = user?.role === 'coordinateur'
  const isEnc     = user?.role === 'encadrant_acad' || user?.role === 'encadrant_entr'

  const MINIMAL_NAV = [
    { to: homeRoute, end: true, label: t('nav.vue_ensemble'),
      icon: <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg> },
    { to: '/stats', label: t('nav.statistiques'),
      icon: <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg> },
  ]
  const navItems = isCoord ? COORD_NAV(t) : MINIMAL_NAV

  /* ── queries ──────────────────────────────────────────────── */
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
  const { data: encRes } = useQuery({
    queryKey: ['stats-encadrant-me', user?.id],
    queryFn:  getStatsEncadrantMe,
    enabled:  isEnc && !!user?.id,
    staleTime: 0,
  })

  /* ── données ──────────────────────────────────────────────── */
  const s = statsRes?.data?.data ?? {}

  const filieresArr = (() => {
    const raw = filieresRes?.data?.data ?? []
    return Array.isArray(raw) ? raw : []
  })()

  const classArr = (() => {
    const raw = classRes?.data?.data ?? classRes?.data ?? []
    return Array.isArray(raw) ? raw : []
  })()

  const encStats = encRes?.data?.data ?? {}

  const totalGlobal = filieresArr.reduce((sum, f) => sum + f.total, 0) || 1

  /* mentions */
  const mentionDistrib = useMemo(() => {
    const counts = {}
    classArr.forEach((r) => {
      if (r.note_finale == null) return
      const m = getMention(r.note_finale)
      counts[m.label] = (counts[m.label] || 0) + 1
    })
    return MENTION_ORDER.filter((m) => counts[m.label] > 0).map((m) => ({ ...m, count: counts[m.label] ?? 0 }))
  }, [classArr])

  const tauxReussite = classArr.length > 0
    ? Math.round((classArr.filter((r) => r.note_finale >= 10).length / classArr.length) * 100)
    : null

  /* années disponibles depuis classement */
  const anneesDispos = useMemo(() => {
    const set = new Set(classArr.map((r) => r.annee).filter(Boolean))
    return [...set].sort((a, b) => b - a)
  }, [classArr])

  /* ── export ────────────────────────────────────────────────── */
  const handleExport = async (type) => {
    setExporting(type)
    try {
      if (type === 'csv')   { const { data } = await exportCSV();   downloadBlob(data, 'classement.csv',  'text/csv') }
      if (type === 'excel') { const { data } = await exportExcel(); downloadBlob(data, 'classement.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') }
      if (type === 'pdf')   { const { data } = await exportPDF();   downloadBlob(data, 'classement.pdf',  'application/pdf') }
    } catch { /* silencieux */ } finally { setExporting(null) }
  }

  /* ── render ─────────────────────────────────────────────────── */
  return (
    <DashboardLayout navItems={navItems}>

      {/* En-tête */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: '#1a2744' }}>Statistiques</h1>
        <p className="text-sm text-gray-400 mt-0.5">Bilan global des projets de fin d'études — ISCAE</p>
      </div>

      {/* ── KPI globaux ────────────────────────────────────────── */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <KpiCard loading={statsLoading} label="PFE total" value={s.total_pfe}
          sub={s.pfe_archives ? `${s.pfe_archives} archivés` : undefined}
          color="#2db84b" bg="#f0fdf4"
          icon={<svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>} />

        <KpiCard loading={statsLoading} label="PFE en cours" value={s.pfe_en_cours}
          sub={s.total_pfe ? `${Math.round(((s.pfe_en_cours ?? 0) / (s.total_pfe || 1)) * 100)}% du total` : undefined}
          color="#0ea5e9" bg="#f0f9ff"
          icon={<svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>} />

        <KpiCard loading={statsLoading} label="Soutenances terminées" value={s.soutenances_terminees}
          sub={s.total_soutenances ? `/${s.total_soutenances} planifiées` : undefined}
          color="#7e22ce" bg="#faf5ff"
          icon={<svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>} />

        <KpiCard loading={statsLoading} label="Moyenne générale"
          value={s.moyenne_notes ? `${s.moyenne_notes}/20` : '—'}
          sub={s.moyenne_notes >= 14 ? 'Mention Bien ✓' : s.moyenne_notes >= 10 ? 'Passable' : s.moyenne_notes > 0 ? 'Insuffisant' : 'Pas encore de notes'}
          color="#f59e0b" bg="#fffbeb"
          icon={<svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>} />
      </div>

      {/* KPI secondaires */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <KpiCard loading={statsLoading} label="Sujets proposés" value={s.total_sujets}
          sub={s.sujets_en_attente ? `${s.sujets_en_attente} en attente de validation` : 'Tous validés'}
          color="#b45309" bg="#fffbeb"
          icon={<svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>} />

        <KpiCard loading={statsLoading} label="Sujets en attente" value={s.sujets_en_attente ?? 0}
          sub={s.sujets_en_attente > 0 ? 'Validation coordinateur requise' : 'Aucun en attente ✓'}
          color={s.sujets_en_attente > 0 ? '#d97706' : '#15803d'}
          bg={s.sujets_en_attente > 0 ? '#fffbeb' : '#f0fdf4'}
          icon={<svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>} />

        <KpiCard loading={statsLoading} label="PFE archivés" value={s.pfe_archives ?? 0}
          sub={s.total_pfe ? `${Math.round(((s.pfe_archives ?? 0) / (s.total_pfe || 1)) * 100)}% archivés` : undefined}
          color="#475569" bg="#f8fafc"
          icon={<svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>} />

        <KpiCard loading={statsLoading} label="Taux de réussite"
          value={tauxReussite !== null ? `${tauxReussite}%` : '—'}
          sub={classArr.length > 0 ? `${classArr.filter(r => r.note_finale >= 10).length}/${classArr.length} étudiants ≥10` : 'Aucune note disponible'}
          color={tauxReussite >= 70 ? '#15803d' : tauxReussite >= 50 ? '#d97706' : tauxReussite !== null ? '#b91c1c' : '#9ca3af'}
          bg={tauxReussite >= 70 ? '#f0fdf4' : tauxReussite >= 50 ? '#fffbeb' : tauxReussite !== null ? '#fef2f2' : '#f8fafc'}
          icon={<svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>} />
      </div>

      {/* ── Stats encadrant (si role encadrant) ───────────────── */}
      {isEnc && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                 style={{ backgroundColor: '#f0fdf4' }}>
              <svg width="14" height="14" fill="none" stroke="#2db84b" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
            </div>
            <h2 className="text-sm font-bold" style={{ color: '#1a2744' }}>Mes statistiques personnelles</h2>
          </div>
          <div className="grid sm:grid-cols-4 gap-4">
            {[
              { label: 'Mes PFE total',    value: encStats.total_pfe,    color: '#2db84b', bg: '#f0fdf4' },
              { label: 'PFE en cours',     value: encStats.pfe_en_cours, color: '#0ea5e9', bg: '#f0f9ff' },
              { label: 'PFE archivés',     value: encStats.pfe_archives, color: '#475569', bg: '#f8fafc' },
              { label: 'Moyenne étudiants',value: encStats.moyenne_notes ? `${encStats.moyenne_notes}/20` : '—', color: '#f59e0b', bg: '#fffbeb' },
            ].map((k) => (
              <div key={k.label} className="rounded-xl p-3 text-center" style={{ backgroundColor: k.bg }}>
                <p className="text-2xl font-black" style={{ color: k.color }}>{k.value ?? '—'}</p>
                <p className="text-[11px] text-gray-500 mt-0.5">{k.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── 2 colonnes : filières + mentions/taux ─────────────── */}
      <div className="grid gap-5 lg:grid-cols-5 mb-6">

        {/* Répartition filières — 3/5 */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-2">
            <svg width="14" height="14" fill="none" stroke="#1a2744" strokeWidth="2" viewBox="0 0 24 24">
              <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
            </svg>
            <span className="text-sm font-semibold" style={{ color: '#1a2744' }}>Répartition par filière</span>
          </div>
          <div className="p-5">
            {filieresArr.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">Aucune filière enregistrée</p>
            ) : (
              <div className="space-y-4">
                {filieresArr.map((f, i) => {
                  const color = FILIERE_COLORS[i % FILIERE_COLORS.length]
                  const pct   = Math.round((f.total / totalGlobal) * 100)
                  return (
                    <div key={f.filiere}>
                      <div className="flex items-center justify-between mb-1.5 gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                          <span className="text-sm font-semibold" style={{ color: '#1a2744' }}>{f.filiere}</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-400 flex-shrink-0">
                          <span className="font-bold" style={{ color }}>{f.total} PFE · {pct}%</span>
                          {f.moyenne > 0 && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                                  style={{ backgroundColor: color + '20', color }}>
                              moy. {f.moyenne}/20
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="h-2.5 rounded-full overflow-hidden" style={{ backgroundColor: color + '20' }}>
                        <div className="h-2.5 rounded-full transition-all duration-700"
                             style={{ width: `${pct}%`, backgroundColor: color }} />
                      </div>
                      <div className="flex gap-4 mt-1">
                        <span className="text-[10px] text-gray-400">En cours : <strong style={{ color: '#0ea5e9' }}>{f.en_cours}</strong></span>
                        <span className="text-[10px] text-gray-400">Archivés : <strong style={{ color: '#475569' }}>{f.archives}</strong></span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Colonne droite — 2/5 */}
        <div className="lg:col-span-2 space-y-5">

          {/* Distribution des mentions */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-2">
              <svg width="14" height="14" fill="none" stroke="#1a2744" strokeWidth="2" viewBox="0 0 24 24">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
              </svg>
              <span className="text-sm font-semibold" style={{ color: '#1a2744' }}>Mentions</span>
            </div>
            <div className="p-5">
              {mentionDistrib.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-xs text-gray-400">Les mentions apparaissent après les soutenances notées</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {mentionDistrib.map(({ label, count, color, bg }) => {
                    const total = mentionDistrib.reduce((s, d) => s + d.count, 0)
                    const pct   = Math.round((count / total) * 100)
                    return (
                      <div key={label}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="font-semibold" style={{ color }}>{label}</span>
                          <span className="text-gray-400">{count} étud. · {pct}%</span>
                        </div>
                        <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: bg }}>
                          <div className="h-2 rounded-full transition-all duration-700"
                               style={{ width: `${pct}%`, backgroundColor: color }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Taux réussite */}
          {tauxReussite !== null && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-5">
              <div className="relative flex-shrink-0">
                <svg viewBox="0 0 36 36" width="80" height="80" className="-rotate-90">
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke="#f3f4f6" strokeWidth="3.5" />
                  <circle cx="18" cy="18" r="15.9" fill="none"
                    stroke={tauxReussite >= 70 ? '#2db84b' : tauxReussite >= 50 ? '#f59e0b' : '#ef4444'}
                    strokeWidth="3.5"
                    strokeDasharray={`${tauxReussite} ${100 - tauxReussite}`}
                    strokeLinecap="round" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-lg font-black" style={{ color: '#1a2744' }}>{tauxReussite}%</span>
                </div>
              </div>
              <div>
                <p className="text-sm font-bold" style={{ color: '#1a2744' }}>Taux de réussite</p>
                <p className="text-xs text-gray-400 mt-0.5">Étudiants ≥ 10/20</p>
                <p className="text-[11px] text-gray-400 mt-1">
                  {classArr.filter(r => r.note_finale >= 10).length}/{classArr.length} étudiants
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Classement ────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <svg width="14" height="14" fill="none" stroke="#1a2744" strokeWidth="2" viewBox="0 0 24 24">
              <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
            </svg>
            <span className="text-sm font-semibold" style={{ color: '#1a2744' }}>
              Classement {classArr.length > 0 ? `— ${classArr.length} résultat${classArr.length > 1 ? 's' : ''}` : ''}
            </span>
          </div>

          {/* Exports */}
          <div className="flex gap-2">
            {[
              { type: 'csv',   label: 'CSV',   color: '#15803d' },
              { type: 'excel', label: 'Excel', color: '#047857' },
              { type: 'pdf',   label: 'PDF',   color: '#b91c1c' },
            ].map(({ type, label, color }) => (
              <button key={type} onClick={() => handleExport(type)} disabled={!!exporting}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold border transition"
                style={{
                  color, borderColor: color + '40', backgroundColor: color + '10',
                  opacity: exporting && exporting !== type ? 0.5 : 1,
                }}>
                {exporting === type ? '...' : label}
              </button>
            ))}
          </div>
        </div>

        {/* Filtres */}
        <div className="px-5 py-3 border-b border-gray-50 flex gap-3 flex-wrap items-center">
          <select value={filiere} onChange={(e) => setFiliere(e.target.value)}
            className="px-3 py-2 rounded-xl text-sm border outline-none bg-white"
            style={{ borderColor: '#e5e7eb' }}>
            <option value="">Toutes les filières</option>
            {filieresArr.map((f) => <option key={f.filiere} value={f.filiere}>{f.filiere}</option>)}
          </select>
          <select value={annee} onChange={(e) => setAnnee(e.target.value)}
            className="px-3 py-2 rounded-xl text-sm border outline-none bg-white"
            style={{ borderColor: '#e5e7eb' }}>
            <option value="">Toutes les années</option>
            {anneesDispos.map((a) => <option key={a} value={a}>{a}</option>)}
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
          <div className="p-5 space-y-2">
            {[1,2,3,4,5].map((i) => <div key={i} className="h-10 rounded-xl bg-gray-50 animate-pulse" />)}
          </div>
        )}

        {!classLoading && classArr.length === 0 && (
          <div className="py-16 text-center">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3"
                 style={{ backgroundColor: '#f8fafc' }}>
              <svg width="24" height="24" fill="none" stroke="#cbd5e1" strokeWidth="1.5" viewBox="0 0 24 24">
                <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
              </svg>
            </div>
            <p className="text-sm font-semibold text-gray-400">Aucun résultat</p>
            <p className="text-xs text-gray-300 mt-1">Les notes finales apparaissent après les soutenances terminées</p>
            {(filiere || annee) && (
              <button onClick={() => { setFiliere(''); setAnnee('') }}
                className="mt-3 text-xs font-semibold px-3 py-1.5 rounded-xl"
                style={{ backgroundColor: '#eff6ff', color: '#1d4ed8' }}>
                Voir tous les résultats
              </button>
            )}
          </div>
        )}

        {!classLoading && classArr.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                  {['#', 'Étudiant', 'Filière', 'Année', 'Titre PFE', 'Note', 'Mention', 'Plagiat'].map((h) => (
                    <th key={h} className="text-left py-3 px-3 text-xs font-semibold text-gray-400 whitespace-nowrap first:pl-5">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {classArr.map((row) => {
                  const mention    = row.note_finale != null ? getMention(row.note_finale) : null
                  const rankColors = ['#f59e0b', '#94a3b8', '#b45309']
                  const rankBg     = row.rang <= 3 ? rankColors[row.rang - 1] : '#f1f5f9'
                  const rankFg     = row.rang <= 3 ? '#fff' : '#94a3b8'
                  const plagHigh   = row.score_plagiat > 30
                  const plagMed    = row.score_plagiat > 20
                  return (
                    <tr key={row.rang} className="hover:bg-gray-50 transition-colors">
                      <td className="py-3 pl-5 pr-2">
                        <span className="w-7 h-7 rounded-full inline-flex items-center justify-center text-xs font-bold"
                          style={{ backgroundColor: rankBg, color: rankFg }}>
                          {row.rang}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                               style={{ background: 'linear-gradient(135deg,#1e3a5f,#2db84b)' }}>
                            {row.etudiant?.split(' ').map(n => n[0]).slice(0,2).join('')}
                          </div>
                          <span className="font-semibold whitespace-nowrap" style={{ color: '#1a2744' }}>{row.etudiant}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-xs text-gray-500 whitespace-nowrap">{row.filiere}</td>
                      <td className="py-3 px-3 text-xs text-gray-500">{row.annee}</td>
                      <td className="py-3 px-3 text-xs text-gray-500 max-w-[180px]">
                        <span className="block truncate" title={row.titre}>{row.titre}</span>
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className="text-lg font-black" style={{ color: row.note_finale >= 10 ? '#15803d' : '#b91c1c' }}>
                          {row.note_finale}
                        </span>
                        <span className="text-xs text-gray-400">/20</span>
                      </td>
                      <td className="py-3 px-3">
                        {mention && (
                          <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap"
                            style={{ backgroundColor: mention.bg, color: mention.color }}>
                            {mention.label}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                          style={{
                            backgroundColor: plagHigh ? '#fef2f2' : plagMed ? '#fffbeb' : '#f0fdf4',
                            color:           plagHigh ? '#b91c1c' : plagMed ? '#b45309' : '#166534',
                          }}>
                          {row.score_plagiat ?? 0}%
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </DashboardLayout>
  )
}
