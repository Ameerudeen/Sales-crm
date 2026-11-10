import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Camera, X, CameraOff, SwitchCamera, Loader2, Zap, ZapOff } from 'lucide-react';
import { motion } from 'motion/react';

interface BusinessCardScannerProps {
  onScan: (base64Image: string) => void;
  onClose: () => void;
}

const BusinessCardScanner: React.FC<BusinessCardScannerProps> = ({ onScan, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [isCapturing, setIsCapturing] = useState(false);
  const [torchOn, setTorchOn] = useState(false);

  const startCamera = async () => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 30 }
        }
      });
      
      // Try to apply advanced constraints for focus if supported
      const track = newStream.getVideoTracks()[0];
      if (track && track.getCapabilities) {
        const capabilities = track.getCapabilities() as any;
        if (capabilities.focusMode && capabilities.focusMode.includes('continuous')) {
          try {
            await track.applyConstraints({
              advanced: [{ focusMode: 'continuous' }]
            } as any);
          } catch (e) {
            console.warn('Continuous focus not supported', e);
          }
        }
      }
      streamRef.current = newStream;
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
      }
      setError(null);
      setTorchOn(false); // Reset torch when camera starts
    } catch (err) {
      console.error('Error accessing camera:', err);
      setError('Could not access camera. Please ensure you have granted permission.');
    }
  };

  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (track && track.getCapabilities) {
      const capabilities = track.getCapabilities() as any;
      if (capabilities.torch) {
        try {
          await track.applyConstraints({
            advanced: [{ torch: !torchOn }]
          } as any);
          setTorchOn(!torchOn);
        } catch (e) {
          console.error('Error toggling torch:', e);
        }
      } else {
        alert('Flash is not supported on this device/camera.');
      }
    }
  };

  useEffect(() => {
    startCamera();
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    };
  }, [facingMode]);

  const captureImage = useCallback(() => {
    if (videoRef.current && canvasRef.current && !isCapturing) {
      setIsCapturing(true);
      
      // Flash effect
      const flash = document.createElement('div');
      flash.className = 'absolute inset-0 bg-white z-[200] animate-pulse';
      videoRef.current.parentElement?.appendChild(flash);
      setTimeout(() => flash.remove(), 150);

      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      // Cap the resolution for the API (max 1600px in any dimension)
      const MAX_DIMENSION = 1600;
      let width = video.videoWidth;
      let height = video.videoHeight;

      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        if (width > height) {
          height = (height / width) * MAX_DIMENSION;
          width = MAX_DIMENSION;
        } else {
          width = (width / height) * MAX_DIMENSION;
          height = MAX_DIMENSION;
        }
      }

      canvas.width = width;
      canvas.height = height;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, width, height);
        // Use a slightly lower quality to reduce payload size while maintaining legibility
        const base64 = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
        
        // Small delay to ensure the flash animation is visible
        setTimeout(() => {
          onScan(base64);
        }, 300);
      }
    }
  }, [onScan, isCapturing]);

  const toggleCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-slate-900 rounded-[40px] w-full max-w-lg overflow-hidden border border-slate-800 shadow-[0_0_100px_rgba(59,130,246,0.1)] flex flex-col"
      >
        <div className="p-6 flex justify-between items-center border-b border-slate-800/50 bg-slate-900/50 backdrop-blur-md">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-500/10 rounded-2xl border border-blue-500/20">
              <Camera className="w-6 h-6 text-blue-500" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white tracking-tight">Lead Scanner</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">
                Capture business card manually
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-slate-800 rounded-2xl transition-all text-slate-400 hover:text-white active:scale-90">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="relative aspect-[4/3] bg-black flex items-center justify-center overflow-hidden">
          {error ? (
            <div className="p-12 text-center">
              <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6">
                <CameraOff className="w-10 h-10 text-slate-600" />
              </div>
              <p className="text-slate-400 text-sm font-bold max-w-[200px] mx-auto leading-relaxed">{error}</p>
              <button 
                onClick={startCamera}
                className="mt-8 px-8 py-3 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all active:scale-95 shadow-lg shadow-blue-600/20"
              >
                Retry Access
              </button>
            </div>
          ) : (
            <>
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                className="w-full h-full object-cover"
              />
              
              {/* Scanning Overlay */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-[85%] h-[70%] border-2 border-dashed border-white/30 rounded-3xl relative overflow-hidden">
                  {/* Corner Accents */}
                  <div className="absolute top-0 left-0 w-12 h-12 border-t-4 border-l-4 border-blue-500 -mt-1 -ml-1 rounded-tl-2xl" />
                  <div className="absolute top-0 right-0 w-12 h-12 border-t-4 border-r-4 border-blue-500 -mt-1 -mr-1 rounded-tr-2xl" />
                  <div className="absolute bottom-0 left-0 w-12 h-12 border-b-4 border-l-4 border-blue-500 -mb-1 -ml-1 rounded-bl-2xl" />
                  <div className="absolute bottom-0 right-0 w-12 h-12 border-b-4 border-r-4 border-blue-500 -mb-1 -mr-1 rounded-br-2xl" />
                </div>
              </div>

              {isCapturing && (
                <div className="absolute inset-0 bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <div className="p-4 bg-slate-900/80 rounded-3xl flex items-center gap-3 border border-white/10">
                    <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                    <span className="text-xs font-black text-white uppercase tracking-widest">Processing...</span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="p-10 flex items-center justify-center gap-12 bg-slate-900">
          <button
            type="button"
            onClick={toggleTorch}
            className={`p-5 rounded-2xl transition-all active:scale-90 border ${torchOn ? 'bg-amber-500 text-white border-amber-400 shadow-lg shadow-amber-500/20' : 'bg-slate-800 text-white border-slate-700 hover:bg-slate-700'}`}
            title="Toggle Flash"
          >
            {torchOn ? <Zap className="w-7 h-7" /> : <ZapOff className="w-7 h-7" />}
          </button>

          <button
            type="button"
            onClick={toggleCamera}
            className="p-5 bg-slate-800 text-white rounded-2xl hover:bg-slate-700 transition-all active:scale-90 border border-slate-700"
            title="Switch Camera"
          >
            <SwitchCamera className="w-7 h-7" />
          </button>
          
          <button
            type="button"
            onClick={captureImage}
            disabled={!!error || !streamRef.current || isCapturing}
            className="group relative w-28 h-28 flex items-center justify-center active:scale-90 transition-all disabled:opacity-50 disabled:scale-100"
          >
            <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-2xl group-hover:bg-blue-500/30 transition-all" />
            <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-[0_0_50px_rgba(255,255,255,0.3)] relative z-10">
              <div className="w-20 h-20 border-4 border-slate-900 rounded-full flex items-center justify-center">
                <div className="w-16 h-16 bg-blue-600 rounded-full group-hover:scale-110 transition-transform" />
              </div>
            </div>
          </button>

          <div className="w-16" /> {/* Balance spacer */}
        </div>

        <canvas ref={canvasRef} className="hidden" />
      </motion.div>
    </div>
  );
};

export default BusinessCardScanner;
