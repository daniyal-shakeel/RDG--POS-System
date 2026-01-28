import { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Eraser, Check, Download } from 'lucide-react';
import { toast } from 'sonner';

interface SignaturePadProps {
  onSave: (signature: string) => void;
  onClear: () => void;
  className?: string;
  initialSignature?: string; // Base64 string (without data URL prefix) to display on load
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
    
    // If signature was already accepted and user is drawing again, reset accepted state
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

  // Load existing signature on mount
  useEffect(() => {
    if (initialSignature && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const img = new Image();
        // Reconstruct data URL if needed (in case initialSignature is just base64)
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

    // Convert canvas to base64 data URL (format: data:image/png;base64,<base64-string>)
    const dataUrl = canvas.toDataURL('image/png');
    
    // Extract just the base64 portion (remove 'data:image/png;base64,' prefix)
    // This makes it cleaner for API transmission - backend can prepend the prefix if needed
    const base64String = dataUrl.split(',')[1] || dataUrl;
    
    // Save the base64 string for API transmission
    onSave(base64String);
    
    // Mark as accepted and show success message
    setIsAccepted(true);
    toast.success('Signature accepted and saved');
  };

  const downloadSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasSignature) {
      toast.error('No signature to download');
      return;
    }

    // Convert canvas to blob and download
    canvas.toBlob((blob) => {
      if (!blob) {
        toast.error('Failed to generate signature image');
        return;
      }

      // Create download link
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
