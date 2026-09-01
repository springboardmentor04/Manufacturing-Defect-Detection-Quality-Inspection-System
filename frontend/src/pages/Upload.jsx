import { useRef, useState, useEffect } from 'react';
import { Api } from '../api';
import { useSetPageHeader } from '../context/PageHeaderContext';
import { EmptyState, ErrorBanner, Skeleton } from '../components/Shared';
import InspectionResult from '../components/InspectionResult';

export default function Upload() {
  useSetPageHeader('Upload Product Image', 'Add a product image and run the AI inspection pipeline against it.');

  const fileInputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);
  const [previewSrc, setPreviewSrc] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);

  const [productCode, setProductCode] = useState('');
  const [productName, setProductName] = useState('');
  const [category, setCategory] = useState('');
  const [batchNumber, setBatchNumber] = useState('');
  const [productionLine, setProductionLine] = useState('');
  const [productionDate, setProductionDate] = useState('');

  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null); // { inspection, imgSrc }
  const [resultLoading, setResultLoading] = useState(false);

  // ---- Camera capture state ----
  const [showCamera, setShowCamera] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  function handleFile(file) {
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = () => setPreviewSrc(reader.result);
    reader.readAsDataURL(file);
  }

  function onDrop(e) {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
  }

  // ---- Camera helpers ----
  async function openCamera() {
    setCameraError('');
    setShowCamera(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) {
      console.error('Camera access error:', err);
      setCameraError('Could not access camera. Check permissions, or use file upload instead.');
    }
  }

  function closeCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setShowCamera(false);
  }

  function capturePhoto() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);

    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], `capture-${Date.now()}.jpg`, { type: 'image/jpeg' });
      handleFile(file); // reuses the exact same flow as a picked file
      closeCamera();
    }, 'image/jpeg', 0.92);
  }

  // Clean up camera if the component unmounts while camera is open
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!selectedFile) {
      setError('Please select a product image to upload.');
      return;
    }

    setSubmitting(true);
    setResultLoading(true);
    setResult(null);

    try {
      const fd = new FormData();
      fd.append('image', selectedFile);
      fd.append('product_code', productCode);
      fd.append('product_name', productName);
      fd.append('category', category);
      fd.append('batch_number', batchNumber);
      fd.append('production_line', productionLine);
      fd.append('production_date', productionDate);

      const { product } = await Api.uploadProduct(fd);
      const { inspection } = await Api.runInspection(product.id);

      setResult({ inspection, imgSrc: previewSrc });
    } catch (err) {
      setError(err.message);
      setResultLoading(false);
    } finally {
      setSubmitting(false);
      setResultLoading(false);
    }
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, alignItems: 'start' }}>
      <div className="card">
        <h3 className="font-display" style={{ margin: '0 0 16px', fontSize: 15 }}>
          Product Details
        </h3>
        {error && <ErrorBanner message={error} />}
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label className="field-label">Product Code</label>
              <input className="field-input" required placeholder="M12-HN-001" value={productCode} onChange={(e) => setProductCode(e.target.value)} />
            </div>
            <div>
              <label className="field-label">Product Name</label>
              <input className="field-input" required placeholder="M12 Heavy Hex Nut" value={productName} onChange={(e) => setProductName(e.target.value)} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label className="field-label">Category</label>
              <input className="field-input" placeholder="metal_nut" value={category} onChange={(e) => setCategory(e.target.value)} />
            </div>
            <div>
              <label className="field-label">Batch Number</label>
              <input className="field-input" placeholder="B-2026-0731" value={batchNumber} onChange={(e) => setBatchNumber(e.target.value)} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 18 }}>
            <div>
              <label className="field-label">Production Line</label>
              <input className="field-input" placeholder="Line-A" value={productionLine} onChange={(e) => setProductionLine(e.target.value)} />
            </div>
            <div>
              <label className="field-label">Production Date</label>
              <input className="field-input" type="date" value={productionDate} onChange={(e) => setProductionDate(e.target.value)} />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label className="field-label">Product Image</label>
            <button
              type="button"
              onClick={openCamera}
              style={{
                fontSize: 11.5,
                color: 'var(--text-dim)',
                background: 'none',
                border: '1px solid var(--border, #444)',
                borderRadius: 6,
                padding: '4px 10px',
                cursor: 'pointer',
              }}
            >
              📷 Use Camera
            </button>
          </div>

          <div
            className={`upload-drop${dragOver ? ' dragover' : ''}`}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragEnter={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={(e) => { e.preventDefault(); setDragOver(false); }}
            onDrop={onDrop}
          >
            <input
              type="file"
              ref={fileInputRef}
              accept="image/png,image/jpeg,image/bmp,image/webp"
              style={{ display: 'none' }}
              onChange={(e) => { if (e.target.files.length) handleFile(e.target.files[0]); }}
            />
            {!previewSrc ? (
              <div>
                <div style={{ fontSize: 26, marginBottom: 6 }}>↑</div>
                <div style={{ fontSize: 13, color: 'var(--text)' }}>Click to upload product image</div>
                <div style={{ fontSize: 11.5, color: 'var(--text-dim)', marginTop: 4 }}>Supports PNG, JPG, BMP up to 20MB</div>
              </div>
            ) : (
              <img src={previewSrc} style={{ maxHeight: 180, borderRadius: 8, margin: '0 auto', display: 'block' }} alt="Preview" />
            )}
          </div>

          <button type="submit" className="btn-primary" style={{ marginTop: 18 }} disabled={submitting}>
            {submitting ? (
              <>
                <span className="spinner"></span> Running inspection…
              </>
            ) : (
              'Upload & Trigger AI Inspection'
            )}
          </button>
        </form>
      </div>

      <div className="card">
        {result ? (
          <InspectionResult insp={result.inspection} imgSrc={result.imgSrc} />
        ) : (
          <>
            <h3 className="font-display" style={{ margin: '0 0 4px', fontSize: 15 }}>
              Inspection Pipeline Output
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: 12.5, margin: '0 0 16px' }}>
              YOLOv8 Object Detection Engine · Quality Workspace
            </p>
            {resultLoading ? (
              <Skeleton h={220} />
            ) : (
              <EmptyState title="No inspection yet" subtitle="Fill in product details and upload an image to see AI results here." />
            )}
          </>
        )}
      </div>

      {/* Camera capture modal */}
      {showCamera && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
          }}
          onClick={closeCamera}
        >
          <div
            className="card"
            style={{ width: 420, maxWidth: '90vw', padding: 16 }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-display" style={{ margin: '0 0 12px', fontSize: 14 }}>
              Capture Product Photo
            </h3>

            {cameraError ? (
              <ErrorBanner message={cameraError} />
            ) : (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                style={{ width: '100%', borderRadius: 8, background: '#000' }}
              />
            )}
            <canvas ref={canvasRef} style={{ display: 'none' }} />

            <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
              <button type="button" className="btn-primary" onClick={capturePhoto} disabled={!!cameraError} style={{ flex: 1 }}>
                Capture
              </button>
              <button
                type="button"
                onClick={closeCamera}
                style={{ flex: 1, background: 'none', border: '1px solid var(--border, #444)', borderRadius: 8, color: 'var(--text)', cursor: 'pointer' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}