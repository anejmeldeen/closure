'use client';

import { use } from 'react';
import { Tldraw, Editor } from 'tldraw';
import 'tldraw/tldraw.css';
import { useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabase';
import { ArrowLeft } from 'lucide-react';

export default function BoardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  // Database Sync Logic
  const handleMount = (editor: Editor) => {
    let timeout: NodeJS.Timeout;

    // Listen to document changes to update 'last_modified'
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
      
      {/* Top Navigation Bar overlay */}
      <div className="absolute top-4 left-4 z-[3000] pointer-events-none">
        <button 
          onClick={() => router.push('/')}
          className="pointer-events-auto flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-md shadow-sm hover:bg-gray-50 transition-all font-medium text-sm"
        >
          <ArrowLeft size={16} /> Back to Dashboard
        </button>
      </div>

      {/* The Notebook styling overrides */}
      <style dangerouslySetInnerHTML={{ __html: `
        .tl-canvas, .tl-background, .tldraw-view-background {
          background-color: transparent !important;
          background: transparent !important;
        }
        .tldraw-canvas {
          background-color: #F5F2E8;
          background-image: 
            linear-gradient(90deg, transparent 79px, #abced4 79px, #abced4 81px, transparent 81px),
            linear-gradient(#e5e7eb 1px, transparent 1px);
          background-size: 100% 32px;
        }
      `}} />

      {/* The Drawing Engine */}
      <div className="tldraw-canvas w-full h-full relative z-10">
        <Tldraw persistenceKey={`project-${id}`} onMount={handleMount} />
      </div>
    </div>
  );
}