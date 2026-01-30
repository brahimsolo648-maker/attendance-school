import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowRight, FileDown, User, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { QRCodeSVG } from 'qrcode.react';
import JsBarcode from 'jsbarcode';
import jsPDF from 'jspdf';
import { useStudent } from '@/hooks/useStudents';
import { useIsMobile } from '@/hooks/use-mobile';

// 3 Wide diagonal lines pattern
const WideStripesPattern = () => (
  <svg 
    className="absolute inset-0 w-full h-full pointer-events-none" 
    preserveAspectRatio="none"
    viewBox="0 0 340 227"
  >
    {/* 3 wide diagonal stripes */}
    <line x1="60" y1="0" x2="0" y2="60" stroke="#4361ee" strokeWidth="12" opacity="0.12" />
    <line x1="170" y1="0" x2="0" y2="170" stroke="#4361ee" strokeWidth="12" opacity="0.1" />
    <line x1="280" y1="0" x2="0" y2="280" stroke="#4361ee" strokeWidth="12" opacity="0.08" />
  </svg>
);

const StudentCardPage = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isMobile = useIsMobile();
  
  const { data: studentData, isLoading } = useStudent(id || null);
  
  const [showFront, setShowFront] = useState(true);
  const frontBarcodeRef = useRef<SVGSVGElement>(null);
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
        width: 2,
        height: 50,
        displayValue: true,
        fontSize: 12,
        margin: 5,
        background: '#ffffff',
        lineColor: '#1a1a2e'
      });
    } catch {
      try {
        const barcodeNumber = generateBarcodeNumber(studentId, studentCode, barcodeNum);
        JsBarcode(ref, barcodeNumber, {
          format: 'CODE128',
          width: 1.8,
          height: 50,
          displayValue: true,
          fontSize: 11,
          margin: 5,
          background: '#ffffff',
          lineColor: '#1a1a2e'
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
      }, 150);
    }
  }, [studentData, initializeBarcode]);

  const exportToPDF = async () => {
    if (!frontCardRef.current || !backCardRef.current || !studentData) return;

    try {
      const html2canvas = (await import('html2canvas')).default;
      
      // Card dimensions: 6cm x 9cm = 60mm x 90mm
      const cardWidthMM = 90;
      const cardHeightMM = 60;
      
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: [cardWidthMM, cardHeightMM]
      });

      // Front card
      const frontCanvas = await html2canvas(frontCardRef.current, {
        scale: 4,
        backgroundColor: '#ffffff',
        useCORS: true,
        logging: false
      });
      
      pdf.addImage(frontCanvas.toDataURL('image/png', 1.0), 'PNG', 0, 0, cardWidthMM, cardHeightMM);
      
      // Back card on new page
      pdf.addPage([cardWidthMM, cardHeightMM], 'landscape');
      
      const backCanvas = await html2canvas(backCardRef.current, {
        scale: 4,
        backgroundColor: '#ffffff',
        useCORS: true,
        logging: false
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
        <div className="text-muted-foreground">جاري التحميل...</div>
      </div>
    );
  }

  if (!studentData) {
    return (
      <div className="page-container min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">التلميذ غير موجود</div>
      </div>
    );
  }

  const student = studentData;
  const section = (studentData as any).sections;

  // Responsive card style - larger on desktop, fits mobile screen
  const getCardStyle = () => {
    const baseStyle = {
      aspectRatio: '3 / 2', // 9cm x 6cm = 3:2 ratio
      background: '#ffffff',
      borderRadius: '12px',
      overflow: 'hidden',
      position: 'relative' as const,
      boxShadow: '0 8px 30px rgba(67, 97, 238, 0.15)',
      border: '2px solid rgba(67, 97, 238, 0.2)'
    };

    if (isMobile) {
      return { ...baseStyle, width: '100%', maxWidth: '340px' };
    }
    return { ...baseStyle, width: '450px', height: '300px' };
  };

  const cardStyle = getCardStyle();

  return (
    <div className="page-container min-h-screen">
      {/* Header */}
      <header className="glass-nav">
        <div className="content-container flex items-center justify-between h-16">
          <Button variant="ghost" onClick={() => navigate(-1)}>
            <ArrowRight className="w-5 h-5 ml-2" />
            العودة
          </Button>
          <h1 className="text-lg font-bold text-foreground">بطاقة التلميذ</h1>
          <div className="w-20" />
        </div>
      </header>

      {/* Main Content */}
      <main className="content-container py-8" dir="rtl">
        <div className="flex flex-col items-center gap-6">
          {/* Student Name */}
          <div className="text-center">
            <h2 className="text-xl font-bold text-foreground">
              {student.last_name} {student.first_name}
            </h2>
            <p className="text-muted-foreground">{section?.full_name}</p>
          </div>

          {/* Card Toggle - Mobile */}
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
          <div className={`flex ${isMobile ? 'flex-col' : 'flex-row'} items-center justify-center gap-8`}>
            {/* Front Card */}
            <div className={`space-y-3 ${isMobile && !showFront ? 'hidden' : ''}`}>
              {!isMobile && (
                <p className="text-sm font-medium text-muted-foreground text-center">الوجه الأمامي</p>
              )}
              <div ref={frontCardRef} style={cardStyle} dir="rtl">
                {/* 3 Wide diagonal stripes background */}
                <WideStripesPattern />
                
                {/* Top gradient bar */}
                <div 
                  className="relative z-10 text-center py-3 px-4"
                  style={{ 
                    background: 'linear-gradient(135deg, #4361ee 0%, #3a56d4 100%)',
                    color: 'white'
                  }}
                >
                  <p className="text-[8px] md:text-[9px] font-medium opacity-85 tracking-wide">الجمهورية الجزائرية الديمقراطية الشعبية</p>
                  <p className="text-[7px] md:text-[8px] opacity-75">وزارة التربية الوطنية</p>
                  <p className="text-sm md:text-base font-bold my-1 tracking-wider">بطاقة حضور التلميذ</p>
                  <p className="text-[9px] md:text-[10px] font-medium opacity-90">ثانوية العربي عبد القادر</p>
                </div>

                {/* Content */}
                <div className="relative z-10 flex p-4 gap-4" style={{ direction: 'rtl' }}>
                  {/* Student Info - No barcode on front */}
                  <div className="flex-1 flex flex-col justify-center gap-2.5 pr-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] md:text-[11px] font-bold min-w-[45px]" style={{ color: '#4361ee' }}>اللقب:</span>
                      <span className="text-[11px] md:text-[13px] font-semibold text-gray-800">{student.last_name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] md:text-[11px] font-bold min-w-[45px]" style={{ color: '#4361ee' }}>الاسم:</span>
                      <span className="text-[11px] md:text-[13px] font-semibold text-gray-800">{student.first_name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] md:text-[11px] font-bold min-w-[45px]" style={{ color: '#4361ee' }}>القسم:</span>
                      <span className="text-[11px] md:text-[13px] font-semibold text-gray-800">{section?.full_name || '-'}</span>
                    </div>
                  </div>

                  {/* Photo - 3x4 ratio */}
                  <div 
                    className="flex-shrink-0 rounded-lg overflow-hidden flex items-center justify-center"
                    style={{ 
                      width: isMobile ? '75px' : '90px', 
                      height: isMobile ? '100px' : '120px',
                      background: 'linear-gradient(145deg, #f8f9ff, #eef1ff)',
                      border: '2px solid rgba(67, 97, 238, 0.3)',
                      boxShadow: '0 3px 12px rgba(67, 97, 238, 0.12)'
                    }}
                  >
                    {student.photo_url ? (
                      <img src={student.photo_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-center">
                        <User className="w-8 h-8 mx-auto" style={{ color: '#4361ee', opacity: 0.5 }} />
                        <p className="text-[7px] mt-1" style={{ color: '#4361ee', opacity: 0.6 }}>صورة</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer */}
                <div 
                  className="absolute bottom-0 left-0 right-0 flex justify-between items-end px-4 py-2 z-10"
                  style={{ 
                    background: 'rgba(248, 249, 255, 0.95)',
                    borderTop: '1px solid rgba(67, 97, 238, 0.15)'
                  }}
                >
                  <div className="text-center">
                    <p className="text-[7px]" style={{ color: '#666' }}>توقيع المدير</p>
                    <div className="w-14 h-3 border-b" style={{ borderColor: 'rgba(67, 97, 238, 0.4)' }} />
                  </div>
                  <div className="flex flex-col items-center">
                    <div 
                      className="w-8 h-8 rounded-full border-2 border-dashed flex items-center justify-center"
                      style={{ borderColor: 'rgba(67, 97, 238, 0.5)' }}
                    >
                      <span className="text-[6px] font-medium" style={{ color: '#4361ee' }}>ختم</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Back Card */}
            <div className={`space-y-3 ${isMobile && showFront ? 'hidden' : ''}`}>
              {!isMobile && (
                <p className="text-sm font-medium text-muted-foreground text-center">الوجه الخلفي</p>
              )}
              <div ref={backCardRef} style={cardStyle} dir="rtl">
                {/* 3 Wide diagonal stripes background */}
                <WideStripesPattern />
                
                {/* Header */}
                <div 
                  className="relative z-10 text-center py-2.5 px-4"
                  style={{ 
                    background: 'linear-gradient(135deg, #4361ee 0%, #3a56d4 100%)',
                    color: 'white'
                  }}
                >
                  <p className="text-[10px] md:text-[11px] font-semibold tracking-wide">رموز التعريف الإلكتروني</p>
                </div>

                {/* QR and Barcode side by side - adjusted sizes for 6x9cm */}
                <div className="relative z-10 flex items-center justify-center gap-6 md:gap-10 h-[calc(100%-48px)] px-4">
                  {/* QR Code - on the left for RTL */}
                  <div className="flex flex-col items-center gap-2">
                    <div 
                      className="bg-white p-2.5 rounded-xl"
                      style={{ 
                        border: '2px solid #4361ee',
                        boxShadow: '0 4px 15px rgba(67, 97, 238, 0.2)'
                      }}
                    >
                      <QRCodeSVG 
                        value={student.barcode_number || student.student_code || student.id} 
                        size={isMobile ? 90 : 110} 
                        level="H"
                        includeMargin={false}
                        fgColor="#1a1a2e"
                        bgColor="#ffffff"
                      />
                    </div>
                    <span className="text-[9px] md:text-[10px] font-bold" style={{ color: '#4361ee' }}>رمز QR</span>
                  </div>

                  {/* Barcode EAN - on the right for RTL */}
                  <div className="flex flex-col items-center gap-2">
                    <div 
                      className="bg-white px-3 py-2 rounded-xl"
                      style={{ 
                        border: '2px solid rgba(67, 97, 238, 0.3)',
                        boxShadow: '0 4px 15px rgba(0, 0, 0, 0.08)'
                      }}
                    >
                      <svg ref={backBarcodeRef} style={{ maxWidth: isMobile ? '120px' : '150px', height: 'auto' }} />
                    </div>
                    <span className="text-[9px] md:text-[10px] font-bold" style={{ color: '#4361ee' }}>باركود EAN</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Flip button - Mobile only */}
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

          {/* Export Button */}
          <div className="w-full max-w-md space-y-3 pt-4">
            <Button onClick={exportToPDF} className="w-full" variant="default" size="lg">
              <FileDown className="w-5 h-5 ml-2" />
              تصدير البطاقة كـ PDF
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              سيتم تصدير كل وجه في صفحة منفصلة بحجم 6×9 سم
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default StudentCardPage;
