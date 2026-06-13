import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import DashboardLayout from '../../components/Layout/DashboardLayout'
import Card from '../../components/UI/Card'
import Badge from '../../components/UI/Badge'
import { getSujets, validerSujet, refuserSujet, affecterEncadrant } from '../../api/sujets'
import { getUsers } from '../../api/auth'
import { COORD_NAV } from './Dashboard'
import { useFilieres } from '../../hooks/useFilieres'

const STATUTS = ['', 'PROPOSE', 'VALIDE', 'REFUSE', 'AFFECTE']

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
  const [affecterTarget, setAffecterTarget] = useState(null)
  const [selectedEncadrant, setSelectedEncadrant] = useState('')

  const NAV_ITEMS = COORD_NAV(t)
  const { filieres: filieresData } = useFilieres({ activeOnly: false })

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

  const affecterMut = useMutation({
    mutationFn: ({ id, encadrant_id }) => affecterEncadrant(id, { encadrant_id }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sujets'] })
      setAffecterTarget(null)
      setSelectedEncadrant('')
    },
  })

  const { data: usersRes } = useQuery({
    queryKey: ['users'],
    queryFn: getUsers,
    enabled: !!affecterTarget,
  })
  const allUsers = usersRes?.data?.results ?? usersRes?.data?.data ?? usersRes?.data ?? []
  const encadrants = Array.isArray(allUsers)
    ? allUsers.filter((u) => u.role === 'encadrant_acad' || u.role === 'encadrant_entr')
    : []

  return (
    <DashboardLayout navItems={NAV_ITEMS}>
      {/* Modal affectation encadrant */}
      {affecterTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
             style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="text-base font-bold mb-1" style={{ color: '#1a2744' }}>
              {t('coordinateur.affecter_title')}
            </h3>
            <p className="text-sm text-gray-400 mb-4 truncate">{affecterTarget.titre}</p>

            {affecterTarget.encadrant && (
              <div className="flex items-center gap-2 mb-3 px-3 py-2.5 rounded-xl"
                   style={{ backgroundColor: '#f0fdf4' }}>
                <svg width="14" height="14" fill="none" stroke="#2db84b" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                </svg>
                <span className="text-xs font-medium" style={{ color: '#15803d' }}>
                  {t('coordinateur.encadrant_actuel')} : {affecterTarget.encadrant.prenom} {affecterTarget.encadrant.nom}
                </span>
              </div>
            )}

            <label className="block text-xs font-semibold mb-1.5 text-gray-600">
              {t('coordinateur.select_encadrant')}
            </label>
            {encadrants.length === 0
              ? <p className="text-sm text-gray-400 py-2">{t('coordinateur.no_encadrants')}</p>
              : (
                <div className="space-y-2 max-h-56 overflow-y-auto mb-4">
                  {encadrants.map((u) => (
                    <label key={u.id}
                      className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition hover:bg-gray-50"
                      style={{ border: selectedEncadrant == u.id ? '2px solid #2db84b' : '2px solid transparent' }}>
                      <input type="radio" name="encadrant" value={u.id}
                        checked={selectedEncadrant == u.id}
                        onChange={() => setSelectedEncadrant(u.id)}
                        className="accent-green-600" />
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                           style={{ backgroundColor: '#1e3a5f' }}>
                        {u.prenom?.[0]}{u.nom?.[0]}
                      </div>
                      <div>
                        <p className="text-sm font-medium" style={{ color: '#1a2744' }}>{u.prenom} {u.nom}</p>
                        <p className="text-xs text-gray-400">{t(`roles.${u.role}`, { defaultValue: u.role })}</p>
                      </div>
                    </label>
                  ))}
                </div>
              )
            }

            <div className="flex gap-2">
              <button onClick={() => { setAffecterTarget(null); setSelectedEncadrant('') }}
                className="flex-1 py-2.5 rounded-xl text-sm border font-medium"
                style={{ borderColor: '#e5e7eb', color: '#6b7280' }}>
                {t('common.cancel')}
              </button>
              <button
                onClick={() => affecterMut.mutate({ id: affecterTarget.id, encadrant_id: parseInt(selectedEncadrant) })}
                disabled={!selectedEncadrant || affecterMut.isPending}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white"
                style={{ backgroundColor: selectedEncadrant ? '#2db84b' : '#86c99a' }}>
                {affecterMut.isPending ? t('coordinateur.affecter_loading') : t('coordinateur.affecter_confirm')}
              </button>
            </div>
          </div>
        </div>
      )}

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
          {filieresData.map((f) => <option key={f.id} value={f.libelle}>{f.libelle}</option>)}
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
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-gray-400">{s.filiere} · {s.annee}</p>
                    {s.confidentiel && (
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                            style={{ backgroundColor: '#fff7ed', color: '#c2410c' }}>
                        🔒 Confidentiel
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {t('coordinateur.proposed_by', { name: `${s.propose_par?.prenom ?? ''} ${s.propose_par?.nom ?? ''}` })}
                  </p>
                  {s.encadrant && (
                    <p className="text-xs mt-0.5" style={{ color: '#15803d' }}>
                      👤 {s.encadrant.prenom} {s.encadrant.nom}
                    </p>
                  )}
                  {s.motif_refus && (
                    <p className="text-xs mt-1 font-medium" style={{ color: '#b91c1c' }}>Motif : {s.motif_refus}</p>
                  )}
                </div>
                <div className="flex gap-2 flex-wrap">
                  {s.statut === 'PROPOSE' && (
                    <>
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
                    </>
                  )}
                  {(s.statut === 'VALIDE' || s.statut === 'AFFECTE') && (
                    <button
                      onClick={() => { setAffecterTarget(s); setSelectedEncadrant(s.encadrant?.id ?? '') }}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                      style={{ backgroundColor: '#eff6ff', color: '#1d4ed8' }}>
                      {t('coordinateur.affecter_btn')}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </DashboardLayout>
  )
}
