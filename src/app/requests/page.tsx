'use client';
import { useEffect, useState, useCallback } from 'react'; // 1. Added useCallback
import { supabase } from '@/lib/supabase';

export default function OnboardingRequests() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // 2. Wrap fetchRequests in useCallback to prevent the lint error
  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('onboarding_submissions')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (!error) {
        setRequests(data || []);
      }
    } catch (err) {
      console.error("Error fetching requests:", err);
    } finally {
      setLoading(false);
    }
  }, []); // Empty dependency array means this function is stable

  const updateStatus = async (id: string, newStatus: string) => {
    const { error } = await supabase
      .from('onboarding_submissions')
      .update({ approval_status: newStatus })
      .eq('id', id);
    
    if (!error) {
      // It's safe to call fetchRequests here because it's a stable callback
      void fetchRequests();
    }
  };

  // 3. Effect now calls the memoized function
  useEffect(() => {
    void fetchRequests();
  }, [fetchRequests]);

  if (loading) return <div className="p-10 text-gray-400 font-sans text-center">Loading Queue...</div>;

  return (
    <div className="p-8 font-[var(--font-manrope)] min-h-screen bg-[#F9FAFB] text-black">
      <div className="max-w-6xl mx-auto">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold">Onboarding Queue</h1>
            <p className="text-sm text-gray-500">Sunday Launch: Request Access Triage</p>
          </div>
          <button 
            onClick={() => { void fetchRequests(); }} 
            className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-semibold shadow-sm hover:bg-gray-50"
          >
            Refresh
          </button>
        </header>

        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden text-black">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="p-4 text-xs font-bold uppercase text-gray-400">User</th>
                <th className="p-4 text-xs font-bold uppercase text-gray-400">Metrics</th>
                <th className="p-4 text-xs font-bold uppercase text-gray-400">Status</th>
                <th className="p-4 text-xs font-bold uppercase text-gray-400 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {requests.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-10 text-center text-gray-400">No requests found.</td>
                </tr>
              ) : (
                requests.map((req) => (
                  <tr key={req.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4">
                      <div className="font-bold">{req.full_name}</div>
                      <div className="text-sm text-gray-500">{req.email}</div>
                    </td>
                    <td className="p-4 text-sm">
                      <span className="text-gray-600">Height: {req.height_value}{req.height_unit}</span>
                      <div className="text-xs text-gray-400 italic">IG: {req.instagram_handle || 'N/A'}</div>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                        req.approval_status === 'approved' 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-amber-100 text-amber-700'
                      }`}>
                        {req.approval_status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      {req.approval_status === 'pending' && (
                        <button 
                          onClick={() => { void updateStatus(req.id, 'approved'); }}
                          className="px-4 py-2 bg-black text-white rounded-lg text-sm font-bold hover:bg-zinc-800"
                        >
                          Approve
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
