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

const StudentCardModal = ({ open, onOpenChange, student }: StudentCardModalProps) => {
  const frontBarcodeRef = useRef<SVGSVGElement>(null);
  const backBarcodeRef = useRef<SVGSVGElement>(null);
  const frontCardRef = useRef<HTMLDivElement>(null);
  const backCardRef = useRef<HTMLDivElement>(null);

  // Generate unique barcode number from student ID or student_code
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
        width: 2,
        height: 45,
        displayValue: true,
        fontSize: 11,
        margin: 5,
        background: '#ffffff',
        lineColor: '#1a1a2e'
      });
    } catch {
      try {
        const barcodeNumber = generateBarcodeNumber(studentData.id, studentData.student_code, studentData.barcode_number);
        JsBarcode(ref, barcodeNumber, {
          format: 'CODE128',
          width: 1.5,
          height: 45,
          displayValue: true,
          fontSize: 10,
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
      
      // Card dimensions: 9cm x 6cm = ~255.12pt x 170.08pt (at 72dpi)
      // Using mm for jsPDF: 90mm x 60mm
      const cardWidthMM = 90;
      const cardHeightMM = 60;
      
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: [cardWidthMM, cardHeightMM]
      });

      // Capture front card
      const frontCanvas = await html2canvas(frontCardRef.current, {
        scale: 4,
        backgroundColor: '#ffffff',
        useCORS: true,
        logging: false
      });
      
      const frontImgData = frontCanvas.toDataURL('image/png', 1.0);
      pdf.addImage(frontImgData, 'PNG', 0, 0, cardWidthMM, cardHeightMM);
      
      // Add new page for back
      pdf.addPage([cardWidthMM, cardHeightMM], 'landscape');
      
      // Capture back card
      const backCanvas = await html2canvas(backCardRef.current, {
        scale: 4,
        backgroundColor: '#ffffff',
        useCORS: true,
        logging: false
      });
      
      const backImgData = backCanvas.toDataURL('image/png', 1.0);
      pdf.addImage(backImgData, 'PNG', 0, 0, cardWidthMM, cardHeightMM);
      
      // Save PDF
      pdf.save(`بطاقة-${student.last_name}-${student.first_name}.pdf`);
    } catch (error) {
      console.error('PDF export error:', error);
      alert('حدث خطأ أثناء تصدير البطاقة');
    }
  };

  if (!student) return null;

  // Shared card styles
  const cardContainerStyle = {
    width: '340px',
    height: '227px', // 9:6 aspect ratio
    background: '#ffffff',
    borderRadius: '12px',
    overflow: 'hidden',
    position: 'relative' as const,
    boxShadow: '0 4px 20px rgba(67, 97, 238, 0.15)',
    border: '1px solid hsl(var(--primary) / 0.2)'
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[420px] p-6" dir="rtl">
        <DialogHeader className="pb-4 border-b border-border">
          <DialogTitle className="text-right flex items-center gap-2 text-foreground">
            <CreditCard className="w-5 h-5 text-primary" />
            بطاقة التلميذ
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Front Card Preview */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">الوجه الأمامي</p>
            <div 
              ref={frontCardRef}
              style={cardContainerStyle}
              dir="rtl"
            >
              {/* Decorative gradient accent */}
              <div 
                className="absolute top-0 left-0 right-0 h-1"
                style={{ background: 'linear-gradient(90deg, hsl(var(--primary)), hsl(var(--primary) / 0.6))' }}
              />
              
              {/* Header */}
              <div 
                className="text-center py-3 px-4"
                style={{ 
                  background: 'hsl(var(--primary))',
                  color: 'white'
                }}
              >
                <p className="text-[8px] font-medium opacity-90">الجمهورية الجزائرية الديمقراطية الشعبية</p>
                <p className="text-[7px] opacity-80">وزارة التربية الوطنية</p>
                <p className="text-[13px] font-bold my-0.5 tracking-wide">بطاقة حضور التلميذ</p>
                <p className="text-[9px] font-medium">ثانوية العربي عبد القادر</p>
              </div>

              {/* Content Area */}
              <div className="flex p-3 gap-3" style={{ direction: 'rtl' }}>
                {/* Student Info */}
                <div className="flex-1 flex flex-col justify-center gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-primary min-w-[45px]">اللقب:</span>
                    <span className="text-[11px] font-semibold text-foreground">{student.last_name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-primary min-w-[45px]">الاسم:</span>
                    <span className="text-[11px] font-semibold text-foreground">{student.first_name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-primary min-w-[45px]">القسم:</span>
                    <span className="text-[11px] font-semibold text-foreground">{student.section?.full_name || '-'}</span>
                  </div>
                  
                  {/* Small barcode on front */}
                  <div className="mt-1 flex justify-start">
                    <svg 
                      ref={frontBarcodeRef} 
                      style={{ maxWidth: '100px', height: '35px' }}
                    />
                  </div>
                </div>

                {/* Photo Area */}
                <div 
                  className="flex-shrink-0 rounded-lg overflow-hidden flex items-center justify-center bg-secondary/30"
                  style={{ 
                    width: '75px', 
                    height: '100px',
                    border: '2px solid hsl(var(--primary) / 0.3)'
                  }}
                >
                  {student.photo_url ? (
                    <img src={student.photo_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-center">
                      <User className="w-7 h-7 mx-auto text-muted-foreground" />
                      <p className="text-[7px] mt-0.5 text-muted-foreground">صورة</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div 
                className="absolute bottom-0 left-0 right-0 flex justify-between items-end px-3 py-1.5"
                style={{ 
                  background: 'hsl(var(--secondary) / 0.5)',
                  borderTop: '1px solid hsl(var(--border))'
                }}
              >
                <div className="text-center">
                  <p className="text-[7px] text-muted-foreground">توقيع المدير</p>
                  <div className="w-12 h-3 border-b border-muted-foreground/50" />
                </div>
                <div className="flex flex-col items-center">
                  <div className="w-7 h-7 rounded-full border border-dashed border-muted-foreground/50 flex items-center justify-center">
                    <span className="text-[5px] text-muted-foreground">ختم</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Back Card Preview */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">الوجه الخلفي</p>
            <div 
              ref={backCardRef}
              style={cardContainerStyle}
              dir="rtl"
            >
              {/* Header accent */}
              <div 
                className="text-center py-2 px-4"
                style={{ 
                  background: 'hsl(var(--primary))',
                  color: 'white'
                }}
              >
                <p className="text-[10px] font-medium">رموز التعريف الإلكتروني</p>
              </div>

              {/* Codes Container */}
              <div className="flex items-center justify-center gap-6 h-[calc(100%-40px)] px-4">
                {/* QR Code */}
                <div className="flex flex-col items-center gap-1.5">
                  <div 
                    className="bg-white p-2 rounded-lg"
                    style={{ 
                      border: '2px solid hsl(var(--primary))',
                      boxShadow: '0 2px 10px hsl(var(--primary) / 0.15)'
                    }}
                  >
                    <QRCodeSVG 
                      value={student.barcode_number || student.student_code || student.id} 
                      size={80} 
                      level="H"
                      includeMargin={false}
                      fgColor="#1a1a2e"
                      bgColor="#ffffff"
                    />
                  </div>
                  <span className="text-[9px] font-semibold text-primary">رمز QR</span>
                </div>

                {/* Barcode */}
                <div className="flex flex-col items-center gap-1.5">
                  <div 
                    className="bg-white px-2 py-1.5 rounded-lg"
                    style={{ 
                      border: '1px solid hsl(var(--border))',
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)'
                    }}
                  >
                    <svg 
                      ref={backBarcodeRef} 
                      style={{ maxWidth: '120px', height: 'auto' }} 
                    />
                  </div>
                  <span className="text-[9px] font-semibold text-primary">الباركود</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Export Button */}
        <div className="pt-4 border-t border-border">
          <Button 
            onClick={exportToPDF} 
            className="w-full"
            variant="gradient"
            size="lg"
          >
            <FileDown className="w-5 h-5 ml-2" />
            تصدير البطاقة كـ PDF
          </Button>
          <p className="text-[10px] text-muted-foreground text-center mt-2">
            سيتم تصدير الوجهين في ملف PDF واحد بحجم 9×6 سم
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default StudentCardModal;
