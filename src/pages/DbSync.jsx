import { useState } from 'react';
import { useStore } from '../store/useStore';
import {
  Database, Upload, RotateCcw, CheckCircle, XCircle,
  Clock, Activity, Eye, X, AlertTriangle,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import toast from 'react-hot-toast';
import './DbSync.css';

export default function DbSync() {
  const { documents, activityLog, syncDocument } = useStore();
  const [confirmDoc, setConfirmDoc] = useState(null);
  const [previewDoc, setPreviewDoc] = useState(null);

  const syncable = documents.filter((d) => d.status === 'complete' && d.syncStatus !== 'synced');
  const synced = documents.filter((d) => d.syncStatus === 'synced');
  const failed = documents.filter((d) => d.syncStatus === 'failed');

  const handleSync = (doc) => {
    setConfirmDoc(null);
    syncDocument(doc.id);
    toast.success(`Syncing "${doc.filename}" to database...`);
  };

  const syncBadge = (s) => {
    if (s === 'synced') return <span className="badge badge-green"><CheckCircle size={11} /> Synced</span>;
    if (s === 'syncing') return <span className="badge badge-blue"><Clock size={11} /> Syncing</span>;
    if (s === 'failed') return <span className="badge badge-red"><XCircle size={11} /> Failed</span>;
    return <span className="badge badge-yellow"><Clock size={11} /> Pending</span>;
  };

  const activityIcon = (type) => {
    if (type === 'sync') return <CheckCircle size={14} style={{ color: 'var(--success)' }} />;
    if (type === 'error') return <XCircle size={14} style={{ color: 'var(--error)' }} />;
    if (type === 'upload') return <Upload size={14} style={{ color: 'var(--primary)' }} />;
    return <Activity size={14} style={{ color: 'var(--warning)' }} />;
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">DB Sync & History</div>
          <div className="page-subtitle">Preview and push extracted data to the database.</div>
        </div>
        <div className="flex gap-2 items-center">
          <span className="badge badge-green"><CheckCircle size={12} /> Database Connected</span>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <div className="stat-card">
          <div className="stat-icon stat-icon-green"><CheckCircle size={20} /></div>
          <div>
            <div className="stat-value">{synced.length}</div>
            <div className="stat-label">Synced Records</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon stat-icon-yellow"><Clock size={20} /></div>
          <div>
            <div className="stat-value">{syncable.length}</div>
            <div className="stat-label">Pending Sync</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon stat-icon-red"><XCircle size={20} /></div>
          <div>
            <div className="stat-value">{failed.length}</div>
            <div className="stat-label">Sync Failed</div>
          </div>
        </div>
      </div>

      <div className="sync-layout">
        {/* Pending sync */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Pending Sync ({syncable.length})</span>
          </div>
          {syncable.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon"><CheckCircle size={40} /></div>
              <p>All documents are synced!</p>
            </div>
          ) : (
            <div className="sync-list">
              {syncable.map((doc) => (
                <div key={doc.id} className="sync-item">
                  <div className="sync-item-info">
                    <div className="sync-item-name">{doc.filename}</div>
                    <div className="text-sm text-muted">
                      {doc.recordCount} fields · uploaded {format(parseISO(doc.uploadDate), 'MMM d, HH:mm')}
                    </div>
                    <div className="mt-2">{syncBadge(doc.syncStatus)}</div>
                  </div>
                  <div className="sync-item-actions">
                    <button className="btn btn-icon btn-sm" title="Preview" onClick={() => setPreviewDoc(doc)}>
                      <Eye size={14} />
                    </button>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => setConfirmDoc(doc)}
                      disabled={doc.syncStatus === 'syncing'}
                    >
                      <Upload size={14} /> Sync
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Activity log */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Activity Log</span>
          </div>
          <div className="activity-log">
            {activityLog.map((item) => (
              <div key={item.id} className="log-item">
                <div className="log-icon">{activityIcon(item.type)}</div>
                <div className="log-content">
                  <div className="log-action">
                    <strong>{item.action}</strong> — {item.document}
                  </div>
                  <div className="log-meta text-sm text-muted">
                    {item.user} · {format(parseISO(item.timestamp), 'MMM d, HH:mm')}
                    {item.detail && <span> · {item.detail}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Synced history */}
      {synced.length > 0 && (
        <div className="card mt-4">
          <div className="card-header">
            <span className="card-title">Sync History</span>
          </div>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Document</th>
                  <th>Fields</th>
                  <th>Synced At</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {synced.map((doc) => (
                  <tr key={doc.id}>
                    <td className="font-semibold text-sm">{doc.filename}</td>
                    <td>{doc.recordCount}</td>
                    <td className="text-sm text-muted">{format(parseISO(doc.uploadDate), 'MMM d, HH:mm')}</td>
                    <td><span className="badge badge-green"><CheckCircle size={11} /> Synced</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Confirm sync modal */}
      {confirmDoc && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3 className="card-title">Confirm Sync</h3>
              <button className="btn btn-icon btn-sm" onClick={() => setConfirmDoc(null)}><X size={16} /></button>
            </div>
            <div className="modal-body">
              <div className="alert alert-info mb-4">
                <Database size={16} />
                <span>You are about to push <strong>{confirmDoc.recordCount} fields</strong> from <strong>{confirmDoc.filename}</strong> to the database.</span>
              </div>
              <p className="text-sm text-muted">This will insert/update the record in the connected database. Review the data before proceeding.</p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setConfirmDoc(null)}>Cancel</button>
              <button className="btn btn-success" onClick={() => handleSync(confirmDoc)}>
                <Upload size={14} /> Confirm Sync
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview modal */}
      {previewDoc && (
        <div className="modal-overlay">
          <div className="modal modal-lg">
            <div className="modal-header">
              <h3 className="card-title">Preview: {previewDoc.filename}</h3>
              <button className="btn btn-icon btn-sm" onClick={() => setPreviewDoc(null)}><X size={16} /></button>
            </div>
            <div className="modal-body">
              <pre className="json-preview" style={{ maxHeight: 400 }}>
                {JSON.stringify(
                  Object.fromEntries(
                    Object.entries(previewDoc.extractedData).map(([k, v]) => [k, v.value])
                  ),
                  null, 2
                )}
              </pre>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setPreviewDoc(null)}>Close</button>
              <button className="btn btn-success" onClick={() => { setPreviewDoc(null); setConfirmDoc(previewDoc); }}>
                <Upload size={14} /> Sync This
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
