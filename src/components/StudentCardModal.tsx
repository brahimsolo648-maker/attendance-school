import { useRef, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FileDown, User, CreditCard } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import JsBarcode from 'jsbarcode';
import jsPDF from 'jspdf';

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

// Diagonal lines SVG pattern component
const DiagonalLinesPattern = () => (
  <svg 
    className="absolute inset-0 w-full h-full pointer-events-none" 
    style={{ opacity: 0.08 }}
    preserveAspectRatio="none"
  >
    <defs>
      <pattern id="diagonalLines" patternUnits="userSpaceOnUse" width="20" height="20" patternTransform="rotate(45)">
        <line x1="0" y1="0" x2="0" y2="20" stroke="#4361ee" strokeWidth="3" />
      </pattern>
    </defs>
    <rect width="100%" height="100%" fill="url(#diagonalLines)" />
  </svg>
);

const StudentCardModal = ({ open, onOpenChange, student }: StudentCardModalProps) => {
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

  const initializeBarcode = useCallback((ref: SVGSVGElement | null, studentData: Student) => {
    if (!ref) return;
    
    try {
      const barcodeNumber = generateBarcodeNumber(studentData.id, studentData.student_code, studentData.barcode_number);
      JsBarcode(ref, barcodeNumber, {
        format: 'EAN13',
        width: 1.8,
        height: 40,
        displayValue: true,
        fontSize: 10,
        margin: 3,
        background: '#ffffff',
        lineColor: '#1a1a2e'
      });
    } catch {
      try {
        const barcodeNumber = generateBarcodeNumber(studentData.id, studentData.student_code, studentData.barcode_number);
        JsBarcode(ref, barcodeNumber, {
          format: 'CODE128',
          width: 1.5,
          height: 40,
          displayValue: true,
          fontSize: 9,
          margin: 3,
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
        initializeBarcode(frontBarcodeRef.current, student);
        initializeBarcode(backBarcodeRef.current, student);
      }, 100);
    }
  }, [student, open, initializeBarcode]);

  const exportToPDF = async () => {
    if (!frontCardRef.current || !backCardRef.current || !student) return;

    try {
      const html2canvas = (await import('html2canvas')).default;
      
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

  if (!student) return null;

  const cardStyle = {
    width: '340px',
    height: '227px',
    background: '#ffffff',
    borderRadius: '10px',
    overflow: 'hidden',
    position: 'relative' as const,
    boxShadow: '0 4px 15px rgba(67, 97, 238, 0.12)',
    border: '1px solid rgba(67, 97, 238, 0.15)'
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[420px] p-5" dir="rtl">
        <DialogHeader className="pb-3 border-b border-border">
          <DialogTitle className="text-right flex items-center gap-2 text-foreground">
            <CreditCard className="w-5 h-5 text-primary" />
            بطاقة التلميذ
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-3">
          {/* Front Card */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">الوجه الأمامي</p>
            <div ref={frontCardRef} style={cardStyle} dir="rtl">
              {/* Diagonal lines background */}
              <DiagonalLinesPattern />
              
              {/* Top gradient bar */}
              <div 
                className="relative z-10 text-center py-2.5 px-3"
                style={{ 
                  background: 'linear-gradient(135deg, #4361ee 0%, #3a56d4 100%)',
                  color: 'white'
                }}
              >
                <p className="text-[7px] font-medium opacity-85 tracking-wide">الجمهورية الجزائرية الديمقراطية الشعبية</p>
                <p className="text-[6.5px] opacity-75">وزارة التربية الوطنية</p>
                <p className="text-[12px] font-bold my-0.5 tracking-wider">بطاقة حضور التلميذ</p>
                <p className="text-[8px] font-medium opacity-90">ثانوية العربي عبد القادر</p>
              </div>

              {/* Content */}
              <div className="relative z-10 flex p-3 gap-3" style={{ direction: 'rtl' }}>
                {/* Student Info */}
                <div className="flex-1 flex flex-col justify-center gap-1.5 pr-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-bold min-w-[40px]" style={{ color: '#4361ee' }}>اللقب:</span>
                    <span className="text-[10px] font-semibold text-gray-800">{student.last_name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-bold min-w-[40px]" style={{ color: '#4361ee' }}>الاسم:</span>
                    <span className="text-[10px] font-semibold text-gray-800">{student.first_name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-bold min-w-[40px]" style={{ color: '#4361ee' }}>القسم:</span>
                    <span className="text-[10px] font-semibold text-gray-800">{student.section?.full_name || '-'}</span>
                  </div>
                  
                  {/* Mini barcode */}
                  <div className="mt-1">
                    <svg ref={frontBarcodeRef} style={{ maxWidth: '90px', height: '32px' }} />
                  </div>
                </div>

                {/* Photo */}
                <div 
                  className="flex-shrink-0 rounded-lg overflow-hidden flex items-center justify-center"
                  style={{ 
                    width: '70px', 
                    height: '95px',
                    background: 'linear-gradient(145deg, #f8f9ff, #eef1ff)',
                    border: '2px solid rgba(67, 97, 238, 0.25)',
                    boxShadow: '0 2px 8px rgba(67, 97, 238, 0.1)'
                  }}
                >
                  {student.photo_url ? (
                    <img src={student.photo_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-center">
                      <User className="w-6 h-6 mx-auto" style={{ color: '#4361ee', opacity: 0.5 }} />
                      <p className="text-[6px] mt-0.5" style={{ color: '#4361ee', opacity: 0.6 }}>صورة</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div 
                className="absolute bottom-0 left-0 right-0 flex justify-between items-end px-3 py-1.5 z-10"
                style={{ 
                  background: 'rgba(248, 249, 255, 0.9)',
                  borderTop: '1px solid rgba(67, 97, 238, 0.1)'
                }}
              >
                <div className="text-center">
                  <p className="text-[6px]" style={{ color: '#666' }}>توقيع المدير</p>
                  <div className="w-12 h-2.5 border-b" style={{ borderColor: 'rgba(67, 97, 238, 0.3)' }} />
                </div>
                <div className="flex flex-col items-center">
                  <div 
                    className="w-6 h-6 rounded-full border border-dashed flex items-center justify-center"
                    style={{ borderColor: 'rgba(67, 97, 238, 0.4)' }}
                  >
                    <span className="text-[5px]" style={{ color: '#4361ee' }}>ختم</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Back Card */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">الوجه الخلفي</p>
            <div ref={backCardRef} style={cardStyle} dir="rtl">
              {/* Diagonal lines background */}
              <DiagonalLinesPattern />
              
              {/* Header */}
              <div 
                className="relative z-10 text-center py-2 px-3"
                style={{ 
                  background: 'linear-gradient(135deg, #4361ee 0%, #3a56d4 100%)',
                  color: 'white'
                }}
              >
                <p className="text-[9px] font-medium tracking-wide">رموز التعريف الإلكتروني</p>
              </div>

              {/* Codes side by side */}
              <div className="relative z-10 flex items-center justify-center gap-8 h-[calc(100%-36px)] px-4">
                {/* QR Code */}
                <div className="flex flex-col items-center gap-1">
                  <div 
                    className="bg-white p-2 rounded-lg"
                    style={{ 
                      border: '2px solid #4361ee',
                      boxShadow: '0 2px 10px rgba(67, 97, 238, 0.15)'
                    }}
                  >
                    <QRCodeSVG 
                      value={student.barcode_number || student.student_code || student.id} 
                      size={75} 
                      level="H"
                      includeMargin={false}
                      fgColor="#1a1a2e"
                      bgColor="#ffffff"
                    />
                  </div>
                  <span className="text-[8px] font-semibold" style={{ color: '#4361ee' }}>رمز QR</span>
                </div>

                {/* Barcode EAN */}
                <div className="flex flex-col items-center gap-1">
                  <div 
                    className="bg-white px-2 py-1 rounded-lg"
                    style={{ 
                      border: '1px solid rgba(67, 97, 238, 0.2)',
                      boxShadow: '0 2px 6px rgba(0, 0, 0, 0.05)'
                    }}
                  >
                    <svg ref={backBarcodeRef} style={{ maxWidth: '110px', height: 'auto' }} />
                  </div>
                  <span className="text-[8px] font-semibold" style={{ color: '#4361ee' }}>باركود EAN</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Export Button */}
        <div className="pt-3 border-t border-border">
          <Button onClick={exportToPDF} className="w-full" variant="default" size="lg">
            <FileDown className="w-5 h-5 ml-2" />
            تصدير البطاقة كـ PDF
          </Button>
          <p className="text-[9px] text-muted-foreground text-center mt-2">
            سيتم تصدير كل وجه في صفحة منفصلة بحجم 9×6 سم
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default StudentCardModal;
