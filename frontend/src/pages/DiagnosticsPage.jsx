// frontend/src/pages/DiagnosticsPage.jsx
// Visit /diagnostics on your live site to see a clean dashboard of backend health
// without ever touching Railway logs.

import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, AlertTriangle, RefreshCw, Database, Server } from 'lucide-react';

export default function DiagnosticsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

 const API_URL =
  import.meta.env.VITE_API_URL ||
  'https://skilltech-hub-production.up.railway.app';

  const fetchDiagnostics = () => {
    setLoading(true);
    setError(null);
    fetch(`${API_URL}/api/diagnostics`)
      .then(r => r.json())
      .then(setData)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchDiagnostics(); }, []);

  return (
    <div className="max-w-3xl mx-auto px-4 py-24 min-h-screen">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-white flex items-center gap-2">
          <Server size={28} className="text-brand-400" /> System Diagnostics
        </h1>
        <button onClick={fetchDiagnostics} className="btn-secondary flex items-center gap-2">
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {loading && <div className="card text-center py-12 text-white/40">Checking backend health...</div>}

      {error && (
        <div className="card border-red-500/30 text-center py-12">
          <XCircle size={40} className="text-red-400 mx-auto mb-3" />
          <p className="text-white font-semibold">Cannot reach backend</p>
          <p className="text-white/40 text-sm mt-1">{error}</p>
        </div>
      )}

      {data && (
        <div className="space-y-6">
          {/* Verdict banner */}
          <div className={`card border ${data.verdict.startsWith('✅') ? 'border-green-500/30' : 'border-yellow-500/30'}`}>
            <p className="text-lg font-semibold text-white">{data.verdict}</p>
            <p className="text-white/40 text-xs mt-1">Checked at {new Date(data.timestamp).toLocaleString()}</p>
          </div>

          {/* Database status */}
          <div className="card">
            <h2 className="font-semibold text-white mb-4 flex items-center gap-2">
              <Database size={18} className="text-brand-400" /> Database
            </h2>
            <div className="flex items-center gap-2 mb-4">
              {data.database.connected
                ? <><CheckCircle size={16} className="text-green-400" /><span className="text-green-400 text-sm">Connected</span></>
                : <><XCircle size={16} className="text-red-400" /><span className="text-red-400 text-sm">Not connected</span></>
              }
              <span className="text-white/40 text-sm">· {data.database.tables.length} tables found</span>
            </div>

            <h3 className="text-white/60 text-sm mb-2">Critical Tables</h3>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(data.criticalTables).map(([table, info]) => (
                <div key={table} className="flex items-center justify-between px-3 py-2 rounded-lg bg-white/5">
                  <span className="text-white/80 text-sm">{table}</span>
                  {info.exists
                    ? <span className="text-green-400 text-xs">{info.rows} rows</span>
                    : <span className="text-red-400 text-xs flex items-center gap-1"><AlertTriangle size={12}/> missing</span>
                  }
                </div>
              ))}
            </div>
          </div>

          {/* Env vars */}
          <div className="card">
            <h2 className="font-semibold text-white mb-4">Environment Variables</h2>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {Object.entries(data.env).map(([key, val]) => (
                <div key={key} className="flex items-center justify-between px-3 py-2 rounded-lg bg-white/5">
                  <span className="text-white/60">{key}</span>
                  {typeof val === 'boolean'
                    ? (val ? <CheckCircle size={14} className="text-green-400"/> : <XCircle size={14} className="text-red-400"/>)
                    : <span className="text-white/80 text-xs truncate max-w-[150px]">{val}</span>
                  }
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
