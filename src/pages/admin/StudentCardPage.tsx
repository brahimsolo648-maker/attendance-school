import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowRight, FileDown, User, RotateCcw, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { QRCodeSVG } from 'qrcode.react';
import JsBarcode from 'jsbarcode';
import jsPDF from 'jspdf';
import { useStudent } from '@/hooks/useStudents';
import { useIsMobile } from '@/hooks/use-mobile';

// Wave pattern for front card
const WavePattern = () => (
  <svg 
    className="absolute inset-0 w-full h-full pointer-events-none" 
    preserveAspectRatio="none"
    viewBox="0 0 340 227"
  >
    <defs>
      <linearGradient id="waveGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#ffffff" stopOpacity="0.12" />
        <stop offset="100%" stopColor="#ffffff" stopOpacity="0.04" />
      </linearGradient>
    </defs>
    <path d="M0,60 Q85,30 170,60 T340,60 L340,0 L0,0 Z" fill="url(#waveGrad1)" />
    <path d="M0,200 Q60,180 120,200 T240,190 T340,210 L340,227 L0,227 Z" fill="url(#waveGrad1)" />
    <circle cx="15" cy="15" r="20" fill="#ffffff" opacity="0.04" />
    <circle cx="325" cy="212" r="25" fill="#ffffff" opacity="0.03" />
  </svg>
);

// Pattern for back card
const BackPattern = () => (
  <svg 
    className="absolute inset-0 w-full h-full pointer-events-none" 
    preserveAspectRatio="none"
    viewBox="0 0 340 227"
  >
    <rect x="10" y="10" width="320" height="207" rx="6" 
      fill="none" stroke="#ffffff" strokeWidth="1" opacity="0.12" />
    <path d="M10,30 L10,10 L30,10" fill="none" stroke="#ffffff" strokeWidth="1.5" opacity="0.15" />
    <path d="M310,10 L330,10 L330,30" fill="none" stroke="#ffffff" strokeWidth="1.5" opacity="0.15" />
    <path d="M10,197 L10,217 L30,217" fill="none" stroke="#ffffff" strokeWidth="1.5" opacity="0.15" />
    <path d="M310,217 L330,217 L330,197" fill="none" stroke="#ffffff" strokeWidth="1.5" opacity="0.15" />
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

  const generateBarcodeNumber = useCallback((studentCode?: string, barcodeNum?: string, studentId?: string): string => {
    if (barcodeNum) {
      return barcodeNum.replace(/\D/g, '').padStart(12, '0').slice(0, 12);
    }
    if (studentCode) {
      return studentCode.replace(/\D/g, '').padStart(12, '0').slice(0, 12);
    }
    const hash = (studentId || '').replace(/-/g, '').slice(0, 12);
    let numericHash = '';
    for (let i = 0; i < 12; i++) {
      const char = hash[i] || '0';
      const num = parseInt(char, 16);
      numericHash += (num % 10).toString();
    }
    return numericHash;
  }, []);

  const initializeBarcode = useCallback((ref: SVGSVGElement | null, studentCode?: string, barcodeNum?: string, studentId?: string) => {
    if (!ref) return;
    
    try {
      const barcodeNumber = generateBarcodeNumber(studentCode, barcodeNum, studentId);
      JsBarcode(ref, barcodeNumber, {
        format: 'EAN13',
        width: 1.2,
        height: 32,
        displayValue: true,
        fontSize: 8,
        margin: 2,
        background: '#ffffff',
        lineColor: '#1e3a5f'
      });
    } catch {
      try {
        const barcodeNumber = generateBarcodeNumber(studentCode, barcodeNum, studentId);
        JsBarcode(ref, barcodeNumber, {
          format: 'CODE128',
          width: 1,
          height: 32,
          displayValue: true,
          fontSize: 7,
          margin: 2,
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

  // Export both faces to PDF
  const exportToPDF = async () => {
    if (!frontCardRef.current || !backCardRef.current || !studentData) return;

    try {
      const html2canvas = (await import('html2canvas')).default;
      
      const cardWidthMM = 90;
      const cardHeightMM = 60;
      
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: [cardWidthMM, cardHeightMM]
      });

      const frontCanvas = await html2canvas(frontCardRef.current, {
        scale: 4,
        backgroundColor: null,
        useCORS: true,
        logging: false,
        allowTaint: true
      });
      
      pdf.addImage(frontCanvas.toDataURL('image/png', 1.0), 'PNG', 0, 0, cardWidthMM, cardHeightMM);
      
      pdf.addPage([cardWidthMM, cardHeightMM], 'landscape');
      
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

  // Print single face as PDF
  const printSingleFace = async (face: 'front' | 'back') => {
    const cardRef = face === 'front' ? frontCardRef.current : backCardRef.current;
    if (!cardRef || !studentData) return;

    try {
      const html2canvas = (await import('html2canvas')).default;
      
      const cardWidthMM = 90;
      const cardHeightMM = 60;
      
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: [cardWidthMM, cardHeightMM]
      });

      const canvas = await html2canvas(cardRef, {
        scale: 4,
        backgroundColor: null,
        useCORS: true,
        logging: false,
        allowTaint: true
      });
      
      pdf.addImage(canvas.toDataURL('image/png', 1.0), 'PNG', 0, 0, cardWidthMM, cardHeightMM);
      
      const faceName = face === 'front' ? 'أمامي' : 'خلفي';
      pdf.save(`بطاقة-${faceName}-${studentData.last_name}-${studentData.first_name}.pdf`);
    } catch (error) {
      console.error('PDF export error:', error);
      alert('حدث خطأ أثناء الطباعة');
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

  // Fixed card dimensions - 340x227 pixels (3:2 ratio for 9x6 cm)
  const cardStyle = {
    width: isMobile ? '320px' : '340px',
    height: isMobile ? '213px' : '227px',
    borderRadius: '10px',
    overflow: 'hidden',
    position: 'relative' as const,
  };

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
      <main className="content-container py-6" dir="rtl">
        <div className="flex flex-col items-center gap-6">
          {/* Student Name */}
          <div className="text-center space-y-1">
            <h2 className="text-xl font-bold text-foreground">
              {student.last_name} {student.first_name}
            </h2>
            <p className="text-muted-foreground">{section?.full_name}</p>
          </div>

          {/* Mobile Toggle */}
          {isMobile && (
            <div className="flex items-center gap-2">
              <Button
                variant={showFront ? "default" : "outline"}
                size="sm"
                onClick={() => setShowFront(true)}
              >
                الأمامي
              </Button>
              <Button
                variant={!showFront ? "default" : "outline"}
                size="sm"
                onClick={() => setShowFront(false)}
              >
                الخلفي
              </Button>
            </div>
          )}

          {/* Cards Container */}
          <div className={`flex ${isMobile ? 'flex-col' : 'flex-row'} items-center justify-center gap-8`}>
            
            {/* ========== FRONT CARD ========== */}
            <div className={`space-y-3 ${isMobile && !showFront ? 'hidden' : ''}`}>
              {!isMobile && (
                <p className="text-sm font-medium text-muted-foreground text-center">الوجه الأمامي</p>
              )}
              <div 
                ref={frontCardRef} 
                style={{
                  ...cardStyle,
                  background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 50%, #06b6d4 100%)',
                  boxShadow: '0 8px 30px rgba(59, 130, 246, 0.3)'
                }} 
                dir="rtl"
              >
                <WavePattern />
                
                {/* Header - Compact */}
                <div className="relative z-10 text-center py-2 px-4">
                  <p style={{ 
                    fontSize: '8px', 
                    fontWeight: 500,
                    color: 'rgba(255, 255, 255, 0.9)',
                    letterSpacing: '0.5px'
                  }}>
                    الجمهورية الجزائرية الديمقراطية الشعبية
                  </p>
                  <p style={{ 
                    fontSize: '7px', 
                    color: 'rgba(255, 255, 255, 0.8)',
                  }}>
                    وزارة التربية الوطنية
                  </p>
                  <p style={{ 
                    fontSize: '12px', 
                    fontWeight: 700,
                    color: '#ffffff',
                    marginTop: '2px',
                    textShadow: '0 1px 3px rgba(0, 0, 0, 0.2)'
                  }}>
                    بطاقة حضور التلميذ
                  </p>
                  <p style={{ 
                    fontSize: '8px', 
                    fontWeight: 600,
                    color: 'rgba(255, 255, 255, 0.9)',
                    marginTop: '1px'
                  }}>
                    ثانوية العربي عبد القادر
                  </p>
                </div>

                {/* Content - Photo + Info */}
                <div className="relative z-10 flex px-4 gap-3" style={{ direction: 'rtl' }}>
                  {/* Student Info */}
                  <div className="flex-1 flex flex-col justify-center gap-2">
                    <div className="flex items-center gap-2">
                      <span style={{ 
                        fontSize: '9px', 
                        fontWeight: 600,
                        color: 'rgba(255, 255, 255, 0.85)',
                        minWidth: '35px'
                      }}>
                        اللقب:
                      </span>
                      <span style={{ 
                        fontSize: '11px', 
                        fontWeight: 700,
                        color: '#ffffff'
                      }}>
                        {student.last_name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span style={{ 
                        fontSize: '9px', 
                        fontWeight: 600,
                        color: 'rgba(255, 255, 255, 0.85)',
                        minWidth: '35px'
                      }}>
                        الاسم:
                      </span>
                      <span style={{ 
                        fontSize: '11px', 
                        fontWeight: 700,
                        color: '#ffffff'
                      }}>
                        {student.first_name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span style={{ 
                        fontSize: '9px', 
                        fontWeight: 600,
                        color: 'rgba(255, 255, 255, 0.85)',
                        minWidth: '35px'
                      }}>
                        القسم:
                      </span>
                      <span style={{ 
                        fontSize: '10px', 
                        fontWeight: 600,
                        color: '#ffffff'
                      }}>
                        {section?.full_name || '-'}
                      </span>
                    </div>
                  </div>

                  {/* Photo */}
                  <div 
                    className="flex-shrink-0 rounded-lg overflow-hidden flex items-center justify-center"
                    style={{ 
                      width: '55px', 
                      height: '70px',
                      background: 'linear-gradient(145deg, rgba(255,255,255,0.95), rgba(240,245,255,0.9))',
                      border: '2px solid rgba(255, 255, 255, 0.6)',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
                    }}
                  >
                    {student.photo_url ? (
                      <img src={student.photo_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-center">
                        <User style={{ width: '20px', height: '20px', color: '#3b82f6', opacity: 0.5, margin: '0 auto' }} />
                        <p style={{ fontSize: '6px', marginTop: '2px', color: '#3b82f6', opacity: 0.6 }}>صورة</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer - Signature & Stamp */}
                <div 
                  className="absolute bottom-0 left-0 right-0 flex justify-between items-end px-4 py-2 z-10"
                  style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.1), transparent)' }}
                >
                  <div className="text-center">
                    <p style={{ fontSize: '7px', color: 'rgba(255, 255, 255, 0.8)' }}>توقيع المدير</p>
                    <div style={{ width: '45px', height: '1px', marginTop: '2px', background: 'rgba(255, 255, 255, 0.4)' }} />
                  </div>
                  <div style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    border: '1.5px dashed rgba(255, 255, 255, 0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <span style={{ fontSize: '6px', fontWeight: 600, color: 'rgba(255, 255, 255, 0.7)' }}>ختم</span>
                  </div>
                </div>
              </div>
              
              {/* Print Front Button */}
              <Button 
                onClick={() => printSingleFace('front')} 
                variant="outline" 
                size="sm"
                className="w-full gap-2"
              >
                <Printer className="w-4 h-4" />
                طباعة الوجه الأمامي
              </Button>
            </div>

            {/* ========== BACK CARD ========== */}
            <div className={`space-y-3 ${isMobile && showFront ? 'hidden' : ''}`}>
              {!isMobile && (
                <p className="text-sm font-medium text-muted-foreground text-center">الوجه الخلفي</p>
              )}
              <div 
                ref={backCardRef} 
                style={{
                  ...cardStyle,
                  background: 'linear-gradient(135deg, #60a5fa 0%, #3b82f6 50%, #38bdf8 100%)',
                  boxShadow: '0 8px 30px rgba(59, 130, 246, 0.3)'
                }} 
                dir="rtl"
              >
                <BackPattern />
                
                {/* Header */}
                <div className="relative z-10 text-center py-2">
                  <p style={{ 
                    fontSize: '11px', 
                    fontWeight: 700,
                    color: '#ffffff',
                    textShadow: '0 1px 4px rgba(0, 0, 0, 0.15)',
                    letterSpacing: '0.5px'
                  }}>
                    رموز التعريف الإلكتروني
                  </p>
                </div>

                {/* QR and Barcode */}
                <div className="relative z-10 flex items-center justify-center gap-6 px-4" style={{ height: 'calc(100% - 45px)' }}>
                  {/* QR Code */}
                  <div className="flex flex-col items-center gap-1">
                    <div style={{
                      background: '#ffffff',
                      padding: '6px',
                      borderRadius: '8px',
                      border: '2px solid rgba(255, 255, 255, 0.7)',
                      boxShadow: '0 4px 15px rgba(0, 0, 0, 0.15)'
                    }}>
                      <QRCodeSVG 
                        value={student.student_code || student.id} 
                        size={65} 
                        level="H"
                        includeMargin={false}
                        fgColor="#1e3a5f"
                        bgColor="#ffffff"
                      />
                    </div>
                    <span style={{ 
                      fontSize: '8px', 
                      fontWeight: 600,
                      color: '#ffffff',
                      textShadow: '0 1px 2px rgba(0, 0, 0, 0.1)'
                    }}>
                      رمز QR
                    </span>
                  </div>

                  {/* Barcode EAN */}
                  <div className="flex flex-col items-center gap-1">
                    <div style={{
                      background: '#ffffff',
                      padding: '4px 8px',
                      borderRadius: '6px',
                      border: '1.5px solid rgba(255, 255, 255, 0.5)',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
                    }}>
                      <svg ref={backBarcodeRef} style={{ maxWidth: '90px', height: 'auto' }} />
                    </div>
                    <span style={{ 
                      fontSize: '8px', 
                      fontWeight: 600,
                      color: '#ffffff',
                      textShadow: '0 1px 2px rgba(0, 0, 0, 0.1)'
                    }}>
                      باركود EAN
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Print Back Button */}
              <Button 
                onClick={() => printSingleFace('back')} 
                variant="outline" 
                size="sm"
                className="w-full gap-2"
              >
                <Printer className="w-4 h-4" />
                طباعة الوجه الخلفي
              </Button>
            </div>
          </div>

          {/* Mobile Flip Button */}
          {isMobile && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setShowFront(!showFront)}
              className="gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              قلب البطاقة
            </Button>
          )}

          {/* Export Both Button */}
          <div className="w-full max-w-sm space-y-3 pt-4">
            <Button 
              onClick={exportToPDF} 
              className="w-full h-11" 
              variant="default" 
              size="lg"
            >
              <FileDown className="w-5 h-5 ml-2" />
              تصدير البطاقة كاملة (PDF)
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              كل وجه في صفحة PDF منفصلة بحجم 6×9 سم
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default StudentCardPage;
