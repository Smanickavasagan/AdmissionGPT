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
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const getFileIcon = (name) => {
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
  
  // Preview state
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState(null);

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
    
    toast.loading('Extracting OCR Text...', { id: 'ocr' });
    try {
      const res = await fetch(`${API}/upload_and_ocr`, { method: 'POST', body: formData });
      const data = await res.json();
      toast.dismiss('ocr');
      setPreviewData(data);
      setPreviewOpen(true);
      setBurst(true);
      setTimeout(() => setBurst(false), 700);
    } catch (err) {
      toast.error('Failed to extract OCR', { id: 'ocr' });
    }
  }, []);

  const handleConfirmUpload = async () => {
    setPreviewOpen(false);
    toast.loading('AI Agent processing & saving...', { id: 'agent' });
    try {
      const res = await fetch(`${API}/process_and_save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: previewData.filename, text: previewData.ocr_text })
      });
      if (res.ok) {
        toast.success('Successfully processed and saved!', { id: 'agent' });
      } else {
        toast.error('Failed to process', { id: 'agent' });
      }
    } catch (err) {
      toast.error('Error contacting agent', { id: 'agent' });
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
    fetch(captured)
      .then((res) => res.blob())
      .then((blob) => {
        const file = new File([blob], `camera-capture-${Date.now()}.jpg`, { type: 'image/jpeg' });
        handleFiles([file]);
        stopCamera();
      });
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

      {/* OCR Preview Modal */}
      {previewOpen && previewData && (
        <div className="modal-overlay">
          <div className="camera-modal" style={{ width: '600px', maxWidth: '90%' }}>
            <div className="camera-modal-header">
              <div>
                <div className="card-title">OCR Preview</div>
                <div className="text-sm text-muted">Review extracted text before AI processing</div>
              </div>
              <button className="btn btn-icon" onClick={() => setPreviewOpen(false)}>
                <X size={18} />
              </button>
            </div>
            
            <div style={{ padding: '20px', maxHeight: '400px', overflowY: 'auto', background: '#f8fafc', margin: '20px', borderRadius: '8px', border: '1px solid #e2e8f0', whiteSpace: 'pre-wrap', fontSize: '14px' }}>
              {previewData.ocr_text || 'No text extracted.'}
            </div>

            <div className="camera-controls">
              <button className="btn btn-secondary" onClick={() => setPreviewOpen(false)}>
                Cancel
              </button>
              <button className="btn btn-success" onClick={handleConfirmUpload}>
                <CheckCircle size={16} />
                Confirm & Upload
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
