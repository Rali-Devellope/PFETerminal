import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import DashboardLayout from '../../components/Layout/DashboardLayout'
import Card, { StatCard } from '../../components/UI/Card'
import Badge from '../../components/UI/Badge'
import { getPFEs } from '../../api/pfe'
import { getSujets } from '../../api/sujets'
import { getSoutenances } from '../../api/soutenances'
import { getStatsGlobales } from '../../api/stats'

const NAV_ITEMS = [
  { to: '/coordinateur', end: true, label: 'Vue d\'ensemble',
    icon: <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg> },
  { to: '/coordinateur/sujets', label: 'Sujets',
    icon: <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> },
  { to: '/coordinateur/soutenances', label: 'Soutenances',
    icon: <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="16" y1="2" x2="16" y2="6"/></svg> },
  { to: '/stats', label: 'Statistiques',
    icon: <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg> },
]

export default function CoordinateurDashboard() {
  const { data: statsRes } = useQuery({ queryKey: ['stats-globales'], queryFn: getStatsGlobales })
  const { data: sujetsRes } = useQuery({ queryKey: ['sujets'], queryFn: () => getSujets({ statut: 'EN_ATTENTE' }) })
  const { data: pfesRes } = useQuery({ queryKey: ['pfe-list'], queryFn: getPFEs })
  const { data: soutRes } = useQuery({ queryKey: ['soutenances'], queryFn: getSoutenances })

  const stats = statsRes?.data?.data ?? {}
  const sujetsAttente = sujetsRes?.data?.results ?? sujetsRes?.data ?? []
  const pfeList = pfesRes?.data?.results ?? pfesRes?.data?.data ?? []
  const soutenances = soutRes?.data?.results ?? soutRes?.data?.data ?? []

  const sujetsArr = Array.isArray(sujetsAttente) ? sujetsAttente : []
  const pfesArr = Array.isArray(pfeList) ? pfeList.slice(0, 5) : []
  const soutsArr = Array.isArray(soutenances) ? soutenances.slice(0, 5) : []

  return (
    <DashboardLayout navItems={NAV_ITEMS}>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: '#1a2744' }}>Vue d&apos;ensemble</h1>
        <p className="text-sm text-gray-500 mt-1">Tableau de bord coordinateur</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <StatCard label="PFE total" value={stats.total_pfe ?? '—'} color="#2db84b"
          icon={<svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>} />
        <StatCard label="Sujets en attente" value={stats.sujets_en_attente ?? sujetsArr.length} color="#f59e0b"
          icon={<svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>} />
        <StatCard label="Soutenances planifiées" value={stats.soutenances_planifiees ?? soutsArr.length} color="#7e22ce"
          icon={<svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/></svg>} />
        <StatCard label="Moyenne générale" value={stats.moyenne_generale ? `${stats.moyenne_generale}/20` : '—'} color="#0ea5e9"
          icon={<svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>} />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Sujets en attente */}
        <Card title={`Sujets à valider (${sujetsArr.length})`}
          action={<Link to="/coordinateur/sujets" className="text-xs font-medium px-2.5 py-1 rounded-lg" style={{ backgroundColor: '#fef3c7', color: '#b45309' }}>Voir tout</Link>}
          icon={<svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>}>
          {sujetsArr.length === 0
            ? <p className="text-sm text-gray-400 py-2">Aucun sujet en attente</p>
            : <div className="space-y-2">
                {sujetsArr.slice(0, 4).map((s) => (
                  <div key={s.id} className="flex items-center justify-between p-3 rounded-xl" style={{ backgroundColor: '#fffbeb' }}>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate" style={{ color: '#1a2744' }}>{s.titre}</p>
                      <p className="text-xs text-gray-400">{s.filiere} · {s.propose_par?.prenom} {s.propose_par?.nom}</p>
                    </div>
                    <Badge statut={s.statut} />
                  </div>
                ))}
              </div>
          }
        </Card>

        {/* PFE récents */}
        <Card title="PFE récents"
          action={<Link to="/coordinateur/sujets" className="text-xs font-medium px-2.5 py-1 rounded-lg" style={{ backgroundColor: '#f0fdf4', color: '#15803d' }}>Tous les PFE</Link>}
          icon={<svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>}>
          {pfesArr.length === 0
            ? <p className="text-sm text-gray-400 py-2">Aucun PFE trouvé</p>
            : <div className="space-y-2">
                {pfesArr.map((p) => (
                  <div key={p.id} className="flex items-center justify-between p-3 rounded-xl" style={{ backgroundColor: '#f8fafc' }}>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate" style={{ color: '#1a2744' }}>
                        {p.etudiant?.prenom} {p.etudiant?.nom}
                      </p>
                      <p className="text-xs text-gray-400 truncate">{p.sujet?.titre}</p>
                    </div>
                    <Badge statut={p.statut} />
                  </div>
                ))}
              </div>
          }
        </Card>

        {/* Soutenances prochaines */}
        <Card title="Soutenances prochaines"
          action={<Link to="/coordinateur/soutenances" className="text-xs font-medium px-2.5 py-1 rounded-lg" style={{ backgroundColor: '#faf5ff', color: '#7e22ce' }}>Planifier</Link>}
          icon={<svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/></svg>}
          className="lg:col-span-2">
          {soutsArr.length === 0
            ? <p className="text-sm text-gray-400 py-2">Aucune soutenance planifiée</p>
            : <div className="grid sm:grid-cols-2 gap-2">
                {soutsArr.map((s) => (
                  <div key={s.id} className="flex items-center gap-3 p-3 rounded-xl" style={{ backgroundColor: '#faf5ff' }}>
                    <div className="w-10 h-10 rounded-xl flex flex-col items-center justify-center flex-shrink-0 text-center"
                         style={{ backgroundColor: '#ede9fe' }}>
                      <span className="text-xs font-bold" style={{ color: '#7e22ce' }}>
                        {new Date(s.date).getDate()}
                      </span>
                      <span className="text-[9px]" style={{ color: '#a78bfa' }}>
                        {new Date(s.date).toLocaleDateString('fr-FR', { month: 'short' }).toUpperCase()}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate" style={{ color: '#1a2744' }}>
                        {s.pfe?.etudiant?.prenom} {s.pfe?.etudiant?.nom}
                      </p>
                      <p className="text-xs text-gray-400">{s.salle} · {s.duree} min</p>
                    </div>
                    <Badge statut={s.statut} />
                  </div>
                ))}
              </div>
          }
        </Card>
      </div>
    </DashboardLayout>
  )
}
