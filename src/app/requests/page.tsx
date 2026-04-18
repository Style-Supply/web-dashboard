'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase'; // Ensure this path is correct for your dashboard

export default function OnboardingRequests() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRequests = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('onboarding_submissions')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (!error) setRequests(data || []);
    setLoading(false);
  };

  const updateStatus = async (id: string, newStatus: string) => {
    const { error } = await supabase
      .from('onboarding_submissions')
      .update({ approval_status: newStatus })
      .eq('id', id);
    
    if (!error) fetchRequests();
  };

  useEffect(() => { fetchRequests(); }, []);

  if (loading) return <div className="p-10 text-gray-400 font-sans">Loading Queue...</div>;

  return (
    <div className="p-8 font-[var(--font-manrope)] min-h-screen bg-[#F9FAFB]">
      <div className="max-w-6xl mx-auto">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-black">Onboarding Queue</h1>
            <p className="text-sm text-gray-500">Request Access</p>
          </div>
          <button 
            onClick={fetchRequests} 
            className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-semibold shadow-sm hover:bg-gray-50"
          >
            Refresh
          </button>
        </header>

        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
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
              {requests.map((req) => (
                <tr key={req.id} className="hover:bg-gray-50 transition-colors">
                  <td className="p-4">
                    <div className="font-bold text-gray-900">{req.full_name}</div>
                    <div className="text-sm text-gray-500">{req.email}</div>
                  </td>
                  <td className="p-4 text-sm">
                    <span className="text-gray-600">Height: {req.height_value}{req.height_unit}</span>
                    <div className="text-xs text-gray-400">IG: {req.instagram_handle || 'N/A'}</div>
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
                        onClick={() => updateStatus(req.id, 'approved')}
                        className="px-4 py-2 bg-black text-white rounded-lg text-sm font-bold hover:bg-zinc-800"
                      >
                        Approve
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
