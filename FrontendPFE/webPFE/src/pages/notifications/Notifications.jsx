import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../../store/authStore'
import { useNotifStore } from '../../store/notifStore'
import { ROLE_DASHBOARDS } from '../../components/ProtectedRoute'
import { getNotifications, marquerLu, marquerTousLus } from '../../api/notifications'
import DashboardLayout from '../../components/Layout/DashboardLayout'

const TYPE_META = {
  sujet_valide:         { icon: '✅', label: 'Sujet validé',          color: '#2db84b', bg: '#f0fdf4', group: 'sujet' },
  sujet_refuse:         { icon: '❌', label: 'Sujet refusé',           color: '#ef4444', bg: '#fef2f2', group: 'sujet' },
  encadrant_affecte:    { icon: '👨‍🏫', label: 'Encadrant affecté',      color: '#0ea5e9', bg: '#f0f9ff', group: 'sujet' },
  livrable_depose:      { icon: '📤', label: 'Livrable déposé',        color: '#f59e0b', bg: '#fffbeb', group: 'livrable' },
  livrable_valide:      { icon: '📗', label: 'Livrable validé',        color: '#2db84b', bg: '#f0fdf4', group: 'livrable' },
  livrable_refuse:      { icon: '📕', label: 'Livrable refusé',        color: '#ef4444', bg: '#fef2f2', group: 'livrable' },
  soutenance_planifiee: { icon: '🎓', label: 'Soutenance planifiée',   color: '#7e22ce', bg: '#faf5ff', group: 'soutenance' },
  note_publiee:         { icon: '⭐', label: 'Note publiée',           color: '#f59e0b', bg: '#fffbeb', group: 'soutenance' },
  deadline:             { icon: '⏰', label: 'Deadline',               color: '#c2410c', bg: '#fff7ed', group: 'deadline' },
}

const DEFAULT_META = { icon: '🔔', label: 'Notification', color: '#6b7280', bg: '#f9fafb', group: 'autre' }

const FILTERS = [
  { key: 'toutes',    label: 'Toutes',      groups: null },
  { key: 'non_lues',  label: 'Non lues',    groups: null, unreadOnly: true },
  { key: 'sujet',     label: 'Sujets',      groups: ['sujet'] },
  { key: 'livrable',  label: 'Livrables',   groups: ['livrable'] },
  { key: 'soutenance',label: 'Soutenances', groups: ['soutenance'] },
  { key: 'deadline',  label: 'Deadlines',   groups: ['deadline'] },
]

function timeAgo(d) {
  if (!d) return ''
  const diff = Date.now() - new Date(d).getTime()
  const m = Math.floor(diff / 60000)
  const h = Math.floor(m / 60)
  const day = Math.floor(h / 24)
  if (m < 1) return "À l'instant"
  if (m < 60) return `Il y a ${m} min`
  if (h < 24) return `Il y a ${h}h`
  if (day === 1) return 'Hier'
  if (day < 7) return `Il y a ${day}j`
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: '2-digit' })
}

function dateGroup(d) {
  if (!d) return 'Plus ancien'
  const date = new Date(d)
  const now = new Date()
  const diffDays = Math.floor((now - date) / 86400000)
  if (diffDays === 0) return "Aujourd'hui"
  if (diffDays === 1) return 'Hier'
  if (diffDays < 7) return 'Cette semaine'
  if (diffDays < 30) return 'Ce mois'
  return 'Plus ancien'
}

const DATE_GROUP_ORDER = ["Aujourd'hui", 'Hier', 'Cette semaine', 'Ce mois', 'Plus ancien']

export default function Notifications() {
  const { t } = useTranslation()
  const { user } = useAuthStore()
  const { setUnread } = useNotifStore()
  const qc = useQueryClient()
  const [activeFilter, setActiveFilter] = useState('toutes')

  const homeRoute = ROLE_DASHBOARDS[user?.role] ?? '/login'

  const NAV_ITEMS = [
    {
      to: homeRoute, end: true, label: t('nav.vue_ensemble'),
      icon: <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>,
    },
  ]

  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: getNotifications,
    refetchInterval: 30000,
  })

  const notifsArr = useMemo(() => {
    const raw = data?.data?.results ?? data?.data?.data ?? data?.data ?? []
    return Array.isArray(raw) ? raw : []
  }, [data])

  const nonLues = notifsArr.filter((n) => !n.lu).length

  const filtered = useMemo(() => {
    const f = FILTERS.find((f) => f.key === activeFilter)
    if (!f) return notifsArr
    let list = notifsArr
    if (f.unreadOnly) list = list.filter((n) => !n.lu)
    if (f.groups) list = list.filter((n) => (TYPE_META[n.type]?.group ?? 'autre') === f.groups[0])
    return list
  }, [notifsArr, activeFilter])

  const grouped = useMemo(() => {
    const map = {}
    filtered.forEach((n) => {
      const g = dateGroup(n.created_at)
      if (!map[g]) map[g] = []
      map[g].push(n)
    })
    return DATE_GROUP_ORDER.filter((k) => map[k]).map((k) => ({ label: k, items: map[k] }))
  }, [filtered])

  const filterCounts = useMemo(() => {
    const counts = {}
    FILTERS.forEach((f) => {
      let list = notifsArr
      if (f.unreadOnly) list = list.filter((n) => !n.lu)
      if (f.groups) list = list.filter((n) => (TYPE_META[n.type]?.group ?? 'autre') === f.groups[0])
      counts[f.key] = list.length
    })
    return counts
  }, [notifsArr])

  const marquerLuMut = useMutation({
    mutationFn: marquerLu,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] })
      setUnread(Math.max(0, nonLues - 1))
    },
  })

  const marquerTousMut = useMutation({
    mutationFn: marquerTousLus,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] })
      setUnread(0)
    },
  })

  return (
    <DashboardLayout navItems={NAV_ITEMS}>
      {/* Header */}
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: '#1a2744' }}>
            Notifications
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {nonLues > 0
              ? <><span className="font-semibold" style={{ color: '#2db84b' }}>{nonLues}</span> non lue{nonLues > 1 ? 's' : ''} · {notifsArr.length} au total</>
              : 'Tout est à jour'}
          </p>
        </div>
        {nonLues > 0 && (
          <button
            onClick={() => marquerTousMut.mutate()}
            disabled={marquerTousMut.isPending}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition hover:opacity-80"
            style={{ backgroundColor: '#f1f5f9', color: '#475569' }}>
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            Tout marquer comme lu
          </button>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        {FILTERS.map((f) => {
          const count = filterCounts[f.key] ?? 0
          const isActive = activeFilter === f.key
          return (
            <button
              key={f.key}
              onClick={() => setActiveFilter(f.key)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium transition"
              style={{
                backgroundColor: isActive ? '#1a2744' : '#f1f5f9',
                color: isActive ? '#fff' : '#64748b',
              }}>
              {f.label}
              {count > 0 && (
                <span
                  className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                  style={{
                    backgroundColor: isActive ? 'rgba(255,255,255,0.2)' : (f.unreadOnly ? '#2db84b' : '#e2e8f0'),
                    color: isActive ? '#fff' : (f.unreadOnly ? '#fff' : '#64748b'),
                  }}>
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Content */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden"
           style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>

        {/* Loading */}
        {isLoading && (
          <div className="p-4 space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-xl bg-gray-100 animate-pulse flex-shrink-0" />
                <div className="flex-1 space-y-2 py-1">
                  <div className="h-3.5 bg-gray-100 rounded-lg animate-pulse w-2/3" />
                  <div className="h-3 bg-gray-100 rounded-lg animate-pulse w-full" />
                  <div className="h-2.5 bg-gray-100 rounded-lg animate-pulse w-1/4" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty */}
        {!isLoading && filtered.length === 0 && (
          <div className="py-16 text-center">
            <div className="text-5xl mb-3">{activeFilter === 'non_lues' ? '✅' : '🔔'}</div>
            <p className="text-base font-semibold" style={{ color: '#1a2744' }}>
              {activeFilter === 'non_lues' ? 'Tout est lu !' : 'Aucune notification'}
            </p>
            <p className="text-sm text-gray-400 mt-1">
              {activeFilter === 'non_lues'
                ? 'Vous avez lu toutes vos notifications'
                : 'Aucune notification dans cette catégorie'}
            </p>
          </div>
        )}

        {/* Grouped list */}
        {!isLoading && grouped.map((group, gi) => (
          <div key={group.label}>
            {/* Group header */}
            <div className="px-5 py-2.5 flex items-center gap-3"
                 style={{ backgroundColor: '#f8fafc', borderTop: gi > 0 ? '1px solid #f1f5f9' : 'none' }}>
              <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: '#94a3b8' }}>
                {group.label}
              </span>
              <div className="flex-1 h-px" style={{ backgroundColor: '#e2e8f0' }} />
              <span className="text-[11px] text-gray-400">{group.items.length}</span>
            </div>

            {/* Items */}
            <div>
              {group.items.map((n, idx) => {
                const meta = TYPE_META[n.type] ?? DEFAULT_META
                return (
                  <div
                    key={n.id}
                    className="flex items-start gap-4 px-5 py-4 transition cursor-pointer group"
                    style={{
                      borderBottom: idx < group.items.length - 1 ? '1px solid #f8fafc' : 'none',
                      backgroundColor: n.lu ? 'transparent' : 'rgba(45,184,75,0.03)',
                    }}
                    onClick={() => { if (!n.lu) marquerLuMut.mutate(n.id) }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = n.lu ? 'transparent' : 'rgba(45,184,75,0.03)')}>

                    {/* Icon */}
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                      style={{ backgroundColor: meta.bg }}>
                      {meta.icon}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold leading-snug" style={{ color: '#1a2744' }}>
                            {n.titre}
                          </p>
                          {!n.lu && (
                            <span className="w-2 h-2 rounded-full flex-shrink-0 mt-0.5" style={{ backgroundColor: '#2db84b' }} />
                          )}
                        </div>
                        <span className="text-[11px] text-gray-400 flex-shrink-0 whitespace-nowrap">
                          {timeAgo(n.created_at)}
                        </span>
                      </div>

                      {n.message && (
                        <p className="text-xs text-gray-500 mt-1 leading-relaxed line-clamp-2">{n.message}</p>
                      )}

                      <div className="flex items-center gap-3 mt-2">
                        <span
                          className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: meta.bg, color: meta.color }}>
                          {meta.label}
                        </span>
                        {!n.lu && (
                          <button
                            onClick={(e) => { e.stopPropagation(); marquerLuMut.mutate(n.id) }}
                            className="text-[11px] font-medium transition opacity-0 group-hover:opacity-100"
                            style={{ color: '#2db84b' }}>
                            Marquer comme lu →
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </DashboardLayout>
  )
}
