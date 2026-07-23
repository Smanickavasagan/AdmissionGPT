import { useState, useRef, useEffect } from 'react';
import { useStore } from '../store/useStore';
import {
  Eye, Edit3, Check, X, ChevronLeft, ChevronRight,
  AlertTriangle, Info, FileText,
} from 'lucide-react';
import toast from 'react-hot-toast';
import './OcrPreview.css';

const ConfidenceBadge = ({ score }) => {
  if (score >= 0.9) return <span className="conf-badge conf-high">{(score * 100).toFixed(0)}%</span>;
  if (score >= 0.75) return <span className="conf-badge conf-med">{(score * 100).toFixed(0)}%</span>;
  return <span className="conf-badge conf-low">{(score * 100).toFixed(0)}%</span>;
};

export default function OcrPreview() {
  const { documents, updateDocumentField } = useStore();
  const completeDocs = documents.filter((d) => d.status === 'complete');

  const [selectedIdx, setSelectedIdx] = useState(0);
  const [editingField, setEditingField] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [activeTab, setActiveTab] = useState('fields');

  const doc = completeDocs[selectedIdx];
  const prevDocId = useRef(null);
  const [fieldKey, setFieldKey] = useState(0);

  // Bump fieldKey when doc changes to re-trigger stagger animation
  useEffect(() => {
    if (doc && doc.id !== prevDocId.current) {
      prevDocId.current = doc.id;
      setFieldKey((k) => k + 1);
    }
  }, [doc]);

  if (completeDocs.length === 0) {
    return (
      <div>
        <div className="page-header">
          <div className="page-title">OCR Preview & Validation</div>
        </div>
        <div className="empty-state card">
          <div className="empty-state-icon"><FileText size={48} /></div>
          <p>No processed documents yet. Upload and process a document first.</p>
        </div>
      </div>
    );
  }

  const fields = doc ? Object.entries(doc.extractedData) : [];
  const lowConfFields = fields.filter(([, v]) => v.confidence < 0.85);

  const startEdit = (field, val) => {
    setEditingField(field);
    setEditValue(val);
  };

  const saveEdit = (field) => {
    updateDocumentField(doc.id, field, editValue);
    setEditingField(null);
    toast.success(`Field "${field}" updated`);
  };

  const cancelEdit = () => setEditingField(null);

  const rawJson = doc ? JSON.stringify(
    Object.fromEntries(fields.map(([k, v]) => [k, v.value])),
    null,
    2
  ) : '';

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">OCR Preview & Validation</div>
          <div className="page-subtitle">Review extracted data and correct OCR errors inline.</div>
        </div>
      </div>

      {/* Document selector */}
      <div className="doc-selector card mb-4">
        <div className="doc-selector-inner">
          <button
            className="btn btn-icon"
            disabled={selectedIdx === 0}
            onClick={() => setSelectedIdx((i) => i - 1)}
          >
            <ChevronLeft size={16} />
          </button>
          <div className="doc-selector-list">
            {completeDocs.map((d, i) => (
              <button
                key={d.id}
                className={`doc-chip ${i === selectedIdx ? 'active' : ''}`}
                onClick={() => setSelectedIdx(i)}
              >
                <FileText size={13} />
                <span className="truncate">{d.filename}</span>
              </button>
            ))}
          </div>
          <button
            className="btn btn-icon"
            disabled={selectedIdx === completeDocs.length - 1}
            onClick={() => setSelectedIdx((i) => i + 1)}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {doc && (
        <>
          {lowConfFields.length > 0 && (
            <div className="alert alert-warning mb-4">
              <AlertTriangle size={16} />
              <span>
                <strong>{lowConfFields.length} field{lowConfFields.length > 1 ? 's' : ''}</strong> have low confidence scores (&lt;85%). Please review and correct them.
              </span>
            </div>
          )}

          <div className="preview-layout">
            {/* Left: Document preview */}
            <div className="card preview-doc-panel">
              <div className="card-header">
                <span className="card-title">Document Preview</span>
                <span className="badge badge-blue">{doc.filename.split('.').pop().toUpperCase()}</span>
              </div>
              <div className="doc-preview-area" style={{ position: 'relative' }}>
                <div className="scan-line" />
                <div className="doc-mock">
                  <div className="doc-mock-header">
                    <div className="doc-mock-logo">📋</div>
                    <div>
                      <div className="doc-mock-title">ADMISSION FORM</div>
                      <div className="doc-mock-subtitle">Academic Year 2026-27</div>
                    </div>
                  </div>
                  {fields.slice(0, 8).map(([key, val]) => (
                    <div key={key} className={`doc-mock-row ${val.confidence < 0.85 ? 'low-conf' : ''}`}>
                      <span className="doc-mock-label">{key.replace(/([A-Z])/g, ' $1').trim()}:</span>
                      <span className="doc-mock-value">{val.value}</span>
                    </div>
                  ))}
                  <div className="doc-mock-note text-xs text-muted">
                    <Info size={11} /> Highlighted rows have low confidence
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Extracted fields */}
            <div className="card preview-fields-panel">
              <div className="card-header">
                <span className="card-title">Extracted Fields</span>
                <div className="flex gap-2">
                  <span className="badge badge-green">{fields.length} fields</span>
                </div>
              </div>
              <div className="tabs" style={{ padding: '0 16px' }}>
                <button className={`tab ${activeTab === 'fields' ? 'active' : ''}`} onClick={() => setActiveTab('fields')}>
                  <Eye size={14} /> Fields
                </button>
                <button className={`tab ${activeTab === 'json' ? 'active' : ''}`} onClick={() => setActiveTab('json')}>
                  {'{ }'} Raw JSON
                </button>
              </div>

              {activeTab === 'fields' && (
                <div className="fields-list">
                  {fields.map(([key, val]) => (
                    <div key={key} className={`field-row ${val.confidence < 0.85 ? 'field-row-warn' : ''}`}>
                      <div className="field-key">
                        <span>{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                        <ConfidenceBadge score={val.confidence} />
                        {val.manuallyEdited && (
                          <span className="badge badge-purple" style={{ fontSize: 10 }}>edited</span>
                        )}
                      </div>
                      {editingField === key ? (
                        <div className="field-edit-row">
                          <input
                            className="form-input"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveEdit(key);
                              if (e.key === 'Escape') cancelEdit();
                            }}
                            autoFocus
                          />
                          <button className="btn btn-success btn-sm" onClick={() => saveEdit(key)}>
                            <Check size={14} />
                          </button>
                          <button className="btn btn-secondary btn-sm" onClick={cancelEdit}>
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <div className="field-value-row">
                          <span className="field-value">{val.value}</span>
                          <button
                            className="btn btn-icon btn-sm field-edit-btn"
                            onClick={() => startEdit(key, val.value)}
                            title="Edit field"
                          >
                            <Edit3 size={13} />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'json' && (
                <div className="card-body">
                  <pre className="json-preview">{rawJson}</pre>
                </div>
              )}
            </div>
          </div>

          {/* Stats bar */}
          <div className="card mt-4">
            <div className="card-body">
              <div className="ocr-stats">
                <div className="ocr-stat">
                  <div className="ocr-stat-value">{fields.length}</div>
                  <div className="ocr-stat-label">Total Fields</div>
                </div>
                <div className="ocr-stat">
                  <div className="ocr-stat-value" style={{ color: 'var(--success)' }}>
                    {fields.filter(([, v]) => v.confidence >= 0.9).length}
                  </div>
                  <div className="ocr-stat-label">High Confidence</div>
                </div>
                <div className="ocr-stat">
                  <div className="ocr-stat-value" style={{ color: 'var(--warning)' }}>
                    {fields.filter(([, v]) => v.confidence >= 0.75 && v.confidence < 0.9).length}
                  </div>
                  <div className="ocr-stat-label">Medium Confidence</div>
                </div>
                <div className="ocr-stat">
                  <div className="ocr-stat-value" style={{ color: 'var(--error)' }}>
                    {fields.filter(([, v]) => v.confidence < 0.75).length}
                  </div>
                  <div className="ocr-stat-label">Low Confidence</div>
                </div>
                <div className="ocr-stat">
                  <div className="ocr-stat-value">
                    {(fields.reduce((s, [, v]) => s + v.confidence, 0) / (fields.length || 1) * 100).toFixed(1)}%
                  </div>
                  <div className="ocr-stat-label">Avg Confidence</div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
