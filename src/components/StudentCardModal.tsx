import { useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Printer, Download, User } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import JsBarcode from 'jsbarcode';
import { format } from 'date-fns';

type Student = {
  id: string;
  first_name: string;
  last_name: string;
  birth_date?: string;
  photo_url?: string;
  student_code?: string;
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
  const barcodeRef = useRef<SVGSVGElement>(null);
  const frontCardRef = useRef<HTMLDivElement>(null);
  const backCardRef = useRef<HTMLDivElement>(null);

  // Generate unique barcode number from student ID or student_code
  const generateBarcodeNumber = (studentId: string, studentCode?: string): string => {
    if (studentCode) {
      // Pad or truncate to 12 digits for EAN-13 compatibility
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
  };

  useEffect(() => {
    if (barcodeRef.current && student && open) {
      try {
        const barcodeNumber = generateBarcodeNumber(student.id, student.student_code);
        JsBarcode(barcodeRef.current, barcodeNumber, {
          format: 'CODE128',
          width: 1.5,
          height: 35,
          displayValue: true,
          fontSize: 10,
          margin: 5,
          background: '#ffffff',
          lineColor: '#1a365d'
        });
      } catch (e) {
        console.error('Barcode generation error:', e);
      }
    }
  }, [student, open]);

  const handlePrint = (side: 'front' | 'back') => {
    const element = side === 'front' ? frontCardRef.current : backCardRef.current;
    if (!element) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const clonedElement = element.cloneNode(true) as HTMLElement;

    const printDoc = printWindow.document;
    printDoc.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
        <head>
          <meta charset="UTF-8">
          <title>بطاقة التلميذ - ${side === 'front' ? 'الوجه الأمامي' : 'الوجه الخلفي'}</title>
          <style>
            @page { 
              size: 9cm 6cm; 
              margin: 0; 
            }
            * {
              box-sizing: border-box;
              margin: 0;
              padding: 0;
            }
            body { 
              margin: 0;
              padding: 0;
              display: flex; 
              justify-content: center; 
              align-items: center;
              min-height: 100vh;
              font-family: 'Segoe UI', Tahoma, Arial, sans-serif;
              direction: rtl;
              background: white;
            }
            .card {
              width: 9cm;
              height: 6cm;
              padding: 0.4cm;
              box-sizing: border-box;
              border: 2px solid #4361ee;
              border-radius: 12px;
              background: linear-gradient(145deg, #ffffff 0%, #f8fafc 100%);
              position: relative;
              overflow: hidden;
            }
            .card::before {
              content: '';
              position: absolute;
              top: 0;
              left: 0;
              right: 0;
              height: 8px;
              background: linear-gradient(90deg, #4361ee, #3730a3);
            }
            .header {
              text-align: center;
              margin-top: 0.2cm;
              margin-bottom: 0.25cm;
              padding-bottom: 0.15cm;
              border-bottom: 1px solid #e2e8f0;
            }
            .header-line1 {
              font-size: 9px;
              color: #4361ee;
              font-weight: 600;
            }
            .header-line2 {
              font-size: 13px;
              font-weight: bold;
              color: #1e3a5f;
              margin: 2px 0;
            }
            .header-line3 {
              font-size: 9px;
              color: #64748b;
              font-weight: 500;
            }
            .content {
              display: flex;
              gap: 0.35cm;
              align-items: flex-start;
              direction: rtl;
            }
            .info-side {
              flex: 1;
              display: flex;
              flex-direction: column;
              gap: 0.15cm;
            }
            .info-row {
              font-size: 10px;
              display: flex;
              gap: 6px;
              align-items: baseline;
            }
            .label {
              font-weight: bold;
              color: #4361ee;
              min-width: 65px;
            }
            .value {
              color: #1e293b;
              font-weight: 500;
            }
            .photo-side {
              width: 2.4cm;
              height: 3cm;
              border: 2px solid #4361ee;
              border-radius: 8px;
              display: flex;
              align-items: center;
              justify-content: center;
              background: white;
              overflow: hidden;
              flex-shrink: 0;
            }
            .photo-side img {
              width: 100%;
              height: 100%;
              object-fit: cover;
            }
            .photo-placeholder {
              color: #94a3b8;
              font-size: 9px;
              text-align: center;
            }
            .footer {
              position: absolute;
              bottom: 0.25cm;
              left: 0.4cm;
              right: 0.4cm;
              display: flex;
              justify-content: space-between;
              align-items: center;
              font-size: 8px;
              color: #64748b;
              border-top: 1px dashed #cbd5e1;
              padding-top: 0.15cm;
            }
            .signature-area {
              display: flex;
              flex-direction: column;
              align-items: flex-start;
              gap: 2px;
            }
            .signature-line {
              width: 2cm;
              border-bottom: 1px solid #94a3b8;
            }
            .stamp-area {
              width: 1.2cm;
              height: 1.2cm;
              border: 1px dashed #94a3b8;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 6px;
            }
            .back-content {
              display: flex;
              flex-direction: row;
              align-items: center;
              justify-content: center;
              gap: 1cm;
              height: calc(100% - 1.2cm);
              padding-top: 0.5cm;
            }
            .code-container {
              display: flex;
              flex-direction: column;
              align-items: center;
              gap: 0.2cm;
            }
            .qr-wrapper {
              background: white;
              padding: 0.25cm;
              border-radius: 8px;
              border: 2px solid #4361ee;
            }
            .barcode-wrapper {
              background: white;
              padding: 0.2cm;
              border-radius: 6px;
              border: 1px solid #e2e8f0;
            }
            .code-label {
              font-size: 8px;
              color: #64748b;
              font-weight: 500;
            }
            .back-footer {
              position: absolute;
              bottom: 0.25cm;
              left: 0.4cm;
              right: 0.4cm;
              text-align: center;
              font-size: 7px;
              color: #94a3b8;
              line-height: 1.4;
            }
          </style>
        </head>
        <body>
          <div class="card" id="print-card"></div>
        </body>
      </html>
    `);
    printDoc.close();
    
    const cardContainer = printDoc.getElementById('print-card');
    if (cardContainer) {
      while (clonedElement.firstChild) {
        cardContainer.appendChild(clonedElement.firstChild);
      }
    }
    
    setTimeout(() => {
      printWindow.print();
    }, 300);
  };

  const handleDownload = async (side: 'front' | 'back') => {
    const element = side === 'front' ? frontCardRef.current : backCardRef.current;
    if (!element) return;

    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(element, { 
        scale: 3,
        backgroundColor: null,
        useCORS: true
      });
      const link = document.createElement('a');
      link.download = `بطاقة-${student?.last_name}-${student?.first_name}-${side === 'front' ? 'أمامي' : 'خلفي'}.png`;
      link.href = canvas.toDataURL('image/png', 1.0);
      link.click();
    } catch {
      alert('لتحميل الصورة، استخدم زر الطباعة وحفظ كـ PDF');
    }
  };

  if (!student) return null;

  const formattedBirthDate = student.birth_date 
    ? format(new Date(student.birth_date), 'yyyy/MM/dd')
    : '-';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-right">بطاقة التلميذ الذكية</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="front" dir="rtl">
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="front">الوجه الأمامي</TabsTrigger>
            <TabsTrigger value="back">الوجه الخلفي</TabsTrigger>
          </TabsList>

          <TabsContent value="front" className="space-y-4">
            {/* Front Card Preview - 6×9 cm ratio (RTL layout) */}
            <div 
              ref={frontCardRef}
              className="w-full rounded-xl border-2 border-primary shadow-lg overflow-hidden"
              style={{ 
                aspectRatio: '9/6',
                background: 'linear-gradient(145deg, #ffffff 0%, #f8fafc 100%)'
              }}
              dir="rtl"
            >
              {/* Top border accent */}
              <div className="h-2" style={{ background: 'linear-gradient(90deg, #4361ee, #3730a3)' }} />
              
              <div className="p-3 h-full flex flex-col" style={{ height: 'calc(100% - 8px)' }}>
                {/* Header - Centered */}
                <div className="text-center mb-2 pb-2 border-b border-border/50">
                  <p className="text-[9px] text-primary font-semibold">وزارة التربية الوطنية</p>
                  <p className="text-[13px] font-bold" style={{ color: '#1e3a5f' }}>بطاقة حضور التلميذ</p>
                  <p className="text-[9px] text-muted-foreground font-medium">ثانوية العربي عبد القادر</p>
                </div>

                {/* Content - Info on right, Photo on left (RTL) */}
                <div className="flex gap-3 flex-1" style={{ direction: 'rtl' }}>
                  {/* Info - Right side (RTL) */}
                  <div className="flex-1 flex flex-col justify-center gap-2">
                    <div className="flex gap-2 text-[10px]">
                      <span className="font-bold text-primary min-w-[60px]">الاسم الكامل:</span>
                      <span className="text-foreground font-medium">{student.last_name} {student.first_name}</span>
                    </div>
                    <div className="flex gap-2 text-[10px]">
                      <span className="font-bold text-primary min-w-[60px]">تاريخ الميلاد:</span>
                      <span className="text-foreground font-medium">{formattedBirthDate}</span>
                    </div>
                    <div className="flex gap-2 text-[10px]">
                      <span className="font-bold text-primary min-w-[60px]">القسم:</span>
                      <span className="text-foreground font-medium">{student.section?.full_name || '-'}</span>
                    </div>
                    {student.student_code && (
                      <div className="flex gap-2 text-[10px]">
                        <span className="font-bold text-primary min-w-[60px]">رقم التعريف:</span>
                        <span className="text-foreground font-mono font-medium">{student.student_code}</span>
                      </div>
                    )}
                  </div>

                  {/* Photo Area - Left side (3×4 cm ratio) */}
                  <div 
                    className="border-2 border-primary rounded-lg flex items-center justify-center bg-white overflow-hidden flex-shrink-0"
                    style={{ width: '60px', height: '75px' }}
                  >
                    {student.photo_url ? (
                      <img src={student.photo_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-center">
                        <User className="w-6 h-6 text-muted-foreground mx-auto" />
                        <p className="text-[7px] text-muted-foreground mt-0.5">صورة</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer */}
                <div className="flex justify-between items-center pt-2 mt-auto border-t border-dashed border-muted-foreground/30">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[7px] text-muted-foreground">توقيع المدير:</span>
                    <div className="w-16 border-b border-muted-foreground/50" />
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[7px] text-muted-foreground">الختم:</span>
                    <div className="w-7 h-7 border border-dashed border-muted-foreground/50 rounded-full flex items-center justify-center">
                      <span className="text-[5px] text-muted-foreground">ختم</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={() => handlePrint('front')}>
                <Printer className="w-4 h-4 ml-2" />
                طباعة الوجه الأمامي
              </Button>
              <Button variant="outline" onClick={() => handleDownload('front')}>
                <Download className="w-4 h-4 ml-2" />
                حفظ كصورة
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="back" className="space-y-4">
            {/* Back Card Preview */}
            <div 
              ref={backCardRef}
              className="w-full rounded-xl border-2 border-primary shadow-lg overflow-hidden"
              style={{ 
                aspectRatio: '9/6',
                background: 'linear-gradient(145deg, #ffffff 0%, #f8fafc 100%)'
              }}
              dir="rtl"
            >
              {/* Top border accent */}
              <div className="h-2" style={{ background: 'linear-gradient(90deg, #4361ee, #3730a3)' }} />
              
              <div className="p-3 h-full flex flex-col" style={{ height: 'calc(100% - 8px)' }}>
                {/* Header */}
                <div className="text-center mb-2">
                  <p className="text-[10px] font-semibold" style={{ color: '#1e3a5f' }}>رموز المسح الضوئي</p>
                </div>

                {/* Codes Container - Side by Side */}
                <div className="flex-1 flex items-center justify-center gap-6">
                  {/* QR Code - Left */}
                  <div className="flex flex-col items-center gap-1">
                    <div className="bg-white p-2 rounded-lg border-2 border-primary">
                      <QRCodeSVG 
                        value={student.id} 
                        size={65} 
                        level="H"
                        includeMargin={false}
                        fgColor="#1e3a5f"
                      />
                    </div>
                    <span className="text-[8px] text-muted-foreground">رمز QR</span>
                  </div>

                  {/* Barcode - Right */}
                  <div className="flex flex-col items-center gap-1">
                    <div className="bg-white p-2 rounded-lg border border-border">
                      <svg ref={barcodeRef} className="max-w-[100px]" />
                    </div>
                    <span className="text-[8px] text-muted-foreground">الباركود</span>
                  </div>
                </div>

                {/* Footer Note */}
                <div className="text-center pt-2 border-t border-dashed border-muted-foreground/30">
                  <p className="text-[7px] text-muted-foreground leading-relaxed">
                    هذه البطاقة خاصة بتسجيل الحضور • يرجى المحافظة عليها
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={() => handlePrint('back')}>
                <Printer className="w-4 h-4 ml-2" />
                طباعة الوجه الخلفي
              </Button>
              <Button variant="outline" onClick={() => handleDownload('back')}>
                <Download className="w-4 h-4 ml-2" />
                حفظ كصورة
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default StudentCardModal;
