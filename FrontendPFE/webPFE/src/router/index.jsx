import { createBrowserRouter, Navigate } from 'react-router-dom'
import ProtectedRoute from '../components/ProtectedRoute'

import Login from '../pages/auth/Login'
import ChangePassword from '../pages/auth/ChangePassword'

import EtudiantDashboard from '../pages/etudiant/Dashboard'
import EtudiantSujets from '../pages/etudiant/Sujets'
import EtudiantLivrables from '../pages/etudiant/Livrables'
import EtudiantSoutenance from '../pages/etudiant/Soutenance'

import CoordinateurDashboard from '../pages/coordinateur/Dashboard'
import CoordinateurSujets from '../pages/coordinateur/Sujets'
import CoordinateurSoutenances from '../pages/coordinateur/Soutenances'

import EncadrantDashboard from '../pages/encadrant/Dashboard'

import JuryDashboard from '../pages/jury/Dashboard'

import AdminUsers from '../pages/admin/Users'

import Stats from '../pages/stats/Stats'

const guard = (roles, element) => (
  <ProtectedRoute roles={roles}>{element}</ProtectedRoute>
)

const router = createBrowserRouter([
  { path: '/', element: <Navigate to="/login" replace /> },
  { path: '/login', element: <Login /> },
  { path: '/change-password', element: <ChangePassword /> },

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
    path: '/encadrant',
    element: guard(['encadrant_acad', 'encadrant_entr'], <EncadrantDashboard />),
  },

  { path: '/jury', element: guard(['jury'], <JuryDashboard />) },

  {
    path: '/admin',
    element: guard(['admin', 'scolarite'], <AdminUsers />),
  },

  {
    path: '/stats',
    element: guard(['coordinateur', 'admin', 'scolarite'], <Stats />),
  },
])

export default router
