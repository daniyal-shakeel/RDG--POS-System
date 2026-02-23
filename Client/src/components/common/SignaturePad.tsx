import { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Eraser, Check, Download } from 'lucide-react';
import { toast } from 'sonner';

interface SignaturePadProps {
  onSave: (signature: string) => void;
  onClear: () => void;
  className?: string;
  initialSignature?: string; 
}

export function SignaturePad({ onSave, onClear, className, initialSignature }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(!!initialSignature);
  const [isAccepted, setIsAccepted] = useState(!!initialSignature);

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    setHasSignature(true);
    
    
    if (isAccepted) {
      setIsAccepted(false);
    }

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'hsl(var(--foreground))';
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
    setIsAccepted(false);
    onClear();
  };

  
  useEffect(() => {
    if (initialSignature && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const img = new Image();
        
        const dataUrl = initialSignature.startsWith('data:')
          ? initialSignature
          : `data:image/png;base64,${initialSignature}`;
        
        img.onload = () => {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0);
          setHasSignature(true);
          setIsAccepted(true);
        };
        img.src = dataUrl;
      }
    }
  }, [initialSignature]);

  const saveSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasSignature) return;

    
    const dataUrl = canvas.toDataURL('image/png');
    
    
    
    const base64String = dataUrl.split(',')[1] || dataUrl;
    
    
    onSave(base64String);
    
    
    setIsAccepted(true);
    toast.success('Signature accepted and saved');
  };

  const downloadSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasSignature) {
      toast.error('No signature to download');
      return;
    }

    
    canvas.toBlob((blob) => {
      if (!blob) {
        toast.error('Failed to generate signature image');
        return;
      }

      
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `signature-${new Date().toISOString().split('T')[0]}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success('Signature downloaded');
    }, 'image/png');
  };

  return (
    <div className={className}>
      <div className="border border-border rounded-lg p-1 bg-muted/50">
        <canvas
          ref={canvasRef}
          width={400}
          height={150}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="w-full bg-background rounded cursor-crosshair touch-none"
        />
      </div>
      <p className="text-xs text-muted-foreground text-center mt-2 mb-3">
        Sign above using mouse, touch, or CT60 stylus
        {isAccepted && (
          <span className="block mt-1 text-success font-medium">
            ✓ Signature accepted
          </span>
        )}
      </p>
      <div className="flex gap-2 justify-end">
        <Button variant="outline" size="sm" onClick={clearSignature}>
          <Eraser className="h-4 w-4 mr-1" />
          Clear
        </Button>
        {hasSignature && (
          <Button variant="outline" size="sm" onClick={downloadSignature}>
            <Download className="h-4 w-4 mr-1" />
            Download
          </Button>
        )}
        <Button 
          size="sm" 
          onClick={saveSignature} 
          disabled={!hasSignature}
          className={isAccepted ? 'bg-success hover:bg-success/90' : ''}
        >
          <Check className="h-4 w-4 mr-1" />
          {isAccepted ? 'Accepted ✓' : 'Accept'}
        </Button>
      </div>
    </div>
  );
}
