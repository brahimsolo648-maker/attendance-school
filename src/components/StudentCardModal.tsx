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
          format: 'EAN13',
          width: 2,
          height: 50,
          displayValue: true,
          fontSize: 12,
          margin: 8,
          background: '#ffffff',
          lineColor: '#000000'
        });
      } catch (e) {
        try {
          const barcodeNumber = generateBarcodeNumber(student.id, student.student_code);
          JsBarcode(barcodeRef.current, barcodeNumber, {
            format: 'CODE128',
            width: 1.8,
            height: 50,
            displayValue: true,
            fontSize: 11,
            margin: 8,
            background: '#ffffff',
            lineColor: '#000000'
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
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .card {
      width: 9cm;
      height: 6cm;
      box-sizing: border-box;
      border: 1px solid #4361ee;
      border-radius: 8px;
      background: #ffffff;
      position: relative;
      overflow: hidden;
    }
    .diagonal-lines {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      overflow: hidden;
      pointer-events: none;
      z-index: 0;
    }
    .diagonal-line {
      position: absolute;
      width: 200%;
      height: 3px;
      background: rgba(67, 97, 238, 0.08);
      transform-origin: center;
    }
    .line-1 { top: 30%; left: -50%; transform: rotate(-15deg); }
    .line-2 { top: 50%; left: -50%; transform: rotate(-15deg); }
    .line-3 { top: 70%; left: -50%; transform: rotate(-15deg); }
    .front-header {
      background: #4361ee;
      padding: 0.35cm 0.5cm;
      text-align: center;
      color: white;
      position: relative;
      z-index: 1;
    }
    .ministry-text {
      font-size: 9px;
      font-weight: 500;
      margin-bottom: 2px;
    }
    .card-title {
      font-size: 16px;
      font-weight: bold;
      margin: 4px 0;
    }
    .school-name {
      font-size: 10px;
      font-weight: 500;
    }
    .front-content {
      display: flex;
      padding: 0.4cm 0.5cm;
      gap: 0.5cm;
      direction: rtl;
      position: relative;
      z-index: 1;
    }
    .info-section {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;
      gap: 0.3cm;
    }
    .info-row {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
    }
    .info-label {
      font-weight: bold;
      color: #4361ee;
      min-width: 50px;
    }
    .info-value {
      color: #1a1a2e;
      font-weight: 600;
    }
    .photo-section {
      width: 3cm;
      height: 4cm;
      border: 2px solid #4361ee;
      border-radius: 6px;
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
      padding: 0.25cm 0.5cm;
      background: rgba(255, 255, 255, 0.95);
      border-top: 1px solid #e5e5e5;
      z-index: 1;
    }
    .signature-box {
      text-align: center;
    }
    .signature-label {
      font-size: 8px;
      color: #666;
      margin-bottom: 4px;
    }
    .signature-line {
      width: 2.5cm;
      border-bottom: 1px solid #999;
      height: 15px;
    }
    .stamp-box {
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .stamp-circle {
      width: 1.4cm;
      height: 1.4cm;
      border: 1.5px dashed #999;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .stamp-text {
      font-size: 7px;
      color: #999;
    }
    .back-content {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 1.5cm;
      height: 100%;
      padding: 0.5cm;
    }
    .code-box {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.3cm;
    }
    .qr-container {
      background: white;
      padding: 0.3cm;
      border-radius: 8px;
      border: 2px solid #4361ee;
    }
    .barcode-container {
      background: white;
      padding: 0.2cm 0.4cm;
      border-radius: 6px;
      border: 1px solid #ddd;
    }
    .code-label {
      font-size: 10px;
      color: #4361ee;
      font-weight: 600;
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
              className="w-full rounded-lg border border-primary shadow-lg overflow-hidden relative"
              style={{ 
                aspectRatio: '9/6',
                background: '#ffffff'
              }}
              dir="rtl"
            >
              {/* Diagonal decorative lines */}
              <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
                <div 
                  className="absolute w-[200%] h-[3px]"
                  style={{ 
                    top: '35%', 
                    left: '-50%', 
                    transform: 'rotate(-12deg)',
                    background: 'rgba(67, 97, 238, 0.1)'
                  }}
                />
                <div 
                  className="absolute w-[200%] h-[3px]"
                  style={{ 
                    top: '50%', 
                    left: '-50%', 
                    transform: 'rotate(-12deg)',
                    background: 'rgba(67, 97, 238, 0.08)'
                  }}
                />
                <div 
                  className="absolute w-[200%] h-[3px]"
                  style={{ 
                    top: '65%', 
                    left: '-50%', 
                    transform: 'rotate(-12deg)',
                    background: 'rgba(67, 97, 238, 0.06)'
                  }}
                />
              </div>

              {/* Header with solid blue */}
              <div 
                className="text-center text-white py-3 px-4 relative z-10"
                style={{ background: '#4361ee' }}
              >
                <p className="text-[9px] font-medium">وزارة التربية الوطنية</p>
                <p className="text-[15px] font-bold my-1">بطاقة حضور التلميذ</p>
                <p className="text-[10px] font-medium">ثانوية العربي عبد القادر</p>
              </div>

              {/* Content: Info Right, Photo Left (RTL) */}
              <div className="flex p-4 gap-4 relative z-10" style={{ direction: 'rtl' }}>
                {/* Student Info - Right Side */}
                <div className="flex-1 flex flex-col justify-center gap-3">
                  <div className="flex items-center gap-2 text-[12px]">
                    <span className="font-bold min-w-[50px]" style={{ color: '#4361ee' }}>الاسم:</span>
                    <span className="font-semibold" style={{ color: '#1a1a2e' }}>{student.first_name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[12px]">
                    <span className="font-bold min-w-[50px]" style={{ color: '#4361ee' }}>اللقب:</span>
                    <span className="font-semibold" style={{ color: '#1a1a2e' }}>{student.last_name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[12px]">
                    <span className="font-bold min-w-[50px]" style={{ color: '#4361ee' }}>القسم:</span>
                    <span className="font-semibold" style={{ color: '#1a1a2e' }}>{student.section?.full_name || '-'}</span>
                  </div>
                </div>

                {/* Photo Area - Left Side (3×4 cm ratio) */}
                <div 
                  className="rounded-md flex items-center justify-center bg-white overflow-hidden flex-shrink-0"
                  style={{ 
                    width: '80px', 
                    height: '107px',
                    border: '2px solid #4361ee'
                  }}
                >
                  {student.photo_url ? (
                    <img src={student.photo_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-center">
                      <User className="w-8 h-8 mx-auto" style={{ color: '#94a3b8' }} />
                      <p className="text-[8px] mt-1" style={{ color: '#94a3b8' }}>صورة التلميذ</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer: Signature & Stamp */}
              <div 
                className="absolute bottom-0 left-0 right-0 flex justify-between items-end px-4 py-2 z-10"
                style={{ 
                  background: 'rgba(255, 255, 255, 0.95)', 
                  borderTop: '1px solid #e5e5e5' 
                }}
              >
                <div className="text-center">
                  <p className="text-[8px] mb-1" style={{ color: '#666' }}>توقيع المدير</p>
                  <div className="h-4" style={{ width: '60px', borderBottom: '1px solid #999' }} />
                </div>
                <div className="flex flex-col items-center">
                  <div 
                    className="w-9 h-9 rounded-full flex items-center justify-center"
                    style={{ border: '1.5px dashed #999' }}
                  >
                    <span className="text-[6px]" style={{ color: '#999' }}>ختم المؤسسة</span>
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
              className="w-full rounded-lg border border-primary shadow-lg overflow-hidden relative"
              style={{ 
                aspectRatio: '9/6',
                background: '#ffffff'
              }}
              dir="rtl"
            >
              {/* Codes Container - Side by Side: QR Left, Barcode Right */}
              <div className="flex items-center justify-center gap-6 h-full px-6">
                {/* QR Code - Left */}
                <div className="flex flex-col items-center gap-2">
                  <div 
                    className="bg-white p-3 rounded-lg"
                    style={{ 
                      border: '2px solid #4361ee',
                      boxShadow: '0 2px 8px rgba(67, 97, 238, 0.15)'
                    }}
                  >
                    <QRCodeSVG 
                      value={student.id} 
                      size={90} 
                      level="H"
                      includeMargin={false}
                      fgColor="#000000"
                      bgColor="#ffffff"
                    />
                  </div>
                  <span className="text-[10px] font-semibold" style={{ color: '#4361ee' }}>رمز QR</span>
                </div>

                {/* Barcode - Right */}
                <div className="flex flex-col items-center gap-2">
                  <div 
                    className="bg-white px-3 py-2 rounded-md"
                    style={{ 
                      border: '1px solid #ddd',
                      boxShadow: '0 2px 6px rgba(0, 0, 0, 0.08)'
                    }}
                  >
                    <svg ref={barcodeRef} style={{ maxWidth: '130px', height: 'auto' }} />
                  </div>
                  <span className="text-[10px] font-semibold" style={{ color: '#4361ee' }}>الباركود EAN-13</span>
                </div>
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
