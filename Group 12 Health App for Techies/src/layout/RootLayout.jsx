import { Outlet } from 'react-router-dom';
import { useState } from 'react';

function RootLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  return (
    <div className="app-container">
      <button 
        className="sidebar-toggle" 
        onClick={() => setSidebarOpen(!sidebarOpen)}
      >
        ☰
      </button>
      
      {/* Sidebar component */}
      {sidebarOpen && (
        <div className="sidebar">
          <nav>
            <ul>
              <li><a href="/"></a></li>
              <li><a href="/"></a></li>
              <li><a href="/dashboard">Dashboard</a></li>
              <li><a href="/posture">Posture Corrector</a></li>
              <li><a href="/analytics">Analytics</a></li>
              <li><a href="/ergonomics">Ergonomics</a></li>
              <li><a href="/settings">Settings</a></li>
            </ul>
          </nav>
        </div>
      )}
      
      <main className={`main-content ${sidebarOpen ? 'sidebar-open' : ''}`}>
        <Outlet />
      </main>
    </div>
  );
}

export default RootLayout;
