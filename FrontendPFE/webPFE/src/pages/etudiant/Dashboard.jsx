import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import DashboardLayout from '../../components/Layout/DashboardLayout'
import Card, { StatCard } from '../../components/UI/Card'
import Badge from '../../components/UI/Badge'
import { getMonPFE } from '../../api/pfe'
import { getMaSoutenance } from '../../api/soutenances'

const NAV_ITEMS = [
  {
    to: '/etudiant', end: true, label: 'Mon PFE',
    icon: <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>,
  },
  {
    to: '/etudiant/livrables', label: 'Mes Livrables',
    icon: <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>,
  },
  {
    to: '/etudiant/soutenance', label: 'Ma Soutenance',
    icon: <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>,
  },
]

function InfoRow({ label, value }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start py-3 border-b border-gray-50 last:border-0 gap-1">
      <span className="text-xs text-gray-400 sm:w-36 flex-shrink-0 pt-0.5">{label}</span>
      <span className="text-sm font-medium" style={{ color: '#1a2744' }}>{value ?? '—'}</span>
    </div>
  )
}

function PlagiatGauge({ score }) {
  const pct = Math.min(score, 100)
  const color = score > 30 ? '#ef4444' : score > 20 ? '#f59e0b' : '#22c55e'
  const label = score > 30 ? 'Score élevé — livrable à revoir' : score > 20 ? 'Score modéré' : 'Score acceptable'
  return (
    <div>
      <div className="flex justify-between items-end mb-2">
        <span className="text-xs text-gray-500">Taux de similitude</span>
        <span className="text-2xl font-bold" style={{ color }}>{score}%</span>
      </div>
      <div className="h-2.5 rounded-full overflow-hidden" style={{ backgroundColor: '#f1f5f9' }}>
        <div
          className="h-2.5 rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${color}cc, ${color})` }}
        />
      </div>
      <p className="text-xs mt-2" style={{ color }}>{label}</p>
    </div>
  )
}

export default function EtudiantDashboard() {
  const { data: pfeRes, isLoading: pfeLoading, isError: pfeError } = useQuery({
    queryKey: ['mon-pfe'],
    queryFn: getMonPFE,
  })
  const { data: soutRes } = useQuery({
    queryKey: ['ma-soutenance'],
    queryFn: getMaSoutenance,
    retry: false,
  })

  const pfe = pfeRes?.data?.data
  const soutenance = soutRes?.data?.data

  return (
    <DashboardLayout navItems={NAV_ITEMS}>
      {/* En-tête */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: '#1a2744' }}>
          Mon Projet de Fin d&apos;Études
        </h1>
        <p className="text-sm text-gray-500 mt-1">Suivi de votre PFE et des échéances importantes</p>
      </div>

      {pfeLoading && (
        <div className="grid gap-4 sm:grid-cols-3 mb-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-white rounded-2xl border border-gray-100 animate-pulse" />
          ))}
        </div>
      )}

      {pfeError && (
        <div className="bg-white rounded-2xl border border-amber-100 p-8 text-center"
             style={{ backgroundColor: '#fffbeb' }}>
          <div className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center"
               style={{ backgroundColor: '#fef3c7' }}>
            <svg width="24" height="24" fill="none" stroke="#d97706" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <p className="text-sm font-semibold" style={{ color: '#92400e' }}>Aucun PFE trouvé</p>
          <p className="text-xs text-amber-600 mt-1">
            Contactez le coordinateur pour être affecté à un sujet.
          </p>
        </div>
      )}

      {pfe && (
        <>
          {/* Stat Cards */}
          <div className="grid gap-4 sm:grid-cols-3 mb-6">
            <StatCard
              label="Statut du PFE"
              value={<Badge statut={pfe.statut} />}
              icon={<svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>}
            />
            <StatCard
              label="Score plagiat"
              value={pfe.score_plagiat != null ? `${pfe.score_plagiat}%` : '—'}
              sub={pfe.score_plagiat != null ? (pfe.score_plagiat > 30 ? 'À revoir' : 'Acceptable') : 'Non analysé'}
              color={pfe.score_plagiat > 30 ? '#ef4444' : '#2db84b'}
              icon={<svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18" /></svg>}
            />
            <StatCard
              label="Soutenance"
              value={soutenance ? new Date(soutenance.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : '—'}
              sub={soutenance ? soutenance.salle : 'Pas encore planifiée'}
              color="#7e22ce"
              icon={<svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>}
            />
          </div>

          {/* Contenu principal */}
          <div className="grid gap-5 lg:grid-cols-2">
            {/* Info PFE */}
            <Card
              title="Informations PFE"
              icon={<svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /></svg>}
            >
              <InfoRow label="Titre" value={pfe.sujet?.titre} />
              <InfoRow label="Filière" value={pfe.sujet?.filiere} />
              <InfoRow label="Année" value={pfe.sujet?.annee} />
              <InfoRow
                label="Encadrant"
                value={
                  pfe.sujet?.encadrant
                    ? `${pfe.sujet.encadrant.prenom} ${pfe.sujet.encadrant.nom}`
                    : <span className="text-gray-400">Non affecté</span>
                }
              />
              <InfoRow label="Statut" value={<Badge statut={pfe.statut} />} />
            </Card>

            {/* Colonne droite */}
            <div className="flex flex-col gap-5">
              {/* Plagiat */}
              <Card
                title="Analyse plagiat"
                icon={<svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18" /></svg>}
              >
                {pfe.score_plagiat != null
                  ? <PlagiatGauge score={pfe.score_plagiat} />
                  : (
                    <div className="text-center py-2">
                      <p className="text-sm text-gray-400">Aucun livrable analysé</p>
                      <Link to="/etudiant/livrables"
                            className="text-xs font-medium mt-1 inline-block"
                            style={{ color: '#2db84b' }}>
                        Déposer un livrable →
                      </Link>
                    </div>
                  )
                }
              </Card>

              {/* Soutenance rapide */}
              <Card
                title="Ma Soutenance"
                icon={<svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="3" y1="10" x2="21" y2="10" /></svg>}
                action={
                  <Link to="/etudiant/soutenance"
                        className="text-xs font-medium px-2.5 py-1 rounded-lg transition"
                        style={{ backgroundColor: '#f0fdf4', color: '#15803d' }}>
                    Détails
                  </Link>
                }
              >
                {soutenance ? (
                  <>
                    <InfoRow
                      label="Date"
                      value={new Date(soutenance.date).toLocaleString('fr-FR', {
                        weekday: 'long', day: 'numeric', month: 'long',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    />
                    <InfoRow label="Salle" value={soutenance.salle} />
                    <InfoRow label="Statut" value={<Badge statut={soutenance.statut} />} />
                    {soutenance.note_finale != null && (
                      <InfoRow label="Note finale" value={
                        <span className="font-bold text-base" style={{ color: soutenance.note_finale >= 10 ? '#15803d' : '#b91c1c' }}>
                          {soutenance.note_finale} <span className="text-xs font-normal text-gray-400">/ 20</span>
                        </span>
                      } />
                    )}
                  </>
                ) : (
                  <p className="text-sm text-gray-400 py-1">Pas encore planifiée</p>
                )}
              </Card>
            </div>

            {/* Livrables CTA */}
            <Card
              title="Livrables"
              icon={<svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>}
              action={
                <Link
                  to="/etudiant/livrables"
                  className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg text-white transition"
                  style={{ backgroundColor: '#2db84b' }}
                >
                  <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  Déposer
                </Link>
              }
            >
              <p className="text-sm text-gray-500 leading-relaxed">
                Déposez vos rapports, présentations et documents relatifs à votre PFE.
                Ils seront analysés automatiquement pour le plagiat.
              </p>
            </Card>
          </div>
        </>
      )}
    </DashboardLayout>
  )
}
