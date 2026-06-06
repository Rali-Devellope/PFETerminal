import { useState } from 'react'

function downloadBlob(data, filename) {
  const url = URL.createObjectURL(new Blob([data], { type: 'application/pdf' }))
  const a = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

function PdfBtn({ label, filename, fetchFn, color = '#1e3a5f' }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handle = async () => {
    setLoading(true); setError('')
    try {
      const { data } = await fetchFn()
      downloadBlob(data, filename)
    } catch (e) {
      setError(e.response?.data?.error?.message ?? 'Erreur PDF')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <button onClick={handle} disabled={loading}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition hover:opacity-80"
        style={{ backgroundColor: color + '15', color, opacity: loading ? 0.6 : 1 }}>
        <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          {loading
            ? <path d="M21 12a9 9 0 1 1-6.219-8.56" strokeLinecap="round" className="animate-spin" />
            : <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></>
          }
        </svg>
        {loading ? 'PDF...' : label}
      </button>
      {error && <p className="text-[10px] mt-0.5" style={{ color: '#ef4444' }}>{error}</p>}
    </div>
  )
}

export function PVButton({ soutenanceId }) {
  return <PdfBtn label="PV" filename={`pv_${soutenanceId}.pdf`}
    fetchFn={() => import('../../api/soutenances').then(m => m.telechargerPV(soutenanceId))}
    color="#7e22ce" />
}

export function ReleveButton({ soutenanceId }) {
  return <PdfBtn label="Relevé" filename={`releve_${soutenanceId}.pdf`}
    fetchFn={() => import('../../api/soutenances').then(m => m.telechargerReleve(soutenanceId))}
    color="#0369a1" />
}

export function AttestationButton({ soutenanceId }) {
  return <PdfBtn label="Attestation" filename={`attestation_${soutenanceId}.pdf`}
    fetchFn={() => import('../../api/soutenances').then(m => m.telechargerAttestation(soutenanceId))}
    color="#15803d" />
}
