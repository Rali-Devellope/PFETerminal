import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import DashboardLayout from '../../components/Layout/DashboardLayout'
import Card from '../../components/UI/Card'
import { getAnneeActive, getDeadlines, definirDeadline, supprimerDeadline, notifierDeadlines, getStatsLivrables } from '../../api/pfe'
import { COORD_NAV } from './Dashboard'

const LIVRABLE_TYPES = [
  { key: 'rapport',      color: '#1a2744', bg: '#eef1f8' },
  { key: 'code',         color: '#0ea5e9', bg: '#f0f9ff' },
  { key: 'presentation', color: '#7e22ce', bg: '#faf5ff' },
]

function StatsBar({ stat }) {
  if (!stat) return null
  const { total_pfe, total_deposes, en_delai, hors_delai } = stat
  if (total_pfe === 0) return null
  const pct = Math.round((total_deposes / total_pfe) * 100)
  return (
    <div className="px-5 py-3 border-t flex items-center gap-4 flex-wrap"
      style={{ borderColor: '#f1f5f9', backgroundColor: '#f8fafc' }}>
      <div className="flex-1 min-w-36">
        <div className="flex justify-between text-xs mb-1.5">
          <span className="text-gray-500">{total_deposes} / {total_pfe} déposés</span>
          <span className="font-semibold" style={{ color: pct === 100 ? '#166534' : '#374151' }}>{pct}%</span>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: '#e5e7eb' }}>
          <div className="h-full rounded-full transition-all duration-500"
            style={{ width: `${pct}%`, backgroundColor: pct === 100 ? '#2db84b' : pct >= 50 ? '#f59e0b' : '#1a2744' }} />
        </div>
      </div>
      <div className="flex gap-2 flex-wrap">
        {en_delai > 0 && (
          <span className="text-xs font-medium px-2 py-0.5 rounded-full"
            style={{ backgroundColor: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0' }}>
            {en_delai} à temps
          </span>
        )}
        {hors_delai > 0 && (
          <span className="text-xs font-medium px-2 py-0.5 rounded-full"
            style={{ backgroundColor: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca' }}>
            {hors_delai} hors délai
          </span>
        )}
        {total_deposes === 0 && (
          <span className="text-xs text-gray-400">Aucun dépôt</span>
        )}
      </div>
    </div>
  )
}

function DeadlineRow({ typeKey, typeLabel, color, bg, deadline, anneeId, stat, t }) {
  const qc = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [input, setInput]     = useState('')

  const saveMut = useMutation({
    mutationFn: (data) => definirDeadline(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['deadlines', anneeId] })
      qc.invalidateQueries({ queryKey: ['stats-livrables', anneeId] })
      setEditing(false)
    },
  })

  const deleteMut = useMutation({
    mutationFn: () => supprimerDeadline({ annee_id: anneeId, type_livrable: typeKey }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['deadlines', anneeId] })
      qc.invalidateQueries({ queryKey: ['stats-livrables', anneeId] })
    },
  })

  const now        = new Date()
  const dateVal    = deadline ? new Date(deadline.date_limite) : null
  const joursRest  = dateVal ? Math.ceil((dateVal - now) / 86400000) : null
  const depasse    = joursRest !== null && joursRest < 0
  const proche     = joursRest !== null && joursRest >= 0 && joursRest <= 7

  const statusColor = depasse ? '#b91c1c' : proche ? '#92400e' : dateVal ? '#166534' : '#6b7280'
  const statusBg    = depasse ? '#fef2f2' : proche ? '#fffbeb' : dateVal ? '#f0fdf4' : '#f9fafb'
  const borderColor = depasse ? '#fecaca' : proche ? '#fde68a' : dateVal ? '#bbf7d0' : '#e5e7eb'

  const openEdit = () => {
    setInput(dateVal ? dateVal.toISOString().slice(0, 16) : '')
    setEditing(true)
  }

  return (
    <div className="rounded-xl border overflow-hidden" style={{ borderColor }}>
      {/* Ligne principale */}
      <div className="px-5 py-4 flex items-center gap-3 flex-wrap" style={{ backgroundColor: statusBg }}>
        <span className="text-xs font-bold px-3 py-1 rounded-lg text-white flex-shrink-0"
          style={{ backgroundColor: color }}>
          {typeLabel}
        </span>

        <div className="flex-1 min-w-0">
          {dateVal ? (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold" style={{ color: statusColor }}>
                {dateVal.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
              <span className="text-xs" style={{ color: statusColor }}>
                à {dateVal.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
              </span>
              {depasse && (
                <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: '#fecaca', color: '#b91c1c' }}>
                  {t('coordinateur.deadline_depasse')}
                </span>
              )}
              {proche && !depasse && (
                <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: '#fde68a', color: '#92400e' }}>
                  {t('coordinateur.deadline_jours', { count: joursRest })}
                </span>
              )}
            </div>
          ) : (
            <span className="text-sm text-gray-400">{t('coordinateur.deadline_non_definie')}</span>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Bouton Supprimer (visible uniquement si deadline existe) */}
          {dateVal && !editing && (
            <button
              onClick={() => { if (window.confirm(`Supprimer la deadline ${typeLabel} ?`)) deleteMut.mutate() }}
              disabled={deleteMut.isPending}
              title="Supprimer cette deadline"
              className="p-1.5 rounded-lg hover:bg-red-50 transition"
              style={{ color: '#ef4444' }}>
              {deleteMut.isPending ? (
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"
                  className="animate-spin"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83"/></svg>
              ) : (
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                  <path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                </svg>
              )}
            </button>
          )}

          {/* Bouton Éditer / Annuler */}
          <button onClick={editing ? () => setEditing(false) : openEdit}
            className="text-xs px-3 py-1.5 rounded-lg font-semibold"
            style={{ backgroundColor: editing ? '#f3f4f6' : '#1a2744', color: editing ? '#6b7280' : '#fff' }}>
            {editing ? t('common.cancel') : dateVal ? t('coordinateur.deadline_modifier') : t('coordinateur.deadline_definir')}
          </button>
        </div>
      </div>

      {/* Formulaire inline */}
      {editing && (
        <div className="px-5 py-4 border-t flex items-center gap-3 flex-wrap"
          style={{ borderColor: '#e5e7eb', backgroundColor: '#fff' }}>
          <input type="datetime-local" value={input} onChange={(e) => setInput(e.target.value)}
            className="px-3 py-2 rounded-xl text-sm border outline-none"
            style={{ borderColor: '#e5e7eb' }}
            onFocus={(e) => (e.target.style.borderColor = '#1a2744')}
            onBlur={(e) => (e.target.style.borderColor = '#e5e7eb')} />
          <button
            onClick={() => saveMut.mutate({ annee_id: anneeId, type_livrable: typeKey, date_limite: new Date(input).toISOString() })}
            disabled={!input || saveMut.isPending}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-white"
            style={{ backgroundColor: '#2db84b', opacity: !input ? 0.5 : 1 }}>
            {saveMut.isPending ? '...' : t('coordinateur.deadline_save')}
          </button>
        </div>
      )}

      {/* Barre de stats */}
      <StatsBar stat={stat} />
    </div>
  )
}

export default function CoordinateurDeadlines() {
  const { t } = useTranslation()
  const qc    = useQueryClient()
  const [notifMsg, setNotifMsg] = useState('')

  const { data: anneeRes } = useQuery({ queryKey: ['annee-active'], queryFn: getAnneeActive })
  const anneeActive = anneeRes?.data?.data ?? null

  const { data: deadlinesRes } = useQuery({
    queryKey: ['deadlines', anneeActive?.id],
    queryFn: () => getDeadlines(anneeActive.id),
    enabled: !!anneeActive?.id,
  })
  const deadlinesList = deadlinesRes?.data?.data ?? []

  const { data: statsRes } = useQuery({
    queryKey: ['stats-livrables', anneeActive?.id],
    queryFn: () => getStatsLivrables(anneeActive.id),
    enabled: !!anneeActive?.id,
  })
  const statsList = statsRes?.data?.data ?? []

  const notifMut = useMutation({
    mutationFn: () => notifierDeadlines(anneeActive.id),
    onSuccess: (res) => {
      const msg = res?.data?.message ?? 'Étudiants notifiés.'
      setNotifMsg(msg)
      setTimeout(() => setNotifMsg(''), 4000)
    },
  })

  const typeLabels = {
    rapport:      t('livrables.rapport'),
    code:         t('livrables.code'),
    presentation: t('livrables.presentation'),
  }

  const hasAnyDeadline = deadlinesList.length > 0

  return (
    <DashboardLayout navItems={COORD_NAV(t)}>
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: '#1a2744' }}>
            {t('coordinateur.deadlines_title')}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {anneeActive ? anneeActive.libelle : t('coordinateur.deadlines_no_annee')}
          </p>
        </div>

        {/* Bouton Notifier */}
        {anneeActive && hasAnyDeadline && (
          <div className="flex items-center gap-3">
            {notifMsg && (
              <span className="text-xs font-medium px-3 py-1.5 rounded-xl"
                style={{ backgroundColor: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0' }}>
                ✓ {notifMsg}
              </span>
            )}
            <button
              onClick={() => {
                if (window.confirm('Envoyer les deadlines à tous les étudiants avec un PFE en cours ?'))
                  notifMut.mutate()
              }}
              disabled={notifMut.isPending}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white"
              style={{ backgroundColor: notifMut.isPending ? '#94a3b8' : '#0ea5e9' }}>
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
              {notifMut.isPending ? 'Envoi...' : 'Notifier les étudiants'}
            </button>
          </div>
        )}
      </div>

      {!anneeActive ? (
        <div className="px-5 py-4 rounded-xl" style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a' }}>
          <p className="text-sm" style={{ color: '#92400e' }}>
            ⚠ {t('coordinateur.deadlines_no_annee')}
          </p>
        </div>
      ) : (
        <Card
          title={`Deadlines — ${anneeActive.libelle}`}
          icon={<svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
          </svg>}>
          <div className="space-y-3">
            {LIVRABLE_TYPES.map(({ key, color, bg }) => (
              <DeadlineRow
                key={key}
                typeKey={key}
                typeLabel={typeLabels[key]}
                color={color}
                bg={bg}
                deadline={deadlinesList.find((d) => d.type_livrable === key) ?? null}
                anneeId={anneeActive.id}
                stat={statsList.find((s) => s.type_livrable === key) ?? null}
                t={t}
              />
            ))}
          </div>

          <div className="mt-5 pt-4 border-t" style={{ borderColor: '#f1f5f9' }}>
            <p className="text-xs text-gray-400">
              Le dépôt hors délai est autorisé mais le livrable sera marqué <strong>hors délai</strong>.
              L'encadrant en est informé.
            </p>
          </div>
        </Card>
      )}
    </DashboardLayout>
  )
}
