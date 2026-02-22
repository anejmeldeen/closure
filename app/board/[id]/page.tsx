'use client';

import { useState, useEffect, use } from 'react';
// NEW: Imported getSnapshot and loadSnapshot directly from tldraw
import { Tldraw, Editor, getSnapshot, loadSnapshot } from 'tldraw'; 
import 'tldraw/tldraw.css';
import { useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabase';
import EditorContent from './components/Editor';

export default function BoardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  // State to hold the cloud drawing data before rendering the board
  const [initialSnapshot, setInitialSnapshot] = useState<any>(null);
  const [isFetching, setIsFetching] = useState(true);

  // Fetch the drawing from Supabase when the page loads
  useEffect(() => {
    const fetchDrawing = async () => {
      const { data, error } = await supabase
        .from('drawings')
        .select('canvas_data')
        .eq('id', id)
        .single();
        
      if (data?.canvas_data) {
        setInitialSnapshot(data.canvas_data);
      }
      setIsFetching(false);
    };
    
    fetchDrawing();
  }, [id]);

  const handleBack = () => {
    router.push('/?tab=tasks');
  };

  const handleMount = (editor: Editor) => {
    // 1. Inject the cloud data using the standalone loadSnapshot utility
    if (initialSnapshot) {
      try {
        loadSnapshot(editor.store, initialSnapshot);
      } catch (e) {
        console.error("Failed to load drawing from cloud", e);
      }
    }

    // 2. Save new drawing strokes to Supabase every 2 seconds
    let timeout: NodeJS.Timeout;
    editor.store.listen((update) => {
      if (update.source !== 'user') return; // Only save user actions
      
      clearTimeout(timeout);
      timeout = setTimeout(async () => {
        const timestamp = new Date().toISOString();
        
        // NEW: Grab the snapshot using the standalone getSnapshot utility
        const snapshot = getSnapshot(editor.store); 
        
        await supabase.from('drawings').update({ 
          last_modified: timestamp,
          canvas_data: snapshot 
        }).eq('id', id);
        
      }, 2000);
    }, { scope: 'document' });
  };

  // Wait for Supabase to grab the drawing before showing the canvas
  if (isFetching) {
    return (
      <div className="fixed inset-0 bg-[#F5F2E8] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#2D2A26] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-[#F5F2E8] overflow-hidden">
      {/* THE "FUZZY" GRAIN LAYER */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-[0.15]" 
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`
        }}
      />
      
      {/* THE BASE COLOR OVERLAY */}
      <div className="absolute inset-0 bg-[#F5F2E8]/40 paper-texture pointer-events-none z-0" />

      <style dangerouslySetInnerHTML={{ __html: `
        /* Strip Tldraw back to transparency */
        .tl-container, .tl-main, .tl-layer, .tl-background, .tl-canvas, .tl-theme__light {
          background-color: transparent !important;
          background: transparent !important;
        }

        .tl-grid {
          display: none !important;
        }

        /* War Room UI */
        .tlui-navigation-zone, .tlui-layout__bottom-left, .tlui-help-menu, [data-testid="zoom-menu"] {
          display: none !important;
        }
      `}} />

      <div className="w-full h-full relative z-10">
        <Tldraw 
          onMount={handleMount}
          gridMode={false}
        >
          <EditorContent handleBack={handleBack} />
        </Tldraw>
      </div>
    </div>
  );
}