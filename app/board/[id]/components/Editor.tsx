'use client';

import { useEditor } from 'tldraw';
import { useAiNoteFiller } from '@/hooks/useAINoteFiller';
import { Sparkles, Loader2, ArrowLeft } from 'lucide-react';

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
    <div className="absolute top-6 left-1/2 -translate-x-1/2 z-[3000] pointer-events-none flex gap-3">
      {/* BACK BUTTON - Paper White Style */}
      <button 
        onClick={handleBack}
        className="pointer-events-auto flex items-center gap-2 h-10 px-4 bg-[#fcfaf2] border-2 border-[#2D2A26] text-[#2D2A26] shadow-[3px_3px_0px_0px_rgba(45,42,38,1)] hover:translate-y-[1px] hover:translate-x-[1px] hover:shadow-[1px_1px_0px_0px_rgba(45,42,38,1)] transition-all text-[10px] font-black uppercase tracking-widest"
      >
        <ArrowLeft size={14} strokeWidth={3} />
        Back
      </button>

      {/* AI CONTROLS */}
      {pendingShapeId ? (
        <div className="pointer-events-auto flex gap-3 animate-in fade-in slide-in-from-top-2">
          <button 
            onClick={handleAccept} 
            className="h-10 px-5 bg-[#86efac] border-2 border-[#2D2A26] text-[#2D2A26] shadow-[3px_3px_0px_0px_rgba(45,42,38,1)] hover:translate-y-[1px] hover:translate-x-[1px] hover:shadow-[1px_1px_0px_0px_rgba(45,42,38,1)] transition-all font-black text-[10px] uppercase tracking-widest"
          >
            Commit
          </button>
          <button 
            onClick={handleReject} 
            className="h-10 px-5 bg-[#fca5a5] border-2 border-[#2D2A26] text-[#2D2A26] shadow-[3px_3px_0px_0px_rgba(45,42,38,1)] hover:translate-y-[1px] hover:translate-x-[1px] hover:shadow-[1px_1px_0px_0px_rgba(45,42,38,1)] transition-all font-black text-[10px] uppercase tracking-widest"
          >
            Discard
          </button>
        </div>
      ) : (
        <button 
          onClick={() => generateSolution()}
          disabled={isGenerating}
          className={`pointer-events-auto flex items-center gap-2 h-10 px-5 border-2 border-[#2D2A26] text-[#2D2A26] shadow-[3px_3px_0px_0px_rgba(45,42,38,1)] hover:translate-y-[1px] hover:translate-x-[1px] hover:shadow-[1px_1px_0px_0px_rgba(45,42,38,1)] transition-all text-[10px] font-black uppercase tracking-widest ${
            isGenerating ? 'bg-gray-100 opacity-80 cursor-not-allowed' : 'bg-[#ffbb00]'
          }`}
        >
          {isGenerating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} strokeWidth={3} />}
          {isGenerating ? 'Analyzing...' : 'Autofill'}
        </button>
      )}
    </div>
  );
}