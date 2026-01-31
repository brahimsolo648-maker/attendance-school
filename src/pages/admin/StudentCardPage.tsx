import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowRight, FileDown, User, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { QRCodeSVG } from 'qrcode.react';
import JsBarcode from 'jsbarcode';
import jsPDF from 'jspdf';
import { useStudent } from '@/hooks/useStudents';
import { useIsMobile } from '@/hooks/use-mobile';

// Professional wave pattern background
const WavePattern = () => (
  <svg 
    className="absolute inset-0 w-full h-full pointer-events-none" 
    preserveAspectRatio="none"
    viewBox="0 0 400 250"
  >
    <defs>
      <linearGradient id="waveGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#ffffff" stopOpacity="0.15" />
        <stop offset="100%" stopColor="#ffffff" stopOpacity="0.05" />
      </linearGradient>
      <linearGradient id="waveGrad2" x1="100%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#ffffff" stopOpacity="0.1" />
        <stop offset="100%" stopColor="#ffffff" stopOpacity="0.02" />
      </linearGradient>
    </defs>
    
    {/* Flowing waves */}
    <path 
      d="M0,80 Q100,40 200,80 T400,80 L400,0 L0,0 Z" 
      fill="url(#waveGrad1)"
    />
    <path 
      d="M0,120 Q80,90 160,120 T320,100 T400,130 L400,250 L0,250 Z" 
      fill="url(#waveGrad2)"
    />
    
    {/* Geometric patterns - corners */}
    <circle cx="20" cy="20" r="30" fill="#ffffff" opacity="0.05" />
    <circle cx="380" cy="230" r="40" fill="#ffffff" opacity="0.04" />
    
    {/* Decorative dots */}
    <circle cx="350" cy="30" r="2" fill="#ffffff" opacity="0.3" />
    <circle cx="360" cy="45" r="1.5" fill="#ffffff" opacity="0.25" />
    <circle cx="370" cy="25" r="1" fill="#ffffff" opacity="0.2" />
    <circle cx="30" cy="200" r="2" fill="#ffffff" opacity="0.25" />
    <circle cx="45" cy="215" r="1.5" fill="#ffffff" opacity="0.2" />
    <circle cx="20" cy="220" r="1" fill="#ffffff" opacity="0.15" />
    
    {/* Subtle lines */}
    <line x1="0" y1="200" x2="80" y2="250" stroke="#ffffff" strokeWidth="0.5" opacity="0.1" />
    <line x1="320" y1="0" x2="400" y2="60" stroke="#ffffff" strokeWidth="0.5" opacity="0.1" />
  </svg>
);

// Back card pattern
const BackPattern = () => (
  <svg 
    className="absolute inset-0 w-full h-full pointer-events-none" 
    preserveAspectRatio="none"
    viewBox="0 0 400 250"
  >
    <defs>
      <linearGradient id="backGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#ffffff" stopOpacity="0.08" />
        <stop offset="100%" stopColor="#ffffff" stopOpacity="0.02" />
      </linearGradient>
    </defs>
    
    {/* Geometric frame */}
    <rect x="15" y="15" width="370" height="220" rx="8" 
      fill="none" stroke="#ffffff" strokeWidth="1" opacity="0.15" />
    <rect x="25" y="25" width="350" height="200" rx="6" 
      fill="none" stroke="#ffffff" strokeWidth="0.5" opacity="0.1" />
    
    {/* Corner decorations */}
    <path d="M15,40 L15,15 L40,15" fill="none" stroke="#ffffff" strokeWidth="2" opacity="0.2" />
    <path d="M360,15 L385,15 L385,40" fill="none" stroke="#ffffff" strokeWidth="2" opacity="0.2" />
    <path d="M15,210 L15,235 L40,235" fill="none" stroke="#ffffff" strokeWidth="2" opacity="0.2" />
    <path d="M360,235 L385,235 L385,210" fill="none" stroke="#ffffff" strokeWidth="2" opacity="0.2" />
    
    {/* Dots pattern */}
    <circle cx="50" cy="50" r="1.5" fill="#ffffff" opacity="0.15" />
    <circle cx="350" cy="50" r="1.5" fill="#ffffff" opacity="0.15" />
    <circle cx="50" cy="200" r="1.5" fill="#ffffff" opacity="0.15" />
    <circle cx="350" cy="200" r="1.5" fill="#ffffff" opacity="0.15" />
  </svg>
);

const StudentCardPage = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isMobile = useIsMobile();
  
  const { data: studentData, isLoading } = useStudent(id || null);
  
  const [showFront, setShowFront] = useState(true);
  const backBarcodeRef = useRef<SVGSVGElement>(null);
  const frontCardRef = useRef<HTMLDivElement>(null);
  const backCardRef = useRef<HTMLDivElement>(null);

  const generateBarcodeNumber = useCallback((studentId: string, studentCode?: string, barcodeNum?: string): string => {
    if (barcodeNum) {
      return barcodeNum.replace(/\D/g, '').padStart(12, '0').slice(0, 12);
    }
    if (studentCode) {
      return studentCode.replace(/\D/g, '').padStart(12, '0').slice(0, 12);
    }
    const hash = studentId.replace(/-/g, '').slice(0, 12);
    let numericHash = '';
    for (let i = 0; i < 12; i++) {
      const char = hash[i] || '0';
      const num = parseInt(char, 16);
      numericHash += (num % 10).toString();
    }
    return numericHash;
  }, []);

  const initializeBarcode = useCallback((ref: SVGSVGElement | null, studentId: string, studentCode?: string, barcodeNum?: string) => {
    if (!ref) return;
    
    try {
      const barcodeNumber = generateBarcodeNumber(studentId, studentCode, barcodeNum);
      JsBarcode(ref, barcodeNumber, {
        format: 'EAN13',
        width: 2.2,
        height: 55,
        displayValue: true,
        fontSize: 14,
        margin: 8,
        background: '#ffffff',
        lineColor: '#1e3a5f'
      });
    } catch {
      try {
        const barcodeNumber = generateBarcodeNumber(studentId, studentCode, barcodeNum);
        JsBarcode(ref, barcodeNumber, {
          format: 'CODE128',
          width: 2,
          height: 55,
          displayValue: true,
          fontSize: 13,
          margin: 8,
          background: '#ffffff',
          lineColor: '#1e3a5f'
        });
      } catch (e2) {
        console.error('Barcode generation error:', e2);
      }
    }
  }, [generateBarcodeNumber]);

  useEffect(() => {
    if (studentData) {
      setTimeout(() => {
        initializeBarcode(backBarcodeRef.current, studentData.id, studentData.student_code || undefined, studentData.barcode_number || undefined);
      }, 200);
    }
  }, [studentData, initializeBarcode]);

  const exportToPDF = async () => {
    if (!frontCardRef.current || !backCardRef.current || !studentData) return;

    try {
      const html2canvas = (await import('html2canvas')).default;
      
      // Card dimensions: 9cm x 6cm = 90mm x 60mm (landscape)
      const cardWidthMM = 90;
      const cardHeightMM = 60;
      
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: [cardWidthMM, cardHeightMM]
      });

      // Capture front card with high quality
      const frontCanvas = await html2canvas(frontCardRef.current, {
        scale: 4,
        backgroundColor: null,
        useCORS: true,
        logging: false,
        allowTaint: true
      });
      
      pdf.addImage(frontCanvas.toDataURL('image/png', 1.0), 'PNG', 0, 0, cardWidthMM, cardHeightMM);
      
      // Add new page for back card
      pdf.addPage([cardWidthMM, cardHeightMM], 'landscape');
      
      // Capture back card with high quality
      const backCanvas = await html2canvas(backCardRef.current, {
        scale: 4,
        backgroundColor: null,
        useCORS: true,
        logging: false,
        allowTaint: true
      });
      
      pdf.addImage(backCanvas.toDataURL('image/png', 1.0), 'PNG', 0, 0, cardWidthMM, cardHeightMM);
      
      pdf.save(`بطاقة-${studentData.last_name}-${studentData.first_name}.pdf`);
    } catch (error) {
      console.error('PDF export error:', error);
      alert('حدث خطأ أثناء تصدير البطاقة');
    }
  };

  if (isLoading) {
    return (
      <div className="page-container min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground text-lg">جاري التحميل...</div>
      </div>
    );
  }

  if (!studentData) {
    return (
      <div className="page-container min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground text-lg">التلميذ غير موجود</div>
      </div>
    );
  }

  const student = studentData;
  const section = (studentData as any).sections;

  // Card style - responsive for mobile and desktop
  const getCardStyle = () => {
    const baseStyle = {
      aspectRatio: '3 / 2', // 9cm x 6cm = 3:2 ratio
      borderRadius: '16px',
      overflow: 'hidden',
      position: 'relative' as const,
    };

    if (isMobile) {
      return { ...baseStyle, width: '100%', maxWidth: '360px' };
    }
    return { ...baseStyle, width: '480px', height: '320px' };
  };

  const cardStyle = getCardStyle();

  return (
    <div className="page-container min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <header className="glass-nav">
        <div className="content-container flex items-center justify-between h-16">
          <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2">
            <ArrowRight className="w-5 h-5" />
            <span className="hidden sm:inline">العودة</span>
          </Button>
          <h1 className="text-lg font-bold text-foreground">بطاقة التلميذ</h1>
          <div className="w-20" />
        </div>
      </header>

      {/* Main Content */}
      <main className="content-container py-8" dir="rtl">
        <div className="flex flex-col items-center gap-8">
          {/* Student Name Header */}
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold text-foreground">
              {student.last_name} {student.first_name}
            </h2>
            <p className="text-muted-foreground text-lg">{section?.full_name}</p>
          </div>

          {/* Mobile Toggle */}
          {isMobile && (
            <div className="flex items-center gap-3">
              <Button
                variant={showFront ? "default" : "outline"}
                size="sm"
                onClick={() => setShowFront(true)}
              >
                الوجه الأمامي
              </Button>
              <Button
                variant={!showFront ? "default" : "outline"}
                size="sm"
                onClick={() => setShowFront(false)}
              >
                الوجه الخلفي
              </Button>
            </div>
          )}

          {/* Cards Container */}
          <div className={`flex ${isMobile ? 'flex-col' : 'flex-row'} items-center justify-center gap-10`}>
            
            {/* ========== FRONT CARD ========== */}
            <div className={`space-y-4 ${isMobile && !showFront ? 'hidden' : ''}`}>
              {!isMobile && (
                <p className="text-base font-semibold text-muted-foreground text-center">الوجه الأمامي</p>
              )}
              <div 
                ref={frontCardRef} 
                style={{
                  ...cardStyle,
                  background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 50%, #06b6d4 100%)',
                  boxShadow: '0 20px 60px rgba(59, 130, 246, 0.35), 0 8px 25px rgba(0, 0, 0, 0.15)'
                }} 
                dir="rtl"
              >
                <WavePattern />
                
                {/* Header Section */}
                <div className="relative z-10 text-center py-4 px-6">
                  <p style={{ 
                    fontSize: isMobile ? '11px' : '13px', 
                    fontWeight: 600,
                    color: 'rgba(255, 255, 255, 0.95)',
                    letterSpacing: '1px',
                    fontFamily: 'Noto Sans Arabic, Arial, sans-serif'
                  }}>
                    الجمهورية الجزائرية الديمقراطية الشعبية
                  </p>
                  <p style={{ 
                    fontSize: isMobile ? '9px' : '11px', 
                    color: 'rgba(255, 255, 255, 0.85)',
                    marginTop: '2px',
                    fontFamily: 'Noto Sans Arabic, Arial, sans-serif'
                  }}>
                    وزارة التربية الوطنية
                  </p>
                  <p style={{ 
                    fontSize: isMobile ? '16px' : '20px', 
                    fontWeight: 800,
                    color: '#ffffff',
                    marginTop: '6px',
                    textShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
                    fontFamily: 'Noto Sans Arabic, Arial, sans-serif'
                  }}>
                    بطاقة حضور التلميذ
                  </p>
                  <p style={{ 
                    fontSize: isMobile ? '11px' : '13px', 
                    fontWeight: 600,
                    color: 'rgba(255, 255, 255, 0.9)',
                    marginTop: '4px',
                    fontFamily: 'Noto Sans Arabic, Arial, sans-serif'
                  }}>
                    ثانوية العربي عبد القادر
                  </p>
                </div>

                {/* Content Section - Photo Left, Info Right (RTL) */}
                <div className="relative z-10 flex px-6 gap-5" style={{ direction: 'rtl' }}>
                  {/* Student Info - 60% */}
                  <div className="flex-1 flex flex-col justify-center gap-3 pr-2">
                    <div className="flex items-center gap-3">
                      <span style={{ 
                        fontSize: isMobile ? '13px' : '15px', 
                        fontWeight: 700,
                        color: 'rgba(255, 255, 255, 0.9)',
                        minWidth: '55px',
                        fontFamily: 'Noto Sans Arabic, Arial, sans-serif'
                      }}>
                        اللقب:
                      </span>
                      <span style={{ 
                        fontSize: isMobile ? '15px' : '18px', 
                        fontWeight: 800,
                        color: '#ffffff',
                        textShadow: '0 1px 4px rgba(0, 0, 0, 0.15)',
                        fontFamily: 'Noto Sans Arabic, Arial, sans-serif'
                      }}>
                        {student.last_name}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span style={{ 
                        fontSize: isMobile ? '13px' : '15px', 
                        fontWeight: 700,
                        color: 'rgba(255, 255, 255, 0.9)',
                        minWidth: '55px',
                        fontFamily: 'Noto Sans Arabic, Arial, sans-serif'
                      }}>
                        الاسم:
                      </span>
                      <span style={{ 
                        fontSize: isMobile ? '15px' : '18px', 
                        fontWeight: 800,
                        color: '#ffffff',
                        textShadow: '0 1px 4px rgba(0, 0, 0, 0.15)',
                        fontFamily: 'Noto Sans Arabic, Arial, sans-serif'
                      }}>
                        {student.first_name}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span style={{ 
                        fontSize: isMobile ? '13px' : '15px', 
                        fontWeight: 700,
                        color: 'rgba(255, 255, 255, 0.9)',
                        minWidth: '55px',
                        fontFamily: 'Noto Sans Arabic, Arial, sans-serif'
                      }}>
                        القسم:
                      </span>
                      <span style={{ 
                        fontSize: isMobile ? '14px' : '16px', 
                        fontWeight: 700,
                        color: '#ffffff',
                        fontFamily: 'Noto Sans Arabic, Arial, sans-serif'
                      }}>
                        {section?.full_name || '-'}
                      </span>
                    </div>
                  </div>

                  {/* Photo - 40% with geometric frame */}
                  <div 
                    className="flex-shrink-0 rounded-xl overflow-hidden flex items-center justify-center"
                    style={{ 
                      width: isMobile ? '85px' : '105px', 
                      height: isMobile ? '110px' : '135px',
                      background: 'linear-gradient(145deg, rgba(255,255,255,0.95), rgba(240,245,255,0.9))',
                      border: '3px solid rgba(255, 255, 255, 0.7)',
                      boxShadow: '0 8px 25px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255,255,255,0.5)'
                    }}
                  >
                    {student.photo_url ? (
                      <img src={student.photo_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-center">
                        <User style={{ 
                          width: isMobile ? '32px' : '40px', 
                          height: isMobile ? '32px' : '40px',
                          color: '#3b82f6', 
                          opacity: 0.6,
                          margin: '0 auto'
                        }} />
                        <p style={{ 
                          fontSize: '10px', 
                          marginTop: '6px',
                          color: '#3b82f6', 
                          opacity: 0.7,
                          fontFamily: 'Noto Sans Arabic, Arial, sans-serif'
                        }}>
                          صورة التلميذ
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer - Signature & Stamp */}
                <div 
                  className="absolute bottom-0 left-0 right-0 flex justify-between items-end px-6 py-3 z-10"
                  style={{ 
                    background: 'linear-gradient(to top, rgba(0,0,0,0.15), transparent)'
                  }}
                >
                  <div className="text-center">
                    <p style={{ 
                      fontSize: '10px', 
                      color: 'rgba(255, 255, 255, 0.85)',
                      fontFamily: 'Noto Sans Arabic, Arial, sans-serif'
                    }}>
                      توقيع المدير
                    </p>
                    <div style={{ 
                      width: '70px', 
                      height: '1px', 
                      marginTop: '4px',
                      background: 'rgba(255, 255, 255, 0.5)'
                    }} />
                  </div>
                  <div className="flex flex-col items-center">
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      border: '2px dashed rgba(255, 255, 255, 0.6)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <span style={{ 
                        fontSize: '9px', 
                        fontWeight: 600,
                        color: 'rgba(255, 255, 255, 0.8)',
                        fontFamily: 'Noto Sans Arabic, Arial, sans-serif'
                      }}>
                        ختم
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ========== BACK CARD ========== */}
            <div className={`space-y-4 ${isMobile && showFront ? 'hidden' : ''}`}>
              {!isMobile && (
                <p className="text-base font-semibold text-muted-foreground text-center">الوجه الخلفي</p>
              )}
              <div 
                ref={backCardRef} 
                style={{
                  ...cardStyle,
                  background: 'linear-gradient(135deg, #60a5fa 0%, #3b82f6 50%, #38bdf8 100%)',
                  boxShadow: '0 20px 60px rgba(59, 130, 246, 0.35), 0 8px 25px rgba(0, 0, 0, 0.15)'
                }} 
                dir="rtl"
              >
                <BackPattern />
                
                {/* Header */}
                <div className="relative z-10 text-center py-4">
                  <p style={{ 
                    fontSize: isMobile ? '14px' : '17px', 
                    fontWeight: 800,
                    color: '#ffffff',
                    textShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
                    letterSpacing: '1px',
                    fontFamily: 'Noto Sans Arabic, Arial, sans-serif'
                  }}>
                    رموز التعريف الإلكتروني
                  </p>
                </div>

                {/* QR and Barcode side by side */}
                <div className="relative z-10 flex items-center justify-center gap-8 md:gap-12 h-[calc(100%-80px)] px-6">
                  {/* QR Code */}
                  <div className="flex flex-col items-center gap-3">
                    <div style={{
                      background: '#ffffff',
                      padding: isMobile ? '10px' : '14px',
                      borderRadius: '16px',
                      border: '3px solid rgba(255, 255, 255, 0.8)',
                      boxShadow: '0 8px 30px rgba(0, 0, 0, 0.2)'
                    }}>
                      <QRCodeSVG 
                        value={student.barcode_number || student.student_code || student.id} 
                        size={isMobile ? 95 : 115} 
                        level="H"
                        includeMargin={false}
                        fgColor="#1e3a5f"
                        bgColor="#ffffff"
                      />
                    </div>
                    <span style={{ 
                      fontSize: isMobile ? '12px' : '14px', 
                      fontWeight: 700,
                      color: '#ffffff',
                      textShadow: '0 1px 4px rgba(0, 0, 0, 0.15)',
                      fontFamily: 'Noto Sans Arabic, Arial, sans-serif'
                    }}>
                      رمز QR
                    </span>
                  </div>

                  {/* Barcode EAN */}
                  <div className="flex flex-col items-center gap-3">
                    <div style={{
                      background: '#ffffff',
                      padding: isMobile ? '8px 12px' : '10px 16px',
                      borderRadius: '12px',
                      border: '2px solid rgba(255, 255, 255, 0.6)',
                      boxShadow: '0 8px 25px rgba(0, 0, 0, 0.15)'
                    }}>
                      <svg 
                        ref={backBarcodeRef} 
                        style={{ 
                          maxWidth: isMobile ? '130px' : '160px', 
                          height: 'auto' 
                        }} 
                      />
                    </div>
                    <span style={{ 
                      fontSize: isMobile ? '12px' : '14px', 
                      fontWeight: 700,
                      color: '#ffffff',
                      textShadow: '0 1px 4px rgba(0, 0, 0, 0.15)',
                      fontFamily: 'Noto Sans Arabic, Arial, sans-serif'
                    }}>
                      باركود EAN
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Mobile Flip Button */}
          {isMobile && (
            <Button 
              variant="outline" 
              size="default" 
              onClick={() => setShowFront(!showFront)}
              className="gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              قلب البطاقة
            </Button>
          )}

          {/* Export Button */}
          <div className="w-full max-w-md space-y-4 pt-6">
            <Button 
              onClick={exportToPDF} 
              className="w-full h-12 text-base font-semibold" 
              variant="default" 
              size="lg"
            >
              <FileDown className="w-5 h-5 ml-2" />
              تصدير البطاقة كـ PDF
            </Button>
            <p className="text-sm text-muted-foreground text-center">
              كل وجه يُطبع في صفحة PDF منفصلة بحجم 6×9 سم
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default StudentCardPage;
