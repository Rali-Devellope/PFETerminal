import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import DashboardLayout from '../../components/Layout/DashboardLayout'
import Card from '../../components/UI/Card'
import Badge from '../../components/UI/Badge'
import { getMonPFE, getLivrables, deposerLivrable } from '../../api/pfe'

function FileIcon() {
  return (
    <svg width="32" height="32" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" className="text-gray-300">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  )
}

export default function EtudiantLivrables() {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const fileRef = useRef()
  const [form, setForm] = useState({ type_livrable: 'rapport', commentaire: '' })
  const [selectedFile, setSelectedFile] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  const NAV_ITEMS = [
    { to: '/etudiant', end: true, label: t('nav.mon_pfe'),
      icon: <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg> },
    { to: '/etudiant/sujets', label: t('nav.sujets_dispo'),
      icon: <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg> },
    { to: '/etudiant/livrables', label: t('nav.mes_livrables'),
      icon: <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg> },
    { to: '/etudiant/soutenance', label: t('nav.ma_soutenance'),
      icon: <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg> },
  ]

  const TYPE_OPTIONS = [
    { value: 'rapport',      label: t('livrables.rapport') },
    { value: 'presentation', label: t('livrables.presentation') },
    { value: 'code',         label: t('livrables.code') },
  ]

  const { data: pfeRes } = useQuery({ queryKey: ['mon-pfe'], queryFn: getMonPFE })
  const pfeId = pfeRes?.data?.data?.id

  const { data: livrRes, isLoading } = useQuery({
    queryKey: ['livrables', pfeId],
    queryFn: () => getLivrables(pfeId),
    enabled: !!pfeId,
  })

  const livrables = livrRes?.data?.data ?? livrRes?.data?.results ?? []

  const mutation = useMutation({
    mutationFn: (fd) => deposerLivrable(pfeId, fd),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['livrables', pfeId] })
      qc.invalidateQueries({ queryKey: ['mon-pfe'] })
      setForm({ type_livrable: 'rapport', commentaire: '' })
      setSelectedFile(null)
      if (fileRef.current) fileRef.current.value = ''
      setSuccessMsg(t('livrables.success'))
      setErrorMsg('')
      setTimeout(() => setSuccessMsg(''), 4000)
    },
    onError: (err) => {
      const msg = err.response?.data?.message ?? err.response?.data?.fichier?.[0] ?? 'Erreur lors du dépôt'
      setErrorMsg(msg)
      setSuccessMsg('')
    },
  })

  const handleFile = (file) => file && setSelectedFile(file)

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!selectedFile) { setErrorMsg(t('livrables.no_file')); return }
    if (!pfeId) { setErrorMsg(t('livrables.no_pfe')); return }
    const fd = new FormData()
    fd.append('fichier', selectedFile)
    fd.append('type_livrable', form.type_livrable)
    if (form.commentaire) fd.append('commentaire', form.commentaire)
    setErrorMsg('')
    mutation.mutate(fd)
  }

  return (
    <DashboardLayout navItems={NAV_ITEMS}>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: '#1a2744' }}>{t('livrables.page_title')}</h1>
        <p className="text-sm text-gray-500 mt-1">{t('livrables.page_sub')}</p>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card title={t('livrables.form_title')}
          icon={<svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>}>
          <form onSubmit={handleSubmit} className="space-y-4">
            {successMsg && (
              <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm"
                   style={{ backgroundColor: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0' }}>
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12" /></svg>
                {successMsg}
              </div>
            )}
            {errorMsg && (
              <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm"
                   style={{ backgroundColor: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca' }}>
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
                </svg>
                {errorMsg}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold mb-2 text-gray-600">{t('livrables.type_label')}</label>
              <div className="flex gap-2">
                {TYPE_OPTIONS.map((tp) => (
                  <button key={tp.value} type="button"
                    onClick={() => setForm({ ...form, type_livrable: tp.value })}
                    className="flex-1 py-2 rounded-xl text-xs font-medium transition"
                    style={form.type_livrable === tp.value
                      ? { backgroundColor: '#2db84b', color: '#fff' }
                      : { backgroundColor: '#f8f9fa', color: '#6b7280', border: '1.5px solid #e5e7eb' }
                    }>
                    {tp.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-2 text-gray-600">{t('livrables.file_label')}</label>
              <div
                className="relative rounded-2xl p-6 text-center cursor-pointer transition-all duration-200"
                style={{
                  border: `2px dashed ${dragOver ? '#2db84b' : selectedFile ? '#2db84b' : '#e5e7eb'}`,
                  backgroundColor: dragOver ? '#f0fdf4' : selectedFile ? '#f0fdf4' : '#fafafa',
                }}
                onClick={() => fileRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]) }}
              >
                <input ref={fileRef} type="file" className="hidden" accept=".pdf,.zip,.tar,.gz,.pptx,.ppt"
                       onChange={(e) => handleFile(e.target.files[0] ?? null)} />
                {selectedFile ? (
                  <div className="flex items-center justify-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#dcfce7' }}>
                      <svg width="18" height="18" fill="none" stroke="#15803d" strokeWidth="2" viewBox="0 0 24 24">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                      </svg>
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-semibold" style={{ color: '#15803d' }}>{selectedFile.name}</p>
                      <p className="text-xs text-gray-400">{(selectedFile.size / 1024).toFixed(0)} Ko</p>
                    </div>
                    <button type="button" onClick={(e) => { e.stopPropagation(); setSelectedFile(null) }}
                            className="ml-2 text-gray-400 hover:text-red-500 transition">
                      <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </div>
                ) : (
                  <div>
                    <FileIcon />
                    <p className="text-sm text-gray-500 mt-2">
                      {t('livrables.drag_hint')} <span style={{ color: '#2db84b' }}>{t('livrables.browse')}</span>
                    </p>
                    <p className="text-xs text-gray-400 mt-1">{t('livrables.formats')}</p>
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-2 text-gray-600">
                {t('livrables.comment_label')} <span className="font-normal text-gray-400">{t('livrables.optional')}</span>
              </label>
              <textarea value={form.commentaire} onChange={(e) => setForm({ ...form, commentaire: e.target.value })}
                rows={3} placeholder={t('livrables.comment_placeholder')}
                className="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none transition"
                style={{ border: '1.5px solid #e5e7eb', color: '#1a2744', backgroundColor: '#fafafa' }}
                onFocus={(e) => (e.target.style.borderColor = '#2db84b')}
                onBlur={(e) => (e.target.style.borderColor = '#e5e7eb')} />
            </div>

            <button type="submit" disabled={mutation.isPending || !pfeId}
              className="w-full py-3 rounded-xl text-white text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2"
              style={{
                background: mutation.isPending || !pfeId ? 'linear-gradient(135deg, #86c99a, #6dbf82)' : 'linear-gradient(135deg, #2db84b, #1e8c36)',
                cursor: mutation.isPending || !pfeId ? 'not-allowed' : 'pointer',
                boxShadow: mutation.isPending || !pfeId ? 'none' : '0 4px 12px rgba(45,184,75,0.3)',
              }}>
              {mutation.isPending ? (
                <>
                  <svg className="animate-spin" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" strokeLinecap="round" />
                  </svg>
                  {t('livrables.uploading')}
                </>
              ) : (
                <>
                  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  {t('livrables.submit')}
                </>
              )}
            </button>
          </form>
        </Card>

        <Card title={`${t('livrables.history_title')}${livrables.length > 0 ? ` (${livrables.length})` : ''}`}
          icon={<svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>}>
          {isLoading && (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <div key={i} className="h-16 rounded-xl bg-gray-50 animate-pulse" />)}
            </div>
          )}
          {!isLoading && livrables.length === 0 && (
            <div className="text-center py-8">
              <div className="w-12 h-12 rounded-2xl mx-auto mb-3 flex items-center justify-center" style={{ backgroundColor: '#f8f9fa' }}>
                <svg width="20" height="20" fill="none" stroke="#9ca3af" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
              </div>
              <p className="text-sm text-gray-400">{t('livrables.none_deposited')}</p>
            </div>
          )}
          <div className="space-y-2.5">
            {livrables.map((l) => (
              <div key={l.id} className="flex items-start justify-between p-4 rounded-xl transition"
                   style={{ backgroundColor: '#f8fafc', border: '1px solid #f1f5f9' }}>
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                       style={{ backgroundColor: '#e0f2fe' }}>
                    <svg width="16" height="16" fill="none" stroke="#0284c7" strokeWidth="2" viewBox="0 0 24 24">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-xs font-semibold capitalize" style={{ color: '#1a2744' }}>{l.type_livrable}</span>
                      <Badge statut={l.statut} />
                    </div>
                    <p className="text-[11px] text-gray-400">
                      {new Date(l.date_depot).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                    {l.remarques && l.statut === 'REFUSE' && (
                      <p className="text-xs mt-1 font-medium" style={{ color: '#b91c1c' }}>
                        {t('livrables.reason_prefix')}{l.remarques}
                      </p>
                    )}
                  </div>
                </div>
                {l.fichier && (
                  <a href={l.fichier} target="_blank" rel="noreferrer"
                     className="ml-3 flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg transition flex-shrink-0"
                     style={{ backgroundColor: '#f0fdf4', color: '#15803d' }}>
                    <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    {t('livrables.dl')}
                  </a>
                )}
              </div>
            ))}
          </div>
        </Card>
      </div>
    </DashboardLayout>
  )
}
