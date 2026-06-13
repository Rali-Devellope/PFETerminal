import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import DashboardLayout from '../../components/Layout/DashboardLayout'
import Card from '../../components/UI/Card'
import { getClassement, exportCSV, exportExcel, exportPDF, getStatsFilieres } from '../../api/stats'
import { getAnnees } from '../../api/pfe'
import { PVButton, ReleveButton, AttestationButton } from '../../components/UI/PdfButtons'
import { SCOLARITE_NAV_ITEMS } from './_nav'

function NavIcon({ d }) {
  return <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d={d} /></svg>
}

function getMention(note, t) {
  if (note >= 16) return { label: t('scolarite.mention_tb'), color: '#15803d' }
  if (note >= 14) return { label: t('scolarite.mention_b'),  color: '#2db84b' }
  if (note >= 12) return { label: t('scolarite.mention_ab'), color: '#f59e0b' }
  if (note >= 10) return { label: t('scolarite.mention_p'),  color: '#d97706' }
  return              { label: t('scolarite.mention_i'),     color: '#ef4444' }
}

function downloadBlob(data, filename, mime) {
  const url = URL.createObjectURL(new Blob([data], { type: mime }))
  const a = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

export default function ScolariteClassement() {
  const { t } = useTranslation()

  const NAV_ITEMS = SCOLARITE_NAV_ITEMS.map((item) => ({ ...item, icon: <NavIcon d={item.iconPath} /> }))

  const [filiere,   setFiliere]   = useState('')
  const [annee,     setAnnee]     = useState('')
  const [search,    setSearch]    = useState('')
  const [exporting, setExporting] = useState('')

  const { data: filieresRes } = useQuery({
    queryKey: ['stats-filieres-list'],
    queryFn: getStatsFilieres,
  })
  const { data: anneesRes } = useQuery({
    queryKey: ['annees-list'],
    queryFn: getAnnees,
  })

  const filieresArr = (filieresRes?.data?.data ?? []).map((f) => f.filiere).filter(Boolean)

  const anneesRaw = anneesRes?.data?.results ?? anneesRes?.data?.data ?? anneesRes?.data ?? []
  const anneesArr = Array.isArray(anneesRaw)
    ? [...new Set(anneesRaw.flatMap((a) => (a.libelle ?? '').split('-').map((p) => p.trim()).filter((p) => /^\d{4}$/.test(p))))]
    : []

  const { data: classementRes, isLoading } = useQuery({
    queryKey: ['classement', filiere, annee],
    queryFn: () => getClassement({ filiere: filiere || undefined, annee: annee || undefined }),
  })

  const classement = classementRes?.data?.data ?? []
  const classementArr = (Array.isArray(classement) ? classement : [])
    .filter((r) => !search || r.etudiant?.toLowerCase().includes(search.toLowerCase()) || r.titre?.toLowerCase().includes(search.toLowerCase()))

  const handleExport = async (type) => {
    setExporting(type)
    try {
      if (type === 'csv')   { const { data } = await exportCSV();   downloadBlob(data, 'classement_pfe.csv',  'text/csv') }
      if (type === 'excel') { const { data } = await exportExcel(); downloadBlob(data, 'classement_pfe.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') }
      if (type === 'pdf')   { const { data } = await exportPDF();   downloadBlob(data, 'classement_pfe.pdf',  'application/pdf') }
    } finally { setExporting('') }
  }

  return (
    <DashboardLayout navItems={NAV_ITEMS}>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: '#1a2744' }}>{t('scolarite.classement_title')}</h1>
        <p className="text-sm text-gray-500 mt-1">{t('scolarite.classement_sub')}</p>
      </div>

      <Card title={t('scolarite.classement_title')}
        icon={<svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>}>

        <div className="flex flex-wrap gap-3 mb-5">
          <div className="relative flex-1 min-w-40">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" width="13" height="13"
              fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un étudiant..."
              className="w-full pl-8 pr-3 py-2 rounded-xl text-sm border outline-none bg-white" style={{ borderColor: '#e5e7eb' }}
              onFocus={(e) => (e.target.style.borderColor = '#2db84b')}
              onBlur={(e) => (e.target.style.borderColor = '#e5e7eb')} />
          </div>
          <select value={filiere} onChange={(e) => setFiliere(e.target.value)}
            className="px-3 py-2 rounded-xl text-sm border outline-none bg-white" style={{ borderColor: '#e5e7eb' }}>
            <option value="">{t('scolarite.filter_filiere')}</option>
            {filieresArr.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
          <select value={annee} onChange={(e) => setAnnee(e.target.value)}
            className="px-3 py-2 rounded-xl text-sm border outline-none bg-white" style={{ borderColor: '#e5e7eb' }}>
            <option value="">{t('scolarite.filter_annee')}</option>
            {anneesArr.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
          <div className="flex gap-2 ms-auto">
            {[
              { key: 'csv',   label: t('scolarite.export_csv'),   color: '#15803d', icon: 'C' },
              { key: 'excel', label: t('scolarite.export_excel'), color: '#1d4ed8', icon: 'X' },
              { key: 'pdf',   label: t('scolarite.export_pdf'),   color: '#b91c1c', icon: 'P' },
            ].map(({ key, label, color, icon }) => (
              <button key={key} onClick={() => handleExport(key)} disabled={!!exporting}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-white"
                style={{ backgroundColor: exporting === key ? color + '99' : color }}>
                <span className="font-black text-[10px] w-4 h-4 rounded flex items-center justify-center"
                  style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>{icon}</span>
                {exporting === key ? t('scolarite.downloading') : label}
              </button>
            ))}
          </div>
        </div>

        {isLoading && <div className="space-y-2">{[1,2,3,4].map((i) => <div key={i} className="h-12 rounded-xl bg-gray-50 animate-pulse" />)}</div>}
        {!isLoading && classementArr.length === 0 && <p className="text-sm text-gray-400 py-6 text-center">{t('scolarite.no_data')}</p>}
        {!isLoading && classementArr.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '2px solid #f1f5f9' }}>
                  {[t('scolarite.col_rang'), t('scolarite.col_etudiant'), t('scolarite.col_filiere'),
                    t('scolarite.col_annee'), t('scolarite.col_titre'), t('scolarite.col_note'),
                    t('scolarite.col_plagiat'), 'PDF'].map((h) => (
                    <th key={h} className="text-left py-3 px-2 text-xs font-semibold text-gray-400 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {classementArr.map((row) => {
                  const mention = getMention(row.note_finale, t)
                  return (
                    <tr key={row.rang} className="hover:bg-gray-50 transition">
                      <td className="py-3 px-2">
                        <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white inline-flex"
                          style={{ backgroundColor: row.rang <= 3 ? '#f59e0b' : '#cbd5e1' }}>
                          {row.rang}
                        </span>
                      </td>
                      <td className="py-3 px-2 font-medium" style={{ color: '#1a2744' }}>{row.etudiant}</td>
                      <td className="py-3 px-2 text-gray-500">{row.filiere}</td>
                      <td className="py-3 px-2 text-gray-500">{row.annee}</td>
                      <td className="py-3 px-2 text-gray-500 max-w-xs truncate">{row.titre}</td>
                      <td className="py-3 px-2">
                        <span className="font-bold" style={{ color: mention.color }}>{row.note_finale}/20</span>
                        <span className="ml-1.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                          style={{ backgroundColor: mention.color + '18', color: mention.color }}>
                          {mention.label}
                        </span>
                      </td>
                      <td className="py-3 px-2">
                        <span className="text-xs font-medium"
                          style={{ color: row.score_plagiat > 30 ? '#ef4444' : row.score_plagiat > 20 ? '#f59e0b' : '#6b7280' }}>
                          {row.score_plagiat}%
                        </span>
                      </td>
                      <td className="py-3 px-2">
                        {row.soutenance_id && (
                          <div className="flex gap-1 flex-wrap">
                            <PVButton soutenanceId={row.soutenance_id} />
                            <ReleveButton soutenanceId={row.soutenance_id} />
                            {row.note_finale >= 10 && <AttestationButton soutenanceId={row.soutenance_id} />}
                          </div>
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
