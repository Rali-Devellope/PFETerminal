import { createBrowserRouter, Navigate } from 'react-router-dom'
import ProtectedRoute from '../components/ProtectedRoute'

import Login from '../pages/auth/Login'
import ChangePassword from '../pages/auth/ChangePassword'
import Profile from '../pages/auth/Profile'

import EtudiantDashboard from '../pages/etudiant/Dashboard'
import EtudiantSujets from '../pages/etudiant/Sujets'
import EtudiantLivrables from '../pages/etudiant/Livrables'
import EtudiantSoutenance from '../pages/etudiant/Soutenance'

import CoordinateurDashboard from '../pages/coordinateur/Dashboard'
import CoordinateurSujets from '../pages/coordinateur/Sujets'
import CoordinateurSoutenances from '../pages/coordinateur/Soutenances'
import CoordinateurDeadlines from '../pages/coordinateur/Deadlines'

import EncadrantDashboard from '../pages/encadrant/Dashboard'
import EncadrantSujets from '../pages/encadrant/Sujets'
import EncadrantLivrables from '../pages/encadrant/Livrables'
import EtudiantDetail from '../pages/encadrant/EtudiantDetail'

import JuryDashboard from '../pages/jury/Dashboard'

import AdminUsers from '../pages/admin/Users'
import ScolariteDashboard from '../pages/scolarite/Dashboard'
import ScolariteAnnees from '../pages/scolarite/Annees'
import ScolariteEtudiants from '../pages/scolarite/Etudiants'
import ScolariteArchivage from '../pages/scolarite/Archivage'
import ScolariteClassement from '../pages/scolarite/Classement'

import Stats from '../pages/stats/Stats'
import Notifications from '../pages/notifications/Notifications'
import Messages from '../pages/messages/Messages'

const guard = (roles, element) => (
  <ProtectedRoute roles={roles}>{element}</ProtectedRoute>
)

const router = createBrowserRouter([
  { path: '/', element: <Navigate to="/login" replace /> },
  { path: '/login', element: <Login /> },
  { path: '/change-password', element: <ChangePassword /> },
  { path: '/profile', element: <ProtectedRoute><Profile /></ProtectedRoute> },
  { path: '/notifications', element: <ProtectedRoute><Notifications /></ProtectedRoute> },
  { path: '/messages', element: <ProtectedRoute><Messages /></ProtectedRoute> },

  { path: '/etudiant', element: guard(['etudiant'], <EtudiantDashboard />) },
  { path: '/etudiant/sujets', element: guard(['etudiant'], <EtudiantSujets />) },
  { path: '/etudiant/livrables', element: guard(['etudiant'], <EtudiantLivrables />) },
  { path: '/etudiant/soutenance', element: guard(['etudiant'], <EtudiantSoutenance />) },

  {
    path: '/coordinateur',
    element: guard(['coordinateur'], <CoordinateurDashboard />),
  },
  {
    path: '/coordinateur/sujets',
    element: guard(['coordinateur'], <CoordinateurSujets />),
  },
  {
    path: '/coordinateur/soutenances',
    element: guard(['coordinateur'], <CoordinateurSoutenances />),
  },
  {
    path: '/coordinateur/deadlines',
    element: guard(['coordinateur'], <CoordinateurDeadlines />),
  },

  {
    path: '/encadrant',
    element: guard(['encadrant_acad', 'encadrant_entr'], <EncadrantDashboard />),
  },
  {
    path: '/encadrant/sujets',
    element: guard(['encadrant_acad', 'encadrant_entr'], <EncadrantSujets />),
  },
  {
    path: '/encadrant/livrables',
    element: guard(['encadrant_acad', 'encadrant_entr'], <EncadrantLivrables />),
  },
  {
    path: '/encadrant/etudiant/:id',
    element: guard(['encadrant_acad', 'encadrant_entr'], <EtudiantDetail />),
  },

  { path: '/jury', element: guard(['jury'], <JuryDashboard />) },

  {
    path: '/admin',
    element: guard(['admin'], <AdminUsers />),
  },
  { path: '/scolarite',             element: guard(['scolarite'], <ScolariteDashboard />) },
  { path: '/scolarite/annees',      element: guard(['scolarite', 'admin'], <ScolariteAnnees />) },
  { path: '/scolarite/etudiants',   element: guard(['scolarite', 'admin'], <ScolariteEtudiants />) },
  { path: '/scolarite/archivage',   element: guard(['scolarite'], <ScolariteArchivage />) },
  { path: '/scolarite/classement',  element: guard(['scolarite', 'admin', 'coordinateur'], <ScolariteClassement />) },

  {
    path: '/stats',
    element: guard(['coordinateur', 'admin', 'scolarite', 'encadrant_acad', 'encadrant_entr'], <Stats />),
  },
])

export default router
