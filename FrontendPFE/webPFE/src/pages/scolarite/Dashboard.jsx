import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import DashboardLayout from '../../components/Layout/DashboardLayout'
import Card, { StatCard } from '../../components/UI/Card'
import { getStatsGlobales, getClassement, exportCSV, exportExcel, exportPDF } from '../../api/stats'
import { getPFEs, archiverPFE } from '../../api/pfe'
import { createUser } from '../../api/auth'
import { PVButton, ReleveButton, AttestationButton } from '../../components/UI/PdfButtons'

const FILIERES = ['', 'Finance', 'Comptabilité', 'Audit', 'Management', 'Informatique']
const ANNEES = ['', ...Array.from({ length: 6 }, (_, i) => String(new Date().getFullYear() - i))]

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
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export default function ScolariteDashboard() {
  const { t } = useTranslation()
  const [filiere, setFiliere] = useState('')
  const [annee, setAnnee] = useState('')
  const [search, setSearch] = useState('')
  const [exporting, setExporting] = useState('')
  const [showEtudiantForm, setShowEtudiantForm] = useState(false)
  const [etudiantForm, setEtudiantForm] = useState({ prenom: '', nom: '', email: '', password: '', filiere: '' })
  const [etudiantError, setEtudiantError] = useState('')
  const [etudiantSuccess, setEtudiantSuccess] = useState('')

  const NAV_ITEMS = [
    { to: '/scolarite', end: true, label: t('scolarite.title'),
      icon: <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg> },
    { to: '/stats', label: t('nav.statistiques'),
      icon: <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg> },
  ]

  const qc = useQueryClient()

  const { data: statsRes } = useQuery({
    queryKey: ['stats-globales'],
    queryFn: getStatsGlobales,
  })

  const { data: pfesRes } = useQuery({
    queryKey: ['pfe-scolarite'],
    queryFn: () => getPFEs({ statut: 'EN_COURS' }),
  })

  const pfesArr = (() => {
    const raw = pfesRes?.data?.results ?? pfesRes?.data?.data ?? []
    return Array.isArray(raw) ? raw : []
  })()

  const archiverMut = useMutation({
    mutationFn: archiverPFE,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pfe-scolarite'] }),
  })

  const createEtudiantMut = useMutation({
    mutationFn: (data) => createUser({ ...data, role: 'etudiant' }),
    onSuccess: () => {
      setEtudiantSuccess('Compte étudiant créé. Email envoyé.')
      setEtudiantForm({ prenom: '', nom: '', email: '', password: '', filiere: '' })
      setEtudiantError('')
      setTimeout(() => setEtudiantSuccess(''), 4000)
    },
    onError: (e) => {
      const err = e.response?.data
      setEtudiantError(err?.error?.message ?? err?.email?.[0] ?? 'Erreur lors de la création')
    },
  })

  const handleCreateEtudiant = (e) => {
    e.preventDefault()
    if (!etudiantForm.prenom || !etudiantForm.nom || !etudiantForm.email || !etudiantForm.password) {
      setEtudiantError('Remplissez tous les champs obligatoires'); return
    }
    setEtudiantError('')
    createEtudiantMut.mutate(etudiantForm)
  }

  const { data: classementRes, isLoading } = useQuery({
    queryKey: ['classement', filiere, annee],
    queryFn: () => getClassement({ filiere: filiere || undefined, annee: annee || undefined }),
  })

  const stats = statsRes?.data?.data ?? {}
  const classement = classementRes?.data?.data ?? []
  const classementArr = (Array.isArray(classement) ? classement : [])
    .filter((r) => !search || r.etudiant?.toLowerCase().includes(search.toLowerCase()) || r.titre?.toLowerCase().includes(search.toLowerCase()))

  const handleExport = async (type) => {
    setExporting(type)
    try {
      const params = `?${filiere ? `filiere=${filiere}&` : ''}${annee ? `annee=${annee}` : ''}`
      if (type === 'csv') {
        const { data } = await exportCSV()
        downloadBlob(data, `classement_pfe${params}.csv`, 'text/csv')
      } else if (type === 'excel') {
        const { data } = await exportExcel()
        downloadBlob(data, `classement_pfe${params}.xlsx`, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      } else if (type === 'pdf') {
        const { data } = await exportPDF()
        downloadBlob(data, `classement_pfe${params}.pdf`, 'application/pdf')
      }
    } finally {
      setExporting('')
    }
  }

  return (
    <DashboardLayout navItems={NAV_ITEMS}>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: '#1a2744' }}>
          {t('scolarite.title')}
        </h1>
        <p className="text-sm text-gray-500 mt-1">{t('scolarite.sub')}</p>
      </div>

      {/* Bouton + formulaire créer étudiant */}
      <div className="mb-6">
        <button onClick={() => { setShowEtudiantForm((v) => !v); setEtudiantError(''); setEtudiantSuccess('') }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white mb-4"
          style={{ background: 'linear-gradient(135deg, #2db84b, #1e8c36)', boxShadow: '0 4px 12px rgba(45,184,75,0.3)' }}>
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            {showEtudiantForm ? <line x1="18" y1="6" x2="6" y2="18"/> : <><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>}
          </svg>
          {showEtudiantForm ? t('common.cancel') : 'Inscrire un étudiant'}
        </button>

        {showEtudiantForm && (
          <div className="bg-white rounded-2xl p-6 mb-4" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9' }}>
            <h3 className="text-sm font-bold mb-4" style={{ color: '#1a2744' }}>
              Nouveau compte étudiant
            </h3>

            {etudiantSuccess && (
              <div className="mb-4 px-4 py-3 rounded-xl text-sm" style={{ backgroundColor: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0' }}>
                ✓ {etudiantSuccess}
              </div>
            )}
            {etudiantError && (
              <div className="mb-4 px-4 py-3 rounded-xl text-sm" style={{ backgroundColor: '#fef2f2', color: '#b91c1c' }}>
                {etudiantError}
              </div>
            )}

            <form onSubmit={handleCreateEtudiant} className="grid sm:grid-cols-2 gap-4">
              {[
                { key: 'prenom',   label: 'Prénom *',          ph: 'Prénom' },
                { key: 'nom',      label: 'Nom *',             ph: 'Nom de famille' },
                { key: 'email',    label: 'Email @iscae.mr *', ph: 'etudiant@iscae.mr', type: 'email' },
                { key: 'password', label: 'Mot de passe *',    ph: '••••••••', type: 'password' },
                { key: 'filiere',  label: 'Filière',           ph: 'Finance, Informatique...' },
              ].map(({ key, label, ph, type = 'text' }) => (
                <div key={key}>
                  <label className="block text-xs font-semibold mb-1.5 text-gray-600">{label}</label>
                  <input type={type} value={etudiantForm[key]}
                    onChange={(e) => setEtudiantForm({ ...etudiantForm, [key]: e.target.value })}
                    placeholder={ph}
                    className="w-full px-3 py-2.5 rounded-xl text-sm border outline-none"
                    style={{ borderColor: '#e5e7eb' }}
                    onFocus={(e) => (e.target.style.borderColor = '#2db84b')}
                    onBlur={(e) => (e.target.style.borderColor = '#e5e7eb')} />
                </div>
              ))}
              <div className="sm:col-span-2 flex justify-end">
                <button type="submit" disabled={createEtudiantMut.isPending}
                  className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white"
                  style={{ backgroundColor: '#2db84b', opacity: createEtudiantMut.isPending ? 0.7 : 1 }}>
                  {createEtudiantMut.isPending ? 'Création...' : 'Créer le compte'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <StatCard label={t('scolarite.stat_pfe')} value={stats.total_pfe ?? '—'} color="#1e3a5f"
          icon={<svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>} />
        <StatCard label={t('scolarite.stat_archives')} value={stats.pfe_archives ?? '—'} color="#7e22ce"
          icon={<svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>} />
        <StatCard label={t('scolarite.stat_souts')} value={stats.soutenances_terminees ?? '—'} color="#0ea5e9"
          icon={<svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/></svg>} />
        <StatCard label={t('scolarite.stat_moyenne')} value={stats.moyenne_notes ? `${stats.moyenne_notes}/20` : '—'} color="#2db84b"
          icon={<svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>} />
      </div>

      {/* Archivage PFE */}
      {pfesArr.length > 0 && (
        <Card title={`PFE à archiver (${pfesArr.length})`} className="mb-5"
          icon={<svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>}>
          <div className="divide-y divide-gray-50">
            {pfesArr.map((p) => (
              <div key={p.id} className="py-3 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold" style={{ color: '#1a2744' }}>
                    {p.etudiant?.prenom} {p.etudiant?.nom}
                  </p>
                  <p className="text-xs text-gray-400">{p.titre} · {p.filiere} · {p.annee}</p>
                </div>
                <button onClick={() => archiverMut.mutate(p.id)} disabled={archiverMut.isPending}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold flex-shrink-0"
                  style={{ backgroundColor: '#faf5ff', color: '#7e22ce' }}>
                  Archiver
                </button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Classement */}
      <Card
        title={t('scolarite.classement_title')}
        icon={<svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>}
      >
        {/* Filtres + exports */}
        <div className="flex flex-wrap gap-3 mb-5">
          <div className="relative flex-1 min-w-40">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" width="13" height="13"
                 fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un étudiant..."
              className="w-full pl-8 pr-3 py-2 rounded-xl text-sm border outline-none bg-white"
              style={{ borderColor: '#e5e7eb' }}
              onFocus={(e) => (e.target.style.borderColor = '#2db84b')}
              onBlur={(e) => (e.target.style.borderColor = '#e5e7eb')} />
          </div>
          <select value={filiere} onChange={(e) => setFiliere(e.target.value)}
            className="px-3 py-2 rounded-xl text-sm border outline-none bg-white" style={{ borderColor: '#e5e7eb' }}>
            <option value="">{t('scolarite.filter_filiere')}</option>
            {FILIERES.filter(Boolean).map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
          <select value={annee} onChange={(e) => setAnnee(e.target.value)}
            className="px-3 py-2 rounded-xl text-sm border outline-none bg-white" style={{ borderColor: '#e5e7eb' }}>
            <option value="">{t('scolarite.filter_annee')}</option>
            {ANNEES.filter(Boolean).map((a) => <option key={a} value={a}>{a}</option>)}
          </select>

          <div className="flex gap-2 ms-auto">
            {[
              { key: 'csv',   label: t('scolarite.export_csv'),   color: '#15803d', icon: 'C' },
              { key: 'excel', label: t('scolarite.export_excel'), color: '#1d4ed8', icon: 'X' },
              { key: 'pdf',   label: t('scolarite.export_pdf'),   color: '#b91c1c', icon: 'P' },
            ].map(({ key, label, color, icon }) => (
              <button key={key} onClick={() => handleExport(key)} disabled={!!exporting}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-white transition"
                style={{ backgroundColor: exporting === key ? color + '99' : color }}>
                <span className="font-black text-[10px] w-4 h-4 rounded flex items-center justify-center"
                      style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>{icon}</span>
                {exporting === key ? t('scolarite.downloading') : label}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        {isLoading && (
          <div className="space-y-2">
            {[1,2,3,4].map((i) => <div key={i} className="h-12 rounded-xl bg-gray-50 animate-pulse" />)}
          </div>
        )}

        {!isLoading && classementArr.length === 0 && (
          <p className="text-sm text-gray-400 py-6 text-center">{t('scolarite.no_data')}</p>
        )}

        {!isLoading && classementArr.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '2px solid #f1f5f9' }}>
                  {[
                    t('scolarite.col_rang'), t('scolarite.col_etudiant'),
                    t('scolarite.col_filiere'), t('scolarite.col_annee'),
                    t('scolarite.col_titre'), t('scolarite.col_note'), t('scolarite.col_plagiat'), 'PDF',
                  ].map((h) => (
                    <th key={h} className="text-left py-3 px-2 text-xs font-semibold text-gray-400 whitespace-nowrap">
                      {h}
                    </th>
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
                      <td className="py-3 px-2 font-medium" style={{ color: '#1a2744' }}>
                        {row.etudiant}
                      </td>
                      <td className="py-3 px-2 text-gray-500">{row.filiere}</td>
                      <td className="py-3 px-2 text-gray-500">{row.annee}</td>
                      <td className="py-3 px-2 text-gray-500 max-w-xs truncate">{row.titre}</td>
                      <td className="py-3 px-2">
                        <span className="font-bold" style={{ color: mention.color }}>
                          {row.note_finale}/20
                        </span>
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
