import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Button } from './button';
import { Eraser, Save } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SignatureCanvasProps {
  onSave: (signatureDataUrl: string) => void;
  width?: number;
  height?: number;
  label?: string;
  className?: string;
  initialSignature?: string;
}

export function SignatureCanvas({
  onSave,
  width = 300,
  height = 120,
  label = 'Assinatura',
  className,
  initialSignature,
}: SignatureCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [ctx, setCtx] = useState<CanvasRenderingContext2D | null>(null);

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext('2d');
    if (!context) return;

    // Set up canvas for high DPI displays
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    context.scale(dpr, dpr);

    // Set drawing style
    context.strokeStyle = '#1e293b';
    context.lineWidth = 2;
    context.lineCap = 'round';
    context.lineJoin = 'round';

    // Fill white background
    context.fillStyle = '#f8fafc';
    context.fillRect(0, 0, width, height);

    // Load initial signature if provided
    if (initialSignature) {
      const img = new Image();
      img.onload = () => {
        context.drawImage(img, 0, 0, width, height);
        setHasSignature(true);
      };
      img.src = initialSignature;
    }

    setCtx(context);
  }, [width, height, initialSignature]);

  const getEventCoordinates = useCallback(
    (e: React.MouseEvent | React.TouchEvent): { x: number; y: number } => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };

      const rect = canvas.getBoundingClientRect();
      const scaleX = width / rect.width;
      const scaleY = height / rect.height;

      if ('touches' in e) {
        const touch = e.touches[0] || e.changedTouches[0];
        return {
          x: (touch.clientX - rect.left) * scaleX,
          y: (touch.clientY - rect.top) * scaleY,
        };
      }

      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      };
    },
    [width, height]
  );

  const startDrawing = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (!ctx) return;
      e.preventDefault();

      const { x, y } = getEventCoordinates(e);
      ctx.beginPath();
      ctx.moveTo(x, y);
      setIsDrawing(true);
    },
    [ctx, getEventCoordinates]
  );

  const draw = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (!isDrawing || !ctx) return;
      e.preventDefault();

      const { x, y } = getEventCoordinates(e);
      ctx.lineTo(x, y);
      ctx.stroke();
      setHasSignature(true);
    },
    [isDrawing, ctx, getEventCoordinates]
  );

  const stopDrawing = useCallback(() => {
    if (ctx) {
      ctx.closePath();
    }
    setIsDrawing(false);
  }, [ctx]);

  const clearCanvas = useCallback(() => {
    if (!ctx || !canvasRef.current) return;

    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, width, height);
    setHasSignature(false);
  }, [ctx, width, height]);

  const saveSignature = useCallback(() => {
    if (!canvasRef.current || !hasSignature) return;

    const dataUrl = canvasRef.current.toDataURL('image/png');
    onSave(dataUrl);
  }, [hasSignature, onSave]);

  return (
    <div className={cn('space-y-2', className)}>
      <label className="text-xs font-medium text-slate-400">{label}</label>
      <div className="relative border-2 border-dashed border-slate-500 rounded-lg overflow-hidden bg-slate-100">
        <canvas
          ref={canvasRef}
          className="cursor-crosshair touch-none"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
        
        {/* Placeholder text */}
        {!hasSignature && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-xs text-slate-400 italic">
              Desenhe sua assinatura aqui
            </span>
          </div>
        )}
      </div>
      
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={clearCanvas}
          className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700/50"
        >
          <Eraser className="h-3.5 w-3.5 mr-1.5" />
          Limpar
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={saveSignature}
          disabled={!hasSignature}
          className="flex-1 bg-green-600 hover:bg-green-700 text-white disabled:opacity-50"
        >
          <Save className="h-3.5 w-3.5 mr-1.5" />
          Confirmar
        </Button>
      </div>
    </div>
  );
}
