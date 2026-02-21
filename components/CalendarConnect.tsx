// components/CalendarConnect.tsx
'use client';

export default function CalendarConnect() {
  const handleConnect = (provider: 'google' | 'microsoft') => {
    // Redirect the user to our backend initiation route
    window.location.href = `/api/auth/connect?provider=${provider}`;
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <h3 className="text-lg font-bold mb-4">Connect Your Calendar</h3>
      <p className="text-sm text-gray-500 mb-6">
        Link your account so the team can see when you are free or busy.
      </p>
      
      <div className="flex gap-4">
        <button 
          onClick={() => handleConnect('google')}
          className="px-4 py-2 bg-white border border-gray-300 text-gray-700 font-medium rounded shadow-sm hover:bg-gray-50 transition-colors"
        >
          Connect Google Calendar
        </button>
        
        <button 
          onClick={() => handleConnect('microsoft')}
          className="px-4 py-2 bg-[#00a4ef] text-white font-medium rounded shadow-sm hover:bg-[#0078d4] transition-colors"
        >
          Connect Outlook
        </button>
      </div>
    </div>
  );
}