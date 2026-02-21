'use client';

import { useEditor } from 'tldraw';
import { useAiNoteFiller } from '@/hooks/useAINoteFiller';

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
        className="pointer-events-auto h-10 px-6 bg-[#F5F2E8] border-2 border-[#2D2A26] text-[#2D2A26] shadow-[4px_4px_0px_0px_rgba(45,42,38,1)] hover:translate-y-1 hover:shadow-none transition-all text-xs font-bold uppercase tracking-widest"
      >
        Back
      </button>

      {/* AI MAGIC FILL CONTROLS */}
      {pendingShapeId ? (
        <div className="pointer-events-auto flex gap-2 animate-in fade-in slide-in-from-top-2">
          <button onClick={handleAccept} className="h-10 px-4 bg-[#86efac] border-2 border-[#2D2A26] shadow-[4px_4px_0px_0px_rgba(45,42,38,1)] hover:translate-y-1 hover:shadow-none transition-all font-bold text-xs uppercase tracking-widest">
            Accept
          </button>
          <button onClick={handleReject} className="h-10 px-4 bg-[#fca5a5] border-2 border-[#2D2A26] shadow-[4px_4px_0px_0px_rgba(45,42,38,1)] hover:translate-y-1 hover:shadow-none transition-all font-bold text-xs uppercase tracking-widest">
            Reject
          </button>
        </div>
      ) : (
        <button 
          onClick={generateSolution}
          disabled={isGenerating}
          className={`pointer-events-auto h-10 px-6 border-2 border-[#2D2A26] text-[#2D2A26] shadow-[4px_4px_0px_0px_rgba(45,42,38,1)] hover:translate-y-1 hover:shadow-none transition-all text-xs font-bold uppercase tracking-widest ${isGenerating ? 'bg-gray-200' : 'bg-[#bae6fd]'}`}
        >
          {isGenerating ? 'Thinking...' : 'Magic Fill'}
        </button>
      )}
    </div>
  );
}