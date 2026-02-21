import { useState, useCallback } from 'react';
import { useEditor, createShapeId, TLShapeId, TLAssetId } from 'tldraw';
// @ts-ignore
import ImageTracer from 'imagetracerjs';

// --- CONFIG ---
const DEBUG_MODE = false; 
const INK_COLOR = '#222222';

const maximizeContrast = (base64Str: string): Promise<{ url: string, width: number, height: number }> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve({ url: base64Str, width: img.width, height: img.height });

      ctx.drawImage(img, 0, 0);
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imgData.data;
      
      const contrast = 100; 
      const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));

      for (let i = 0; i < data.length; i += 4) {
        data[i] = factor * (data[i] - 128) + 128;     
        data[i+1] = factor * (data[i+1] - 128) + 128; 
        data[i+2] = factor * (data[i+2] - 128) + 128; 
      }
      
      ctx.putImageData(imgData, 0, 0);
      resolve({ url: canvas.toDataURL(), width: img.width, height: img.height });
    };
    img.src = base64Str;
  });
};

export type AiMode = 'art' | 'solve' | 'learn';

export function useAiNoteFiller(editor: ReturnType<typeof useEditor>) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedIds, setGeneratedIds] = useState<TLShapeId[]>([]);

  const generateSolution = useCallback(async (mode: AiMode = 'art') => {
    if (!editor || isGenerating) return;

    try {
      setIsGenerating(true);
      const bounds = editor.getViewportPageBounds();
      
      let imageUrlToProcess = '';

      if (DEBUG_MODE) {
        const response = await fetch('/test.png');
        const blob = await response.blob();
        imageUrlToProcess = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
        });
      } else {
        const shapeIds = editor.getCurrentPageShapeIds();
        if (shapeIds.size === 0) return;
        
        const { blob } = await editor.toImage([...shapeIds], {
            format: 'png', scale: 2, bounds: bounds, padding: 0, background: true,
        });
        
        const base64Image = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
        });
        
        // Hits the backend route we just created
        const res = await fetch('/api/generate-solution', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: base64Image, mode }), 
        });
        
        const data = await res.json();
        imageUrlToProcess = data.imageUrl;
      }

      if (imageUrlToProcess) {
        const { url: highContrastUrl, width: imgW, height: imgH } = await maximizeContrast(imageUrlToProcess);

        const scaleX = bounds.w / imgW;
        const scaleY = bounds.h / imgH;

        ImageTracer.imageToSVG(highContrastUrl, (svgString: string) => {
            const sandbox = document.createElement('div');
            sandbox.innerHTML = svgString;
            const svgEl = sandbox.querySelector('svg');
            if (!svgEl) return;
            
            const pathEls = Array.from(svgEl.querySelectorAll('path'));
            const newShapeIds: TLShapeId[] = [];
            
            pathEls.forEach((pathEl, index) => {
                const fill = pathEl.getAttribute('fill') || 'rgb(0,0,0)';
                const d = pathEl.getAttribute('d');
                if (!d) return;

                let isLight = false;
                if (fill.startsWith('rgb')) {
                    const rgb = fill.match(/\d+/g);
                    if (rgb) {
                        const brightness = (parseInt(rgb[0]) * 0.2126 + parseInt(rgb[1]) * 0.7152 + parseInt(rgb[2]) * 0.0722);
                        if (brightness > 200) isLight = true;
                    }
                } else if (fill === '#ffffff' || fill === 'white') {
                    isLight = true;
                }

                if (isLight) return; 

                const measureSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                measureSvg.style.position = 'absolute'; measureSvg.style.visibility = 'hidden';
                document.body.appendChild(measureSvg);
                const measurePath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                measurePath.setAttribute('d', d);
                measureSvg.appendChild(measurePath);
                const bbox = measurePath.getBBox();
                document.body.removeChild(measureSvg);

                if (bbox.width < 1 || bbox.height < 1) return;

                const miniSvg = `
                    <svg xmlns="http://www.w3.org/2000/svg" width="${bbox.width}" height="${bbox.height}" viewBox="${bbox.x} ${bbox.y} ${bbox.width} ${bbox.height}">
                        <path d="${d}" fill="${INK_COLOR}" stroke="${INK_COLOR}" stroke-width="0.3" stroke-linejoin="round" shape-rendering="geometricPrecision" />
                    </svg>
                `;
                const miniSvgBase64 = "data:image/svg+xml;base64," + btoa(miniSvg);

                const rawId = createShapeId().split(':')[1] + index;
                const assetId = ("asset:" + rawId) as TLAssetId;
                const shapeId = createShapeId();

                editor.createAssets([{
                    id: assetId, type: 'image', typeName: 'asset',
                    props: { name: `stroke-${index}`, src: miniSvgBase64, w: bbox.width * scaleX, h: bbox.height * scaleY, mimeType: 'image/svg+xml', isAnimated: false } as any,
                    meta: {},
                }]);

                editor.createShape({
                    id: shapeId, type: 'image',
                    x: bounds.x + (bbox.x * scaleX), y: bounds.y + (bbox.y * scaleY),
                    isLocked: true, 
                    opacity: 0.3, // GHOST PREVIEW
                    props: { w: bbox.width * scaleX, h: bbox.height * scaleY, assetId: assetId } as any,
                });
                newShapeIds.push(shapeId);
            });

            setGeneratedIds(newShapeIds);
            
            if (newShapeIds.length > 0) {
              editor.sendToBack(newShapeIds);
            }

        }, { 
            ltres: 1, qtres: 1, pathomit: 8, blurradius: 2, blurdelta: 10, colorsampling: 2, numberofcolors: 2, mincolorratio: 0, colorquantcycles: 3 
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsGenerating(false);
    }
  }, [editor, isGenerating]);

  const handleAccept = useCallback(() => {
    if (editor && generatedIds.length > 0) {
      editor.updateShapes(generatedIds.map(id => ({ id, isLocked: false, opacity: 1 })) as any);
      setGeneratedIds([]);
    }
  }, [editor, generatedIds]);

  const handleReject = useCallback(() => {
    if (editor && generatedIds.length > 0) {
        editor.updateShapes(generatedIds.map(id => ({ id, isLocked: false })) as any);
        editor.deleteShapes(generatedIds);
        setGeneratedIds([]);
    }
  }, [editor, generatedIds]);

  return { generateSolution, handleAccept, handleReject, isGenerating, pendingShapeId: generatedIds.length > 0 };
}