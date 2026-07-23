import { useState, useRef, useCallback, useEffect } from 'react';
import { useStore } from '../store/useStore';
import {
  Upload as UploadIcon, X, FileText, Image, File,
  CheckCircle, AlertCircle, Clock, Loader, Camera,
  RotateCcw, ZoomIn, FlipHorizontal, SwitchCamera,
} from 'lucide-react';
import toast from 'react-hot-toast';
import './Upload.css';

const API = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

const formatSize = (bytes) => {
  if (bytes == null || isNaN(bytes)) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const getFileIcon = (name) => {
  if (!name) return <File size={20} />;
  const ext = name.split('.').pop().toLowerCase();
  if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'tiff'].includes(ext)) return <Image size={20} />;
  if (ext === 'pdf') return <FileText size={20} />;
  return <File size={20} />;
};

const StatusIcon = ({ status }) => {
  if (status === 'complete') return <CheckCircle size={16} className="status-icon-complete" style={{ color: 'var(--success)' }} />;
  if (status === 'failed') return <AlertCircle size={16} className="status-icon-failed" style={{ color: 'var(--error)' }} />;
  if (status === 'processing') return <Loader size={16} className="spin status-icon-processing" style={{ color: 'var(--primary)' }} />;
  if (status === 'queued') return <Clock size={16} className="status-icon-queued" style={{ color: 'var(--warning)' }} />;
  return null;
};

export default function Upload() {
  const { addDocuments, documents } = useStore();
  const [dragOver, setDragOver] = useState(false);
  const [burst, setBurst] = useState(false);
  const fileInputRef = useRef(null);
  
  // Loading & Error states for OCR extraction
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractingFileName, setExtractingFileName] = useState('');
  const [extractError, setExtractError] = useState(null);

  // Preview state
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [modalTab, setModalTab] = useState('json');

  // Camera state
  const [cameraOpen, setCameraOpen] = useState(false);
  const [stream, setStream] = useState(null);
  const [captured, setCaptured] = useState(null);
  const [facingMode, setFacingMode] = useState('environment');
  const [cameraError, setCameraError] = useState('');
  const [cameraLoading, setCameraLoading] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const activeUploads = documents.filter((d) =>
    ['queued', 'processing'].includes(d.status)
  );

  const handleFiles = useCallback(async (files) => {
    const valid = Array.from(files).filter((f) => {
      const ok = f.size <= 20 * 1024 * 1024;
      if (!ok) toast.error(`${f.name} exceeds 20MB limit`);
      return ok;
    });
    if (valid.length === 0) return;
    
    const file = valid[0]; // Take first file for preview flow
    const formData = new FormData();
    formData.append('file', file);
    
    setIsExtracting(true);
    setExtractingFileName(file.name);
    setExtractError(null);
    toast.loading('PaddleOCR extracting & Qwen AI formatting...', { id: 'ocr' });

    try {
      const res = await fetch(`${API}/upload_and_ocr`, { method: 'POST', body: formData });
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.detail || `Server returned error status ${res.status}`);
      }

      toast.success('Text extracted & formatted into JSON!', { id: 'ocr' });
      setIsExtracting(false);
      setPreviewData(data);
      setModalTab('json');
      setPreviewOpen(true);
      setBurst(true);
      setTimeout(() => setBurst(false), 700);
    } catch (err) {
      console.error("OCR Extraction Error:", err);
      const errMsg = err.message || 'Failed to extract text from image';
      toast.error(`Processing Failed: ${errMsg}`, { id: 'ocr' });
      setExtractError(errMsg);
      setIsExtracting(false);
    }
  }, []);

  const handleConfirmUpload = async () => {
    setPreviewOpen(false);
    toast.loading('Qwen AI saving document to database...', { id: 'agent' });
    try {
      const res = await fetch(`${API}/process_and_save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          filename: previewData.filename, 
          structured_json: previewData.structured_json,
          text: previewData.ocr_text
        })
      });
      const data = await res.json();
      if (res.ok) {
        toast.success('Successfully saved to database!', { id: 'agent' });
        addDocuments([{
          id: data.id || crypto.randomUUID(),
          filename: data.filename || previewData?.filename || 'unknown-file',
          status: 'complete',
          extractedData: data.extractedData || previewData?.structured_json || {},
          uploadDate: new Date().toISOString()
        }]);
      } else {
        toast.error(`Failed: ${data.detail || 'Save failed'}`, { id: 'agent' });
      }
    } catch (err) {
      console.error('Save to DB Error:', err);
      toast.error(`Error saving document to database: ${err.message || err}`, { id: 'agent' });
    }
  };

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const onDragOver = (e) => { e.preventDefault(); setDragOver(true); };
  const onDragLeave = () => setDragOver(false);

  const onFileSelect = (e) => {
    if (e.target.files?.length) handleFiles(e.target.files);
    e.target.value = '';
  };

  // ── Camera functions ──────────────────────────────────────────
  // Step 1: open the modal first, then request camera in useEffect
  const startCamera = async (facing = facingMode) => {
    setCameraError('');
    setCaptured(null);
    setCameraLoading(true);
    setCameraOpen(true); // mount the video element first

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      setStream(mediaStream);
    } catch (err) {
      console.error(err);
      const msg =
        err.name === 'NotAllowedError'
          ? 'Camera permission denied. Allow camera access in your browser settings.'
          : err.name === 'NotFoundError'
          ? 'No camera found on this device.'
          : 'Camera unavailable. Please try again.';
      setCameraError(msg);
      toast.error('Failed to access camera');
    } finally {
      setCameraLoading(false);
    }
  };

  // Step 2: once stream is ready AND video element is mounted, attach srcObject
  useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(() => {});
    }
  }, [stream, cameraOpen]); // re-run when modal opens or stream changes

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setCameraOpen(false);
    setCaptured(null);
    setCameraError('');
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    setCaptured(dataUrl);
  };

  const retakePhoto = () => setCaptured(null);

  const submitPhoto = () => {
    if (!captured) return;
    // Convert base64 data URL → Blob → File without using fetch()
    const [header, base64Data] = captured.split(',');
    const mime = header.match(/:(.*?);/)[1];
    const binary = atob(base64Data);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const blob = new Blob([bytes], { type: mime });
    const file = new window.File([blob], `camera-capture-${Date.now()}.jpg`, { type: 'image/jpeg' });
    handleFiles([file]);
    stopCamera();
  };

  const switchCamera = () => {
    // Stop current stream, toggle facing mode, restart
    if (stream) stream.getTracks().forEach((t) => t.stop());
    setStream(null);
    setCaptured(null);
    const next = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(next);
    // Re-request with new facing mode
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: next }, audio: false })
      .then((ms) => setStream(ms))
      .catch(() => toast.error('Could not switch camera'));
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (stream) stream.getTracks().forEach((track) => track.stop());
    };
  }, [stream]);

  const recentProcessing = documents
    .filter((d) => ['queued', 'processing', 'complete', 'failed'].includes(d.status))
    .sort((a, b) => new Date(b.uploadDate) - new Date(a.uploadDate))
    .slice(0, 10);

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Upload & Process</div>
          <div className="page-subtitle">Upload admission forms for OCR extraction. Supports PDF, JPG, PNG, TIFF.</div>
        </div>
        <button className="btn btn-outline" onClick={startCamera}>
          <Camera size={16} />
          Capture with Camera
        </button>
      </div>

      {/* Extract Error Alert */}
      {extractError && (
        <div className="card mt-4" style={{ backgroundColor: '#fef2f2', borderColor: '#fca5a5', padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
            <AlertCircle size={20} style={{ color: '#dc2626', marginTop: '2px', flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <h4 style={{ color: '#991b1b', margin: '0 0 4px 0', fontSize: '15px', fontWeight: 600 }}>
                OCR Text Extraction Failed
              </h4>
              <p style={{ color: '#7f1d1d', margin: 0, fontSize: '13.5px', lineHeight: '1.4' }}>
                {extractError}
              </p>
            </div>
            <button 
              className="btn btn-icon" 
              onClick={() => setExtractError(null)}
              style={{ color: '#991b1b', padding: '4px' }}
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Drop zone */}
      <div
        className={`drop-zone ${dragOver ? 'drag-over' : ''} ${burst ? 'drop-zone-burst' : ''}`}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onClick={() => fileInputRef.current?.click()}
      >
        {/* Floating particles */}
        <span className="dz-particle dz-p1" />
        <span className="dz-particle dz-p2" />
        <span className="dz-particle dz-p3" />
        <span className="dz-particle dz-p4" />
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.jpg,.jpeg,.png,.tiff,.bmp,.gif"
          onChange={onFileSelect}
          style={{ display: 'none' }}
        />
        <div className="drop-zone-icon">
          <UploadIcon size={40} />
        </div>
        <div className="drop-zone-title">
          {dragOver ? 'Drop files here' : 'Drag & drop files here'}
        </div>
        <div className="drop-zone-sub">or click to browse · PDF, JPG, PNG, TIFF · Max 20MB per file</div>
        <div className="drop-zone-actions" onClick={(e) => e.stopPropagation()}>
          <button className="btn btn-primary" onClick={() => fileInputRef.current?.click()}>
            <UploadIcon size={16} />
            Choose Files
          </button>
          <span className="drop-zone-or">or</span>
          <button className="btn btn-outline" onClick={startCamera}>
            <Camera size={16} />
            Use Camera
          </button>
        </div>
      </div>

      {/* Supported formats */}
      <div className="format-chips">
        {['PDF', 'JPG', 'PNG', 'TIFF', 'BMP'].map((fmt) => (
          <span key={fmt} className="format-chip">{fmt}</span>
        ))}
        <span className="text-sm text-muted">· Batch upload supported</span>
      </div>

      {/* Processing queue */}
      {recentProcessing.length > 0 && (
        <div className="card mt-4">
          <div className="card-header">
            <span className="card-title">Processing Queue</span>
            {activeUploads.length > 0 && (
              <span className="badge badge-blue">
                <Loader size={12} className="spin" />
                {activeUploads.length} active
              </span>
            )}
          </div>
          <div className="upload-list">
            {recentProcessing.map((doc) => (
              <div key={doc.id} className="upload-item">
                <div className="upload-file-icon">{getFileIcon(doc.filename)}</div>
                <div className="upload-info">
                  <div className="upload-name">{doc.filename}</div>
                  <div className="upload-meta text-sm text-muted">
                    {formatSize(doc.fileSize)}
                    {doc.processingTime && ` · ${doc.processingTime}s`}
                    {doc.status === 'complete' && ` · ${doc.recordCount} fields extracted`}
                    {doc.error && (
                      <span className="upload-error"> · {doc.error}</span>
                    )}
                  </div>
                  {(doc.status === 'processing' || doc.status === 'queued') && (
                    <div className="upload-progress-wrap">
                      <div className="progress-bar">
                        <div
                          className="progress-fill progress-fill-blue"
                          style={{ width: `${doc.progress || 0}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted">{Math.round(doc.progress || 0)}%</span>
                    </div>
                  )}
                </div>
                <div className="upload-status">
                  <StatusIcon status={doc.status} />
                  <span className={`badge badge-${doc.status === 'complete' ? 'green' : doc.status === 'failed' ? 'red' : doc.status === 'processing' ? 'blue' : 'yellow'} text-xs`}>
                    {doc.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tips */}
      <div className="upload-tips card mt-4">
        <div className="card-header">
          <span className="card-title">Tips for best results</span>
        </div>
        <div className="card-body">
          <div className="tips-grid">
            {[
              { icon: '📄', title: 'Scan quality', desc: 'Use 300 DPI or higher for scanned documents' },
              { icon: '💡', title: 'Lighting', desc: 'Ensure consistent, even lighting when photographing forms' },
              { icon: '📐', title: 'Orientation', desc: 'Keep forms straight and avoid angled captures' },
              { icon: '🔲', title: 'File size', desc: 'PDFs under 5MB process fastest; images under 2MB' },
            ].map((tip) => (
              <div key={tip.title} className="tip-card">
                <span className="tip-icon">{tip.icon}</span>
                <div>
                  <div className="tip-title">{tip.title}</div>
                  <div className="tip-desc text-sm text-muted">{tip.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Hidden canvas for capture */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {/* Camera Modal */}
      {cameraOpen && (
        <div className="modal-overlay">
          <div className="camera-modal">
            {/* Header */}
            <div className="camera-modal-header">
              <div>
                <div className="card-title">Capture Admission Form</div>
                <div className="text-sm text-muted">Position the form within the frame and capture</div>
              </div>
              <button className="btn btn-icon" onClick={stopCamera}>
                <X size={18} />
              </button>
            </div>

            {/* Camera error */}
            {cameraError && (
              <div className="alert alert-error" style={{ margin: '0 20px' }}>
                <AlertCircle size={15} />
                {cameraError}
              </div>
            )}

            {/* Viewfinder */}
            <div className="camera-viewfinder">
              {!captured ? (
                <>
                  {/* Loading state while awaiting permission */}
                  {cameraLoading && (
                    <div className="camera-loading">
                      <Loader size={32} className="spin" style={{ color: 'white' }} />
                      <p>Requesting camera access…</p>
                    </div>
                  )}

                  {/* Video — always in DOM when modal is open so ref is ready */}
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="camera-video"
                    style={{ display: cameraLoading || cameraError ? 'none' : 'block' }}
                  />

                  {/* Frame guide overlay — only show when streaming */}
                  {!cameraLoading && !cameraError && stream && (
                    <div className="camera-overlay">
                      <div className="camera-frame">
                        <span className="frame-corner tl" />
                        <span className="frame-corner tr" />
                        <span className="frame-corner bl" />
                        <span className="frame-corner br" />
                        <div className="frame-label">Align form within the frame</div>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="camera-preview">
                  <img src={captured} alt="Captured form" className="camera-captured-img" />
                  <div className="camera-preview-label">
                    <CheckCircle size={14} style={{ color: 'var(--success)' }} />
                    Photo captured — looks good?
                  </div>
                </div>
              )}
            </div>

            {/* Controls */}
            <div className="camera-controls">
              {!captured ? (
                <>
                  <button className="btn btn-secondary" onClick={switchCamera} title="Switch camera">
                    <SwitchCamera size={16} />
                    Flip
                  </button>
                  <button className="btn-capture" onClick={capturePhoto}>
                    <div className="btn-capture-inner" />
                  </button>
                  <button className="btn btn-secondary" onClick={stopCamera}>
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <button className="btn btn-secondary" onClick={retakePhoto}>
                    <RotateCcw size={16} />
                    Retake
                  </button>
                  <button className="btn btn-success" onClick={submitPhoto}>
                    <CheckCircle size={16} />
                    Use This Photo
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Extracting Loading Modal Overlay */}
      {isExtracting && (
        <div className="modal-overlay" style={{ zIndex: 9999 }}>
          <div className="camera-modal" style={{ width: '480px', maxWidth: '90%', textAlign: 'center', padding: '32px 24px' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
              <div style={{ position: 'relative', width: '64px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Loader size={48} className="spin" style={{ color: '#2563eb' }} />
              </div>
            </div>
            <h3 style={{ fontSize: '20px', fontWeight: 600, color: '#1e293b', marginBottom: '8px' }}>
              Extracting Text with PaddleOCR...
            </h3>
            <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '16px', lineHeight: '1.5' }}>
              Processing document: <strong style={{ color: '#0f172a' }}>{extractingFileName}</strong>
            </p>
            <div style={{ background: '#f1f5f9', borderRadius: '8px', padding: '12px 16px', fontSize: '13px', color: '#475569', textAlign: 'left' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 500, color: '#1e293b', marginBottom: '4px' }}>
                <Clock size={16} style={{ color: '#2563eb' }} /> High-speed PaddleOCR Engine Active
              </div>
              <div>Extracting text line-by-line using PaddleOCR model. This usually finishes in just a few seconds.</div>
            </div>
          </div>
        </div>
      )}

      {/* OCR & Qwen JSON Preview Modal */}
      {previewOpen && previewData && (
        <div className="modal-overlay" style={{ zIndex: 9999 }}>
          <div className="camera-modal" style={{ width: '650px', maxWidth: '92%' }}>
            <div className="camera-modal-header" style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0' }}>
              <div>
                <div className="card-title" style={{ fontSize: '18px', fontWeight: 600 }}>Extracted Data Preview</div>
                <div className="text-sm text-muted">Review Qwen LLM structured JSON output for <strong>{previewData.filename}</strong></div>
              </div>
              <button className="btn btn-icon" onClick={() => setPreviewOpen(false)}>
                <X size={18} />
              </button>
            </div>
            
            {/* Tab switcher */}
            <div style={{ display: 'flex', gap: '8px', padding: '12px 20px 0 20px', borderBottom: '1px solid #f1f5f9' }}>
              <button 
                className={`btn btn-sm ${modalTab === 'json' ? 'btn-primary' : 'btn-outline'}`} 
                onClick={() => setModalTab('json')}
              >
                Structured JSON (Qwen AI)
              </button>
              <button 
                className={`btn btn-sm ${modalTab === 'raw' ? 'btn-primary' : 'btn-outline'}`} 
                onClick={() => setModalTab('raw')}
              >
                Raw OCR Text (PaddleOCR)
              </button>
            </div>

            <div style={{ padding: '16px 20px', maxHeight: '420px', overflowY: 'auto' }}>
              {modalTab === 'json' ? (
                <div>
                  <div style={{ marginBottom: '10px', fontSize: '13px', color: '#64748b' }}>
                    Qwen Model extracted key fields from OCR text into JSON format:
                  </div>
                  <pre style={{ 
                    background: '#0f172a', 
                    color: '#38bdf8', 
                    padding: '16px', 
                    borderRadius: '8px', 
                    fontSize: '13.5px', 
                    fontFamily: 'monospace', 
                    overflowX: 'auto',
                    margin: 0,
                    lineHeight: '1.5'
                  }}>
                    {JSON.stringify(previewData.structured_json || {}, null, 2)}
                  </pre>
                </div>
              ) : (
                <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', whiteSpace: 'pre-wrap', fontSize: '14px', fontFamily: 'monospace', color: '#334155' }}>
                  {previewData.ocr_text || 'No text extracted.'}
                </div>
              )}
            </div>

            <div className="camera-controls" style={{ padding: '16px 20px', borderTop: '1px solid #e2e8f0', background: '#f8fafc' }}>
              <button className="btn btn-secondary" onClick={() => setPreviewOpen(false)}>
                Cancel
              </button>
              <button className="btn btn-success" onClick={handleConfirmUpload}>
                <CheckCircle size={16} />
                Save to Database
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
