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

  // Sound effects with different tones for entry/exit
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
    if (studentId === lastScannedRef.current && now - lastScanTimeRef.current < 2000) {
      return;
    }
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
        setLastResult({
          type: 'error',
          message: 'لم يتم العثور على التلميذ في النظام'
        });
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
          const checkInTime = new Date(existingRecord.check_in_time).toLocaleTimeString('ar-DZ', {
            hour: '2-digit',
            minute: '2-digit'
          });
          playSound('error');
          setLastResult({
            type: 'warning',
            message: `التلميذ مسجل الدخول مسبقاً الساعة ${checkInTime}`,
            studentName: `${student.first_name} ${student.last_name}`
          });
          return;
        }

        if (existingRecord) {
          await supabase
            .from('attendance_records')
            .update({ check_in_time: new Date().toISOString() })
            .eq('id', existingRecord.id);
        } else {
          await supabase
            .from('attendance_records')
            .insert({
              student_id: studentId,
              date: today,
              check_in_time: new Date().toISOString()
            });
        }

        playSound('success');
        setLastResult({
          type: 'success',
          message: '✓ تم تسجيل الدخول بنجاح',
          studentName: `${student.first_name} ${student.last_name}`
        });

      } else {
        const { data: existingRecord } = await supabase
          .from('attendance_records')
          .select('id, check_in_time, check_out_time')
          .eq('student_id', studentId)
          .eq('date', today)
          .maybeSingle();

        if (!existingRecord?.check_in_time) {
          playSound('error');
          setLastResult({
            type: 'error',
            message: 'لم يتم تسجيل دخول التلميذ اليوم',
            studentName: `${student.first_name} ${student.last_name}`
          });
          return;
        }

        if (existingRecord?.check_out_time) {
          const checkOutTime = new Date(existingRecord.check_out_time).toLocaleTimeString('ar-DZ', {
            hour: '2-digit',
            minute: '2-digit'
          });
          playSound('error');
          setLastResult({
            type: 'warning',
            message: `التلميذ مسجل الخروج مسبقاً الساعة ${checkOutTime}`,
            studentName: `${student.first_name} ${student.last_name}`
          });
          return;
        }

        await supabase
          .from('attendance_records')
          .update({ check_out_time: new Date().toISOString() })
          .eq('id', existingRecord.id);

        playSound('success');
        setLastResult({
          type: 'success',
          message: '✓ تم تسجيل الخروج بنجاح',
          studentName: `${student.first_name} ${student.last_name}`
        });
      }

    } catch (error) {
      console.error('Error processing QR:', error);
      playSound('error');
      setLastResult({
        type: 'error',
        message: 'حدث خطأ أثناء المعالجة'
      });
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
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.333,
          disableFlip: false
        },
        (decodedText) => {
          processQRCode(decodedText);
        },
        () => {}
      );

      setIsScanning(true);
    } catch (error) {
      console.error('Error starting scanner:', error);
      toast.error('فشل في تشغيل الكاميرا. تأكد من السماح بالوصول للكاميرا');
    }
  }, [facingMode, processQRCode]);

  const stopScanning = useCallback(async () => {
    if (scannerRef.current && isScanning) {
      try {
        await scannerRef.current.stop();
      } catch (error) {
        console.error('Error stopping scanner:', error);
      }
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
      setTimeout(() => {
        startScanning();
      }, 500);
    }

    return () => {
      if (scannerRef.current) {
        try {
          scannerRef.current.stop().catch(() => {});
        } catch (e) {}
        scannerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (autoStartRef.current && !isScanning) {
      startScanning();
    }
  }, [facingMode]);

  const handleExternalInput = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && externalInput.trim()) {
      processQRCode(externalInput.trim());
      setExternalInput('');
    }
  }, [externalInput, processQRCode]);

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
        timeout = setTimeout(() => {
          buffer = '';
        }, 100);
      }
    };

    window.addEventListener('keypress', handleKeyPress);
    return () => {
      window.removeEventListener('keypress', handleKeyPress);
      clearTimeout(timeout);
    };
  }, [processQRCode]);

  const getResultIcon = () => {
    if (!lastResult) return null;
    switch (lastResult.type) {
      case 'success':
        return <CheckCircle className="w-16 h-16 text-success" />;
      case 'error':
        return <XCircle className="w-16 h-16 text-destructive" />;
      case 'warning':
        return <AlertTriangle className="w-16 h-16 text-amber-500" />;
    }
  };

  const getResultBgColor = () => {
    if (!lastResult) return 'bg-muted';
    switch (lastResult.type) {
      case 'success':
        return 'bg-success/10 border-success';
      case 'error':
        return 'bg-destructive/10 border-destructive';
      case 'warning':
        return 'bg-amber-500/10 border-amber-500';
    }
  };

  return (
    <div className="page-container min-h-screen flex flex-col">
      {/* Header - 10% */}
      <header className="glass-nav shrink-0">
        <div className="content-container flex items-center justify-between h-14">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/admin/main')}
          >
            <ArrowRight className="w-4 h-4 ml-2" />
            العودة
          </Button>
          <h1 className="text-base font-bold text-foreground">
            {scanType === 'entry' ? '📥 تسجيل الدخول' : '📤 تسجيل الخروج'}
          </h1>
          <div className="w-16" />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 content-container py-3 flex flex-col min-h-0">
        
        {/* Instruction - 5% */}
        <div className={`glass-card text-center py-2 mb-3 shrink-0 ${scanType === 'entry' ? 'border-success/30 bg-success/10' : 'border-primary/30 bg-primary/10'}`}>
          <p className="font-medium text-sm">ضع الكود داخل المربع الأحمر</p>
        </div>

        {/* Camera View - 60% of remaining space */}
        <div 
          className="relative bg-black rounded-2xl overflow-hidden glass border border-border/50 mx-auto w-full"
          style={{ 
            maxWidth: '600px',
            aspectRatio: '3/4',
            flex: '0 0 55%'
          }}
        >
          <div id="qr-reader" className="w-full h-full" />
          
          {!isScanning && (
            <div className="absolute inset-0 flex items-center justify-center bg-secondary">
              <div className="text-center space-y-4">
                <Camera className="w-16 h-16 mx-auto text-muted-foreground animate-pulse" />
                <p className="text-muted-foreground text-sm">جاري تشغيل الكاميرا...</p>
              </div>
            </div>
          )}

          {/* Scanning Frame Overlay - 250x250 red square */}
          {isScanning && (
            <div className="absolute inset-0 pointer-events-none">
              {/* Semi-transparent overlay */}
              <div className="absolute inset-0 bg-black/40" />
              
              {/* Clear square in center */}
              <div 
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
                style={{ width: '250px', height: '250px' }}
              >
                {/* Clear the center area */}
                <div 
                  className="absolute inset-0 bg-transparent"
                  style={{ 
                    boxShadow: '0 0 0 9999px rgba(0,0,0,0.4)',
                  }}
                />
                
                {/* Red border frame */}
                <div className="absolute inset-0 border-4 border-red-500 rounded-lg">
                  {/* Scanning line animation */}
                  <div className="absolute inset-x-2 top-1/2 h-0.5 bg-gradient-to-r from-transparent via-red-500 to-transparent animate-pulse" />
                </div>
                
                {/* Corner accents */}
                <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-red-500 rounded-tl-lg" />
                <div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-red-500 rounded-tr-lg" />
                <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-red-500 rounded-bl-lg" />
                <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-red-500 rounded-br-lg" />
              </div>
              
              {/* Text above frame */}
              <div 
                className="absolute left-1/2 -translate-x-1/2 text-white text-sm font-medium bg-black/60 px-3 py-1 rounded-lg"
                style={{ top: 'calc(50% - 145px)' }}
              >
                ضع الكود داخل المربع الأحمر
              </div>
            </div>
          )}

          {isProcessing && (
            <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
              <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>

        {/* Result Display - 25% */}
        <div className="mt-3 shrink-0" style={{ flex: '0 0 20%' }}>
          {lastResult ? (
            <div className={`glass-card p-4 border-2 text-center animate-slide-up ${getResultBgColor()}`}>
              <div className="flex flex-col items-center gap-2">
                {getResultIcon()}
                {lastResult.studentName && (
                  <p className="text-lg font-bold text-foreground">{lastResult.studentName}</p>
                )}
                <p className="text-sm text-muted-foreground">{lastResult.message}</p>
              </div>
            </div>
          ) : (
            <div className="glass-card p-4 text-center text-muted-foreground">
              <p className="text-sm">في انتظار المسح...</p>
            </div>
          )}
        </div>

        {/* Controls - 15% */}
        <div className="mt-3 space-y-2 shrink-0" style={{ flex: '0 0 15%' }}>
          <div className="flex gap-2">
            <Button
              variant={isScanning ? 'destructive' : 'default'}
              size="default"
              className="flex-1 h-11"
              onClick={isScanning ? stopScanning : startScanning}
            >
              {isScanning ? (
                <>
                  <CameraOff className="w-4 h-4 ml-2" />
                  إيقاف
                </>
              ) : (
                <>
                  <Camera className="w-4 h-4 ml-2" />
                  تشغيل
                </>
              )}
            </Button>
            
            {isScanning && (
              <Button
                variant="outline"
                size="default"
                className="h-11"
                onClick={switchCamera}
              >
                <RotateCcw className="w-4 h-4" />
              </Button>
            )}
          </div>
          
          <Button
            variant="outline"
            size="sm"
            className="w-full h-9"
            onClick={() => {
              setShowExternalInput(!showExternalInput);
              setTimeout(() => externalInputRef.current?.focus(), 100);
            }}
          >
            <Keyboard className="w-4 h-4 ml-2" />
            {showExternalInput ? 'إخفاء الإدخال اليدوي' : 'إدخال يدوي'}
          </Button>

          {showExternalInput && (
            <div className="flex gap-2">
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
      </main>
    </div>
  );
};

export default QRScanner;
