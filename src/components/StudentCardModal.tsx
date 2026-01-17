import { useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Printer, Download, User } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import JsBarcode from 'jsbarcode';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

type Student = {
  id: string;
  first_name: string;
  last_name: string;
  birth_date?: string;
  photo_url?: string;
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

  // Generate unique barcode number from student ID (EAN-13 compatible)
  const generateBarcodeNumber = (studentId: string): string => {
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
        const barcodeNumber = generateBarcodeNumber(student.id);
        JsBarcode(barcodeRef.current, barcodeNumber, {
          format: 'CODE128',
          width: 2,
          height: 40,
          displayValue: true,
          fontSize: 10,
          margin: 5,
          background: '#ffffff'
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

    // Clone the node instead of using innerHTML to prevent XSS
    const clonedElement = element.cloneNode(true) as HTMLElement;

    // Create the print document structure
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
              padding: 0.3cm;
              box-sizing: border-box;
              border: 2px solid #1a365d;
              border-radius: 10px;
              background: linear-gradient(145deg, #ffffff 0%, #f0f4f8 100%);
              position: relative;
              overflow: hidden;
            }
            .card::before {
              content: '';
              position: absolute;
              top: 0;
              left: 0;
              right: 0;
              height: 6px;
              background: linear-gradient(90deg, #4361ee, #1a365d);
            }
            .header {
              text-align: right;
              margin-top: 0.15cm;
              margin-bottom: 0.2cm;
            }
            .header-line1 {
              font-size: 8px;
              color: #1a365d;
              font-weight: 500;
            }
            .header-line2 {
              font-size: 11px;
              font-weight: bold;
              color: #1a365d;
            }
            .header-line3 {
              font-size: 8px;
              color: #4361ee;
              font-weight: 500;
            }
            .content {
              display: flex;
              gap: 0.3cm;
              align-items: flex-start;
            }
            .info-side {
              flex: 1;
              display: flex;
              flex-direction: column;
              gap: 0.12cm;
            }
            .info-row {
              font-size: 9px;
              display: flex;
              gap: 4px;
              align-items: baseline;
            }
            .label {
              font-weight: bold;
              color: #1a365d;
              min-width: 55px;
            }
            .value {
              color: #1a1a1a;
            }
            .photo-side {
              width: 2.2cm;
              height: 2.8cm;
              border: 2px solid #4361ee;
              border-radius: 6px;
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
              color: #718096;
              font-size: 8px;
              text-align: center;
            }
            .footer {
              position: absolute;
              bottom: 0.2cm;
              left: 0.3cm;
              right: 0.3cm;
              display: flex;
              justify-content: space-between;
              font-size: 7px;
              color: #718096;
              border-top: 1px dashed #cbd5e0;
              padding-top: 0.1cm;
            }
            .footer-box {
              width: 1.5cm;
              height: 0.6cm;
              border: 1px solid #cbd5e0;
              border-radius: 4px;
            }
            .back-card {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              height: 100%;
              padding-top: 0.2cm;
            }
            .qr-container {
              background: white;
              padding: 0.25cm;
              border-radius: 6px;
              border: 2px solid #4361ee;
              margin-bottom: 0.25cm;
            }
            .barcode-container {
              background: white;
              padding: 0.15cm;
              border-radius: 4px;
              margin-bottom: 0.15cm;
            }
            .back-note {
              font-size: 7px;
              color: #718096;
              text-align: center;
              line-height: 1.3;
            }
          </style>
        </head>
        <body>
          <div class="card" id="print-card"></div>
        </body>
      </html>
    `);
    printDoc.close();
    
    // Append the cloned element to the card container safely
    const cardContainer = printDoc.getElementById('print-card');
    if (cardContainer) {
      // Copy the children from the cloned element
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

  // Format birth date
  const formattedBirthDate = student.birth_date 
    ? format(new Date(student.birth_date), 'yyyy/MM/dd')
    : '-';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>بطاقة التلميذ الذكية</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="front">
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="front">الوجه الأمامي</TabsTrigger>
            <TabsTrigger value="back">الوجه الخلفي</TabsTrigger>
          </TabsList>

          <TabsContent value="front" className="space-y-4">
            {/* Front Card Preview - 6×9 cm ratio (RTL layout) */}
            <div 
              ref={frontCardRef}
              className="w-full bg-gradient-to-br from-white to-slate-100 rounded-xl border-2 border-primary/30 shadow-lg overflow-hidden"
              style={{ aspectRatio: '9/6' }}
            >
              {/* Top border accent */}
              <div className="h-1.5 bg-gradient-to-r from-primary to-primary/70" />
              
              <div className="p-3 h-full flex flex-col" style={{ height: 'calc(100% - 6px)' }}>
                {/* Header - Right aligned (RTL) */}
                <div className="text-right mb-2">
                  <p className="text-[8px] text-primary font-medium">وزارة التربية الوطنية</p>
                  <p className="text-[11px] font-bold text-primary">بطاقة حضور التلميذ</p>
                  <p className="text-[8px] text-primary/80 font-medium">ثانوية العربي عبد القادر</p>
                </div>

                {/* Content - Info on right, Photo on left */}
                <div className="flex gap-3 flex-1">
                  {/* Info - Right side (RTL) */}
                  <div className="flex-1 flex flex-col justify-center gap-1.5">
                    <div className="flex gap-1 text-[10px]">
                      <span className="font-bold text-primary min-w-[50px]">الاسم الكامل:</span>
                      <span className="text-foreground">{student.first_name} {student.last_name}</span>
                    </div>
                    <div className="flex gap-1 text-[10px]">
                      <span className="font-bold text-primary min-w-[50px]">تاريخ الميلاد:</span>
                      <span className="text-foreground">{formattedBirthDate}</span>
                    </div>
                    <div className="flex gap-1 text-[10px]">
                      <span className="font-bold text-primary min-w-[50px]">القسم:</span>
                      <span className="text-foreground">{student.section?.full_name || '-'}</span>
                    </div>
                  </div>

                  {/* Photo Area - Left side (3×4 cm ratio) */}
                  <div className="w-16 h-20 border-2 border-primary/40 rounded-lg flex items-center justify-center bg-white overflow-hidden flex-shrink-0">
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
                <div className="flex justify-between items-center pt-1.5 mt-auto border-t border-dashed border-muted-foreground/30">
                  <div className="flex items-center gap-1">
                    <span className="text-[7px] text-muted-foreground">توقيع المدير:</span>
                    <div className="w-16 h-3 border-b border-muted-foreground/50" />
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[7px] text-muted-foreground">ختم المؤسسة:</span>
                    <div className="w-5 h-5 border border-dashed border-muted-foreground/50 rounded-sm" />
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
              className="w-full bg-gradient-to-br from-white to-slate-100 rounded-xl border-2 border-primary/30 shadow-lg overflow-hidden"
              style={{ aspectRatio: '9/6' }}
            >
              {/* Top border accent */}
              <div className="h-1.5 bg-gradient-to-r from-primary to-primary/70" />
              
              <div className="p-3 h-full flex flex-col items-center justify-center" style={{ height: 'calc(100% - 6px)' }}>
                {/* QR Code */}
                <div className="bg-white p-2 rounded-lg border-2 border-primary/30 mb-2">
                  <QRCodeSVG 
                    value={student.id} 
                    size={70} 
                    level="H"
                    includeMargin={false}
                  />
                </div>

                {/* Barcode */}
                <div className="bg-white px-2 py-1 rounded-lg mb-2">
                  <svg ref={barcodeRef} className="w-32" />
                </div>

                {/* Notes */}
                <div className="text-center space-y-0.5">
                  <p className="text-[8px] text-muted-foreground">هذه البطاقة خاصة بتسجيل الحضور</p>
                  <p className="text-[8px] text-muted-foreground">يرجى المحافظة عليها وعدم إتلافها</p>
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
