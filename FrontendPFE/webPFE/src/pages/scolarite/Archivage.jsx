import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import DashboardLayout from '../../components/Layout/DashboardLayout'
import Card from '../../components/UI/Card'
import Badge from '../../components/UI/Badge'
import { getPFEs, archiverPFE } from '../../api/pfe'
import { SCOLARITE_NAV_ITEMS } from './_nav'

function NavIcon({ d }) {
  return <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d={d} /></svg>
}

export default function ScolariteArchivage() {
  const { t } = useTranslation()
  const qc    = useQueryClient()

  const NAV_ITEMS = SCOLARITE_NAV_ITEMS.map((item) => ({ ...item, icon: <NavIcon d={item.iconPath} /> }))

  const { data: pfesRes, isLoading } = useQuery({
    queryKey: ['pfe-scolarite'],
    queryFn: () => getPFEs({ statut: 'EN_COURS' }),
  })

  const pfesArr = (() => { const r = pfesRes?.data?.results ?? pfesRes?.data?.data ?? []; return Array.isArray(r) ? r : [] })()

  const archiverMut = useMutation({
    mutationFn: archiverPFE,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pfe-scolarite'] }),
  })

  return (
    <DashboardLayout navItems={NAV_ITEMS}>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: '#1a2744' }}>Archivage PFE</h1>
        <p className="text-sm text-gray-500 mt-1">Archiver les PFE terminés en fin d'année académique</p>
      </div>

      <Card title={`PFE en cours à archiver (${pfesArr.length})`}
        icon={<svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>}>

        {isLoading && <div className="space-y-3">{[1,2,3].map((i) => <div key={i} className="h-14 rounded-xl bg-gray-50 animate-pulse" />)}</div>}

        {!isLoading && pfesArr.length === 0 && (
          <p className="text-sm text-gray-400 py-6 text-center">Aucun PFE en cours à archiver.</p>
        )}

        {!isLoading && pfesArr.length > 0 && (
          <div className="divide-y divide-gray-50">
            {pfesArr.map((p) => (
              <div key={p.id} className="py-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-sm font-bold text-white"
                  style={{ backgroundColor: '#1a2744' }}>
                  {p.etudiant?.prenom?.[0]}{p.etudiant?.nom?.[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold" style={{ color: '#1a2744' }}>
                    {p.etudiant?.prenom} {p.etudiant?.nom}
                  </p>
                  <p className="text-xs text-gray-400 truncate">{p.titre} · {p.filiere} · {p.annee}</p>
                </div>
                <Badge statut={p.statut} />
                <button onClick={() => { if (window.confirm(`Archiver le PFE de ${p.etudiant?.prenom} ${p.etudiant?.nom} ?`)) archiverMut.mutate(p.id) }}
                  disabled={archiverMut.isPending}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold flex-shrink-0"
                  style={{ backgroundColor: '#faf5ff', color: '#7e22ce', border: '1px solid #e9d5ff' }}>
                  Archiver
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </DashboardLayout>
  )
}
