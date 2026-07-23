import { useState, useMemo } from 'react';
import { useStore } from '../store/useStore';
import {
  FileText, Search, Filter, Trash2, RefreshCw,
  Download, Eye, MoreVertical, ChevronUp, ChevronDown,
  CheckSquare, Square,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import './Documents.css';

const formatSize = (b) => b < 1024 * 1024 ? `${(b / 1024).toFixed(0)} KB` : `${(b / (1024 * 1024)).toFixed(1)} MB`;

export default function Documents() {
  const { documents, selectedDocIds, toggleSelectDoc, selectAllDocs, clearSelection, deleteDocuments } = useStore();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [sortField, setSortField] = useState('uploadDate');
  const [sortDir, setSortDir] = useState('desc');
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const filtered = useMemo(() => {
    let docs = [...documents];
    if (search) docs = docs.filter((d) => d.filename.toLowerCase().includes(search.toLowerCase()));
    if (statusFilter !== 'all') docs = docs.filter((d) => d.status === statusFilter);
    if (dateFilter === 'today') {
      const today = new Date().toDateString();
      docs = docs.filter((d) => new Date(d.uploadDate).toDateString() === today);
    } else if (dateFilter === 'week') {
      const week = Date.now() - 7 * 86400 * 1000;
      docs = docs.filter((d) => new Date(d.uploadDate) >= week);
    }
    docs.sort((a, b) => {
      let va = a[sortField], vb = b[sortField];
      if (sortField === 'uploadDate') { va = new Date(va); vb = new Date(vb); }
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return docs;
  }, [documents, search, statusFilter, dateFilter, sortField, sortDir]);

  const allSelected = filtered.length > 0 && filtered.every((d) => selectedDocIds.includes(d.id));

  const toggleSort = (field) => {
    if (sortField === field) setSortDir((d) => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <ChevronUp size={13} style={{ opacity: 0.3 }} />;
    return sortDir === 'asc' ? <ChevronUp size={13} /> : <ChevronDown size={13} />;
  };

  const handleDelete = () => {
    deleteDocuments(selectedDocIds);
    setShowDeleteModal(false);
    toast.success(`${selectedDocIds.length} document(s) deleted`);
  };

  const exportCSV = () => {
    const rows = [['Filename', 'Status', 'Records', 'Upload Date', 'Sync Status']];
    filtered.forEach((d) => rows.push([d.filename, d.status, d.recordCount, d.uploadDate, d.syncStatus]));
    const csv = rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'documents.csv'; a.click();
    toast.success('CSV exported');
  };

  const statusBadge = (s) => {
    const map = { complete: 'badge-green', processing: 'badge-blue', queued: 'badge-yellow', failed: 'badge-red' };
    return <span className={`badge ${map[s] || 'badge-gray'}`}>{s}</span>;
  };

  const syncBadge = (s) => {
    if (s === 'synced') return <span className="badge badge-green">✓ Synced</span>;
    if (s === 'syncing') return <span className="badge badge-blue">⏳ Syncing</span>;
    if (s === 'failed') return <span className="badge badge-red">✗ Failed</span>;
    return <span className="badge badge-yellow">⏳ Pending</span>;
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Document Management</div>
          <div className="page-subtitle">{documents.length} total documents · {documents.filter((d) => d.status === 'complete').length} processed</div>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-secondary" onClick={exportCSV}>
            <Download size={15} /> Export CSV
          </button>
          <Link to="/upload" className="btn btn-primary">
            <FileText size={15} /> Upload More
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="card mb-4">
        <div className="card-body" style={{ paddingTop: 16, paddingBottom: 16 }}>
          <div className="doc-filters">
            <div className="search-wrap">
              <Search size={15} className="search-icon" />
              <input
                className="form-input"
                style={{ paddingLeft: 32 }}
                placeholder="Search by filename..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select className="form-input form-select" style={{ width: 'auto' }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">All Status</option>
              <option value="complete">Complete</option>
              <option value="processing">Processing</option>
              <option value="queued">Queued</option>
              <option value="failed">Failed</option>
            </select>
            <select className="form-input form-select" style={{ width: 'auto' }} value={dateFilter} onChange={(e) => setDateFilter(e.target.value)}>
              <option value="all">All Dates</option>
              <option value="today">Today</option>
              <option value="week">Last 7 Days</option>
            </select>
            {selectedDocIds.length > 0 && (
              <div className="bulk-actions">
                <span className="text-sm text-muted">{selectedDocIds.length} selected</span>
                <button className="btn btn-danger btn-sm" onClick={() => setShowDeleteModal(true)}>
                  <Trash2 size={13} /> Delete
                </button>
                <button className="btn btn-secondary btn-sm" onClick={clearSelection}>
                  <X size={13} /> Deselect
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: 40 }}>
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={() => allSelected ? clearSelection() : selectAllDocs(filtered.map((d) => d.id))}
                  />
                </th>
                <th>
                  <button className="sort-btn" onClick={() => toggleSort('filename')}>
                    File <SortIcon field="filename" />
                  </button>
                </th>
                <th>Status</th>
                <th>Sync</th>
                <th>
                  <button className="sort-btn" onClick={() => toggleSort('recordCount')}>
                    Fields <SortIcon field="recordCount" />
                  </button>
                </th>
                <th>Size</th>
                <th>
                  <button className="sort-btn" onClick={() => toggleSort('uploadDate')}>
                    Uploaded <SortIcon field="uploadDate" />
                  </button>
                </th>
                <th>Process Time</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9}>
                    <div className="empty-state">
                      <div className="empty-state-icon"><FileText size={40} /></div>
                      <p>No documents match your filters</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((doc) => (
                  <tr key={doc.id} className={selectedDocIds.includes(doc.id) ? 'row-selected' : ''}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedDocIds.includes(doc.id)}
                        onChange={() => toggleSelectDoc(doc.id)}
                      />
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <FileText size={14} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                        <div>
                          <div className="font-semibold" style={{ fontSize: 13 }}>{doc.filename}</div>
                          <div className="text-xs text-muted">{doc.type}</div>
                        </div>
                      </div>
                    </td>
                    <td>{statusBadge(doc.status)}</td>
                    <td>{syncBadge(doc.syncStatus)}</td>
                    <td>{doc.recordCount || '—'}</td>
                    <td className="text-sm text-muted">{formatSize(doc.fileSize)}</td>
                    <td className="text-sm text-muted">{format(parseISO(doc.uploadDate), 'MMM d, HH:mm')}</td>
                    <td className="text-sm text-muted">{doc.processingTime ? `${doc.processingTime}s` : '—'}</td>
                    <td>
                      <div className="flex gap-1">
                        <Link to="/ocr-preview" className="btn btn-icon btn-sm" title="Preview">
                          <Eye size={13} />
                        </Link>
                        <button className="btn btn-icon btn-sm" title="Delete" onClick={() => {
                          deleteDocuments([doc.id]);
                          toast.success('Document deleted');
                        }}>
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {filtered.length > 0 && (
          <div className="table-footer">
            <span className="text-sm text-muted">Showing {filtered.length} of {documents.length} documents</span>
          </div>
        )}
      </div>

      {/* Delete modal */}
      {showDeleteModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3 className="card-title">Confirm Delete</h3>
              <button className="btn btn-icon btn-sm" onClick={() => setShowDeleteModal(false)}><X size={16} /></button>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to delete <strong>{selectedDocIds.length} document(s)</strong>? This action cannot be undone.</p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowDeleteModal(false)}>Cancel</button>
              <button className="btn btn-danger" onClick={handleDelete}>
                <Trash2 size={14} /> Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
