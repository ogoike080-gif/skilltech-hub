import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Award } from 'lucide-react';
import api from '../../utils/api';

export default function VerifyPage() {
  const { token } = useParams();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!token) return;
    api.get(`/certificates/verify/${token}`).then(r => setResult(r.data)).finally(() => setLoading(false));
  }, [token]);
  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin"/></div>;
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-24">
      <div className="max-w-lg w-full">
        <div className={`card text-center ${result?.valid ? 'border-green-500/30' : 'border-red-500/30'}`}>
          <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${result?.valid ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
            <Award size={40} className={result?.valid ? 'text-green-400' : 'text-red-400'}/>
          </div>
          {result?.valid ? (
            <>
              <h1 className="text-2xl font-bold text-white mb-2">Certificate Verified ✓</h1>
              <p className="text-white/50 mb-6">This certificate is authentic and valid</p>
              <div className="bg-surface-100 rounded-xl p-5 text-left space-y-3">
                {[['Recipient',result.data?.recipientName],['Course',result.data?.courseTitle],['School',result.data?.schoolName],['Instructor',result.data?.instructorName],['Issued',result.data?.issuedAt ? new Date(result.data.issuedAt).toLocaleDateString() : '']].map(([label,value])=>(
                  <div key={label} className="flex justify-between"><span className="text-white/40 text-sm">{label}</span><span className="text-white text-sm font-medium">{value}</span></div>
                ))}
              </div>
            </>
          ) : (
            <><h1 className="text-2xl font-bold text-white mb-2">Certificate Not Found</h1><p className="text-white/50">This certificate could not be verified.</p></>
          )}
          <Link to="/" className="btn-primary mt-6 inline-block">Back to SkillTech Hub</Link>
        </div>
      </div>
    </div>
  );
}
