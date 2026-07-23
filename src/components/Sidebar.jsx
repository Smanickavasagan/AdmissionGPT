import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Upload, FileSearch, MessageSquare, ChevronRight
} from 'lucide-react';
import './Sidebar.css';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/upload', icon: Upload, label: 'Upload & Process' },
  { to: '/chat', icon: MessageSquare, label: 'Chat with DB' },
];

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-icon">
          <FileSearch size={22} />
        </div>
        <div>
          <div className="logo-title">AdmissionScan</div>
          <div className="logo-subtitle">OCR Processing System</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-section-label">Navigation</div>
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <Icon size={18} />
            <span>{label}</span>
            <ChevronRight size={14} className="nav-arrow" />
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="db-status">
          <span className="status-dot status-dot-green" />
          <span>Database Connected</span>
        </div>
      </div>
    </aside>
  );
}
