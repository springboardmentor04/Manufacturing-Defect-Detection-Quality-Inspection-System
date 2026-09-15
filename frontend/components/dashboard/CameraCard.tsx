"use client";

import { Camera, RefreshCcw, CameraOff, Upload, SwitchCamera, Loader2 } from "lucide-react";
import { useState, useRef, useEffect, useCallback } from "react";

export function CameraCard() {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string>("");
  const [isCapturing, setIsCapturing] = useState(false);
  const [hasCaptured, setHasCaptured] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const startCamera = useCallback(async () => {
    try {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facingMode }
      });
      setStream(mediaStream);
      setError("");
      setHasCaptured(false);
      setCapturedImage(null);
      setUploadSuccess(false);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'NotAllowedError') {
        setError("Camera permission denied.");
      } else {
        setError("Could not access camera.");
      }
    }
  }, [facingMode, stream]);

  useEffect(() => {
    // We don't auto-start to be polite, let user click "Start Camera"
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []); // eslint-disable-line

  const handleCapture = () => {
    setIsCapturing(true);
    setTimeout(() => {
      if (videoRef.current && canvasRef.current) {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
          setCapturedImage(dataUrl);
          setHasCaptured(true);
          // Stop stream
          if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
          }
        }
      }
      setIsCapturing(false);
    }, 300);
  };

  const handleRetake = () => {
    startCamera();
  };

  const switchCamera = () => {
    setFacingMode(prev => prev === "user" ? "environment" : "user");
    startCamera();
  };

  const uploadImage = async () => {
    if (!capturedImage) return;
    setIsUploading(true);
    try {
      // Convert base64 to blob
      const res = await fetch(capturedImage);
      const blob = await res.blob();
      const file = new File([blob], "capture.jpg", { type: "image/jpeg" });
      
      const formData = new FormData();
      formData.append("file", file);
      
      const uploadRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/v1/upload/`, {
        method: "POST",
        body: formData,
      });
      
      if (!uploadRes.ok) throw new Error("Upload failed");
      setUploadSuccess(true);
    } catch {
      alert("Failed to upload image.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 rounded-2xl p-6 shadow-sm flex flex-col h-full">
      <h3 className="font-bold text-lg mb-4 flex items-center justify-between">
        <span className="flex items-center gap-2"><Camera className="w-5 h-5 text-emerald-500"/> Camera Feed</span>
        <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded-full">
          {stream && !hasCaptured && (
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
          )}
          {hasCaptured ? 'Paused' : (stream ? 'Live' : 'Offline')}
        </span>
      </h3>
      
      <div className="flex-1 bg-slate-950 rounded-xl relative overflow-hidden flex flex-col items-center justify-center min-h-[300px] border border-slate-800 group">
        
        {error ? (
          <div className="flex flex-col items-center text-red-400 p-6 text-center">
            <CameraOff className="w-12 h-12 mb-4 opacity-80" />
            <p className="font-medium mb-4">{error}</p>
            <button onClick={startCamera} className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm text-white font-medium transition-colors">
              Retry Camera
            </button>
          </div>
        ) : (
          <>
            {!stream && !hasCaptured && (
              <div className="flex flex-col items-center justify-center p-6 text-slate-400">
                <Camera className="w-12 h-12 mb-4 opacity-50" />
                <p className="text-sm mb-4">Camera is currently inactive.</p>
                <button onClick={startCamera} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors">
                  Enable Camera
                </button>
              </div>
            )}
            
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              muted 
              className={`w-full h-full object-cover ${(!stream || hasCaptured) ? 'hidden' : 'block'}`}
            />
            <canvas ref={canvasRef} className="hidden" />
            
            {hasCaptured && capturedImage && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={capturedImage} alt="Captured" className="w-full h-full object-cover" />
            )}

            {/* HUD Overlay for Live Camera */}
            {stream && !hasCaptured && (
              <>
                <div className="absolute top-3 left-3 flex gap-2">
                  <div className="bg-black/50 backdrop-blur border border-white/10 px-2 py-1 rounded text-white text-[10px] font-mono">LIVE</div>
                </div>
                <div className="absolute top-3 right-3">
                  <button onClick={switchCamera} className="p-2 bg-black/50 backdrop-blur border border-white/10 rounded-lg text-white hover:bg-white/20 transition">
                    <SwitchCamera className="w-4 h-4" />
                  </button>
                </div>
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-32 h-32 border-2 border-white/20 rounded-lg relative transition-all duration-300 group-hover:scale-105">
                    <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-emerald-400"></div>
                    <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-emerald-400"></div>
                    <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-emerald-400"></div>
                    <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-emerald-400"></div>
                  </div>
                </div>
              </>
            )}

            <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-3 px-4">
              {stream && !hasCaptured && (
                <button onClick={handleCapture} className="bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-white px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 transition-all hover:scale-105 active:scale-95">
                  {isCapturing ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <Camera className="w-4 h-4" />
                  )}
                  Capture
                </button>
              )}
              
              {hasCaptured && (
                <>
                  <button onClick={handleRetake} className="bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-white px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 transition-all">
                    <RefreshCcw className="w-4 h-4" /> Retake
                  </button>
                  <button 
                    onClick={uploadImage} 
                    disabled={isUploading || uploadSuccess}
                    className={`px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 transition-all ${uploadSuccess ? 'bg-emerald-600 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50'}`}
                  >
                    {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : (uploadSuccess ? <CheckCircleIcon className="w-4 h-4" /> : <Upload className="w-4 h-4" />)}
                    {uploadSuccess ? 'Uploaded' : 'Upload'}
                  </button>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function CheckCircleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}
