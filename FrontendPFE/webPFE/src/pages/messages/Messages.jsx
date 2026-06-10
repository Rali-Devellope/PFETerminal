import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { ROLE_DASHBOARDS } from '../../components/ProtectedRoute'
import { getConversations, getMessagesAvec, envoyerMessage } from '../../api/messages'
import DashboardLayout from '../../components/Layout/DashboardLayout'

const ROLE_COLORS = {
  etudiant: '#1d4ed8', encadrant_acad: '#15803d', encadrant_entr: '#047857',
  coordinateur: '#c2410c', jury: '#7e22ce', admin: '#b91c1c', scolarite: '#0369a1',
}

function Avatar({ prenom, nom, role, size = 9 }) {
  const color = ROLE_COLORS[role] ?? '#6b7280'
  return (
    <div className={`w-${size} h-${size} rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0`}
         style={{ backgroundColor: color }}>
      {prenom?.[0]}{nom?.[0]}
    </div>
  )
}

export default function Messages() {
  const { t } = useTranslation()
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [selectedUser, setSelectedUser] = useState(null)
  const [texte, setTexte] = useState('')
  const messagesEndRef = useRef(null)

  const homeRoute = ROLE_DASHBOARDS[user?.role] ?? '/login'

  const NAV_ITEMS = [
    { to: homeRoute, end: true, label: t('nav.vue_ensemble'),
      icon: <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg> },
    { to: '/messages', label: 'Messages',
      icon: <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg> },
  ]

  const { data: convsRes, isLoading: convsLoading } = useQuery({
    queryKey: ['conversations'],
    queryFn: getConversations,
    refetchInterval: 5000,
  })

  const { data: msgsRes } = useQuery({
    queryKey: ['messages', selectedUser?.id],
    queryFn: () => getMessagesAvec(selectedUser.id),
    enabled: !!selectedUser,
    refetchInterval: 3000,
  })

  const convs = convsRes?.data?.data ?? []
  const msgs = msgsRes?.data?.data ?? []
  const msgsArr = Array.isArray(msgs) ? msgs : []

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [msgsArr.length])

  const envoyerMut = useMutation({
    mutationFn: envoyerMessage,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['messages', selectedUser?.id] })
      qc.invalidateQueries({ queryKey: ['conversations'] })
      setTexte('')
    },
  })

  const handleEnvoyer = (e) => {
    e.preventDefault()
    if (!texte.trim() || !selectedUser) return
    envoyerMut.mutate({ destinataire_id: selectedUser.id, contenu: texte.trim() })
  }

  const formatDate = (d) => {
    if (!d) return ''
    const date = new Date(d)
    const now = new Date()
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    }
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
  }

  return (
    <DashboardLayout navItems={NAV_ITEMS}>
      <div className="mb-4">
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: '#1a2744' }}>Messages</h1>
        <p className="text-sm text-gray-500 mt-0.5">Messagerie interne ISCAE</p>
      </div>

      <div className="flex gap-4 h-[calc(100vh-200px)] min-h-[500px]">
        {/* Conversations */}
        <div className="w-72 flex-shrink-0 bg-white rounded-2xl border border-gray-100 overflow-hidden flex flex-col"
             style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          <div className="px-4 py-3 border-b border-gray-50">
            <p className="text-sm font-bold" style={{ color: '#1a2744' }}>Conversations</p>
          </div>

          <div className="flex-1 overflow-y-auto">
            {convsLoading && (
              <div className="space-y-2 p-3">
                {[1,2,3].map((i) => <div key={i} className="h-14 rounded-xl bg-gray-50 animate-pulse" />)}
              </div>
            )}
            {!convsLoading && convs.length === 0 && (
              <div className="py-12 text-center px-4">
                <div className="text-3xl mb-2">💬</div>
                <p className="text-xs text-gray-400">Aucune conversation</p>
              </div>
            )}
            {convs.map((c) => {
              const inter = c.interlocuteur
              const isSelected = selectedUser?.id === inter?.id
              return (
                <button key={inter?.id}
                  onClick={() => setSelectedUser(inter)}
                  className="w-full flex items-center gap-3 px-4 py-3 transition text-left"
                  style={{
                    backgroundColor: isSelected ? 'rgba(45,184,75,0.08)' : 'transparent',
                    borderInlineStart: isSelected ? '3px solid #2db84b' : '3px solid transparent',
                  }}>
                  <Avatar prenom={inter?.prenom} nom={inter?.nom} role={inter?.role} />
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center">
                      <p className="text-xs font-semibold truncate" style={{ color: '#1a2744' }}>
                        {inter?.prenom} {inter?.nom}
                      </p>
                      <span className="text-[10px] text-gray-400 flex-shrink-0 ms-1">
                        {formatDate(c.date)}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-400 truncate">{c.dernier_message}</p>
                  </div>
                  {c.non_lus > 0 && (
                    <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                          style={{ backgroundColor: '#2db84b' }}>
                      {c.non_lus}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Zone messages */}
        <div className="flex-1 bg-white rounded-2xl border border-gray-100 overflow-hidden flex flex-col"
             style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          {!selectedUser ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <div className="text-5xl mb-4">💬</div>
              <p className="text-base font-semibold" style={{ color: '#1a2744' }}>
                Sélectionnez une conversation
              </p>
              <p className="text-sm text-gray-400 mt-1">
                Choisissez un contact dans la liste à gauche
              </p>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="flex items-center gap-3 px-5 py-3.5 border-b border-gray-50">
                <Avatar prenom={selectedUser.prenom} nom={selectedUser.nom} role={selectedUser.role} />
                <div>
                  <p className="text-sm font-bold" style={{ color: '#1a2744' }}>
                    {selectedUser.prenom} {selectedUser.nom}
                  </p>
                  <p className="text-[11px] text-gray-400">
                    {t(`roles.${selectedUser.role}`, { defaultValue: selectedUser.role })}
                  </p>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3"
                   style={{ backgroundColor: '#f8fafc' }}>
                {msgsArr.length === 0 && (
                  <p className="text-center text-xs text-gray-400 py-8">
                    Commencez la conversation
                  </p>
                )}
                {msgsArr.map((m) => {
                  const isMe = m.expediteur?.id === user?.id
                  return (
                    <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                      {!isMe && (
                        <Avatar prenom={m.expediteur?.prenom} nom={m.expediteur?.nom}
                                role={m.expediteur?.role} size={7} />
                      )}
                      <div className={`max-w-xs lg:max-w-md mx-2 px-4 py-2.5 rounded-2xl text-sm ${isMe ? 'rounded-tr-sm' : 'rounded-tl-sm'}`}
                           style={{
                             backgroundColor: isMe ? '#2db84b' : '#fff',
                             color: isMe ? '#fff' : '#1a2744',
                             boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                           }}>
                        <p className="leading-relaxed">{m.contenu}</p>
                        <p className={`text-[10px] mt-1 text-right ${isMe ? 'text-white/70' : 'text-gray-400'}`}>
                          {formatDate(m.created_at)}
                        </p>
                      </div>
                    </div>
                  )
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Saisie */}
              <form onSubmit={handleEnvoyer}
                    className="flex items-end gap-3 px-4 py-3 border-t border-gray-50">
                <textarea
                  value={texte}
                  onChange={(e) => setTexte(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleEnvoyer(e) } }}
                  placeholder="Écrivez un message... (Entrée pour envoyer)"
                  rows={2}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm border outline-none resize-none"
                  style={{ borderColor: '#e5e7eb' }}
                  onFocus={(e) => (e.target.style.borderColor = '#2db84b')}
                  onBlur={(e) => (e.target.style.borderColor = '#e5e7eb')}
                />
                <button type="submit" disabled={!texte.trim() || envoyerMut.isPending}
                  className="p-3 rounded-xl text-white transition flex-shrink-0"
                  style={{ backgroundColor: texte.trim() ? '#2db84b' : '#d1fae5' }}>
                  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <line x1="22" y1="2" x2="11" y2="13"/>
                    <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                  </svg>
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
