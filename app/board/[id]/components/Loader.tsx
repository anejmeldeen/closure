export default function Loader() {
  return (
    <div className="fixed inset-0 bg-[#F5F2E8] flex items-center justify-center z-[9999]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-[#2D2A26] border-t-transparent rounded-full animate-spin"></div>
        <p className="font-bold uppercase tracking-widest text-xs animate-pulse">Loading Workspace...</p>
      </div>
    </div>
  );
}