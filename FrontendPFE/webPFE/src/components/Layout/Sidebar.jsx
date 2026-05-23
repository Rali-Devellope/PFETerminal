import { NavLink } from 'react-router-dom'

export default function Sidebar({ items, open, onClose }) {
  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-30 lg:hidden"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(2px)' }}
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed top-14 left-0 bottom-0 z-40 w-56 flex flex-col transition-transform duration-250
          ${open ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}
        style={{
          backgroundColor: '#152c4a',
          borderRight: '1px solid rgba(255,255,255,0.05)',
        }}
      >
        <nav className="flex-1 py-3 px-2 overflow-y-auto space-y-0.5">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={onClose}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group"
              style={({ isActive }) => isActive
                ? {
                    backgroundColor: 'rgba(45,184,75,0.15)',
                    color: '#4ade80',
                    boxShadow: 'inset 3px 0 0 #2db84b',
                  }
                : {
                    color: 'rgba(255,255,255,0.5)',
                  }
              }
              onMouseEnter={(e) => {
                if (!e.currentTarget.style.boxShadow) {
                  e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'
                  e.currentTarget.style.color = 'rgba(255,255,255,0.85)'
                }
              }}
              onMouseLeave={(e) => {
                if (!e.currentTarget.style.boxShadow) {
                  e.currentTarget.style.backgroundColor = ''
                  e.currentTarget.style.color = 'rgba(255,255,255,0.5)'
                }
              }}
            >
              <span className="w-4 h-4 flex-shrink-0 opacity-80">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="px-4 py-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <p className="text-[10px] font-medium" style={{ color: 'rgba(255,255,255,0.2)' }}>
            ISCAE Mauritanie © {new Date().getFullYear()}
          </p>
        </div>
      </aside>
    </>
  )
}
