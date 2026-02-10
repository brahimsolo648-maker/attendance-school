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
  const [scanBoxSize, setScanBoxSize] = useState(250);
  
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const lastScannedRef = useRef<string>('');
  const lastScanTimeRef = useRef<number>(0);
  const externalInputRef = useRef<HTMLInputElement>(null);
  const autoStartRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Responsive scan box size - 1/4 of screen
  useEffect(() => {
    const updateSize = () => {
      const smaller = Math.min(window.innerWidth, window.innerHeight);
      const size = Math.floor(smaller / 2);
      // Round to nearest even number for qrbox
      setScanBoxSize(size % 2 === 0 ? size : size - 1);
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

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
    const studentId = scannedData.trim();
    if (!studentId) return;

    const now = Date.now();
    if (studentId === lastScannedRef.current && now - lastScanTimeRef.current < 2000) return;
    lastScannedRef.current = studentId;
    lastScanTimeRef.current = now;

    setIsProcessing(true);
    
    try {
      const { data: student, error: studentError } = await supabase
        .from('students')
        .select('id, first_name, last_name, is_banned, ban_reason')
        .eq('id', studentId)
        .maybeSingle();

      if (studentError || !student) {
        playSound('error');
        setLastResult({ type: 'error', message: 'لم يتم العثور على التلميذ في النظام' });
        return;
      }

      if (student.is_banned) {
        playSound('error');
        setLastResult({
          type: 'warning',
          message: `⚠️ التلميذ ممنوع من الدخول: ${student.ban_reason || 'بدون سبب محدد'}`,
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
        setLastResult({ type: 'success', message: '✓ تم تسجيل الدخول بنجاح', studentName: `${student.first_name} ${student.last_name}` });
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
        setLastResult({ type: 'success', message: '✓ تم تسجيل الخروج بنجاح', studentName: `${student.first_name} ${student.last_name}` });
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
      const scanner = new Html5Qrcode('qr-reader');
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode },
        {
          fps: 15,
          qrbox: { width: scanBoxSize, height: scanBoxSize },
          aspectRatio: 1.0,
          disableFlip: false
        },
        (decodedText) => processQRCode(decodedText),
        () => {}
      );
      setIsScanning(true);
    } catch (error) {
      console.error('Error starting scanner:', error);
      toast.error('فشل في تشغيل الكاميرا. تأكد من السماح بالوصول للكاميرا');
    }
  }, [facingMode, processQRCode, scanBoxSize]);

  const stopScanning = useCallback(async () => {
    if (scannerRef.current && isScanning) {
      try { await scannerRef.current.stop(); } catch (e) { console.error(e); }
      scannerRef.current = null;
    }
    setIsScanning(false);
  }, [isScanning]);

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

  // External scanner (USB barcode reader) support
  useEffect(() => {
    let buffer = '';
    let timeout: NodeJS.Timeout;
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

  const resultConfig = lastResult ? {
    success: { icon: <CheckCircle className="w-10 h-10 sm:w-12 sm:h-12 text-success" />, bg: 'border-success/50 bg-success/10' },
    error: { icon: <XCircle className="w-10 h-10 sm:w-12 sm:h-12 text-destructive" />, bg: 'border-destructive/50 bg-destructive/10' },
    warning: { icon: <AlertTriangle className="w-10 h-10 sm:w-12 sm:h-12 text-warning" />, bg: 'border-warning/50 bg-warning/10' },
  }[lastResult.type] : null;

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background">
      {/* Compact Header */}
      <header className="glass-nav shrink-0">
        <div className="flex items-center justify-between h-12 px-3 sm:px-4">
          <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => navigate('/admin/main')}>
            <ArrowRight className="w-4 h-4 ml-1" />
            <span className="text-sm">العودة</span>
          </Button>
          <h1 className="text-sm sm:text-base font-bold text-foreground">
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

      {/* Camera - fills available space */}
      <div className="flex-1 relative bg-black overflow-hidden flex items-center justify-center" ref={containerRef}>
        <div 
          id="qr-reader" 
          className="relative aspect-square mx-auto [&>video]:!object-cover [&>video]:!w-full [&>video]:!h-full"
          style={{ width: scanBoxSize * 2, maxWidth: '100%', maxHeight: '100%' }}
        />
        
        {!isScanning && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted/90">
            <div className="text-center space-y-3">
              <Camera className="w-12 h-12 mx-auto text-muted-foreground animate-pulse" />
              <p className="text-muted-foreground text-sm">جاري تشغيل الكاميرا...</p>
            </div>
          </div>
        )}

        {/* Minimal scan overlay - no red border */}
        {isScanning && (
          <div className="absolute inset-0 pointer-events-none">
            {/* Dim surrounding area */}
            <div className="absolute inset-0 bg-black/30" />
            
            {/* Clear scan window */}
            <div 
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
              style={{ width: scanBoxSize, height: scanBoxSize }}
            >
              <div 
                className="absolute inset-0"
                style={{ boxShadow: '0 0 0 9999px rgba(0,0,0,0.3)' }}
              />
              
              {/* Subtle white corner markers */}
              <div className="absolute -top-0.5 -left-0.5 w-6 h-6 border-t-2 border-l-2 border-white/80 rounded-tl-md" />
              <div className="absolute -top-0.5 -right-0.5 w-6 h-6 border-t-2 border-r-2 border-white/80 rounded-tr-md" />
              <div className="absolute -bottom-0.5 -left-0.5 w-6 h-6 border-b-2 border-l-2 border-white/80 rounded-bl-md" />
              <div className="absolute -bottom-0.5 -right-0.5 w-6 h-6 border-b-2 border-r-2 border-white/80 rounded-br-md" />

              {/* Subtle scan line */}
              <div className="absolute inset-x-3 top-1/2 h-px bg-white/40 animate-pulse" />
            </div>
          </div>
        )}

        {isProcessing && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <div className="w-10 h-10 border-3 border-white border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Camera toggle floating button */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2">
          <Button
            variant={isScanning ? 'destructive' : 'default'}
            size="sm"
            className="h-9 rounded-full shadow-lg px-4"
            onClick={isScanning ? stopScanning : startScanning}
          >
            {isScanning ? (
              <><CameraOff className="w-4 h-4 ml-1" /><span className="text-xs">إيقاف</span></>
            ) : (
              <><Camera className="w-4 h-4 ml-1" /><span className="text-xs">تشغيل</span></>
            )}
          </Button>
        </div>
      </div>

      {/* Result + Controls - bottom panel */}
      <div className="shrink-0 p-3 space-y-2 bg-background">
        {/* Scan Result */}
        {lastResult && resultConfig ? (
          <div className={`glass-card !p-3 border-2 animate-slide-up ${resultConfig.bg}`}>
            <div className="flex items-center gap-3">
              {resultConfig.icon}
              <div className="flex-1 min-w-0">
                {lastResult.studentName && (
                  <p className="font-bold text-foreground text-base truncate">{lastResult.studentName}</p>
                )}
                <p className="text-sm text-muted-foreground">{lastResult.message}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="glass-card !p-3 text-center">
            <p className="text-sm text-muted-foreground">
              {isEntry ? '📥 وجّه الكاميرا نحو رمز QR للتلميذ' : '📤 وجّه الكاميرا نحو رمز QR للتلميذ'}
            </p>
          </div>
        )}

        {/* Manual input */}
        {showExternalInput && (
          <div className="flex gap-2 animate-slide-up">
            <input
              ref={externalInputRef}
              type="text"
              value={externalInput}
              onChange={(e) => setExternalInput(e.target.value)}
              onKeyDown={handleExternalInput}
              placeholder="أدخل رقم الطالب"
              className="flex-1 input-styled text-center text-sm h-9"
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
    </div>
  );
};

export default QRScanner;
