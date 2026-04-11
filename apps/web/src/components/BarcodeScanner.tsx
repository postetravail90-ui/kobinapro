import { useEffect, useRef, useState, useCallback } from 'react';
import type { Html5Qrcode } from 'html5-qrcode';
import { X, Flashlight, FlashlightOff, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Capacitor } from '@capacitor/core';

interface BarcodeScannerProps {
  onScan: (code: string) => void;
  onClose: () => void;
  continuous?: boolean;
}

export default function BarcodeScanner({ onScan, onClose, continuous = true }: BarcodeScannerProps) {
  const [flashOn, setFlashOn] = useState(false);
  const [lastScanned, setLastScanned] = useState('');
  const [scanCount, setScanCount] = useState(0);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const trackRef = useRef<MediaStreamTrack | null>(null);
  const cooldownRef = useRef(false);

  const requestCameraPermission = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
      });
      stream.getTracks().forEach((t) => t.stop());
      return true;
    } catch {
      return false;
    }
  }, []);

  const initScanner = useCallback(async () => {
    try {
      const cameraGranted = await requestCameraPermission();
      if (!cameraGranted) {
        toast.error("Accès caméra refusé", {
          description: 'Activez la permission caméra dans les paramètres',
        });
        return;
      }

      const { Html5Qrcode } = await import('html5-qrcode');

      // Cleanup previous
      if (scannerRef.current) {
        try { await scannerRef.current.stop(); } catch { /* stop peut échouer si déjà arrêté */ }
        try { scannerRef.current.clear(); } catch { /* idem */ }
      }

      const scanner = new Html5Qrcode('barcode-reader', { verbose: false });
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: Capacitor.isNativePlatform() ? 45 : 30,
          qrbox: { width: 280, height: 120 },
          aspectRatio: 1.5,
          disableFlip: false,
        },
        (decodedText: string) => {
          if (cooldownRef.current) return;
          cooldownRef.current = true;

          // Vibrate on scan
          if ('vibrate' in navigator) navigator.vibrate(100);

          setLastScanned(decodedText);
          setScanCount(prev => prev + 1);
          onScan(decodedText);

          if (!continuous) {
            scanner.stop().catch(() => {});
            onClose();
          } else {
            // Short cooldown for ultra-fast continuous scanning
            setTimeout(() => { cooldownRef.current = false; }, 250);
          }
        },
        () => {} // ignore errors per-frame
      );

      // Get track for flash
      const videoElement = document.querySelector('#barcode-reader video') as HTMLVideoElement;
      if (videoElement?.srcObject) {
        const stream = videoElement.srcObject as MediaStream;
        const vTrack = stream.getVideoTracks()[0];
        if (vTrack) trackRef.current = vTrack;
      }
    } catch (err) {
      console.error('Scanner init error:', err);
      toast.error("Impossible d'accéder à la caméra", {
        description: 'Vérifiez les permissions caméra',
      });
    }
  }, [continuous, onClose, onScan, requestCameraPermission]);

  useEffect(() => {
    initScanner();

    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => { /* cleanup */ });
        try { scannerRef.current.clear(); } catch { /* cleanup */ }
      }
    };
  }, [initScanner]);

  const toggleFlash = async () => {
    const track = trackRef.current;
    if (!track) {
      toast.error('Flash non disponible');
      return;
    }
    try {
      type CapWithTorch = MediaTrackCapabilities & { torch?: boolean };
      const capabilities = track.getCapabilities() as CapWithTorch;
      if (capabilities.torch) {
        const newState = !flashOn;
        await track.applyConstraints({
          advanced: [{ torch: newState }],
        } as unknown as MediaTrackConstraints);
        setFlashOn(newState);
      } else {
        toast.error('Flash non supporté');
      }
    } catch {
      toast.error('Erreur flash');
    }
  };

  const handleClose = () => {
    if (scannerRef.current) {
      scannerRef.current.stop().catch(() => {});
    }
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black flex flex-col"
    >
      {/* Top bar */}
      <div className="flex items-center justify-between p-4 z-10">
        <Button variant="ghost" size="icon" className="text-white hover:bg-white/20" onClick={handleClose}>
          <X size={24} />
        </Button>
        <div className="text-center">
          <p className="text-white text-sm font-semibold">Scanner</p>
          {continuous && scanCount > 0 && (
            <p className="text-white/60 text-xs">{scanCount} scanné{scanCount > 1 ? 's' : ''}</p>
          )}
        </div>
        <Button variant="ghost" size="icon" className="text-white hover:bg-white/20" onClick={toggleFlash}>
          {flashOn ? <FlashlightOff size={22} /> : <Flashlight size={22} />}
        </Button>
      </div>

      {/* Scanner viewport */}
      <div className="flex-1 relative flex items-center justify-center">
        <div id="barcode-reader" className="w-full h-full [&_video]:w-full [&_video]:h-full [&_video]:object-cover [&>div]:!border-none" />

        {/* Overlay guide */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div className="w-72 h-28 border-2 border-white/80 rounded-2xl relative">
            <div className="absolute -top-0.5 -left-0.5 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-xl" />
            <div className="absolute -top-0.5 -right-0.5 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-xl" />
            <div className="absolute -bottom-0.5 -left-0.5 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-xl" />
            <div className="absolute -bottom-0.5 -right-0.5 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-xl" />

            {/* Scanning line animation */}
            <motion.div
              className="absolute left-2 right-2 h-0.5 bg-primary/80"
              animate={{ top: ['10%', '90%', '10%'] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            />
          </div>
        </div>
      </div>

      {/* Bottom info */}
      <div className="p-4 text-center space-y-2">
        <p className="text-white/70 text-xs">
          Placez le code-barre dans le cadre • EAN-13 / EAN-8 / UPC / QR / CODE-128 / CODE-39
        </p>
        {lastScanned && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-primary/20 backdrop-blur rounded-xl px-4 py-2 text-primary text-sm font-medium"
          >
            ✔ Dernier scan : {lastScanned}
          </motion.div>
        )}
        {continuous && (
          <p className="text-white/40 text-[10px]">Mode continu activé — scannez plusieurs produits</p>
        )}
      </div>
    </motion.div>
  );
}
