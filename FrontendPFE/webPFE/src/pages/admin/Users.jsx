import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import DashboardLayout from '../../components/Layout/DashboardLayout'
import Card, { StatCard } from '../../components/UI/Card'
import Badge from '../../components/UI/Badge'
import { getUsers, createUser } from '../../api/auth'

const ROLE_VALUES = ['etudiant','encadrant_acad','encadrant_entr','jury','coordinateur','admin','scolarite']
const FILIERES = ['Finance','Comptabilité','Audit','Management','Informatique']

const ROLE_COLORS = {
  etudiant:       { bg: '#eff6ff', color: '#1d4ed8' },
  encadrant_acad: { bg: '#f0fdf4', color: '#15803d' },
  encadrant_entr: { bg: '#ecfdf5', color: '#047857' },
  jury:           { bg: '#faf5ff', color: '#7e22ce' },
  coordinateur:   { bg: '#fff7ed', color: '#c2410c' },
  admin:          { bg: '#fef2f2', color: '#b91c1c' },
  scolarite:      { bg: '#f0f9ff', color: '#0369a1' },
}

const INIT_FORM = { prenom: '', nom: '', email: '', password: '', role: 'etudiant', filiere: '' }

function RoleBadge({ role }) {
  const { t } = useTranslation()
  const s = ROLE_COLORS[role] ?? { bg: '#f3f4f6', color: '#374151' }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold"
          style={{ backgroundColor: s.bg, color: s.color }}>
      {t(`roles.${role}`, { defaultValue: role })}
    </span>
  )
}

export default function AdminUsers() {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(INIT_FORM)
  const [formError, setFormError] = useState('')
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')

  const NAV_ITEMS = [
    { to: '/admin', end: true, label: t('nav.utilisateurs'),
      icon: <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
    { to: '/stats', label: t('nav.statistiques'),
      icon: <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg> },
  ]

  const { data: usersRes, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => getUsers(),
  })

  const allUsers = usersRes?.data?.results ?? usersRes?.data?.data ?? usersRes?.data ?? []
  const usersArr = Array.isArray(allUsers) ? allUsers : []

  const filtered = usersArr.filter((u) => {
    const matchSearch = !search || `${u.prenom} ${u.nom} ${u.email}`.toLowerCase().includes(search.toLowerCase())
    const matchRole = !roleFilter || u.role === roleFilter
    return matchSearch && matchRole
  })

  const createMut = useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] })
      setShowForm(false); setForm(INIT_FORM); setFormError('')
    },
    onError: (e) => {
      const err = e.response?.data
      setFormError(err?.error?.message ?? err?.email?.[0] ?? err?.password?.[0] ?? 'Erreur lors de la création')
    },
  })

  const handleCreate = (e) => {
    e.preventDefault()
    if (!form.prenom || !form.nom || !form.email || !form.password || !form.role) {
      setFormError(t('admin.required_err')); return
    }
    setFormError('')
    const payload = { ...form }
    if (!payload.filiere) delete payload.filiere
    createMut.mutate(payload)
  }

  const etudiantsCount = usersArr.filter((u) => u.role === 'etudiant').length
  const encadrantsCount = usersArr.filter((u) => u.role === 'encadrant_acad' || u.role === 'encadrant_entr').length
  const juryCount = usersArr.filter((u) => u.role === 'jury').length

  const formFields = [
    { key: 'prenom',   label: t('admin.prenom'),   placeholder: 'Prénom' },
    { key: 'nom',      label: t('admin.nom'),       placeholder: 'Nom de famille' },
    { key: 'email',    label: t('admin.email'),     placeholder: 'email@iscae.mr', type: 'email' },
    { key: 'password', label: t('admin.password'),  placeholder: '••••••••', type: 'password' },
  ]

  return (
    <DashboardLayout navItems={NAV_ITEMS}>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: '#1a2744' }}>{t('admin.title')}</h1>
          <p className="text-sm text-gray-500 mt-1">{t('admin.sub')}</p>
        </div>
        <button onClick={() => { setShowForm((v) => !v); setFormError('') }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition"
          style={{ background: 'linear-gradient(135deg, #2db84b, #1e8c36)', boxShadow: '0 4px 12px rgba(45,184,75,0.3)' }}>
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            {showForm ? <line x1="18" y1="6" x2="6" y2="18"/> : <><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>}
          </svg>
          {showForm ? t('admin.cancel_btn') : t('admin.new_btn')}
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3 mb-6">
        <StatCard label={t('admin.stat_students')} value={etudiantsCount} color="#1d4ed8"
          icon={<svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>} />
        <StatCard label={t('admin.stat_encadrants')} value={encadrantsCount} color="#15803d"
          icon={<svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>} />
        <StatCard label={t('admin.stat_jury')} value={juryCount} color="#7e22ce"
          icon={<svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>} />
      </div>

      {showForm && (
        <Card title={t('admin.form_title')} className="mb-5"
          icon={<svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>}>
          <form onSubmit={handleCreate} className="grid sm:grid-cols-2 gap-4">
            {formError && (
              <div className="sm:col-span-2 px-4 py-3 rounded-xl text-sm" style={{ backgroundColor: '#fef2f2', color: '#b91c1c' }}>
                {formError}
              </div>
            )}
            {formFields.map(({ key, label, placeholder, type = 'text' }) => (
              <div key={key}>
                <label className="block text-xs font-semibold mb-1.5 text-gray-600">{label}</label>
                <input type={type} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  placeholder={placeholder}
                  className="w-full px-3 py-2.5 rounded-xl text-sm border outline-none"
                  style={{ borderColor: '#e5e7eb' }}
                  onFocus={(e) => (e.target.style.borderColor = '#2db84b')}
                  onBlur={(e) => (e.target.style.borderColor = '#e5e7eb')} />
              </div>
            ))}
            <div>
              <label className="block text-xs font-semibold mb-1.5 text-gray-600">{t('admin.role')}</label>
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl text-sm border outline-none" style={{ borderColor: '#e5e7eb' }}>
                {ROLE_VALUES.map((r) => <option key={r} value={r}>{t(`roles.${r}`)}</option>)}
              </select>
            </div>
            {form.role === 'etudiant' && (
              <div>
                <label className="block text-xs font-semibold mb-1.5 text-gray-600">{t('admin.filiere')}</label>
                <select value={form.filiere} onChange={(e) => setForm({ ...form, filiere: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl text-sm border outline-none" style={{ borderColor: '#e5e7eb' }}>
                  <option value="">{t('admin.select_filiere')}</option>
                  {FILIERES.map((f) => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
            )}
            <div className="sm:col-span-2 flex justify-end">
              <button type="submit" disabled={createMut.isPending}
                className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white"
                style={{ backgroundColor: '#2db84b', opacity: createMut.isPending ? 0.7 : 1 }}>
                {createMut.isPending ? t('admin.creating') : t('admin.create_btn')}
              </button>
            </div>
          </form>
        </Card>
      )}

      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 min-w-[200px]">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" width="14" height="14"
               fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder={t('admin.search_ph')}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm border outline-none bg-white"
            style={{ borderColor: '#e5e7eb', color: '#1a2744' }}
            onFocus={(e) => (e.target.style.borderColor = '#2db84b')}
            onBlur={(e) => (e.target.style.borderColor = '#e5e7eb')} />
        </div>
        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}
          className="px-3 py-2.5 rounded-xl text-sm border bg-white outline-none"
          style={{ borderColor: '#e5e7eb', color: '#374151' }}>
          <option value="">{t('admin.all_roles')}</option>
          {ROLE_VALUES.map((r) => <option key={r} value={r}>{t(`roles.${r}`)}</option>)}
        </select>
      </div>

      <Card title={t('admin.users_count', { count: filtered.length })}
        icon={<svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>}>
        {isLoading && (
          <div className="space-y-3">
            {[1,2,3,4].map((i) => <div key={i} className="h-14 rounded-xl bg-gray-50 animate-pulse" />)}
          </div>
        )}
        {!isLoading && filtered.length === 0 && (
          <p className="text-sm text-gray-400 py-4 text-center">{t('admin.no_users')}</p>
        )}
        {!isLoading && filtered.length > 0 && (
          <div className="divide-y divide-gray-50">
            {filtered.map((u) => (
              <div key={u.id} className="py-3.5 flex items-center gap-4">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs flex-shrink-0 text-white"
                     style={{ backgroundColor: ROLE_COLORS[u.role]?.color ?? '#6b7280' }}>
                  {u.prenom?.[0]}{u.nom?.[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold" style={{ color: '#1a2744' }}>{u.prenom} {u.nom}</p>
                  <p className="text-xs text-gray-400">{u.email}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {u.filiere && <span className="text-xs text-gray-400">{u.filiere}</span>}
                  <RoleBadge role={u.role} />
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </DashboardLayout>
  )
}
