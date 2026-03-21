import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, Camera, CameraOff, CheckCircle, XCircle, AlertTriangle, RotateCcw, Keyboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Html5Qrcode } from 'html5-qrcode';

type ScanResult = {
  type: 'success' | 'error' | 'warning';
  message: string;
  studentName?: string;
};

const QRScanner = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const scanType = searchParams.get('type') || 'entry';
  
  const [isScanning, setIsScanning] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastResult, setLastResult] = useState<ScanResult | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [externalInput, setExternalInput] = useState('');
  const [showExternalInput, setShowExternalInput] = useState(false);
  
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const lastScannedRef = useRef<string>('');
  const lastScanTimeRef = useRef<number>(0);
  const externalInputRef = useRef<HTMLInputElement>(null);
  const autoStartRef = useRef(false);

  const playSound = useCallback((type: 'success' | 'error') => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      if (type === 'success') {
        if (scanType === 'entry') {
          oscillator.frequency.setValueAtTime(600, audioContext.currentTime);
          oscillator.frequency.setValueAtTime(800, audioContext.currentTime + 0.1);
          oscillator.frequency.setValueAtTime(1000, audioContext.currentTime + 0.2);
        } else {
          oscillator.frequency.setValueAtTime(1000, audioContext.currentTime);
          oscillator.frequency.setValueAtTime(800, audioContext.currentTime + 0.1);
          oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.2);
        }
      } else {
        oscillator.frequency.setValueAtTime(300, audioContext.currentTime);
        oscillator.frequency.setValueAtTime(200, audioContext.currentTime + 0.15);
      }
      
      gainNode.gain.setValueAtTime(0.4, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.4);
    } catch (e) {
      console.log('Audio not supported');
    }
  }, [scanType]);

  const processQRCode = useCallback(async (scannedData: string) => {
    const scannedCode = scannedData.trim();
    if (!scannedCode) return;

    const now = Date.now();
    if (scannedCode === lastScannedRef.current && now - lastScanTimeRef.current < 2000) return;
    lastScannedRef.current = scannedCode;
    lastScanTimeRef.current = now;

    setIsProcessing(true);
    
    try {
      // Look up student by student_code
      const { data: student, error: studentError } = await supabase
        .from('students')
        .select('id, first_name, last_name, is_banned, ban_reason')
        .eq('student_code', scannedCode)
        .maybeSingle();

      if (studentError || !student) {
        playSound('error');
        setLastResult({ type: 'error', message: 'رمز غير صالح أو تلميذ غير موجود في النظام' });
        return;
      }

      if (student.is_banned) {
        playSound('error');
        setLastResult({
          type: 'warning',
          message: `التلميذ ممنوع من الدخول: ${student.ban_reason || 'بدون سبب محدد'}`,
          studentName: `${student.first_name} ${student.last_name}`
        });
        return;
      }

      const today = new Date().toISOString().split('T')[0];

      if (scanType === 'entry') {
        const { data: existingRecord } = await supabase
          .from('attendance_records')
          .select('id, check_in_time')
          .eq('student_id', studentId)
          .eq('date', today)
          .maybeSingle();

        if (existingRecord?.check_in_time) {
          const checkInTime = new Date(existingRecord.check_in_time).toLocaleTimeString('ar-DZ', { hour: '2-digit', minute: '2-digit' });
          playSound('error');
          setLastResult({
            type: 'warning',
            message: `التلميذ مسجل الدخول مسبقاً الساعة ${checkInTime}`,
            studentName: `${student.first_name} ${student.last_name}`
          });
          return;
        }

        if (existingRecord) {
          await supabase.from('attendance_records').update({ check_in_time: new Date().toISOString() }).eq('id', existingRecord.id);
        } else {
          await supabase.from('attendance_records').insert({ student_id: studentId, date: today, check_in_time: new Date().toISOString() });
        }

        playSound('success');
        setLastResult({ type: 'success', message: 'تم تسجيل الدخول بنجاح', studentName: `${student.first_name} ${student.last_name}` });
      } else {
        const { data: existingRecord } = await supabase
          .from('attendance_records')
          .select('id, check_in_time, check_out_time')
          .eq('student_id', studentId)
          .eq('date', today)
          .maybeSingle();

        if (!existingRecord?.check_in_time) {
          playSound('error');
          setLastResult({ type: 'error', message: 'لم يتم تسجيل دخول التلميذ اليوم', studentName: `${student.first_name} ${student.last_name}` });
          return;
        }

        if (existingRecord?.check_out_time) {
          const checkOutTime = new Date(existingRecord.check_out_time).toLocaleTimeString('ar-DZ', { hour: '2-digit', minute: '2-digit' });
          playSound('error');
          setLastResult({
            type: 'warning',
            message: `التلميذ مسجل الخروج مسبقاً الساعة ${checkOutTime}`,
            studentName: `${student.first_name} ${student.last_name}`
          });
          return;
        }

        await supabase.from('attendance_records').update({ check_out_time: new Date().toISOString() }).eq('id', existingRecord.id);
        playSound('success');
        setLastResult({ type: 'success', message: 'تم تسجيل الخروج بنجاح', studentName: `${student.first_name} ${student.last_name}` });
      }
    } catch (error) {
      console.error('Error processing QR:', error);
      playSound('error');
      setLastResult({ type: 'error', message: 'حدث خطأ أثناء المعالجة' });
    } finally {
      setIsProcessing(false);
    }
  }, [scanType, playSound]);

  const startScanning = useCallback(async () => {
    try {
      if (scannerRef.current) {
        try { await scannerRef.current.stop(); } catch (e) {}
        scannerRef.current = null;
      }

      const readerEl = document.getElementById('qr-reader');
      if (!readerEl) return;
      readerEl.innerHTML = '';

      const scanner = new Html5Qrcode('qr-reader');
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode },
        {
          fps: 15,
          qrbox: { width: 200, height: 200 },
          disableFlip: false,
          aspectRatio: 1
        },
        (decodedText) => processQRCode(decodedText),
        () => {}
      );

      // Force hide the shaded region and fix video after scanner starts
      setTimeout(() => {
        const el = document.getElementById('qr-reader');
        if (!el) return;
        // Hide all shaded regions
        el.querySelectorAll('[id*="shaded"]').forEach(n => (n as HTMLElement).style.display = 'none');
        // Fix video element
        const video = el.querySelector('video');
        if (video) {
          video.style.objectFit = 'cover';
          video.style.width = '100%';
          video.style.height = '100%';
          video.style.position = 'absolute';
          video.style.top = '0';
          video.style.left = '0';
        }
      }, 300);

      setIsScanning(true);
    } catch (error) {
      console.error('Error starting scanner:', error);
      toast.error('فشل في تشغيل الكاميرا. تأكد من السماح بالوصول للكاميرا');
    }
  }, [facingMode, processQRCode]);

  const stopScanning = useCallback(async () => {
    if (scannerRef.current) {
      try { await scannerRef.current.stop(); } catch (e) { console.error(e); }
      scannerRef.current = null;
    }
    setIsScanning(false);
  }, []);

  const switchCamera = useCallback(async () => {
    await stopScanning();
    setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
  }, [stopScanning]);

  useEffect(() => {
    if (!autoStartRef.current) {
      autoStartRef.current = true;
      setTimeout(() => startScanning(), 500);
    }
    return () => {
      if (scannerRef.current) {
        try { scannerRef.current.stop().catch(() => {}); } catch (e) {}
        scannerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (autoStartRef.current && !isScanning) startScanning();
  }, [facingMode]);

  const handleExternalInput = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && externalInput.trim()) {
      processQRCode(externalInput.trim());
      setExternalInput('');
    }
  }, [externalInput, processQRCode]);

  useEffect(() => {
    let buffer = '';
    let timeout: ReturnType<typeof setTimeout>;
    const handleKeyPress = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT') return;
      if (e.key === 'Enter' && buffer.length > 0) {
        processQRCode(buffer);
        buffer = '';
      } else if (e.key.length === 1) {
        buffer += e.key;
        clearTimeout(timeout);
        timeout = setTimeout(() => { buffer = ''; }, 100);
      }
    };
    window.addEventListener('keypress', handleKeyPress);
    return () => { window.removeEventListener('keypress', handleKeyPress); clearTimeout(timeout); };
  }, [processQRCode]);

  const isEntry = scanType === 'entry';

  return (
    <div className="h-[100dvh] flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <header className="shrink-0 border-b border-border bg-background/95 backdrop-blur-sm z-10">
        <div className="flex items-center justify-between h-12 px-3">
          <Button variant="ghost" size="sm" className="h-8 px-2 gap-1" onClick={() => navigate('/admin/main')}>
            <ArrowRight className="w-4 h-4" />
            <span className="text-sm">العودة</span>
          </Button>
          <h1 className="text-sm font-bold text-foreground">
            {isEntry ? '📥 تسجيل الدخول' : '📤 تسجيل الخروج'}
          </h1>
          <div className="flex gap-1">
            {isScanning && (
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={switchCamera}>
                <RotateCcw className="w-4 h-4" />
              </Button>
            )}
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => {
              setShowExternalInput(!showExternalInput);
              setTimeout(() => externalInputRef.current?.focus(), 100);
            }}>
              <Keyboard className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Camera area - 30% of viewport, centered square */}
      <div className="shrink-0 relative bg-black flex items-center justify-center" style={{ height: '40dvh' }}>
        {/* Square camera container */}
        <div className="relative h-full aspect-square overflow-hidden">
          <div
            id="qr-reader"
            className="absolute inset-0 overflow-hidden"
          />
          {/* Corner frame overlay */}
          <div className="absolute inset-0 pointer-events-none z-[5]">
            {/* Top-left */}
            <div className="absolute top-3 left-3 w-8 h-8 border-t-[3px] border-l-[3px] border-primary rounded-tl-md" />
            {/* Top-right */}
            <div className="absolute top-3 right-3 w-8 h-8 border-t-[3px] border-r-[3px] border-primary rounded-tr-md" />
            {/* Bottom-left */}
            <div className="absolute bottom-3 left-3 w-8 h-8 border-b-[3px] border-l-[3px] border-primary rounded-bl-md" />
            {/* Bottom-right */}
            <div className="absolute bottom-3 right-3 w-8 h-8 border-b-[3px] border-r-[3px] border-primary rounded-br-md" />
          </div>
        </div>
        
        {!isScanning && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted/90">
            <div className="text-center space-y-2">
              <Camera className="w-10 h-10 mx-auto text-muted-foreground animate-pulse" />
              <p className="text-muted-foreground text-xs">جاري تشغيل الكاميرا...</p>
            </div>
          </div>
        )}

        {isProcessing && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-10">
            <div className="w-8 h-8 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Camera toggle */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-10">
          <Button
            variant={isScanning ? 'destructive' : 'default'}
            size="sm"
            className="h-8 rounded-full shadow-lg px-3 text-xs gap-1"
            onClick={isScanning ? stopScanning : startScanning}
          >
            {isScanning ? (
              <><CameraOff className="w-3.5 h-3.5" /><span>إيقاف</span></>
            ) : (
              <><Camera className="w-3.5 h-3.5" /><span>تشغيل</span></>
            )}
          </Button>
        </div>
      </div>

      {/* Bottom panel */}
      <div className="flex-1 overflow-auto p-3 space-y-3">
        {lastResult ? (
          <div className={`rounded-xl p-4 border-2 transition-all ${
            lastResult.type === 'success' 
              ? 'border-success/40 bg-success/10' 
              : lastResult.type === 'warning'
              ? 'border-warning/40 bg-warning/10'
              : 'border-destructive/40 bg-destructive/10'
          }`}>
            <div className="flex items-center gap-3">
              {lastResult.type === 'success' ? (
                <CheckCircle className="w-8 h-8 shrink-0 text-success" />
              ) : lastResult.type === 'warning' ? (
                <AlertTriangle className="w-8 h-8 shrink-0 text-warning" />
              ) : (
                <XCircle className="w-8 h-8 shrink-0 text-destructive" />
              )}
              <div className="flex-1 min-w-0">
                {lastResult.studentName && (
                  <p className="font-bold text-foreground text-sm truncate">{lastResult.studentName}</p>
                )}
                <p className="text-xs text-muted-foreground mt-0.5">{lastResult.message}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-border p-4 text-center">
            <p className="text-sm text-muted-foreground">
              {isEntry ? '📥 وجّه الكاميرا نحو رمز QR للتلميذ' : '📤 وجّه الكاميرا نحو رمز QR للتلميذ'}
            </p>
          </div>
        )}

        {showExternalInput && (
          <div className="flex gap-2">
            <input
              ref={externalInputRef}
              type="text"
              value={externalInput}
              onChange={(e) => setExternalInput(e.target.value)}
              onKeyDown={handleExternalInput}
              placeholder="أدخل رقم الطالب"
              className="flex-1 rounded-lg border border-border bg-background px-3 text-center text-sm h-9 focus:outline-none focus:ring-2 focus:ring-ring"
              autoFocus
            />
            <Button
              variant="default"
              size="sm"
              className="h-9"
              onClick={() => {
                if (externalInput.trim()) {
                  processQRCode(externalInput.trim());
                  setExternalInput('');
                }
              }}
            >
              تأكيد
            </Button>
          </div>
        )}
      </div>

      {/* Global styles to fix html5-qrcode internals */}
      <style>{`
        #qr-reader {
          position: relative !important;
          width: 100% !important;
          height: 100% !important;
          border: none !important;
        }
        #qr-reader video {
          object-fit: cover !important;
          width: 100% !important;
          height: 100% !important;
          position: absolute !important;
          top: 0 !important;
          left: 0 !important;
          max-width: none !important;
          max-height: none !important;
        }
        #qr-reader img {
          display: none !important;
        }
        #qr-reader br,
        #qr-reader span {
          display: none !important;
        }
        #qr-reader > div:not(:first-child) {
          display: none !important;
        }
        [id*="qr-shaded-region"] {
          display: none !important;
        }
      `}</style>
    </div>
  );
};

export default QRScanner;
