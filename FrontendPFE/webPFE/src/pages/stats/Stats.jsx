import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import DashboardLayout from '../../components/Layout/DashboardLayout'
import Card, { StatCard } from '../../components/UI/Card'
import { getStatsGlobales, getClassement, exportCSV, exportExcel, exportPDF } from '../../api/stats'

const NAV_ITEMS = [
  { to: '/stats', end: true, label: 'Statistiques',
    icon: <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg> },
]

const FILIERES = ['', 'Finance', 'Comptabilité', 'Audit', 'Management', 'Informatique']

function downloadBlob(response, filename) {
  const url = window.URL.createObjectURL(new Blob([response.data]))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  window.URL.revokeObjectURL(url)
}

function getMention(note) {
  if (note >= 16) return { label: 'Très bien', color: '#15803d', bg: '#f0fdf4' }
  if (note >= 14) return { label: 'Bien', color: '#1d4ed8', bg: '#eff6ff' }
  if (note >= 12) return { label: 'Assez bien', color: '#0369a1', bg: '#f0f9ff' }
  if (note >= 10) return { label: 'Passable', color: '#b45309', bg: '#fffbeb' }
  return { label: 'Insuffisant', color: '#b91c1c', bg: '#fef2f2' }
}

export default function Stats() {
  const [filiere, setFiliere] = useState('')
  const [exporting, setExporting] = useState(null)

  const { data: statsRes } = useQuery({ queryKey: ['stats-globales'], queryFn: getStatsGlobales })
  const { data: classRes, isLoading: classLoading } = useQuery({
    queryKey: ['classement', filiere],
    queryFn: () => getClassement(filiere ? { filiere } : {}),
  })

  const stats = statsRes?.data?.data ?? {}
  const classement = classRes?.data?.results ?? classRes?.data?.data ?? classRes?.data ?? []
  const classArr = Array.isArray(classement) ? classement : []

  const handleExport = async (type) => {
    setExporting(type)
    try {
      let res
      if (type === 'csv') { res = await exportCSV(); downloadBlob(res, 'classement.csv') }
      else if (type === 'excel') { res = await exportExcel(); downloadBlob(res, 'classement.xlsx') }
      else if (type === 'pdf') { res = await exportPDF(); downloadBlob(res, 'classement.pdf') }
    } catch {
      // silently ignore export errors
    } finally {
      setExporting(null)
    }
  }

  const taux = stats.total_pfe > 0
    ? Math.round(((stats.total_pfe - (stats.total_pfe - (stats.notes_soumises ?? 0))) / stats.total_pfe) * 100)
    : 0

  return (
    <DashboardLayout navItems={NAV_ITEMS}>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: '#1a2744' }}>Statistiques</h1>
        <p className="text-sm text-gray-500 mt-1">Bilan global des projets de fin d&apos;études</p>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <StatCard label="PFE total" value={stats.total_pfe ?? '—'} color="#2db84b"
          icon={<svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>} />
        <StatCard label="Moyenne générale" value={stats.moyenne_generale ? `${Number(stats.moyenne_generale).toFixed(2)}/20` : '—'} color="#0ea5e9"
          icon={<svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>} />
        <StatCard label="Sujets validés" value={stats.sujets_valides ?? '—'} color="#7e22ce"
          icon={<svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>} />
        <StatCard label="Soutenances planifiées" value={stats.soutenances_planifiees ?? '—'} color="#f59e0b"
          icon={<svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/></svg>} />
      </div>

      <div className="grid gap-5 lg:grid-cols-3 mb-5">
        {/* Répartition par filière */}
        {stats.par_filiere && (
          <Card title="Répartition par filière"
            icon={<svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/><line x1="2" y1="12" x2="22" y2="12"/></svg>}>
            <div className="space-y-3">
              {Object.entries(stats.par_filiere).map(([fil, count]) => {
                const total = stats.total_pfe || 1
                const pct = Math.round((count / total) * 100)
                return (
                  <div key={fil}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium" style={{ color: '#1a2744' }}>{fil}</span>
                      <span className="text-gray-400">{count} ({pct}%)</span>
                    </div>
                    <div className="h-1.5 rounded-full" style={{ backgroundColor: '#f3f4f6' }}>
                      <div className="h-1.5 rounded-full transition-all"
                           style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #2db84b, #0ea5e9)' }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>
        )}

        {/* Taux de réussite */}
        <Card title="Taux de réussite"
          icon={<svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>}>
          <div className="flex flex-col items-center py-4">
            <div className="relative w-24 h-24 mb-4">
              <svg viewBox="0 0 36 36" className="w-24 h-24 -rotate-90">
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="#f3f4f6" strokeWidth="3" />
                <circle cx="18" cy="18" r="15.9" fill="none"
                        stroke={taux >= 70 ? '#2db84b' : taux >= 50 ? '#f59e0b' : '#ef4444'}
                        strokeWidth="3"
                        strokeDasharray={`${taux} ${100 - taux}`}
                        strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xl font-black" style={{ color: '#1a2744' }}>{taux}%</span>
              </div>
            </div>
            <p className="text-xs text-gray-500 text-center">
              Étudiants ayant obtenu une note supérieure à 10/20
            </p>
          </div>
        </Card>

        {/* Exports */}
        <Card title="Exporter les données"
          icon={<svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>}>
          <div className="space-y-3">
            <p className="text-xs text-gray-400 mb-2">Télécharger le classement complet</p>
            {[
              { type: 'csv', label: 'Exporter CSV', color: '#15803d', bg: '#f0fdf4',
                icon: <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> },
              { type: 'excel', label: 'Exporter Excel', color: '#047857', bg: '#ecfdf5',
                icon: <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18"/></svg> },
              { type: 'pdf', label: 'Exporter PDF', color: '#b91c1c', bg: '#fef2f2',
                icon: <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/></svg> },
            ].map(({ type, label, color, bg, icon }) => (
              <button key={type} onClick={() => handleExport(type)} disabled={!!exporting}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition hover:opacity-80"
                style={{ backgroundColor: bg, color, opacity: exporting && exporting !== type ? 0.5 : 1 }}>
                {exporting === type ? (
                  <svg className="animate-spin" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" strokeLinecap="round" />
                  </svg>
                ) : icon}
                {exporting === type ? 'Génération...' : label}
              </button>
            ))}
          </div>
        </Card>
      </div>

      {/* Classement */}
      <Card title="Classement des étudiants"
        action={
          <select value={filiere} onChange={(e) => setFiliere(e.target.value)}
            className="px-2 py-1 rounded-lg text-xs border bg-white outline-none"
            style={{ borderColor: '#e5e7eb', color: '#374151' }}>
            {FILIERES.map((f) => <option key={f} value={f}>{f || 'Toutes les filières'}</option>)}
          </select>
        }
        icon={<svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>}>
        {classLoading && (
          <div className="space-y-3">
            {[1,2,3,4,5].map((i) => <div key={i} className="h-12 rounded-xl bg-gray-50 animate-pulse" />)}
          </div>
        )}
        {!classLoading && classArr.length === 0 && (
          <p className="text-sm text-gray-400 py-4 text-center">Aucun résultat disponible</p>
        )}
        {!classLoading && classArr.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-400 border-b border-gray-100">
                  <th className="pb-2 text-left font-semibold w-10">#</th>
                  <th className="pb-2 text-left font-semibold">Étudiant</th>
                  <th className="pb-2 text-left font-semibold">Filière</th>
                  <th className="pb-2 text-right font-semibold">Note</th>
                  <th className="pb-2 text-right font-semibold">Mention</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {classArr.map((item, idx) => {
                  const note = item.note_finale ?? item.note
                  const mention = note != null ? getMention(note) : null
                  return (
                    <tr key={item.id ?? idx}>
                      <td className="py-3 pr-3">
                        <span className="text-xs font-bold"
                              style={{ color: idx === 0 ? '#f59e0b' : idx === 1 ? '#9ca3af' : idx === 2 ? '#b45309' : '#d1d5db' }}>
                          {idx + 1}
                        </span>
                      </td>
                      <td className="py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                               style={{ backgroundColor: '#1e3a5f' }}>
                            {item.etudiant?.prenom?.[0]}{item.etudiant?.nom?.[0]}
                          </div>
                          <div>
                            <p className="font-medium" style={{ color: '#1a2744' }}>
                              {item.etudiant?.prenom} {item.etudiant?.nom}
                            </p>
                            <p className="text-xs text-gray-400">{item.sujet?.titre?.slice(0, 40)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 text-xs text-gray-400">{item.sujet?.filiere ?? '—'}</td>
                      <td className="py-3 text-right">
                        {note != null ? (
                          <span className="font-bold" style={{ color: note >= 10 ? '#15803d' : '#b91c1c' }}>
                            {Number(note).toFixed(2)}
                          </span>
                        ) : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="py-3 text-right">
                        {mention ? (
                          <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold"
                                style={{ backgroundColor: mention.bg, color: mention.color }}>
                            {mention.label}
                          </span>
                        ) : <span className="text-gray-300 text-xs">—</span>}
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
