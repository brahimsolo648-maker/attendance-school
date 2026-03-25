import { useRef, useEffect, useState } from 'react';
import SignaturePadLib from 'signature_pad';
import { Button } from '@/components/ui/button';
import { Eraser, Save } from 'lucide-react';

interface SignaturePadProps {
  onSave?: (dataUrl: string) => void;
  width?: number;
  height?: number;
}

const SignaturePad = ({ onSave, width = 400, height = 200 }: SignaturePadProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const signaturePadRef = useRef<SignaturePadLib | null>(null);
  const [isEmpty, setIsEmpty] = useState(true);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    canvas.width = canvas.offsetWidth * ratio;
    canvas.height = canvas.offsetHeight * ratio;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(ratio, ratio);
    }

    signaturePadRef.current = new SignaturePadLib(canvas, {
      backgroundColor: 'rgb(255, 255, 255)',
      penColor: 'rgb(0, 0, 0)',
    });

    signaturePadRef.current.addEventListener('beginStroke', () => {
      setIsEmpty(false);
    });

    return () => {
      signaturePadRef.current?.off();
    };
  }, []);

  const handleClear = () => {
    signaturePadRef.current?.clear();
    setIsEmpty(true);
  };

  const handleSave = () => {
    if (!signaturePadRef.current || signaturePadRef.current.isEmpty()) return;
    const dataUrl = signaturePadRef.current.toDataURL('image/png');
    onSave?.(dataUrl);
  };

  return (
    <div className="space-y-3">
      <div className="text-sm font-bold text-foreground">التوقيع</div>
      
      <div 
        className="border-2 border-dashed border-border rounded-xl overflow-hidden bg-white"
        style={{ width: '100%', maxWidth: width }}
      >
        <canvas
          ref={canvasRef}
          className="w-full touch-none cursor-crosshair"
          style={{ height, display: 'block' }}
        />
      </div>
      
      <div className="flex gap-2">
        <Button type="button" variant="outline" size="sm" onClick={handleClear} className="flex-1 text-sm font-semibold border-2 active:scale-[0.95]">
          <Eraser className="w-4 h-4 ml-2" />
          مسح
        </Button>
        <Button type="button" variant="gradient" size="sm" onClick={handleSave} disabled={isEmpty} className="flex-1 text-sm font-semibold active:scale-[0.95]">
          <Save className="w-4 h-4 ml-2" />
          حفظ التوقيع
        </Button>
      </div>
    </div>
  );
};

export default SignaturePad;
