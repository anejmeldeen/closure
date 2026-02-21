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

  // Your handleBack now includes the URL param
  const handleBack = () => {
    router.push('/?tab=whiteboard');
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
    <div className="fixed inset-0 bg-[#F5F2E8]">
      <style dangerouslySetInnerHTML={{ __html: `
        .tldraw-canvas {
          background-color: #F5F2E8;
          background-image: 
            linear-gradient(90deg, transparent 79px, #abced4 79px, #abced4 81px, transparent 81px),
            linear-gradient(#e5e7eb 1px, transparent 1px);
          background-size: 100% 32px;
        }
        .tlui-navigation-zone, .tlui-layout__bottom-left, [data-testid="zoom-menu"] {
          display: none !important;
        }
      `}} />

      <div className="tldraw-canvas w-full h-full relative z-10">
        <Tldraw persistenceKey={`project-${id}`} onMount={handleMount}>
          <EditorContent handleBack={handleBack} />
        </Tldraw>
      </div>
    </div>
  );
}