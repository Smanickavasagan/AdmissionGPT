import { useState } from 'react';
import { useStore } from '../store/useStore';
import {
  Settings as SettingsIcon, Save, Database, Shield, Bell,
  Sliders, FileText, Plus, Trash2, Check, X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import './Settings.css';

const ROLES = ['admin', 'editor', 'viewer'];

const mockUsers = [];

export default function Settings() {
  const { settings, updateSettings } = useStore();
  const [activeTab, setActiveTab] = useState('general');
  const [threshold, setThreshold] = useState(settings.confidenceThreshold * 100);
  const [autoSync, setAutoSync] = useState(settings.autoSync);
  const [dbUrl, setDbUrl] = useState('postgresql://localhost:5432/admissions');
  const [users, setUsers] = useState(mockUsers);
  const [newTemplate, setNewTemplate] = useState('');
  const [addingTemplate, setAddingTemplate] = useState(false);

  const saveGeneral = () => {
    updateSettings({ confidenceThreshold: threshold / 100, autoSync });
    toast.success('Settings saved');
  };

  const testConnection = () => {
    toast.success('Database connection successful ✓');
  };

  const changeRole = (id, role) => {
    setUsers((u) => u.map((user) => user.id === id ? { ...user, role } : user));
    toast.success('Role updated');
  };

  const roleBadge = (role) => {
    const map = { admin: 'badge-red', editor: 'badge-blue', viewer: 'badge-gray' };
    return <span className={`badge ${map[role]}`}>{role}</span>;
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Settings & Configuration</div>
          <div className="page-subtitle">Manage templates, thresholds, DB connection, and user roles.</div>
        </div>
      </div>

      <div className="settings-layout">
        {/* Sidebar tabs */}
        <div className="card settings-nav">
          {[
            { id: 'general', icon: Sliders, label: 'General' },
            { id: 'db', icon: Database, label: 'Database' },
            { id: 'templates', icon: FileText, label: 'Templates' },
            { id: 'users', icon: Shield, label: 'Users & Roles' },
            { id: 'notifications', icon: Bell, label: 'Notifications' },
          ].map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              className={`settings-nav-item ${activeTab === id ? 'active' : ''}`}
              onClick={() => setActiveTab(id)}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="card settings-content">
          {activeTab === 'general' && (
            <>
              <div className="card-header">
                <span className="card-title">General Settings</span>
              </div>
              <div className="card-body">
                <div className="form-group">
                  <label className="form-label">OCR Confidence Threshold: <strong>{threshold}%</strong></label>
                  <input
                    type="range" min={50} max={99} value={threshold}
                    onChange={(e) => setThreshold(Number(e.target.value))}
                    className="settings-range"
                  />
                  <div className="range-labels">
                    <span className="text-xs text-muted">50% (lenient)</span>
                    <span className="text-xs text-muted">99% (strict)</span>
                  </div>
                  <p className="text-sm text-muted mt-2">Fields below this threshold will be flagged for manual review.</p>
                </div>
                <div className="divider" />
                <div className="form-group">
                  <label className="form-label">Default Document Template</label>
                  <select className="form-input form-select" value={settings.defaultTemplate} onChange={(e) => updateSettings({ defaultTemplate: e.target.value })}>
                    {settings.templates.map((t) => (
                      <option key={t.id} value={t.name.toLowerCase().replace(' ', '_')}>{t.name}</option>
                    ))}
                  </select>
                </div>
                <div className="divider" />
                <div className="form-group">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="form-label" style={{ margin: 0 }}>Auto-Sync to Database</label>
                      <p className="text-sm text-muted">Automatically push processed data without manual confirmation.</p>
                    </div>
                    <button
                      className={`toggle ${autoSync ? 'toggle-on' : ''}`}
                      onClick={() => setAutoSync((v) => !v)}
                    >
                      <span className="toggle-thumb" />
                    </button>
                  </div>
                </div>
                <div className="mt-4">
                  <button className="btn btn-primary" onClick={saveGeneral}>
                    <Save size={14} /> Save Changes
                  </button>
                </div>
              </div>
            </>
          )}

          {activeTab === 'db' && (
            <>
              <div className="card-header">
                <span className="card-title">Database Connection</span>
                <span className="badge badge-green"><Check size={11} /> Connected</span>
              </div>
              <div className="card-body">
                <div className="form-group">
                  <label className="form-label">Connection URL</label>
                  <input className="form-input font-mono" value={dbUrl} onChange={(e) => setDbUrl(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Database Name</label>
                  <input className="form-input" defaultValue="admissions" />
                </div>
                <div className="form-group">
                  <label className="form-label">Table / Collection</label>
                  <input className="form-input" defaultValue="admission_records" />
                </div>
                <div className="db-status-card">
                  <div className="flex items-center gap-2">
                    <span className="status-dot status-dot-green" />
                    <span className="font-semibold text-sm">Database is connected and responsive</span>
                  </div>
                  <div className="text-sm text-muted mt-2">Last ping: 24ms · 5 tables · PostgreSQL 15.2</div>
                </div>
                <div className="flex gap-2 mt-4">
                  <button className="btn btn-outline" onClick={testConnection}>Test Connection</button>
                  <button className="btn btn-primary"><Save size={14} /> Save</button>
                </div>
              </div>
            </>
          )}

          {activeTab === 'templates' && (
            <>
              <div className="card-header">
                <span className="card-title">Document Templates</span>
                <button className="btn btn-primary btn-sm" onClick={() => setAddingTemplate(true)}>
                  <Plus size={14} /> Add Template
                </button>
              </div>
              <div className="card-body">
                {addingTemplate && (
                  <div className="add-template-row">
                    <input
                      className="form-input"
                      placeholder="Template name (e.g. Transfer Form)"
                      value={newTemplate}
                      onChange={(e) => setNewTemplate(e.target.value)}
                    />
                    <button className="btn btn-success btn-sm" onClick={() => {
                      if (!newTemplate.trim()) return;
                      updateSettings({
                        templates: [...settings.templates, { id: Date.now().toString(), name: newTemplate, fields: [] }]
                      });
                      setNewTemplate('');
                      setAddingTemplate(false);
                      toast.success('Template added');
                    }}><Check size={14} /></button>
                    <button className="btn btn-secondary btn-sm" onClick={() => setAddingTemplate(false)}><X size={14} /></button>
                  </div>
                )}
                {settings.templates.map((t) => (
                  <div key={t.id} className="template-card">
                    <div className="template-info">
                      <div className="font-semibold">{t.name}</div>
                      <div className="text-sm text-muted">{t.fields.length} field mappings</div>
                      <div className="template-fields">
                        {t.fields.slice(0, 6).map((f) => (
                          <span key={f} className="field-tag">{f}</span>
                        ))}
                        {t.fields.length > 6 && (
                          <span className="field-tag">+{t.fields.length - 6} more</span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button className="btn btn-secondary btn-sm">Edit</button>
                      <button className="btn btn-icon btn-sm" onClick={() => {
                        updateSettings({ templates: settings.templates.filter((tp) => tp.id !== t.id) });
                        toast.success('Template removed');
                      }}><Trash2 size={13} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {activeTab === 'users' && (
            <>
              <div className="card-header">
                <span className="card-title">Users & Permissions</span>
                <button className="btn btn-primary btn-sm"><Plus size={14} /> Invite User</button>
              </div>
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id}>
                        <td className="font-semibold text-sm">{u.name}</td>
                        <td className="text-sm text-muted">{u.email}</td>
                        <td>{roleBadge(u.role)}</td>
                        <td>
                          <select
                            className="form-input form-select"
                            style={{ width: 'auto', padding: '4px 24px 4px 8px', fontSize: 13 }}
                            value={u.role}
                            onChange={(e) => changeRole(u.id, e.target.value)}
                          >
                            {ROLES.map((r) => <option key={r}>{r}</option>)}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="card-body">
                <div className="alert alert-info">
                  <Shield size={15} />
                  <span><strong>Admin</strong>: full access · <strong>Editor</strong>: upload & edit · <strong>Viewer</strong>: read-only</span>
                </div>
              </div>
            </>
          )}

          {activeTab === 'notifications' && (
            <>
              <div className="card-header">
                <span className="card-title">Notification Preferences</span>
              </div>
              <div className="card-body">
                {[
                  { label: 'Upload complete', desc: 'Notify when a document finishes processing' },
                  { label: 'OCR failed', desc: 'Alert when extraction fails' },
                  { label: 'DB sync complete', desc: 'Confirm when data is pushed to database' },
                  { label: 'Low confidence fields', desc: 'Warn when fields fall below threshold' },
                  { label: 'Batch complete', desc: 'Summary when a batch finishes' },
                ].map((n, i) => (
                  <div key={i} className="notif-row">
                    <div>
                      <div className="font-semibold text-sm">{n.label}</div>
                      <div className="text-sm text-muted">{n.desc}</div>
                    </div>
                    <button className="toggle toggle-on">
                      <span className="toggle-thumb" />
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
