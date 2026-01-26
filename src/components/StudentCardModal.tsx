import { useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Printer, Download, User } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import JsBarcode from 'jsbarcode';

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
      // Use student code directly, pad to 12 digits for EAN-13
      return studentCode.replace(/\D/g, '').padStart(12, '0').slice(0, 12);
    }
    // Generate from UUID
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
          format: 'EAN13',
          width: 1.8,
          height: 40,
          displayValue: true,
          fontSize: 11,
          margin: 5,
          background: '#ffffff',
          lineColor: '#1e3a5f'
        });
      } catch (e) {
        // Fallback to CODE128 if EAN13 fails
        try {
          const barcodeNumber = generateBarcodeNumber(student.id, student.student_code);
          JsBarcode(barcodeRef.current, barcodeNumber, {
            format: 'CODE128',
            width: 1.5,
            height: 40,
            displayValue: true,
            fontSize: 10,
            margin: 5,
            background: '#ffffff',
            lineColor: '#1e3a5f'
          });
        } catch (e2) {
          console.error('Barcode generation error:', e2);
        }
      }
    }
  }, [student, open]);

  const printStyles = `
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
      box-sizing: border-box;
      border: 2px solid #4361ee;
      border-radius: 10px;
      background: linear-gradient(180deg, #ffffff 0%, #f0f4ff 100%);
      position: relative;
      overflow: hidden;
    }
    /* Front Card Styles */
    .front-header {
      background: linear-gradient(135deg, #4361ee 0%, #3730a3 100%);
      padding: 0.3cm 0.4cm;
      text-align: center;
      color: white;
    }
    .ministry-text {
      font-size: 8px;
      font-weight: 500;
      opacity: 0.9;
    }
    .card-title {
      font-size: 14px;
      font-weight: bold;
      margin: 3px 0;
      letter-spacing: 0.5px;
    }
    .school-name {
      font-size: 9px;
      font-weight: 500;
      opacity: 0.9;
    }
    .front-content {
      display: flex;
      padding: 0.4cm;
      gap: 0.4cm;
      direction: rtl;
      height: calc(100% - 1.8cm);
    }
    .info-section {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;
      gap: 0.25cm;
    }
    .info-row {
      display: flex;
      align-items: baseline;
      gap: 8px;
      font-size: 11px;
    }
    .info-label {
      font-weight: bold;
      color: #4361ee;
      min-width: 45px;
    }
    .info-value {
      color: #1e293b;
      font-weight: 600;
    }
    .photo-section {
      width: 3cm;
      height: 4cm;
      border: 2px solid #4361ee;
      border-radius: 8px;
      background: white;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      overflow: hidden;
    }
    .photo-section img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .photo-placeholder {
      color: #94a3b8;
      font-size: 10px;
      text-align: center;
    }
    .front-footer {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      padding: 0.25cm 0.4cm;
      background: rgba(248, 250, 252, 0.9);
      border-top: 1px solid #e2e8f0;
    }
    .signature-box {
      text-align: center;
    }
    .signature-label {
      font-size: 7px;
      color: #64748b;
      margin-bottom: 3px;
    }
    .signature-line {
      width: 2.2cm;
      border-bottom: 1px solid #94a3b8;
      height: 12px;
    }
    .stamp-box {
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .stamp-circle {
      width: 1.3cm;
      height: 1.3cm;
      border: 1.5px dashed #94a3b8;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .stamp-text {
      font-size: 6px;
      color: #94a3b8;
    }
    /* Back Card Styles */
    .back-header {
      background: linear-gradient(135deg, #4361ee 0%, #3730a3 100%);
      padding: 0.25cm;
      text-align: center;
      color: white;
    }
    .back-title {
      font-size: 11px;
      font-weight: bold;
    }
    .back-content {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 1.2cm;
      height: calc(100% - 1.5cm);
      padding: 0.3cm;
    }
    .code-box {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.2cm;
    }
    .qr-container {
      background: white;
      padding: 0.25cm;
      border-radius: 8px;
      border: 2px solid #4361ee;
      box-shadow: 0 2px 8px rgba(67, 97, 238, 0.15);
    }
    .barcode-container {
      background: white;
      padding: 0.2cm 0.3cm;
      border-radius: 6px;
      border: 1px solid #e2e8f0;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    }
    .code-label {
      font-size: 9px;
      color: #4361ee;
      font-weight: 600;
    }
    .back-footer {
      position: absolute;
      bottom: 0.2cm;
      left: 0.4cm;
      right: 0.4cm;
      text-align: center;
      font-size: 7px;
      color: #64748b;
      border-top: 1px dashed #cbd5e1;
      padding-top: 0.15cm;
    }
  `;

  const handlePrint = (side: 'front' | 'back') => {
    const element = side === 'front' ? frontCardRef.current : backCardRef.current;
    if (!element) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const clonedElement = element.cloneNode(true) as HTMLElement;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
        <head>
          <meta charset="UTF-8">
          <title>بطاقة التلميذ - ${side === 'front' ? 'الوجه الأمامي' : 'الوجه الخلفي'}</title>
          <style>${printStyles}</style>
        </head>
        <body>
          <div class="card" id="print-card"></div>
        </body>
      </html>
    `);
    printWindow.document.close();
    
    const cardContainer = printWindow.document.getElementById('print-card');
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
        scale: 4,
        backgroundColor: '#ffffff',
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-right">بطاقة التلميذ</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="front" dir="rtl">
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="front">الوجه الأمامي</TabsTrigger>
            <TabsTrigger value="back">الوجه الخلفي</TabsTrigger>
          </TabsList>

          {/* Front Card */}
          <TabsContent value="front" className="space-y-4">
            <div 
              ref={frontCardRef}
              className="w-full rounded-xl border-2 border-primary shadow-lg overflow-hidden"
              style={{ 
                aspectRatio: '9/6',
                background: 'linear-gradient(180deg, #ffffff 0%, #f0f4ff 100%)'
              }}
              dir="rtl"
            >
              {/* Header with blue gradient */}
              <div 
                className="text-center text-white py-3 px-4"
                style={{ background: 'linear-gradient(135deg, #4361ee 0%, #3730a3 100%)' }}
              >
                <p className="text-[8px] font-medium opacity-90">وزارة التربية الوطنية</p>
                <p className="text-[14px] font-bold my-1 tracking-wide">بطاقة حضور التلميذ</p>
                <p className="text-[9px] font-medium opacity-90">ثانوية العربي عبد القادر</p>
              </div>

              {/* Content: Info Right, Photo Left (RTL) */}
              <div className="flex p-4 gap-4" style={{ height: 'calc(100% - 70px)', direction: 'rtl' }}>
                {/* Student Info - Right Side */}
                <div className="flex-1 flex flex-col justify-center gap-3">
                  <div className="flex items-baseline gap-2 text-[11px]">
                    <span className="font-bold text-primary min-w-[40px]">الاسم:</span>
                    <span className="text-foreground font-semibold">{student.first_name}</span>
                  </div>
                  <div className="flex items-baseline gap-2 text-[11px]">
                    <span className="font-bold text-primary min-w-[40px]">اللقب:</span>
                    <span className="text-foreground font-semibold">{student.last_name}</span>
                  </div>
                  <div className="flex items-baseline gap-2 text-[11px]">
                    <span className="font-bold text-primary min-w-[40px]">القسم:</span>
                    <span className="text-foreground font-semibold">{student.section?.full_name || '-'}</span>
                  </div>
                </div>

                {/* Photo Area - Left Side (3×4 cm ratio) */}
                <div 
                  className="border-2 border-primary rounded-lg flex items-center justify-center bg-white overflow-hidden flex-shrink-0"
                  style={{ width: '75px', height: '100px' }}
                >
                  {student.photo_url ? (
                    <img src={student.photo_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-center">
                      <User className="w-8 h-8 text-muted-foreground mx-auto" />
                      <p className="text-[8px] text-muted-foreground mt-1">صورة التلميذ</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer: Signature & Stamp */}
              <div 
                className="absolute bottom-0 left-0 right-0 flex justify-between items-end px-4 py-2"
                style={{ background: 'rgba(248, 250, 252, 0.95)', borderTop: '1px solid #e2e8f0' }}
              >
                <div className="text-center">
                  <p className="text-[7px] text-muted-foreground mb-1">توقيع المدير</p>
                  <div className="w-[55px] border-b border-muted-foreground/50 h-3" />
                </div>
                <div className="flex flex-col items-center">
                  <div 
                    className="w-8 h-8 border-[1.5px] border-dashed border-muted-foreground/50 rounded-full flex items-center justify-center"
                  >
                    <span className="text-[5px] text-muted-foreground">ختم المؤسسة</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={() => handlePrint('front')}>
                <Printer className="w-4 h-4 ml-2" />
                طباعة
              </Button>
              <Button variant="outline" onClick={() => handleDownload('front')}>
                <Download className="w-4 h-4 ml-2" />
                حفظ كصورة
              </Button>
            </div>
          </TabsContent>

          {/* Back Card */}
          <TabsContent value="back" className="space-y-4">
            <div 
              ref={backCardRef}
              className="w-full rounded-xl border-2 border-primary shadow-lg overflow-hidden relative"
              style={{ 
                aspectRatio: '9/6',
                background: 'linear-gradient(180deg, #ffffff 0%, #f0f4ff 100%)'
              }}
              dir="rtl"
            >
              {/* Header */}
              <div 
                className="text-center text-white py-2"
                style={{ background: 'linear-gradient(135deg, #4361ee 0%, #3730a3 100%)' }}
              >
                <p className="text-[11px] font-bold">رموز التعريف</p>
              </div>

              {/* Codes Container - Side by Side: QR Left, Barcode Right */}
              <div className="flex items-center justify-center gap-8 h-[calc(100%-60px)] px-4">
                {/* QR Code - Left */}
                <div className="flex flex-col items-center gap-2">
                  <div 
                    className="bg-white p-3 rounded-lg border-2 border-primary"
                    style={{ boxShadow: '0 4px 12px rgba(67, 97, 238, 0.2)' }}
                  >
                    <QRCodeSVG 
                      value={student.id} 
                      size={80} 
                      level="H"
                      includeMargin={false}
                      fgColor="#1e3a5f"
                    />
                  </div>
                  <span className="text-[9px] font-semibold text-primary">رمز QR</span>
                </div>

                {/* Barcode - Right */}
                <div className="flex flex-col items-center gap-2">
                  <div 
                    className="bg-white p-2 rounded-lg border border-border"
                    style={{ boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)' }}
                  >
                    <svg ref={barcodeRef} className="max-w-[120px]" />
                  </div>
                  <span className="text-[9px] font-semibold text-primary">الباركود EAN-13</span>
                </div>
              </div>

              {/* Footer */}
              <div 
                className="absolute bottom-0 left-0 right-0 text-center py-2 px-4"
                style={{ borderTop: '1px dashed #cbd5e1' }}
              >
                <p className="text-[7px] text-muted-foreground">
                  يرجى المحافظة على هذه البطاقة • للاستخدام الرسمي فقط
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={() => handlePrint('back')}>
                <Printer className="w-4 h-4 ml-2" />
                طباعة
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
