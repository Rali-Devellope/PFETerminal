export default function Card({ title, children, action, icon, className = '' }) {
  return (
    <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden ${className}`}>
      {title && (
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50">
          <div className="flex items-center gap-2.5">
            {icon && (
              <span className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: '#f0fdf4', color: '#2db84b' }}>
                {icon}
              </span>
            )}
            <h2 className="text-sm font-semibold tracking-tight" style={{ color: '#1a2744' }}>
              {title}
            </h2>
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      <div className="p-6">{children}</div>
    </div>
  )
}

export function StatCard({ label, value, sub, color = '#2db84b', icon }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
      {icon && (
        <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
             style={{ backgroundColor: color + '1a' }}>
          <span style={{ color }}>{icon}</span>
        </div>
      )}
      <div className="min-w-0">
        <p className="text-2xl font-bold tracking-tight" style={{ color: '#1a2744' }}>{value}</p>
        <p className="text-xs font-medium text-gray-500 mt-0.5">{label}</p>
        {sub && <p className="text-[11px] text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}
