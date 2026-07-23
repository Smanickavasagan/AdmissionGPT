import { useState } from 'react';
import { useStore } from '../store/useStore';
import {
  Code, Save, Copy, RotateCcw, Check, FileText, Plus, Trash2, X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import './JsonEditor.css';

const DATA_TYPES = ['string', 'number', 'date', 'boolean', 'email', 'phone'];

const validateField = (value, type) => {
  if (!value && value !== 0) return 'Field cannot be empty';
  if (type === 'number' && isNaN(Number(value))) return 'Must be a number';
  if (type === 'date' && isNaN(Date.parse(value))) return 'Must be a valid date (YYYY-MM-DD)';
  if (type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Invalid email';
  if (type === 'phone' && !/^\d{10,15}$/.test(value)) return 'Must be 10-15 digits';
  if (type === 'boolean' && !['true', 'false', '1', '0'].includes(String(value).toLowerCase())) return 'Must be true/false';
  return null;
};

export default function JsonEditor() {
  const { documents, updateDocumentField, settings } = useStore();
  const completeDocs = documents.filter((d) => d.status === 'complete');
  const [selectedDocId, setSelectedDocId] = useState(completeDocs[0]?.id || '');
  const [activeTab, setActiveTab] = useState('editor');
  const [fieldTypes, setFieldTypes] = useState({});
  const [errors, setErrors] = useState({});
  const [copied, setCopied] = useState(false);
  const [addingField, setAddingField] = useState(false);
  const [newField, setNewField] = useState({ key: '', value: '', type: 'string' });

  const doc = documents.find((d) => d.id === selectedDocId);
  const fields = doc ? Object.entries(doc.extractedData) : [];

  const getType = (key) => fieldTypes[key] || 'string';

  const handleChange = (key, val) => {
    const type = getType(key);
    const err = validateField(val, type);
    setErrors((e) => ({ ...e, [key]: err }));
    updateDocumentField(selectedDocId, key, val);
  };

  const handleTypeChange = (key, type) => {
    setFieldTypes((t) => ({ ...t, [key]: type }));
    const field = doc?.extractedData[key];
    if (field) {
      const err = validateField(field.value, type);
      setErrors((e) => ({ ...e, [key]: err }));
    }
  };

  const copyJson = () => {
    const json = JSON.stringify(
      Object.fromEntries(fields.map(([k, v]) => [k, v.value])),
      null, 2
    );
    navigator.clipboard.writeText(json);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('JSON copied to clipboard');
  };

  const addField = () => {
    if (!newField.key.trim()) { toast.error('Field name required'); return; }
    if (doc.extractedData[newField.key]) { toast.error('Field already exists'); return; }
    updateDocumentField(selectedDocId, newField.key, newField.value);
    setFieldTypes((t) => ({ ...t, [newField.key]: newField.type }));
    setAddingField(false);
    setNewField({ key: '', value: '', type: 'string' });
    toast.success('Field added');
  };

  const schemaFields = settings.templates.find((t) => t.name === doc?.type)?.fields || [];

  const rawJson = doc
    ? JSON.stringify(Object.fromEntries(fields.map(([k, v]) => [k, v.value])), null, 2)
    : '{}';

  if (completeDocs.length === 0) {
    return (
      <div>
        <div className="page-header"><div className="page-title">JSON Editor & Mapping</div></div>
        <div className="empty-state card">
          <div className="empty-state-icon"><Code size={48} /></div>
          <p>No processed documents available. Process a document first.</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">JSON Editor & Mapping</div>
          <div className="page-subtitle">Edit extracted fields, set data types, and map to schema.</div>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-secondary" onClick={copyJson}>
            {copied ? <Check size={15} /> : <Copy size={15} />}
            {copied ? 'Copied!' : 'Copy JSON'}
          </button>
        </div>
      </div>

      {/* Doc selector */}
      <div className="card mb-4">
        <div className="card-body" style={{ padding: '14px 20px' }}>
          <div className="flex items-center gap-3">
            <label className="form-label" style={{ margin: 0, whiteSpace: 'nowrap' }}>Select Document:</label>
            <select
              className="form-input form-select"
              style={{ maxWidth: 360 }}
              value={selectedDocId}
              onChange={(e) => setSelectedDocId(e.target.value)}
            >
              {completeDocs.map((d) => (
                <option key={d.id} value={d.id}>{d.filename}</option>
              ))}
            </select>
            {doc && (
              <span className="badge badge-blue">{fields.length} fields</span>
            )}
          </div>
        </div>
      </div>

      {doc && (
        <div className="je-layout">
          {/* Editor panel */}
          <div className="card je-panel">
            <div className="card-header">
              <span className="card-title">Field Editor</span>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => setAddingField(true)}
              >
                <Plus size={14} /> Add Field
              </button>
            </div>

            <div className="tabs" style={{ padding: '0 16px' }}>
              <button className={`tab ${activeTab === 'editor' ? 'active' : ''}`} onClick={() => setActiveTab('editor')}>
                Editor
              </button>
              <button className={`tab ${activeTab === 'schema' ? 'active' : ''}`} onClick={() => setActiveTab('schema')}>
                Schema Mapping
              </button>
              <button className={`tab ${activeTab === 'raw' ? 'active' : ''}`} onClick={() => setActiveTab('raw')}>
                Raw JSON
              </button>
            </div>

            {activeTab === 'editor' && (
              <div className="je-fields">
                {addingField && (
                  <div className="add-field-row">
                    <input className="form-input" placeholder="Field name" value={newField.key} onChange={(e) => setNewField((n) => ({ ...n, key: e.target.value }))} />
                    <input className="form-input" placeholder="Value" value={newField.value} onChange={(e) => setNewField((n) => ({ ...n, value: e.target.value }))} />
                    <select className="form-input form-select" value={newField.type} onChange={(e) => setNewField((n) => ({ ...n, type: e.target.value }))}>
                      {DATA_TYPES.map((t) => <option key={t}>{t}</option>)}
                    </select>
                    <button className="btn btn-success btn-sm" onClick={addField}><Check size={14} /></button>
                    <button className="btn btn-secondary btn-sm" onClick={() => setAddingField(false)}><X size={14} /></button>
                  </div>
                )}
                {fields.map(([key, val]) => (
                  <div key={key} className={`je-field-row ${errors[key] ? 'je-field-error' : ''}`}>
                    <div className="je-field-left">
                      <div className="je-field-key">{key.replace(/([A-Z])/g, ' $1').trim()}</div>
                      <div className="je-type-select">
                        <select
                          className="form-input form-select"
                          style={{ fontSize: 12, padding: '4px 24px 4px 8px' }}
                          value={getType(key)}
                          onChange={(e) => handleTypeChange(key, e.target.value)}
                        >
                          {DATA_TYPES.map((t) => <option key={t}>{t}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="je-field-right">
                      <input
                        className={`form-input ${errors[key] ? 'input-error' : ''}`}
                        value={val.value}
                        onChange={(e) => handleChange(key, e.target.value)}
                      />
                      {errors[key] && <div className="form-error">{errors[key]}</div>}
                    </div>
                    {val.manuallyEdited && (
                      <span className="badge badge-purple" style={{ fontSize: 10, flexShrink: 0 }}>edited</span>
                    )}
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'schema' && (
              <div className="je-schema">
                <div className="card-body">
                  <div className="alert alert-info mb-4">
                    <span>Mapping for template: <strong>{doc.type}</strong></span>
                  </div>
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Schema Field</th>
                        <th>Extracted Field</th>
                        <th>Value</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {schemaFields.map((sf) => {
                        const match = doc.extractedData[sf];
                        return (
                          <tr key={sf}>
                            <td className="font-semibold text-sm">{sf}</td>
                            <td className="text-sm text-muted">{match ? sf : '—'}</td>
                            <td className="text-sm">{match?.value || '—'}</td>
                            <td>
                              {match
                                ? <span className="badge badge-green">✓ Mapped</span>
                                : <span className="badge badge-red">✗ Missing</span>
                              }
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'raw' && (
              <div className="card-body">
                <pre className="json-preview" style={{ maxHeight: 500 }}>{rawJson}</pre>
              </div>
            )}
          </div>

          {/* Preview panel */}
          <div className="card je-panel">
            <div className="card-header">
              <span className="card-title">Live JSON Preview</span>
            </div>
            <div className="card-body">
              <pre className="json-preview" style={{ maxHeight: 600 }}>{rawJson}</pre>
            </div>
            <div className="card-body" style={{ paddingTop: 0 }}>
              <div className="je-summary">
                <div className="je-summary-item">
                  <span className="text-sm text-muted">Fields</span>
                  <span className="font-semibold">{fields.length}</span>
                </div>
                <div className="je-summary-item">
                  <span className="text-sm text-muted">Edited</span>
                  <span className="font-semibold">{fields.filter(([, v]) => v.manuallyEdited).length}</span>
                </div>
                <div className="je-summary-item">
                  <span className="text-sm text-muted">Errors</span>
                  <span className="font-semibold" style={{ color: Object.values(errors).filter(Boolean).length > 0 ? 'var(--error)' : 'inherit' }}>
                    {Object.values(errors).filter(Boolean).length}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
