import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowRight, FileDown, User, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { QRCodeSVG } from 'qrcode.react';
import JsBarcode from 'jsbarcode';
import jsPDF from 'jspdf';
import { useStudents } from '@/hooks/useStudents';
import { useSections } from '@/hooks/useSections';
import { Progress } from '@/components/ui/progress';

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

interface StudentData {
  id: string;
  first_name: string;
  last_name: string;
  photo_url?: string | null;
  student_code?: string | null;
  barcode_number?: string | null;
}

interface CardRefs {
  front: HTMLDivElement | null;
  back: HTMLDivElement | null;
  barcode: SVGSVGElement | null;
}

const SectionCardsPage = () => {
  const navigate = useNavigate();
  const { sectionId } = useParams<{ sectionId: string }>();
  
  const { data: students, isLoading: studentsLoading } = useStudents(sectionId || null);
  const { data: sections } = useSections();
  
  const section = sections?.find(s => s.id === sectionId);
  
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [currentStudent, setCurrentStudent] = useState('');
  
  // Refs for rendering cards
  const cardRefsMap = useRef<Map<string, CardRefs>>(new Map());

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

  // Initialize all barcodes when students load
  useEffect(() => {
    if (students) {
      setTimeout(() => {
        students.forEach(student => {
          const refs = cardRefsMap.current.get(student.id);
          if (refs?.barcode) {
            initializeBarcode(refs.barcode, student.student_code || undefined, student.barcode_number || undefined, student.id);
          }
        });
      }, 300);
    }
  }, [students, initializeBarcode]);

  // Export all cards to single PDF
  const exportAllToPDF = async () => {
    if (!students || students.length === 0) return;

    setIsExporting(true);
    setExportProgress(0);

    try {
      const html2canvas = (await import('html2canvas')).default;
      
      const cardWidthMM = 90;
      const cardHeightMM = 60;
      
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: [cardWidthMM, cardHeightMM]
      });

      let isFirstPage = true;

      for (let i = 0; i < students.length; i++) {
        const student = students[i];
        setCurrentStudent(`${student.last_name} ${student.first_name}`);
        setExportProgress(((i + 1) / students.length) * 100);

        const refs = cardRefsMap.current.get(student.id);
        if (!refs?.front || !refs?.back) continue;

        // Front card
        if (!isFirstPage) {
          pdf.addPage([cardWidthMM, cardHeightMM], 'landscape');
        }
        isFirstPage = false;

        const frontCanvas = await html2canvas(refs.front, {
          scale: 4,
          backgroundColor: null,
          useCORS: true,
          logging: false,
          allowTaint: true
        });
        pdf.addImage(frontCanvas.toDataURL('image/png', 1.0), 'PNG', 0, 0, cardWidthMM, cardHeightMM);

        // Back card
        pdf.addPage([cardWidthMM, cardHeightMM], 'landscape');
        const backCanvas = await html2canvas(refs.back, {
          scale: 4,
          backgroundColor: null,
          useCORS: true,
          logging: false,
          allowTaint: true
        });
        pdf.addImage(backCanvas.toDataURL('image/png', 1.0), 'PNG', 0, 0, cardWidthMM, cardHeightMM);
      }

      pdf.save(`بطاقات-${section?.full_name || 'القسم'}.pdf`);
    } catch (error) {
      console.error('PDF export error:', error);
      alert('حدث خطأ أثناء تصدير البطاقات');
    } finally {
      setIsExporting(false);
      setExportProgress(0);
      setCurrentStudent('');
    }
  };

  const setCardRef = (studentId: string, type: 'front' | 'back' | 'barcode', ref: HTMLDivElement | SVGSVGElement | null) => {
    if (!cardRefsMap.current.has(studentId)) {
      cardRefsMap.current.set(studentId, { front: null, back: null, barcode: null });
    }
    const refs = cardRefsMap.current.get(studentId)!;
    if (type === 'front') refs.front = ref as HTMLDivElement;
    else if (type === 'back') refs.back = ref as HTMLDivElement;
    else refs.barcode = ref as SVGSVGElement;
  };

  // Fixed card dimensions
  const cardStyle = {
    width: '340px',
    height: '227px',
    borderRadius: '10px',
    overflow: 'hidden',
    position: 'relative' as const,
  };

  if (studentsLoading) {
    return (
      <div className="page-container min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground text-lg">جاري التحميل...</div>
      </div>
    );
  }

  return (
    <div className="page-container min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <header className="glass-nav sticky top-0 z-50">
        <div className="content-container flex items-center justify-between h-16">
          <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2">
            <ArrowRight className="w-5 h-5" />
            <span className="hidden sm:inline">العودة</span>
          </Button>
          <h1 className="text-lg font-bold text-foreground">طباعة بطاقات القسم</h1>
          <div className="w-20" />
        </div>
      </header>

      {/* Main Content */}
      <main className="content-container py-6" dir="rtl">
        <div className="flex flex-col items-center gap-6">
          {/* Section Info */}
          <div className="text-center space-y-2">
            <h2 className="text-xl font-bold text-foreground">
              {section?.full_name}
            </h2>
            <p className="text-muted-foreground">
              عدد التلاميذ: {students?.length || 0}
            </p>
          </div>

          {/* Export Button */}
          <div className="w-full max-w-md space-y-4">
            <Button 
              onClick={exportAllToPDF} 
              className="w-full h-12" 
              variant="default" 
              size="lg"
              disabled={isExporting || !students?.length}
            >
              {isExporting ? (
                <>
                  <Loader2 className="w-5 h-5 ml-2 animate-spin" />
                  جاري التصدير...
                </>
              ) : (
                <>
                  <FileDown className="w-5 h-5 ml-2" />
                  تصدير جميع البطاقات (PDF)
                </>
              )}
            </Button>

            {isExporting && (
              <div className="space-y-2">
                <Progress value={exportProgress} className="h-2" />
                <p className="text-sm text-center text-muted-foreground">
                  {currentStudent && `جاري معالجة: ${currentStudent}`}
                </p>
                <p className="text-xs text-center text-muted-foreground">
                  {Math.round(exportProgress)}%
                </p>
              </div>
            )}

            <p className="text-xs text-muted-foreground text-center">
              سيتم إنشاء ملف PDF يحتوي على بطاقة كل تلميذ (الوجه الأمامي والخلفي)
            </p>
          </div>

          {/* Cards Preview - Hidden but used for export */}
          <div className="w-full">
            <h3 className="text-lg font-semibold mb-4 text-center">معاينة البطاقات</h3>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {students?.map((student) => (
                <div key={student.id} className="space-y-4 p-4 bg-card rounded-xl border">
                  <p className="font-medium text-center">
                    {student.last_name} {student.first_name}
                  </p>
                  
                  <div className="flex flex-col items-center gap-4">
                    {/* Front Card */}
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground text-center">الأمامي</p>
                      <div 
                        ref={(ref) => setCardRef(student.id, 'front', ref)}
                        style={{
                          ...cardStyle,
                          background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 50%, #06b6d4 100%)',
                          boxShadow: '0 8px 30px rgba(59, 130, 246, 0.3)',
                          transform: 'scale(0.7)',
                          transformOrigin: 'top center'
                        }} 
                        dir="rtl"
                      >
                        <WavePattern />
                        
                        {/* Header */}
                        <div className="relative z-10 text-center py-2 px-4">
                          <p style={{ fontSize: '8px', fontWeight: 500, color: 'rgba(255, 255, 255, 0.9)', letterSpacing: '0.5px', fontFamily: 'Arial, Tahoma, sans-serif' }}>
                            الجمهورية الجزائرية الديمقراطية الشعبية
                          </p>
                          <p style={{ fontSize: '7px', color: 'rgba(255, 255, 255, 0.8)', fontFamily: 'Arial, Tahoma, sans-serif' }}>
                            وزارة التربية الوطنية
                          </p>
                          <p style={{ fontSize: '12px', fontWeight: 700, color: '#ffffff', marginTop: '2px', textShadow: '0 1px 3px rgba(0, 0, 0, 0.2)', fontFamily: 'Arial, Tahoma, sans-serif' }}>
                            بطاقة حضور التلميذ
                          </p>
                          <p style={{ fontSize: '8px', fontWeight: 600, color: 'rgba(255, 255, 255, 0.9)', marginTop: '1px', fontFamily: 'Arial, Tahoma, sans-serif' }}>
                            ثانوية العربي عبد القادر
                          </p>
                        </div>

                        {/* Content */}
                        <div className="relative z-10 flex px-4 gap-3" style={{ direction: 'rtl' }}>
                          <div className="flex-1 flex flex-col justify-center gap-2">
                            <div className="flex items-center gap-2">
                              <span style={{ fontSize: '9px', fontWeight: 600, color: 'rgba(255, 255, 255, 0.85)', minWidth: '35px' }}>اللقب:</span>
                              <span style={{ fontSize: '11px', fontWeight: 700, color: '#ffffff' }}>{student.last_name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span style={{ fontSize: '9px', fontWeight: 600, color: 'rgba(255, 255, 255, 0.85)', minWidth: '35px' }}>الاسم:</span>
                              <span style={{ fontSize: '11px', fontWeight: 700, color: '#ffffff' }}>{student.first_name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span style={{ fontSize: '9px', fontWeight: 600, color: 'rgba(255, 255, 255, 0.85)', minWidth: '35px' }}>القسم:</span>
                              <span style={{ fontSize: '10px', fontWeight: 600, color: '#ffffff' }}>{section?.full_name || '-'}</span>
                            </div>
                          </div>

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

                        {/* Footer */}
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
                    </div>

                    {/* Back Card */}
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground text-center">الخلفي</p>
                      <div 
                        ref={(ref) => setCardRef(student.id, 'back', ref)}
                        style={{
                          ...cardStyle,
                          background: 'linear-gradient(135deg, #60a5fa 0%, #3b82f6 50%, #38bdf8 100%)',
                          boxShadow: '0 8px 30px rgba(59, 130, 246, 0.3)',
                          transform: 'scale(0.7)',
                          transformOrigin: 'top center'
                        }} 
                        dir="rtl"
                      >
                        <BackPattern />
                        
                        <div className="relative z-10 text-center py-2">
                          <p style={{ fontSize: '11px', fontWeight: 700, color: '#ffffff', textShadow: '0 1px 4px rgba(0, 0, 0, 0.15)', letterSpacing: '0.5px' }}>
                            رموز التعريف الإلكتروني
                          </p>
                        </div>

                        <div className="relative z-10 flex items-center justify-center gap-6 px-4" style={{ height: 'calc(100% - 45px)' }}>
                          <div className="flex flex-col items-center gap-1">
                            <div style={{
                              background: '#ffffff',
                              padding: '6px',
                              borderRadius: '8px',
                              border: '2px solid rgba(255, 255, 255, 0.7)',
                              boxShadow: '0 4px 15px rgba(0, 0, 0, 0.15)'
                            }}>
                              <QRCodeSVG 
                                value={student.barcode_number || student.student_code || student.id} 
                                size={65} 
                                level="H"
                                includeMargin={false}
                                fgColor="#1e3a5f"
                                bgColor="#ffffff"
                              />
                            </div>
                            <span style={{ fontSize: '8px', fontWeight: 600, color: '#ffffff', textShadow: '0 1px 2px rgba(0, 0, 0, 0.1)' }}>
                              رمز QR
                            </span>
                          </div>

                          <div className="flex flex-col items-center gap-1">
                            <div style={{
                              background: '#ffffff',
                              padding: '4px 8px',
                              borderRadius: '6px',
                              border: '1.5px solid rgba(255, 255, 255, 0.5)',
                              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
                            }}>
                              <svg ref={(ref) => setCardRef(student.id, 'barcode', ref)} style={{ maxWidth: '90px', height: 'auto' }} />
                            </div>
                            <span style={{ fontSize: '8px', fontWeight: 600, color: '#ffffff', textShadow: '0 1px 2px rgba(0, 0, 0, 0.1)' }}>
                              باركود EAN
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default SectionCardsPage;
