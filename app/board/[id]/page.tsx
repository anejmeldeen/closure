'use client';

import { use } from 'react';
import { Tldraw, Editor } from 'tldraw';
import 'tldraw/tldraw.css';
import { useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabase';
import EditorContent from './components/Editor';

export default function BoardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const handleBack = () => {
    router.push('/?tab=tasks');
  };

  const handleMount = (editor: Editor) => {
    let timeout: NodeJS.Timeout;
    editor.store.listen((update) => {
      if (update.source !== 'user') return;
      clearTimeout(timeout);
      timeout = setTimeout(async () => {
        const timestamp = new Date().toISOString();
        await supabase.from('drawings').update({ last_modified: timestamp }).eq('id', id);
      }, 2000);
    }, { scope: 'document' });
  };

  return (
    <div className="fixed inset-0 bg-[#F5F2E8] overflow-hidden">
      {/* THE "FUZZY" GRAIN LAYER */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-[0.15]" 
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`
        }}
      />
      
      {/* THE BASE COLOR OVERLAY (To keep the beige tone) */}
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
          persistenceKey={`project-${id}`} 
          onMount={handleMount}
          gridMode={false}
        >
          <EditorContent handleBack={handleBack} />
        </Tldraw>
      </div>
    </div>
  );
}