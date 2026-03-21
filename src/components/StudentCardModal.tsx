import { useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FileDown, User, CreditCard, Maximize2 } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import JsBarcode from 'jsbarcode';
import jsPDF from 'jspdf';
import { useIsMobile } from '@/hooks/use-mobile';

type Student = {
  id: string;
  first_name: string;
  last_name: string;
  birth_date?: string;
  photo_url?: string;
  student_code?: string;
  barcode_number?: string;
  section?: {
    full_name: string;
    year?: string;
    name?: string;
  };
};

type StudentCardModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student: Student | null;
};

// 3 Wide diagonal lines pattern
const WideStripesPattern = () => (
  <svg 
    className="absolute inset-0 w-full h-full pointer-events-none" 
    preserveAspectRatio="none"
    viewBox="0 0 340 227"
  >
    {/* 3 wide diagonal stripes in light blue */}
    <line x1="60" y1="0" x2="0" y2="60" stroke="#4361ee" strokeWidth="12" opacity="0.12" />
    <line x1="170" y1="0" x2="0" y2="170" stroke="#4361ee" strokeWidth="12" opacity="0.1" />
    <line x1="280" y1="0" x2="0" y2="280" stroke="#4361ee" strokeWidth="12" opacity="0.08" />
  </svg>
);

const StudentCardModal = ({ open, onOpenChange, student }: StudentCardModalProps) => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
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

  const initializeBarcode = useCallback((ref: SVGSVGElement | null, studentData: Student) => {
    if (!ref) return;
    
    try {
      const barcodeNumber = generateBarcodeNumber(studentData.student_code, studentData.barcode_number, studentData.id);
      JsBarcode(ref, barcodeNumber, {
        format: 'EAN13',
        width: 1.2,
        height: 30,
        displayValue: true,
        fontSize: 8,
        margin: 2,
        background: '#ffffff',
        lineColor: '#1a1a2e'
      });
    } catch {
      try {
        const barcodeNumber = generateBarcodeNumber(studentData.student_code, studentData.barcode_number, studentData.id);
        JsBarcode(ref, barcodeNumber, {
          format: 'CODE128',
          width: 1,
          height: 30,
          displayValue: true,
          fontSize: 7,
          margin: 2,
          background: '#ffffff',
          lineColor: '#1a1a2e'
        });
      } catch (e2) {
        console.error('Barcode generation error:', e2);
      }
    }
  }, [generateBarcodeNumber]);

  useEffect(() => {
    if (student && open) {
      setTimeout(() => {
        initializeBarcode(backBarcodeRef.current, student);
      }, 100);
    }
  }, [student, open, initializeBarcode]);

  const exportToPDF = async () => {
    if (!frontCardRef.current || !backCardRef.current || !student) return;

    try {
      const html2canvas = (await import('html2canvas')).default;
      
      // Card: 6cm x 9cm = 60mm x 90mm
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
      
      pdf.save(`بطاقة-${student.last_name}-${student.first_name}.pdf`);
    } catch (error) {
      console.error('PDF export error:', error);
      alert('حدث خطأ أثناء تصدير البطاقة');
    }
  };

  const openFullPage = () => {
    if (student) {
      onOpenChange(false);
      navigate(`/admin/student/${student.id}/card`);
    }
  };

  if (!student) return null;

  // Fixed card dimensions to prevent overflow
  const cardStyle = {
    width: '300px',
    height: '200px',
    borderRadius: '8px',
    overflow: 'hidden',
    position: 'relative' as const,
    boxShadow: '0 4px 15px rgba(67, 97, 238, 0.12)',
    border: '1px solid rgba(67, 97, 238, 0.15)'
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[380px] sm:max-w-[400px] p-4 sm:p-5 max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader className="pb-3 border-b border-border">
          <DialogTitle className="text-right flex items-center gap-2 text-foreground">
            <CreditCard className="w-5 h-5 text-primary" />
            بطاقة التلميذ
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-3">
          {/* Front Card */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">الوجه الأمامي</p>
            <div ref={frontCardRef} style={{...cardStyle, background: '#ffffff'}} dir="rtl">
              {/* 3 Wide diagonal stripes */}
              <WideStripesPattern />
              
              {/* Top gradient bar */}
              <div 
                className="relative z-10 text-center py-1.5 px-2"
                style={{ 
                  background: 'linear-gradient(135deg, #4361ee 0%, #3a56d4 100%)',
                  color: 'white'
                }}
              >
                <p style={{ fontSize: '5px', fontWeight: 500, opacity: 0.85, fontFamily: 'Arial, Tahoma, sans-serif' }}>الجمهورية الجزائرية الديمقراطية الشعبية</p>
                <p style={{ fontSize: '4.5px', opacity: 0.75, fontFamily: 'Arial, Tahoma, sans-serif' }}>وزارة التربية الوطنية</p>
                <p style={{ fontSize: '9px', fontWeight: 700, margin: '1px 0', fontFamily: 'Arial, Tahoma, sans-serif' }}>بطاقة حضور التلميذ</p>
                <p style={{ fontSize: '6px', fontWeight: 600, opacity: 0.9, fontFamily: 'Arial, Tahoma, sans-serif' }}>ثانوية العربي عبد القادر</p>
              </div>

              {/* Content */}
              <div className="relative z-10 flex p-2 gap-2" style={{ direction: 'rtl' }}>
                {/* Student Info */}
                <div className="flex-1 flex flex-col justify-center gap-1 pr-1">
                  <div className="flex items-center gap-1">
                    <span style={{ fontSize: '7px', fontWeight: 700, minWidth: '28px', color: '#4361ee' }}>اللقب:</span>
                    <span style={{ fontSize: '8px', fontWeight: 600, color: '#1a1a2e' }}>{student.last_name}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span style={{ fontSize: '7px', fontWeight: 700, minWidth: '28px', color: '#4361ee' }}>الاسم:</span>
                    <span style={{ fontSize: '8px', fontWeight: 600, color: '#1a1a2e' }}>{student.first_name}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span style={{ fontSize: '7px', fontWeight: 700, minWidth: '28px', color: '#4361ee' }}>القسم:</span>
                    <span style={{ fontSize: '8px', fontWeight: 600, color: '#1a1a2e' }}>{student.section?.full_name || '-'}</span>
                  </div>
                </div>

                {/* Photo */}
                <div 
                  className="flex-shrink-0 rounded-md overflow-hidden flex items-center justify-center"
                  style={{ 
                    width: '45px', 
                    height: '60px',
                    background: 'linear-gradient(145deg, #f8f9ff, #eef1ff)',
                    border: '1.5px solid rgba(67, 97, 238, 0.25)'
                  }}
                >
                  {student.photo_url ? (
                    <img src={student.photo_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-center">
                      <User style={{ width: '14px', height: '14px', color: '#4361ee', opacity: 0.5, margin: '0 auto' }} />
                      <p style={{ fontSize: '4px', marginTop: '1px', color: '#4361ee', opacity: 0.6 }}>صورة</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div 
                className="absolute bottom-0 left-0 right-0 flex justify-between items-end px-2 py-1 z-10"
                style={{ background: 'rgba(248, 249, 255, 0.95)', borderTop: '1px solid rgba(67, 97, 238, 0.1)' }}
              >
                <div className="text-center">
                  <p style={{ fontSize: '4px', color: '#666' }}>توقيع المدير</p>
                  <div style={{ width: '30px', height: '1px', marginTop: '1px', borderBottom: '1px solid rgba(67, 97, 238, 0.3)' }} />
                </div>
                <div 
                  style={{
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    border: '1px dashed rgba(67, 97, 238, 0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <span style={{ fontSize: '4px', color: '#4361ee' }}>ختم</span>
                </div>
              </div>
            </div>
          </div>

          {/* Back Card */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">الوجه الخلفي</p>
            <div ref={backCardRef} style={{...cardStyle, background: '#ffffff'}} dir="rtl">
              {/* 3 Wide diagonal stripes */}
              <WideStripesPattern />
              
              {/* Header */}
              <div 
                className="relative z-10 text-center py-1.5 px-2"
                style={{ 
                  background: 'linear-gradient(135deg, #4361ee 0%, #3a56d4 100%)',
                  color: 'white'
                }}
              >
                <p style={{ fontSize: '8px', fontWeight: 600 }}>رموز التعريف الإلكتروني</p>
              </div>

              {/* QR and Barcode side by side */}
              <div className="relative z-10 flex items-center justify-center gap-4 px-3" style={{ height: 'calc(100% - 35px)' }}>
                {/* QR Code */}
                <div className="flex flex-col items-center gap-1">
                  <div 
                    style={{ 
                      background: '#ffffff',
                      padding: '4px',
                      borderRadius: '6px',
                      border: '1.5px solid #4361ee',
                      boxShadow: '0 2px 8px rgba(67, 97, 238, 0.12)'
                    }}
                  >
                    <QRCodeSVG 
                      value={student.barcode_number || student.student_code || student.id} 
                      size={55} 
                      level="H"
                      includeMargin={false}
                      fgColor="#1a1a2e"
                      bgColor="#ffffff"
                    />
                  </div>
                  <span style={{ fontSize: '6px', fontWeight: 600, color: '#4361ee' }}>رمز QR</span>
                </div>

                {/* Barcode EAN */}
                <div className="flex flex-col items-center gap-1">
                  <div 
                    style={{ 
                      background: '#ffffff',
                      padding: '3px 6px',
                      borderRadius: '4px',
                      border: '1px solid rgba(67, 97, 238, 0.2)'
                    }}
                  >
                    <svg ref={backBarcodeRef} style={{ maxWidth: '80px', height: 'auto' }} />
                  </div>
                  <span style={{ fontSize: '6px', fontWeight: 600, color: '#4361ee' }}>باركود EAN</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-3 border-t border-border space-y-2">
          <div className="flex gap-2">
            <Button onClick={exportToPDF} className="flex-1" variant="default" size="default">
              <FileDown className="w-4 h-4 ml-2" />
              تصدير PDF
            </Button>
            <Button onClick={openFullPage} variant="outline" size="default">
              <Maximize2 className="w-4 h-4 ml-2" />
              عرض كامل
            </Button>
          </div>
          <p className="text-[8px] text-muted-foreground text-center">
            كل وجه في صفحة منفصلة بحجم 6×9 سم
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default StudentCardModal;
