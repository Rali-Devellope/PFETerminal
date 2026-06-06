import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import DashboardLayout from '../../components/Layout/DashboardLayout'
import Card, { StatCard } from '../../components/UI/Card'
import { getStatsGlobales, getClassement, exportCSV, exportExcel, exportPDF } from '../../api/stats'
import { useAuthStore } from '../../store/authStore'
import { ROLE_DASHBOARDS } from '../../components/ProtectedRoute'

const FILIERES = ['', 'Finance', 'Comptabilité', 'Audit', 'Management', 'Informatique']
const ANNEES = ['', ...Array.from({ length: 6 }, (_, i) => String(new Date().getFullYear() - i))]

function getMention(note) {
  if (note >= 16) return { label: 'Très bien',   color: '#15803d', bg: '#f0fdf4' }
  if (note >= 14) return { label: 'Bien',         color: '#1d4ed8', bg: '#eff6ff' }
  if (note >= 12) return { label: 'Assez bien',   color: '#0369a1', bg: '#f0f9ff' }
  if (note >= 10) return { label: 'Passable',     color: '#b45309', bg: '#fffbeb' }
  return              { label: 'Insuffisant',  color: '#b91c1c', bg: '#fef2f2' }
}

function downloadBlob(data, filename, mime) {
  const url = URL.createObjectURL(new Blob([data], { type: mime }))
  const a = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

function MiniBar({ label, value, total, color }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="font-medium" style={{ color: '#1a2744' }}>{label}</span>
        <span className="text-gray-400">{value} ({pct}%)</span>
      </div>
      <div className="h-1.5 rounded-full bg-gray-100">
        <div className="h-1.5 rounded-full transition-all duration-500"
             style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  )
}

export default function Stats() {
  const { t } = useTranslation()
  const { user } = useAuthStore()
  const [filiere, setFiliere] = useState('')
  const [annee, setAnnee] = useState('')
  const [exporting, setExporting] = useState(null)

  const homeRoute = ROLE_DASHBOARDS[user?.role] ?? '/login'

  const NAV_ITEMS = [
    { to: homeRoute, end: true, label: t('nav.vue_ensemble'),
      icon: <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg> },
    { to: '/stats', label: t('nav.statistiques'),
      icon: <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg> },
  ]

  const { data: statsRes } = useQuery({ queryKey: ['stats-globales'], queryFn: getStatsGlobales })
  const { data: classRes, isLoading: classLoading } = useQuery({
    queryKey: ['classement', filiere, annee],
    queryFn: () => getClassement({ filiere: filiere || undefined, annee: annee || undefined }),
  })

  const s = statsRes?.data?.data ?? {}
  const classArr = (() => {
    const raw = classRes?.data?.data ?? classRes?.data ?? []
    return Array.isArray(raw) ? raw : []
  })()

  const total = s.total_pfe || 1
  const tauxReussite = classArr.length > 0
    ? Math.round((classArr.filter((r) => r.note_finale >= 10).length / classArr.length) * 100)
    : 0

  const handleExport = async (type) => {
    setExporting(type)
    try {
      if (type === 'csv')   { const { data } = await exportCSV();   downloadBlob(data, 'classement.csv',  'text/csv') }
      if (type === 'excel') { const { data } = await exportExcel(); downloadBlob(data, 'classement.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') }
      if (type === 'pdf')   { const { data } = await exportPDF();   downloadBlob(data, 'classement.pdf',  'application/pdf') }
    } catch { /* ignore */ } finally { setExporting(null) }
  }

  return (
    <DashboardLayout navItems={NAV_ITEMS}>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: '#1a2744' }}>
          {t('nav.statistiques')}
        </h1>
        <p className="text-sm text-gray-500 mt-1">Bilan global des projets de fin d&apos;études — ISCAE</p>
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <StatCard label="PFE total" value={s.total_pfe ?? '—'} color="#2db84b"
          icon={<svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>} />
        <StatCard label="PFE en cours" value={s.pfe_en_cours ?? '—'} color="#0ea5e9"
          icon={<svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>} />
        <StatCard label="Soutenances terminées" value={s.soutenances_terminees ?? '—'} color="#7e22ce"
          icon={<svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>} />
        <StatCard label="Moyenne générale" value={s.moyenne_notes ? `${s.moyenne_notes}/20` : '—'} color="#f59e0b"
          icon={<svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>} />
      </div>

      <div className="grid gap-5 lg:grid-cols-3 mb-5">
        {/* Répartition PFE */}
        <Card title="Répartition des PFE"
          icon={<svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/></svg>}>
          <div className="space-y-4 py-2">
            <MiniBar label="En cours"  value={s.pfe_en_cours ?? 0}  total={total} color="#0ea5e9" />
            <MiniBar label="Archivés"  value={s.pfe_archives ?? 0}  total={total} color="#7e22ce" />
            <MiniBar label="Sujets en attente" value={s.sujets_en_attente ?? 0} total={s.total_sujets || 1} color="#f59e0b" />
          </div>
        </Card>

        {/* Taux de réussite */}
        <Card title="Taux de réussite"
          icon={<svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>}>
          <div className="flex flex-col items-center py-4">
            <div className="relative w-24 h-24 mb-4">
              <svg viewBox="0 0 36 36" className="w-24 h-24 -rotate-90">
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="#f3f4f6" strokeWidth="3" />
                <circle cx="18" cy="18" r="15.9" fill="none"
                        stroke={tauxReussite >= 70 ? '#2db84b' : tauxReussite >= 50 ? '#f59e0b' : '#ef4444'}
                        strokeWidth="3"
                        strokeDasharray={`${tauxReussite} ${100 - tauxReussite}`}
                        strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xl font-black" style={{ color: '#1a2744' }}>{tauxReussite}%</span>
              </div>
            </div>
            <p className="text-xs text-gray-500 text-center">
              Étudiants ayant obtenu une note ≥ 10/20
            </p>
          </div>
        </Card>

        {/* Exports */}
        <Card title="Exporter les données"
          icon={<svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>}>
          <p className="text-xs text-gray-400 mb-3">Télécharger le classement complet</p>
          <div className="space-y-2">
            {[
              { type: 'csv',   label: 'CSV',   color: '#15803d', bg: '#f0fdf4' },
              { type: 'excel', label: 'Excel', color: '#047857', bg: '#ecfdf5' },
              { type: 'pdf',   label: 'PDF',   color: '#b91c1c', bg: '#fef2f2' },
            ].map(({ type, label, color, bg }) => (
              <button key={type} onClick={() => handleExport(type)} disabled={!!exporting}
                className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition hover:opacity-80"
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
      <Card title={`Classement des étudiants${classArr.length > 0 ? ` (${classArr.length})` : ''}`}
        icon={<svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/></svg>}>

        <div className="flex flex-wrap gap-3 mb-4">
          <select value={filiere} onChange={(e) => setFiliere(e.target.value)}
            className="px-3 py-2 rounded-xl text-sm border outline-none bg-white" style={{ borderColor: '#e5e7eb' }}>
            {FILIERES.map((f) => <option key={f} value={f}>{f || 'Toutes les filières'}</option>)}
          </select>
          <select value={annee} onChange={(e) => setAnnee(e.target.value)}
            className="px-3 py-2 rounded-xl text-sm border outline-none bg-white" style={{ borderColor: '#e5e7eb' }}>
            {ANNEES.map((a) => <option key={a} value={a}>{a || 'Toutes les années'}</option>)}
          </select>
        </div>

        {classLoading && (
          <div className="space-y-2">{[1,2,3,4,5].map((i) => <div key={i} className="h-12 rounded-xl bg-gray-50 animate-pulse" />)}</div>
        )}
        {!classLoading && classArr.length === 0 && (
          <p className="text-sm text-gray-400 py-6 text-center">Aucun résultat disponible — les notes finales apparaîtront ici après les soutenances.</p>
        )}
        {!classLoading && classArr.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '2px solid #f1f5f9' }}>
                  {['#', 'Étudiant', 'Filière', 'Année', 'Titre PFE', 'Note', 'Mention'].map((h) => (
                    <th key={h} className="text-left py-3 px-2 text-xs font-semibold text-gray-400 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {classArr.map((row) => {
                  const mention = row.note_finale != null ? getMention(row.note_finale) : null
                  const rankColor = row.rang === 1 ? '#f59e0b' : row.rang === 2 ? '#9ca3af' : row.rang === 3 ? '#b45309' : '#d1d5db'
                  return (
                    <tr key={row.rang} className="hover:bg-gray-50 transition">
                      <td className="py-3 px-2">
                        <span className="w-7 h-7 rounded-full inline-flex items-center justify-center text-xs font-bold text-white"
                              style={{ backgroundColor: rankColor }}>
                          {row.rang}
                        </span>
                      </td>
                      <td className="py-3 px-2 font-medium" style={{ color: '#1a2744' }}>{row.etudiant}</td>
                      <td className="py-3 px-2 text-gray-500 text-xs">{row.filiere}</td>
                      <td className="py-3 px-2 text-gray-500 text-xs">{row.annee}</td>
                      <td className="py-3 px-2 text-gray-500 text-xs max-w-[180px] truncate">{row.titre}</td>
                      <td className="py-3 px-2">
                        <span className="font-bold" style={{ color: row.note_finale >= 10 ? '#15803d' : '#b91c1c' }}>
                          {row.note_finale}/20
                        </span>
                      </td>
                      <td className="py-3 px-2">
                        {mention && (
                          <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap"
                                style={{ backgroundColor: mention.bg, color: mention.color }}>
                            {mention.label}
                          </span>
                        )}
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
