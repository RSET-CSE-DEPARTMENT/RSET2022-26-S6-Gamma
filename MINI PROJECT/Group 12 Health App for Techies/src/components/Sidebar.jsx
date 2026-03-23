import { Link, useLocation } from "react-router-dom";
import { Home, Activity, Monitor, BarChart2, Settings } from "lucide-react";

const Sidebar = ({ isOpen }) => {
  const location = useLocation();

  const navItems = [
    { name: "Dashboard", path: "/app/dashboard", icon: <Home size={20} /> },
    { name: "Posture Corrector", path: "/app/posture", icon: <Activity size={20} /> },
    { name: "Ergonomic Assessment", path: "/app/ergonomics", icon: <Monitor size={20} /> },
    { name: "Predictive Analytics", path: "/app/analytics", icon: <BarChart2 size={20} /> },
    { name: "Settings", path: "/app/settings", icon: <Settings size={20} /> },
    { name: "Blink Tracker", path: "/app/blink-tracker", icon: <Activity size={20} /> },
  ];

  return (
    <aside className={`sidebar fixed inset-y-0 left-0 flex flex-col bg-white shadow-lg transition-all duration-300 ${
      isOpen ? "w-64" : "w-20"
    }`}>
      {/* Sidebar Header */}
      <div className="sidebar-header h-16 flex items-center justify-center border-b border-gray-200 px-4">
        <h2 className="app-title font-bold text-xl truncate">PERCH</h2>
      </div>

      {/* Sidebar Navigation */}
      <nav className="sidebar-nav flex-1 mt-4 overflow-y-auto">
        <ul className="space-y-2 px-2">
          {navItems.map((item) => (
            <li key={item.path}>
              <Link
                to={item.path}
                className={`nav-link flex items-center px-4 py-3 hover:bg-gray-100 rounded-md transition-colors ${
                  location.pathname === item.path
                    ? "bg-blue-50 text-blue-600 font-medium"
                    : "text-gray-700"
                }`}
              >
                <span className="icon flex-shrink-0">{item.icon}</span>
                {isOpen && <span className="nav-text ml-4 truncate">{item.name}</span>}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
};

export default Sidebar;