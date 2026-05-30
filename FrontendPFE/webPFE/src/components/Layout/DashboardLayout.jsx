import { useState } from 'react'
import Navbar from './Navbar'
import Sidebar from './Sidebar'

export default function DashboardLayout({ children, navItems }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f8f9fa' }}>
      <Navbar onToggleSidebar={() => setSidebarOpen((o) => !o)} />
      <Sidebar
        items={navItems}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      {/* Contenu principal — decale a droite de la sidebar sur grand ecran */}
      <main className="pt-14 lg:ps-56 min-h-screen">
        <div className="p-6">{children}</div>
      </main>
    </div>
  )
}
