import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import DashboardLayout from '../../components/Layout/DashboardLayout'
import Card from '../../components/UI/Card'
import Badge from '../../components/UI/Badge'
import { getSujets, validerSujet, refuserSujet } from '../../api/sujets'

const STATUTS = ['', 'EN_ATTENTE', 'VALIDE', 'REFUSE', 'ARCHIVE']
const FILIERES = ['', 'Finance', 'Comptabilité', 'Audit', 'Management', 'Informatique']

function RefusModal({ sujet, onClose, onConfirm, loading }) {
  const { t } = useTranslation()
  const [motif, setMotif] = useState('')
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
        <h3 className="text-base font-bold mb-1" style={{ color: '#1a2744' }}>{t('coordinateur.refuse_title')}</h3>
        <p className="text-sm text-gray-500 mb-4"><span className="font-medium">{sujet.titre}</span></p>
        <label className="block text-xs font-semibold mb-2 text-gray-600">
          {t('coordinateur.motif_label')} <span className="text-red-400">*</span>
        </label>
        <textarea value={motif} onChange={(e) => setMotif(e.target.value)} rows={3}
          placeholder={t('coordinateur.motif_placeholder')}
          className="w-full px-4 py-3 rounded-xl text-sm border outline-none resize-none"
          style={{ borderColor: '#e5e7eb', color: '#1a2744' }}
          onFocus={(e) => (e.target.style.borderColor = '#ef4444')}
          onBlur={(e) => (e.target.style.borderColor = '#e5e7eb')}
          autoFocus />
        <div className="flex gap-2 mt-4">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-medium border"
            style={{ borderColor: '#e5e7eb', color: '#6b7280' }}>
            {t('common.cancel')}
          </button>
          <button onClick={() => onConfirm(motif)} disabled={!motif.trim() || loading}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition"
            style={{ backgroundColor: motif.trim() && !loading ? '#ef4444' : '#fca5a5', cursor: motif.trim() && !loading ? 'pointer' : 'not-allowed' }}>
            {loading ? t('coordinateur.sending') : t('coordinateur.confirm_refus')}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function CoordinateurSujets() {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [statut, setStatut] = useState('')
  const [filiere, setFiliere] = useState('')
  const [search, setSearch] = useState('')
  const [refusTarget, setRefusTarget] = useState(null)

  const NAV_ITEMS = [
    { to: '/coordinateur', end: true, label: t('nav.vue_ensemble'),
      icon: <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg> },
    { to: '/coordinateur/sujets', label: t('nav.sujets'),
      icon: <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> },
    { to: '/coordinateur/soutenances', label: t('nav.soutenances'),
      icon: <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/></svg> },
    { to: '/stats', label: t('nav.statistiques'),
      icon: <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg> },
  ]

  const { data, isLoading } = useQuery({
    queryKey: ['sujets', statut, filiere, search],
    queryFn: () => getSujets({ statut: statut || undefined, filiere: filiere || undefined, search: search || undefined }),
  })

  const sujets = data?.data?.results ?? data?.data ?? []
  const sujetsArr = Array.isArray(sujets) ? sujets : []

  const validerMut = useMutation({
    mutationFn: (id) => validerSujet(id, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sujets'] }),
  })
  const refuserMut = useMutation({
    mutationFn: ({ id, motif }) => refuserSujet(id, { motif }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['sujets'] }); setRefusTarget(null) },
  })

  return (
    <DashboardLayout navItems={NAV_ITEMS}>
      {refusTarget && (
        <RefusModal sujet={refusTarget} onClose={() => setRefusTarget(null)}
          onConfirm={(motif) => refuserMut.mutate({ id: refusTarget.id, motif })}
          loading={refuserMut.isPending} />
      )}

      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: '#1a2744' }}>{t('coordinateur.sujets_title')}</h1>
        <p className="text-sm text-gray-500 mt-1">{t('coordinateur.sujets_sub')}</p>
      </div>

      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 min-w-[200px]">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" width="14" height="14"
               fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder={t('coordinateur.search_sujet')}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm border outline-none bg-white"
            style={{ borderColor: '#e5e7eb' }}
            onFocus={(e) => (e.target.style.borderColor = '#2db84b')}
            onBlur={(e) => (e.target.style.borderColor = '#e5e7eb')} />
        </div>
        <select value={statut} onChange={(e) => setStatut(e.target.value)}
          className="px-3 py-2.5 rounded-xl text-sm border bg-white outline-none" style={{ borderColor: '#e5e7eb' }}>
          <option value="">{t('coordinateur.all_statuts')}</option>
          {STATUTS.filter(Boolean).map((s) => <option key={s} value={s}>{t(`badge.${s}`)}</option>)}
        </select>
        <select value={filiere} onChange={(e) => setFiliere(e.target.value)}
          className="px-3 py-2.5 rounded-xl text-sm border bg-white outline-none" style={{ borderColor: '#e5e7eb' }}>
          <option value="">{t('coordinateur.all_filieres')}</option>
          {FILIERES.filter(Boolean).map((f) => <option key={f} value={f}>{f}</option>)}
        </select>
      </div>

      <Card title={t('coordinateur.all_sujets', { count: sujetsArr.length })}
        icon={<svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>}>
        {isLoading && <div className="space-y-3">{[1,2,3].map((i) => <div key={i} className="h-16 rounded-xl bg-gray-50 animate-pulse" />)}</div>}
        {!isLoading && sujetsArr.length === 0 && (
          <p className="text-sm text-gray-400 py-4 text-center">{t('coordinateur.no_sujets_found')}</p>
        )}
        {!isLoading && (
          <div className="divide-y divide-gray-50">
            {sujetsArr.map((s) => (
              <div key={s.id} className="py-4 flex items-start gap-4 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-sm font-semibold" style={{ color: '#1a2744' }}>{s.titre}</span>
                    <Badge statut={s.statut} />
                  </div>
                  <p className="text-xs text-gray-400">{s.filiere} · {s.annee}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {t('coordinateur.proposed_by', { name: `${s.propose_par?.prenom ?? ''} ${s.propose_par?.nom ?? ''}` })}
                  </p>
                  {s.motif_refus && (
                    <p className="text-xs mt-1 font-medium" style={{ color: '#b91c1c' }}>Motif : {s.motif_refus}</p>
                  )}
                </div>
                {s.statut === 'EN_ATTENTE' && (
                  <div className="flex gap-2">
                    <button onClick={() => validerMut.mutate(s.id)} disabled={validerMut.isPending}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white"
                      style={{ backgroundColor: '#2db84b' }}>
                      {t('coordinateur.valider')}
                    </button>
                    <button onClick={() => setRefusTarget(s)}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white"
                      style={{ backgroundColor: '#ef4444' }}>
                      {t('coordinateur.refuser')}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </DashboardLayout>
  )
}
