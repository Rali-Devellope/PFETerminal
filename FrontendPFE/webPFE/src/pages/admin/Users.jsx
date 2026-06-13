import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import DashboardLayout from '../../components/Layout/DashboardLayout'
import Card, { StatCard } from '../../components/UI/Card'
import { getUsers, createUser, updateUser } from '../../api/auth'
import { useFilieres } from '../../hooks/useFilieres'
import { createFiliere, updateFiliere, deleteFiliere } from '../../api/config'

const ROLE_VALUES = ['etudiant', 'encadrant_acad', 'encadrant_entr', 'jury', 'coordinateur', 'admin', 'scolarite']

const ROLE_COLORS = {
  etudiant:       { bg: '#eff6ff', color: '#1d4ed8' },
  encadrant_acad: { bg: '#f0fdf4', color: '#15803d' },
  encadrant_entr: { bg: '#ecfdf5', color: '#047857' },
  jury:           { bg: '#faf5ff', color: '#7e22ce' },
  coordinateur:   { bg: '#fff7ed', color: '#c2410c' },
  admin:          { bg: '#fef2f2', color: '#b91c1c' },
  scolarite:      { bg: '#f0f9ff', color: '#0369a1' },
}

const INIT_FORM = { prenom: '', nom: '', email: '', password: '', role: 'etudiant', filiere: '', telephone: '', matricule: '', max_etudiants: 5 }

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

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-semibold mb-1.5 text-gray-600">{label}</label>
      {children}
    </div>
  )
}

const inputCls = "w-full px-3 py-2.5 rounded-xl text-sm border outline-none bg-white"
const inputStyle = { borderColor: '#e5e7eb' }
const onFocus = (e) => (e.target.style.borderColor = '#2db84b')
const onBlur  = (e) => (e.target.style.borderColor = '#e5e7eb')

export default function AdminUsers() {
  const { t } = useTranslation()
  const qc = useQueryClient()

  // ── Onglet actif ──────────────────────────────────────────────
  const [tab, setTab] = useState('users') // 'users' | 'filieres'

  // ── Utilisateurs ──────────────────────────────────────────────
  const [search, setSearch]         = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm]             = useState(INIT_FORM)
  const [formError, setFormError]   = useState('')
  const [editTarget, setEditTarget] = useState(null)
  const [editForm, setEditForm]     = useState({ nom: '', prenom: '', role: '', is_active: true, max_etudiants: 5, filiere: '', telephone: '', matricule: '' })

  // ── Filières ──────────────────────────────────────────────────
  const [filiereForm, setFiliereForm] = useState({ libelle: '', code: '' })
  const [editFiliere, setEditFiliere] = useState(null)

  const NAV_ITEMS = [
    { to: '/admin', end: true, label: t('nav.utilisateurs'),
      icon: <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
    { to: '/stats', label: t('nav.statistiques'),
      icon: <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg> },
  ]

  const { data: usersRes, isLoading } = useQuery({ queryKey: ['users'], queryFn: getUsers })
  const { filieres: filieresData }    = useFilieres()
  const filieres = filieresData.map((f) => f.libelle)

  const allUsers = usersRes?.data?.results ?? usersRes?.data?.data ?? usersRes?.data ?? []
  const usersArr = Array.isArray(allUsers) ? allUsers : []
  const filtered = usersArr.filter((u) => {
    const matchSearch = !search || `${u.prenom} ${u.nom} ${u.email}`.toLowerCase().includes(search.toLowerCase())
    const matchRole   = !roleFilter || u.role === roleFilter
    return matchSearch && matchRole
  })

  // ── Mutations utilisateurs ────────────────────────────────────
  const createMut = useMutation({
    mutationFn: createUser,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); setShowCreate(false); setForm(INIT_FORM); setFormError('') },
    onError: (e) => {
      const err = e.response?.data
      setFormError(err?.error?.message ?? err?.email?.[0] ?? err?.password?.[0] ?? 'Erreur lors de la création')
    },
  })
  const updateMut = useMutation({
    mutationFn: ({ id, data }) => updateUser(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); setEditTarget(null) },
  })
  const toggleActiveMut = useMutation({
    mutationFn: ({ id, is_active }) => updateUser(id, { is_active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  })

  const handleCreate = (e) => {
    e.preventDefault()
    if (!form.prenom || !form.nom || !form.email || !form.password || !form.role) {
      setFormError(t('admin.required_err')); return
    }
    setFormError('')
    const payload = { ...form }
    if (!payload.filiere)   delete payload.filiere
    if (!payload.telephone) delete payload.telephone
    if (!payload.matricule) delete payload.matricule
    createMut.mutate(payload)
  }

  // ── Mutations filières ────────────────────────────────────────
  const createFiliereMut = useMutation({
    mutationFn: createFiliere,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['filieres'] }); setFiliereForm({ libelle: '', code: '' }) },
  })
  const updateFiliereMut = useMutation({
    mutationFn: ({ id, data }) => updateFiliere(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['filieres'] }); setEditFiliere(null) },
  })
  const deleteFiliereMut = useMutation({
    mutationFn: deleteFiliere,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['filieres'] }),
  })

  const etudiantsCount  = usersArr.filter((u) => u.role === 'etudiant').length
  const encadrantsCount = usersArr.filter((u) => u.role === 'encadrant_acad' || u.role === 'encadrant_entr').length
  const juryCount       = usersArr.filter((u) => u.role === 'jury').length

  // ── Modal création ────────────────────────────────────────────
  const ModalCreate = () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-bold" style={{ color: '#1a2744' }}>{t('admin.form_title')}</h3>
          <button onClick={() => { setShowCreate(false); setForm(INIT_FORM); setFormError('') }}
            className="p-1.5 rounded-lg hover:bg-gray-100">
            <svg width="16" height="16" fill="none" stroke="#6b7280" strokeWidth="2" viewBox="0 0 24 24">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {formError && (
          <div className="mb-4 px-4 py-3 rounded-xl text-sm" style={{ backgroundColor: '#fef2f2', color: '#b91c1c' }}>
            {formError}
          </div>
        )}

        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label={t('admin.prenom')}>
              <input type="text" value={form.prenom} onChange={(e) => setForm({ ...form, prenom: e.target.value })}
                placeholder="Prénom" className={inputCls} style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
            </Field>
            <Field label={t('admin.nom')}>
              <input type="text" value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })}
                placeholder="Nom" className={inputCls} style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
            </Field>
          </div>

          <Field label={t('admin.email')}>
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="email@iscae.mr" className={inputCls} style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label={t('admin.password')}>
              <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="••••••••" className={inputCls} style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
            </Field>
            <Field label={t('admin.role')}>
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}
                className={inputCls} style={inputStyle} onFocus={onFocus} onBlur={onBlur}>
                {ROLE_VALUES.map((r) => <option key={r} value={r}>{t(`roles.${r}`)}</option>)}
              </select>
            </Field>
          </div>

          <Field label={t('admin.telephone')}>
            <input type="text" value={form.telephone} onChange={(e) => setForm({ ...form, telephone: e.target.value })}
              placeholder="+222 XX XX XX XX" className={inputCls} style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
          </Field>

          {form.role === 'etudiant' && (
            <div className="grid grid-cols-2 gap-3">
              <Field label={t('admin.filiere')}>
                <select value={form.filiere} onChange={(e) => setForm({ ...form, filiere: e.target.value })}
                  className={inputCls} style={inputStyle} onFocus={onFocus} onBlur={onBlur}>
                  <option value="">{t('admin.select_filiere')}</option>
                  {filieres.map((f) => <option key={f} value={f}>{f}</option>)}
                </select>
              </Field>
              <Field label={t('admin.matricule')}>
                <input type="text" value={form.matricule} onChange={(e) => setForm({ ...form, matricule: e.target.value })}
                  placeholder="2024-INF-001" className={inputCls} style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
              </Field>
            </div>
          )}

          {(form.role === 'encadrant_acad' || form.role === 'encadrant_entr') && (
            <Field label="Quota max étudiants">
              <input type="number" min="1" max="20" value={form.max_etudiants ?? 5}
                onChange={(e) => setForm({ ...form, max_etudiants: parseInt(e.target.value) || 1 })}
                className={inputCls} style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
            </Field>
          )}

          <div className="flex gap-2 pt-2">
            <button type="button" onClick={() => { setShowCreate(false); setForm(INIT_FORM); setFormError('') }}
              className="flex-1 py-2.5 rounded-xl text-sm border font-medium"
              style={{ borderColor: '#e5e7eb', color: '#6b7280' }}>
              {t('common.cancel')}
            </button>
            <button type="submit" disabled={createMut.isPending}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white"
              style={{ backgroundColor: '#2db84b', opacity: createMut.isPending ? 0.7 : 1 }}>
              {createMut.isPending ? t('admin.creating') : t('admin.create_btn')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )

  // ── Modal édition ─────────────────────────────────────────────
  const ModalEdit = () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-base font-bold" style={{ color: '#1a2744' }}>{t('admin.edit_title')}</h3>
            <p className="text-xs text-gray-400 mt-0.5">{editTarget?.prenom} {editTarget?.nom}</p>
          </div>
          <button onClick={() => setEditTarget(null)} className="p-1.5 rounded-lg hover:bg-gray-100">
            <svg width="16" height="16" fill="none" stroke="#6b7280" strokeWidth="2" viewBox="0 0 24 24">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label={t('admin.prenom')}>
              <input type="text" value={editForm.prenom}
                onChange={(e) => setEditForm({ ...editForm, prenom: e.target.value })}
                className={inputCls} style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
            </Field>
            <Field label={t('admin.nom')}>
              <input type="text" value={editForm.nom}
                onChange={(e) => setEditForm({ ...editForm, nom: e.target.value })}
                className={inputCls} style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
            </Field>
          </div>

          <Field label={t('admin.role')}>
            <select value={editForm.role}
              onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
              className={inputCls} style={inputStyle} onFocus={onFocus} onBlur={onBlur}>
              {ROLE_VALUES.map((r) => <option key={r} value={r}>{t(`roles.${r}`)}</option>)}
            </select>
          </Field>

          <Field label={t('admin.telephone')}>
            <input type="text" value={editForm.telephone}
              onChange={(e) => setEditForm({ ...editForm, telephone: e.target.value })}
              placeholder="+222 XX XX XX XX"
              className={inputCls} style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
          </Field>

          {editForm.role === 'etudiant' && (
            <div className="grid grid-cols-2 gap-3">
              <Field label={t('admin.filiere')}>
                <select value={editForm.filiere}
                  onChange={(e) => setEditForm({ ...editForm, filiere: e.target.value })}
                  className={inputCls} style={inputStyle} onFocus={onFocus} onBlur={onBlur}>
                  <option value="">{t('admin.select_filiere')}</option>
                  {filieres.map((f) => <option key={f} value={f}>{f}</option>)}
                </select>
              </Field>
              <Field label={t('admin.matricule')}>
                <input type="text" value={editForm.matricule}
                  onChange={(e) => setEditForm({ ...editForm, matricule: e.target.value })}
                  placeholder="2024-INF-001"
                  className={inputCls} style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
              </Field>
            </div>
          )}

          {(editForm.role === 'encadrant_acad' || editForm.role === 'encadrant_entr') && (
            <Field label="Quota max étudiants">
              <input type="number" min="1" max="20" value={editForm.max_etudiants}
                onChange={(e) => setEditForm({ ...editForm, max_etudiants: parseInt(e.target.value) || 1 })}
                className={inputCls} style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
            </Field>
          )}

          <div className="flex items-center justify-between px-3 py-2.5 rounded-xl"
               style={{ backgroundColor: editForm.is_active ? '#f0fdf4' : '#fef2f2' }}>
            <span className="text-sm font-medium" style={{ color: editForm.is_active ? '#15803d' : '#b91c1c' }}>
              {editForm.is_active ? t('admin.active') : t('admin.inactive')}
            </span>
            <button onClick={() => setEditForm({ ...editForm, is_active: !editForm.is_active })}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold"
              style={{ backgroundColor: editForm.is_active ? '#fef2f2' : '#f0fdf4', color: editForm.is_active ? '#b91c1c' : '#15803d' }}>
              {editForm.is_active ? t('admin.deactivate') : t('admin.activate')}
            </button>
          </div>
        </div>

        <div className="flex gap-2 mt-5">
          <button onClick={() => setEditTarget(null)}
            className="flex-1 py-2.5 rounded-xl text-sm border font-medium"
            style={{ borderColor: '#e5e7eb', color: '#6b7280' }}>
            {t('common.cancel')}
          </button>
          <button onClick={() => updateMut.mutate({ id: editTarget.id, data: editForm })}
            disabled={updateMut.isPending}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white"
            style={{ backgroundColor: '#2db84b', opacity: updateMut.isPending ? 0.7 : 1 }}>
            {updateMut.isPending ? t('admin.saving') : t('admin.save_btn')}
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <DashboardLayout navItems={NAV_ITEMS}>
      {showCreate && <ModalCreate />}
      {editTarget  && <ModalEdit />}

      {/* ── En-tête ── */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: '#1a2744' }}>
            {t('admin.title')}
          </h1>
          <p className="text-sm text-gray-500 mt-1">{t('admin.sub')}</p>
        </div>
        {tab === 'users' && (
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white"
            style={{ background: 'linear-gradient(135deg, #2db84b, #1e8c36)', boxShadow: '0 4px 12px rgba(45,184,75,0.3)' }}>
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            {t('admin.new_btn')}
          </button>
        )}
      </div>

      {/* ── Onglets ── */}
      <div className="flex gap-1 mb-5 p-1 rounded-xl w-fit" style={{ backgroundColor: '#f1f5f9' }}>
        {[
          { key: 'users',    label: `Utilisateurs (${usersArr.length})` },
          { key: 'filieres', label: `Filières (${filieresData.length})` },
        ].map(({ key, label }) => (
          <button key={key} onClick={() => setTab(key)}
            className="px-4 py-2 rounded-lg text-sm font-semibold transition"
            style={{
              backgroundColor: tab === key ? '#fff' : 'transparent',
              color: tab === key ? '#1a2744' : '#6b7280',
              boxShadow: tab === key ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
            }}>
            {label}
          </button>
        ))}
      </div>

      {/* ══ Onglet Utilisateurs ══ */}
      {tab === 'users' && (
        <>
          {/* Stats */}
          <div className="grid gap-4 sm:grid-cols-3 mb-5">
            <StatCard label={t('admin.stat_students')} value={etudiantsCount} color="#1d4ed8"
              icon={<svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>} />
            <StatCard label={t('admin.stat_encadrants')} value={encadrantsCount} color="#15803d"
              icon={<svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>} />
            <StatCard label={t('admin.stat_jury')} value={juryCount} color="#7e22ce"
              icon={<svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>} />
          </div>

          {/* Filtres */}
          <div className="flex flex-wrap gap-3 mb-4">
            <div className="relative flex-1 min-w-[200px]">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" width="14" height="14"
                   fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder={t('admin.search_ph')}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm border outline-none bg-white"
                style={{ borderColor: '#e5e7eb', color: '#1a2744' }}
                onFocus={onFocus} onBlur={onBlur} />
            </div>
            <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}
              className="px-3 py-2.5 rounded-xl text-sm border bg-white outline-none"
              style={{ borderColor: '#e5e7eb', color: '#374151' }}>
              <option value="">{t('admin.all_roles')}</option>
              {ROLE_VALUES.map((r) => <option key={r} value={r}>{t(`roles.${r}`)}</option>)}
            </select>
          </div>

          {/* Liste */}
          <div className="bg-white rounded-2xl" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
            <div className="px-5 py-3.5 border-b border-gray-50 flex items-center justify-between">
              <span className="text-sm font-semibold" style={{ color: '#1a2744' }}>
                {t('admin.users_count', { count: filtered.length })}
              </span>
            </div>

            {isLoading && (
              <div className="p-5 space-y-3">
                {[1,2,3,4].map((i) => <div key={i} className="h-14 rounded-xl bg-gray-50 animate-pulse" />)}
              </div>
            )}
            {!isLoading && filtered.length === 0 && (
              <p className="text-sm text-gray-400 py-8 text-center">{t('admin.no_users')}</p>
            )}
            {!isLoading && filtered.length > 0 && (
              <div className="divide-y divide-gray-50">
                {filtered.map((u) => (
                  <div key={u.id} className="px-5 py-3.5 flex items-center gap-4"
                       style={{ opacity: u.is_active ? 1 : 0.5 }}>
                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs flex-shrink-0 text-white"
                         style={{ backgroundColor: ROLE_COLORS[u.role]?.color ?? '#6b7280' }}>
                      {u.prenom?.[0]}{u.nom?.[0]}
                    </div>

                    {/* Info principale */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold" style={{ color: '#1a2744' }}>{u.prenom} {u.nom}</p>
                        {!u.is_active && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                                style={{ backgroundColor: '#fef2f2', color: '#b91c1c' }}>
                            {t('admin.inactive')}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 truncate">{u.email}</p>
                      {/* Infos supplémentaires selon rôle */}
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        {u.role === 'etudiant' && u.filiere && (
                          <span className="text-[11px] text-blue-600 font-medium">{u.filiere}</span>
                        )}
                        {u.role === 'etudiant' && u.matricule && (
                          <span className="text-[11px] text-gray-400"># {u.matricule}</span>
                        )}
                        {u.telephone && (
                          <span className="text-[11px] text-gray-400">{u.telephone}</span>
                        )}
                        {(u.role === 'encadrant_acad' || u.role === 'encadrant_entr') && (
                          <span className="text-[11px] font-medium" style={{ color: '#15803d' }}>
                            max {u.max_etudiants ?? 5} étudiants
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Badge + actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <RoleBadge role={u.role} />
                      <button
                        onClick={() => {
                          setEditTarget(u)
                          setEditForm({ nom: u.nom, prenom: u.prenom, role: u.role, is_active: u.is_active, max_etudiants: u.max_etudiants ?? 5, filiere: u.filiere ?? '', telephone: u.telephone ?? '', matricule: u.matricule ?? '' })
                        }}
                        className="p-1.5 rounded-lg transition hover:bg-gray-100"
                        title={t('admin.edit_btn')}>
                        <svg width="14" height="14" fill="none" stroke="#6b7280" strokeWidth="2" viewBox="0 0 24 24">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                      </button>
                      <button
                        onClick={() => toggleActiveMut.mutate({ id: u.id, is_active: !u.is_active })}
                        disabled={toggleActiveMut.isPending}
                        className="p-1.5 rounded-lg transition hover:bg-gray-100"
                        title={u.is_active ? t('admin.deactivate') : t('admin.activate')}>
                        <svg width="14" height="14" fill="none" strokeWidth="2" viewBox="0 0 24 24"
                             stroke={u.is_active ? '#ef4444' : '#2db84b'}>
                          {u.is_active
                            ? <><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></>
                            : <><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></>
                          }
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* ══ Onglet Filières ══ */}
      {tab === 'filieres' && (
        <div className="bg-white rounded-2xl" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          <div className="px-5 py-4 border-b border-gray-50">
            <h2 className="text-sm font-semibold" style={{ color: '#1a2744' }}>Gestion des filières</h2>
            <p className="text-xs text-gray-400 mt-0.5">Ajoutez, modifiez ou désactivez les filières de l'établissement</p>
          </div>

          {/* Formulaire ajout */}
          <div className="px-5 py-4 border-b border-gray-50">
            <p className="text-xs font-semibold text-gray-500 mb-3">Ajouter une filière</p>
            <div className="flex gap-2">
              <input type="text" value={filiereForm.libelle}
                onChange={(e) => setFiliereForm({ ...filiereForm, libelle: e.target.value })}
                placeholder="Libellé (ex : Informatique)"
                className="flex-1 px-3 py-2.5 rounded-xl text-sm border outline-none"
                style={{ borderColor: '#e5e7eb' }} onFocus={onFocus} onBlur={onBlur} />
              <input type="text" value={filiereForm.code}
                onChange={(e) => setFiliereForm({ ...filiereForm, code: e.target.value })}
                placeholder="Code (ex : INF)"
                className="w-28 px-3 py-2.5 rounded-xl text-sm border outline-none"
                style={{ borderColor: '#e5e7eb' }} onFocus={onFocus} onBlur={onBlur} />
              <button
                onClick={() => { if (filiereForm.libelle.trim()) createFiliereMut.mutate(filiereForm) }}
                disabled={createFiliereMut.isPending}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white flex-shrink-0"
                style={{ backgroundColor: filiereForm.libelle.trim() ? '#2db84b' : '#9ca3af' }}>
                {createFiliereMut.isPending ? '...' : '+ Ajouter'}
              </button>
            </div>
          </div>

          {/* Liste */}
          <div className="divide-y divide-gray-50">
            {filieresData.map((f) => (
              <div key={f.id} className="px-5 py-3.5 flex items-center gap-3">
                {editFiliere?.id === f.id ? (
                  <>
                    <input type="text" value={editFiliere.libelle}
                      onChange={(e) => setEditFiliere({ ...editFiliere, libelle: e.target.value })}
                      className="flex-1 px-3 py-2 rounded-xl text-sm border outline-none"
                      style={{ borderColor: '#2db84b' }} />
                    <input type="text" value={editFiliere.code}
                      onChange={(e) => setEditFiliere({ ...editFiliere, code: e.target.value })}
                      className="w-24 px-3 py-2 rounded-xl text-sm border outline-none"
                      style={{ borderColor: '#2db84b' }} />
                    <button onClick={() => updateFiliereMut.mutate({ id: f.id, data: { libelle: editFiliere.libelle, code: editFiliere.code } })}
                      className="px-3 py-2 rounded-xl text-xs font-semibold text-white"
                      style={{ backgroundColor: '#2db84b' }}>
                      Sauvegarder
                    </button>
                    <button onClick={() => setEditFiliere(null)}
                      className="px-3 py-2 rounded-xl text-xs font-semibold"
                      style={{ backgroundColor: '#f3f4f6', color: '#6b7280' }}>
                      Annuler
                    </button>
                  </>
                ) : (
                  <>
                    <div className="flex-1">
                      <span className="text-sm font-medium" style={{ color: f.active ? '#1a2744' : '#9ca3af' }}>
                        {f.libelle}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {f.code && (
                        <span className="text-[11px] font-semibold px-2 py-1 rounded-lg"
                              style={{ backgroundColor: '#f0fdf4', color: '#15803d' }}>
                          {f.code}
                        </span>
                      )}
                      <span className="text-[11px] font-semibold px-2 py-1 rounded-lg"
                            style={{ backgroundColor: f.active ? '#f0fdf4' : '#fef2f2', color: f.active ? '#15803d' : '#b91c1c' }}>
                        {f.active ? 'Actif' : 'Inactif'}
                      </span>
                    </div>
                    {/* Actions */}
                    <div className="flex items-center gap-1">
                      <button onClick={() => setEditFiliere({ id: f.id, libelle: f.libelle, code: f.code ?? '' })}
                        className="p-2 rounded-lg hover:bg-gray-100 transition" title="Modifier">
                        <svg width="13" height="13" fill="none" stroke="#6b7280" strokeWidth="2" viewBox="0 0 24 24">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                      </button>
                      <button onClick={() => updateFiliereMut.mutate({ id: f.id, data: { active: !f.active } })}
                        className="p-2 rounded-lg hover:bg-gray-100 transition"
                        title={f.active ? 'Désactiver' : 'Activer'}>
                        <svg width="13" height="13" fill="none" strokeWidth="2" viewBox="0 0 24 24"
                             stroke={f.active ? '#f59e0b' : '#2db84b'}>
                          {f.active
                            ? <><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></>
                            : <><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></>
                          }
                        </svg>
                      </button>
                      <button
                        onClick={() => { if (window.confirm(`Supprimer "${f.libelle}" ?`)) deleteFiliereMut.mutate(f.id) }}
                        className="p-2 rounded-lg hover:bg-gray-100 transition" title="Supprimer">
                        <svg width="13" height="13" fill="none" stroke="#ef4444" strokeWidth="2" viewBox="0 0 24 24">
                          <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
                          <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
                        </svg>
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
            {filieresData.length === 0 && (
              <p className="text-sm text-gray-400 py-8 text-center">Aucune filière définie</p>
            )}
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
