import { useRef, useEffect, useState } from 'react';
import SignaturePadLib from 'signature_pad';
import { Button } from '@/components/ui/button';
import { Eraser, Save, RefreshCw } from 'lucide-react';

interface SignaturePadProps {
  onSave?: (dataUrl: string) => void;
  savedSignature?: string | null;
  width?: number;
  height?: number;
}

const SignaturePad = ({ onSave, savedSignature, width = 400, height = 200 }: SignaturePadProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const signaturePadRef = useRef<SignaturePadLib | null>(null);
  const [isEmpty, setIsEmpty] = useState(true);
  const [usingSaved, setUsingSaved] = useState(false);

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
      setUsingSaved(false);
    });

    return () => {
      signaturePadRef.current?.off();
    };
  }, []);

  const handleClear = () => {
    signaturePadRef.current?.clear();
    setIsEmpty(true);
    setUsingSaved(false);
  };

  const handleSave = () => {
    if (!signaturePadRef.current) return;
    
    if (signaturePadRef.current.isEmpty() && !usingSaved) {
      return;
    }

    const dataUrl = usingSaved && savedSignature 
      ? savedSignature 
      : signaturePadRef.current.toDataURL('image/png');
    
    onSave?.(dataUrl);
  };

  const handleUseSaved = () => {
    if (savedSignature && canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        const img = new Image();
        img.onload = () => {
          ctx.clearRect(0, 0, canvasRef.current!.width, canvasRef.current!.height);
          ctx.fillStyle = 'white';
          ctx.fillRect(0, 0, canvasRef.current!.width, canvasRef.current!.height);
          ctx.drawImage(img, 0, 0, canvasRef.current!.offsetWidth, canvasRef.current!.offsetHeight);
        };
        img.src = savedSignature;
        setUsingSaved(true);
        setIsEmpty(false);
      }
    }
  };

  return (
    <div className="space-y-3">
      <div className="text-sm font-medium text-foreground flex items-center justify-between">
        <span>التوقيع</span>
        {savedSignature && (
          <Button 
            type="button" 
            variant="ghost" 
            size="sm" 
            onClick={handleUseSaved}
            className="text-xs"
          >
            <RefreshCw className="w-3 h-3 ml-1" />
            استخدام توقيع محفوظ
          </Button>
        )}
      </div>
      
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
        <Button 
          type="button" 
          variant="outline" 
          size="sm" 
          onClick={handleClear}
          className="flex-1"
        >
          <Eraser className="w-4 h-4 ml-2" />
          مسح
        </Button>
        <Button 
          type="button" 
          variant="gradient" 
          size="sm" 
          onClick={handleSave}
          disabled={isEmpty && !usingSaved}
          className="flex-1"
        >
          <Save className="w-4 h-4 ml-2" />
          حفظ التوقيع
        </Button>
      </div>
    </div>
  );
};

export default SignaturePad;
