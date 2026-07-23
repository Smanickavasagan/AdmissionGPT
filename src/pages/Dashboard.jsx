import { useStore } from '../store/useStore';
import { useCountUp } from '../hooks/useCountUp';
import AnimatedCard from '../components/AnimatedCard';
import {
  FileText, CheckCircle, Clock, AlertCircle, Database,
  TrendingUp, Upload, ArrowRight,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Link } from 'react-router-dom';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import './Dashboard.css';

const areaData = [];

const PIE_COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444'];

export default function Dashboard() {
  const { documents, activityLog } = useStore();

  const total = documents.length;
  const complete = documents.filter((d) => d.status === 'complete').length;
  const processing = documents.filter((d) => d.status === 'processing' || d.status === 'queued').length;
  const failed = documents.filter((d) => d.status === 'failed').length;
  const synced = documents.filter((d) => d.syncStatus === 'synced').length;

  // Animated counters
  const animTotal      = useCountUp(total);
  const animComplete   = useCountUp(complete);
  const animProcessing = useCountUp(processing);
  const animFailed     = useCountUp(failed);
  const animSynced     = useCountUp(synced);

  const pieData = [
    { name: 'Complete', value: complete },
    { name: 'Synced', value: synced },
    { name: 'Processing', value: processing },
    { name: 'Failed', value: failed },
  ];

  const recentDocs = [...documents]
    .sort((a, b) => new Date(b.uploadDate) - new Date(a.uploadDate))
    .slice(0, 5);

  const statusBadge = (status) => {
    const map = {
      complete: 'badge-green',
      processing: 'badge-blue',
      queued: 'badge-yellow',
      failed: 'badge-red',
    };
    return <span className={`badge ${map[status] || 'badge-gray'}`}>{status}</span>;
  };

  return (
    <div>
      {/* Welcome banner */}
      <div className="welcome-banner">
        <div style={{ zIndex: 1 }}>
          <h2>Welcome back, Admin 👋</h2>
          <p>Here's what's happening with your admission forms today.</p>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', zIndex: 1 }}>
          {processing > 0 && (
            <span className="live-dot">
              <span className="live-dot-circle" />
              {processing} processing
            </span>
          )}
          <Link to="/upload" className="btn" style={{ background: 'rgba(255,255,255,0.22)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.35)', color: 'white', fontWeight: 600 }}>
            <Upload size={16} />
            Upload Forms
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <AnimatedCard className="stat-card">
          <div className="stat-icon stat-icon-blue"><FileText size={20} /></div>
          <div>
            <div className="stat-value">{animTotal}</div>
            <div className="stat-label">Total Documents</div>
            <div className="stat-change up">↑ 3 today</div>
          </div>
        </AnimatedCard>
        <AnimatedCard className="stat-card">
          <div className="stat-icon stat-icon-green"><CheckCircle size={20} /></div>
          <div>
            <div className="stat-value">{animComplete}</div>
            <div className="stat-label">Processed</div>
            <div className="stat-change up">↑ {Math.round((complete / (total||1)) * 100)}% success rate</div>
          </div>
        </AnimatedCard>
        <AnimatedCard className="stat-card">
          <div className="stat-icon stat-icon-yellow"><Clock size={20} /></div>
          <div>
            <div className="stat-value">{animProcessing}</div>
            <div className="stat-label">In Progress</div>
            <div className="stat-change">Active queue</div>
          </div>
        </AnimatedCard>
        <AnimatedCard className="stat-card">
          <div className="stat-icon stat-icon-red"><AlertCircle size={20} /></div>
          <div>
            <div className="stat-value">{animFailed}</div>
            <div className="stat-label">Failed</div>
            <div className="stat-change down">Needs attention</div>
          </div>
        </AnimatedCard>
        <AnimatedCard className="stat-card">
          <div className="stat-icon stat-icon-purple"><Database size={20} /></div>
          <div>
            <div className="stat-value">{animSynced}</div>
            <div className="stat-label">Synced to DB</div>
            <div className="stat-change up">↑ {synced} records saved</div>
          </div>
        </AnimatedCard>
        <AnimatedCard className="stat-card">
          <div className="stat-icon stat-icon-cyan"><TrendingUp size={20} /></div>
          <div>
            <div className="stat-value">3.4s</div>
            <div className="stat-label">Avg. Process Time</div>
            <div className="stat-change up">↓ 0.3s faster</div>
          </div>
        </AnimatedCard>
      </div>

      {/* Charts row */}
      <div className="dashboard-charts">
        <div className="card chart-card-wide">
          <div className="card-header">
            <span className="card-title">Processing Activity (7 days)</span>
          </div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={areaData}>
                <defs>
                  <linearGradient id="gradBlue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradRed" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#94a3b8' }} />
                <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} />
                <Tooltip
                  contentStyle={{ fontSize: 13, borderRadius: 8, border: '1px solid #e2e8f0' }}
                />
                <Area type="monotone" dataKey="processed" stroke="#2563eb" fill="url(#gradBlue)" strokeWidth={2} name="Processed" />
                <Area type="monotone" dataKey="failed" stroke="#ef4444" fill="url(#gradRed)" strokeWidth={2} name="Failed" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card chart-card-narrow">
          <div className="card-header">
            <span className="card-title">Status Breakdown</span>
          </div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="45%" outerRadius={75} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={11}>
                  {pieData.map((_, index) => (
                    <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent docs + activity */}
      <div className="dashboard-bottom">
        <div className="card">
          <div className="card-header">
            <span className="card-title">
              Recent Documents
              {processing > 0 && <span className="live-dot" title="Processing active" />}
            </span>
            <Link to="/documents" className="btn btn-sm btn-secondary">
              View all <ArrowRight size={13} />
            </Link>
          </div>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>File</th>
                  <th>Status</th>
                  <th>Records</th>
                  <th>Uploaded</th>
                </tr>
              </thead>
              <tbody>
                {recentDocs.map((doc) => (
                  <tr key={doc.id}>
                    <td>
                      <div className="flex items-center gap-2">
                        <FileText size={14} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                        <span className="truncate" style={{ maxWidth: 160 }}>{doc.filename}</span>
                      </div>
                    </td>
                    <td>{statusBadge(doc.status)}</td>
                    <td>{doc.recordCount || '—'}</td>
                    <td className="text-muted text-sm">
                      {format(parseISO(doc.uploadDate), 'MMM d, HH:mm')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">Activity Log</span>
            <Link to="/db-sync" className="btn btn-sm btn-secondary">
              View all <ArrowRight size={13} />
            </Link>
          </div>
          <div className="activity-list">
            {activityLog.slice(0, 6).map((item) => (
              <div key={item.id} className="activity-item">
                <div className={`activity-dot activity-dot-${item.type}`} />
                <div className="activity-content">
                  <div className="activity-action">
                    <strong>{item.action}</strong>
                  </div>
                  <div className="activity-meta text-sm text-muted">
                    {item.document} · {item.user} ·{' '}
                    {format(parseISO(item.timestamp), 'MMM d, HH:mm')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
