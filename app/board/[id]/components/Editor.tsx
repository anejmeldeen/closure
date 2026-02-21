'use client';

import { useEditor } from 'tldraw';
import { useAiNoteFiller } from '@/hooks/useAINoteFiller';
import { Sparkles, Loader2 } from 'lucide-react';

export default function EditorContent({ handleBack }: { handleBack: () => void }) {
  const editor = useEditor();
  const { 
    generateSolution, 
    handleAccept, 
    handleReject, 
    isGenerating, 
    pendingShapeId 
  } = useAiNoteFiller(editor);

  return (
    <div className="absolute top-6 left-1/2 -translate-x-1/2 z-[3000] pointer-events-none flex gap-4">
      {/* BACK BUTTON */}
      <button 
        onClick={handleBack}
        className="pointer-events-auto flex items-center justify-center h-12 px-6 bg-white border-4 border-[#2D2A26] text-[#2D2A26] shadow-[4px_4px_0px_0px_rgba(45,42,38,1)] hover:translate-y-1 hover:shadow-none transition-all text-xs font-black uppercase tracking-widest"
      >
        Back to HQ
      </button>

      {/* AI MAGIC FILL CONTROLS */}
      {pendingShapeId ? (
        <div className="pointer-events-auto flex gap-4 animate-in fade-in slide-in-from-top-2">
          <button onClick={handleAccept} className="h-12 px-6 bg-[#86efac] border-4 border-[#2D2A26] text-[#2D2A26] shadow-[4px_4px_0px_0px_rgba(45,42,38,1)] hover:translate-y-1 hover:shadow-none transition-all font-black text-xs uppercase tracking-widest">
            Accept
          </button>
          <button onClick={handleReject} className="h-12 px-6 bg-[#fca5a5] border-4 border-[#2D2A26] text-[#2D2A26] shadow-[4px_4px_0px_0px_rgba(45,42,38,1)] hover:translate-y-1 hover:shadow-none transition-all font-black text-xs uppercase tracking-widest">
            Reject
          </button>
        </div>
      ) : (
        <button 
          onClick={generateSolution}
          disabled={isGenerating}
          className={`pointer-events-auto flex items-center gap-3 h-12 px-6 border-4 border-[#2D2A26] text-[#2D2A26] shadow-[4px_4px_0px_0px_rgba(45,42,38,1)] hover:translate-y-1 hover:shadow-none transition-all text-xs font-black uppercase tracking-widest ${isGenerating ? 'bg-gray-200 opacity-80 cursor-not-allowed' : 'bg-[#ffbb00]'}`}
        >
          {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
          {isGenerating ? 'Synthesizing...' : 'Magic Fill'}
        </button>
      )}
    </div>
  );
}