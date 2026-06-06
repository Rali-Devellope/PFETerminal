import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import DashboardLayout from '../../components/Layout/DashboardLayout'
import Card from '../../components/UI/Card'
import Badge from '../../components/UI/Badge'
import { getPFE } from '../../api/pfe'

export default function EtudiantDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { t } = useTranslation()

  const NAV_ITEMS = [
    { to: '/encadrant', end: true, label: t('nav.vue_ensemble'),
      icon: <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg> },
    { to: '/encadrant/sujets', label: t('nav.sujets'),
      icon: <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg> },
    { to: '/encadrant/livrables', label: t('nav.mes_livrables'),
      icon: <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> },
  ]

  const { data, isLoading, isError } = useQuery({
    queryKey: ['pfe-detail', id],
    queryFn: () => getPFE(id),
  })

  const pfe = data?.data?.data ?? data?.data

  const TYPE_LABELS = { rapport: 'Rapport', presentation: 'Présentation', code: 'Code source' }
  const livrablesValides = pfe?.livrables?.filter((l) => l.statut === 'VALIDE').length ?? 0
  const livrablesTotal = pfe?.livrables?.length ?? 0
  const progression = livrablesTotal > 0 ? Math.round((livrablesValides / livrablesTotal) * 100) : 0

  return (
    <DashboardLayout navItems={NAV_ITEMS}>
      <div className="mb-6 flex items-center gap-3">
        <button onClick={() => navigate(-1)}
          className="p-2 rounded-xl hover:bg-gray-100 transition"
          style={{ color: '#6b7280' }}>
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: '#1a2744' }}>
            {pfe ? `${pfe.etudiant?.prenom} ${pfe.etudiant?.nom}` : '...'}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Détail du PFE</p>
        </div>
      </div>

      {isLoading && (
        <div className="space-y-4">
          {[1,2,3].map((i) => <div key={i} className="h-24 rounded-2xl bg-gray-50 animate-pulse" />)}
        </div>
      )}

      {isError && (
        <p className="text-sm text-red-500 py-6 text-center">PFE introuvable ou accès refusé.</p>
      )}

      {pfe && (
        <div className="space-y-5">
          {/* Infos PFE */}
          <Card title="Informations PFE"
            icon={<svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>}>
            <div className="grid sm:grid-cols-2 gap-4">
              {[
                { label: 'Titre', value: pfe.titre },
                { label: 'Filière', value: pfe.filiere },
                { label: 'Année', value: pfe.annee },
                { label: 'Email', value: pfe.etudiant?.email },
              ].map(({ label, value }) => (
                <div key={label} className="py-2.5 border-b border-gray-50">
                  <p className="text-xs text-gray-400 mb-0.5">{label}</p>
                  <p className="text-sm font-medium" style={{ color: '#1a2744' }}>{value ?? '—'}</p>
                </div>
              ))}
              <div className="py-2.5 border-b border-gray-50 sm:col-span-2">
                <p className="text-xs text-gray-400 mb-1">Statut</p>
                <Badge statut={pfe.statut} />
              </div>
            </div>
          </Card>

          {/* Progression livrables */}
          <Card title={`Livrables (${livrablesValides}/${livrablesTotal} validés)`}
            icon={<svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>}>
            {/* Barre progression */}
            <div className="mb-4">
              <div className="flex justify-between text-xs text-gray-400 mb-1">
                <span>Progression</span>
                <span className="font-semibold" style={{ color: progression === 100 ? '#15803d' : '#1a2744' }}>
                  {progression}%
                </span>
              </div>
              <div className="h-2 rounded-full bg-gray-100">
                <div className="h-2 rounded-full transition-all duration-500"
                     style={{ width: `${progression}%`, backgroundColor: progression === 100 ? '#2db84b' : '#0ea5e9' }} />
              </div>
            </div>

            {pfe.livrables?.length === 0 && (
              <p className="text-sm text-gray-400 py-4 text-center">Aucun livrable déposé</p>
            )}
            <div className="divide-y divide-gray-50">
              {pfe.livrables?.map((l) => (
                <div key={l.id} className="py-3 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                       style={{ backgroundColor: l.statut === 'VALIDE' ? '#f0fdf4' : l.statut === 'REFUSE' ? '#fef2f2' : '#f1f5f9' }}>
                    <svg width="15" height="15" fill="none"
                         stroke={l.statut === 'VALIDE' ? '#2db84b' : l.statut === 'REFUSE' ? '#ef4444' : '#94a3b8'}
                         strokeWidth="2" viewBox="0 0 24 24">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                      <polyline points="14 2 14 8 20 8"/>
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium" style={{ color: '#1a2744' }}>
                      {TYPE_LABELS[l.type_livrable] ?? l.type_livrable}
                    </p>
                    <p className="text-xs text-gray-400">
                      {new Date(l.date_depot).toLocaleDateString('fr-FR')}
                      {l.remarques && ` · ${l.remarques}`}
                    </p>
                  </div>
                  <Badge statut={l.statut} />
                  {l.fichier && (
                    <a href={l.fichier} target="_blank" rel="noreferrer"
                       className="p-1.5 rounded-lg hover:bg-gray-100 transition" title="Télécharger">
                      <svg width="14" height="14" fill="none" stroke="#6b7280" strokeWidth="2" viewBox="0 0 24 24">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                        <polyline points="7 10 12 15 17 10"/>
                        <line x1="12" y1="15" x2="12" y2="3"/>
                      </svg>
                    </a>
                  )}
                </div>
              ))}
            </div>
          </Card>

          {/* Score plagiat */}
          {pfe.score_plagiat != null && (
            <Card title="Analyse plagiat"
              icon={<svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>}>
              <div className="flex items-center gap-4">
                <div>
                  <p className="text-3xl font-black"
                     style={{ color: pfe.score_plagiat > 30 ? '#ef4444' : pfe.score_plagiat > 20 ? '#f59e0b' : '#2db84b' }}>
                    {pfe.score_plagiat}%
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {pfe.score_plagiat > 30 ? 'Score élevé — à revoir' : pfe.score_plagiat > 20 ? 'Score modéré' : 'Score acceptable'}
                  </p>
                </div>
                <div className="flex-1">
                  <div className="h-3 rounded-full bg-gray-100">
                    <div className="h-3 rounded-full transition-all"
                         style={{
                           width: `${Math.min(pfe.score_plagiat, 100)}%`,
                           backgroundColor: pfe.score_plagiat > 30 ? '#ef4444' : pfe.score_plagiat > 20 ? '#f59e0b' : '#2db84b'
                         }} />
                  </div>
                </div>
              </div>
            </Card>
          )}
        </div>
      )}
    </DashboardLayout>
  )
}
