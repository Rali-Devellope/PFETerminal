import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { useNotifStore } from '../../store/notifStore'
import { ROLE_DASHBOARDS } from '../../components/ProtectedRoute'
import { getNotifications, marquerLu, marquerTousLus } from '../../api/notifications'
import DashboardLayout from '../../components/Layout/DashboardLayout'
import Card from '../../components/UI/Card'

const TYPE_ICONS = {
  sujet:      { icon: '📋', color: '#0ea5e9' },
  livrable:   { icon: '📄', color: '#2db84b' },
  soutenance: { icon: '🎓', color: '#7e22ce' },
  note:       { icon: '⭐', color: '#f59e0b' },
  default:    { icon: '🔔', color: '#6b7280' },
}

export default function Notifications() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { setUnread } = useNotifStore()
  const qc = useQueryClient()

  const homeRoute = ROLE_DASHBOARDS[user?.role] ?? '/login'

  const NAV_ITEMS = [
    { to: homeRoute, end: true, label: t('nav.vue_ensemble'),
      icon: <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg> },
  ]

  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: getNotifications,
  })

  const notifs = data?.data?.results ?? data?.data?.data ?? data?.data ?? []
  const notifsArr = Array.isArray(notifs) ? notifs : []
  const nonLues = notifsArr.filter((n) => !n.lu).length

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

  const getIcon = (type) => TYPE_ICONS[type] ?? TYPE_ICONS.default

  return (
    <DashboardLayout navItems={NAV_ITEMS}>
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: '#1a2744' }}>
            Notifications
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {nonLues > 0 ? `${nonLues} non lue${nonLues > 1 ? 's' : ''}` : 'Tout est lu'}
          </p>
        </div>
        {nonLues > 0 && (
          <button onClick={() => marquerTousMut.mutate()} disabled={marquerTousMut.isPending}
            className="px-4 py-2 rounded-xl text-sm font-semibold transition"
            style={{ backgroundColor: '#f1f5f9', color: '#475569' }}>
            Tout marquer comme lu
          </button>
        )}
      </div>

      <Card title={`Notifications (${notifsArr.length})`}
        icon={<svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>}>

        {isLoading && (
          <div className="space-y-3">
            {[1,2,3,4].map((i) => <div key={i} className="h-16 rounded-xl bg-gray-50 animate-pulse" />)}
          </div>
        )}

        {!isLoading && notifsArr.length === 0 && (
          <div className="py-12 text-center">
            <div className="text-4xl mb-3">🔔</div>
            <p className="text-sm text-gray-400">Aucune notification</p>
          </div>
        )}

        {!isLoading && (
          <div className="divide-y divide-gray-50">
            {notifsArr.map((n) => {
              const { icon, color } = getIcon(n.type)
              return (
                <div key={n.id}
                  className="py-4 flex items-start gap-4 cursor-pointer hover:bg-gray-50 rounded-xl px-2 -mx-2 transition"
                  style={{ opacity: n.lu ? 0.6 : 1 }}
                  onClick={() => { if (!n.lu) marquerLuMut.mutate(n.id) }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                       style={{ backgroundColor: color + '15' }}>
                    {icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold" style={{ color: '#1a2744' }}>{n.titre ?? n.message?.slice(0, 50)}</p>
                      {!n.lu && (
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: '#2db84b' }} />
                      )}
                    </div>
                    {n.message && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.message}</p>}
                    <p className="text-[10px] text-gray-400 mt-1">
                      {new Date(n.created_at ?? n.date ?? Date.now()).toLocaleDateString('fr-FR', {
                        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                      })}
                    </p>
                  </div>
                  {!n.lu && (
                    <button onClick={(e) => { e.stopPropagation(); marquerLuMut.mutate(n.id) }}
                      className="text-xs text-gray-400 hover:text-gray-600 flex-shrink-0 px-2 py-1 rounded-lg hover:bg-gray-100">
                      Lu
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </Card>
    </DashboardLayout>
  )
}
