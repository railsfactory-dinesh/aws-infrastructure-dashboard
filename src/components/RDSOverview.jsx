import React from 'react';
import { 
  Database, 
  HardDrive, 
  CheckCircle2, 
  ShieldCheck, 
  Cpu, 
  Globe,
  Layers,
  Server
} from 'lucide-react';

export default function RDSOverview({ rdsData = {}, isClientMode }) {
  const instances = rdsData.instances || [];
  const summary = rdsData.summary || {};

  const maskEndpoint = (endpoint) => {
    if (!endpoint || endpoint.includes('N/A')) return endpoint;
    if (isClientMode) {
      return endpoint.replace(/^([^.]+)\.([^.]+)\.([^.]+)/, '$1.******.rds.amazonaws.com');
    }
    return endpoint;
  };

  return (
    <div className="space-y-6">
      
      {/* Header Summary */}
      <div className="glass-panel p-5 rounded-2xl border border-slate-800/80">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-base font-extrabold text-slate-100 flex items-center gap-2">
              <Database className="w-5 h-5 text-purple-400" />
              RDS Database Instances Overview
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Managed Relational Database Service instance types, engine versions, and storage configurations
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              {summary.totalDatabases || instances.length} DB Instances
            </span>
            <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
              {summary.totalStorageGb || 0} GB Storage
            </span>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-900/80 p-4 rounded-xl border border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total DB Storage</span>
              <p className="text-lg font-black text-purple-400">
                {summary.totalStorageGb || 0} GB Allocated
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Multi-AZ Resilience</span>
              <p className="text-lg font-black text-emerald-400">
                {summary.multiAzCount || 0} High Availability
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Primary Database Engine</span>
              <p className="text-lg font-black text-amber-400 capitalize">
                {summary.primaryEngine || 'PostgreSQL'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* RDS Table */}
      <div className="glass-panel rounded-2xl overflow-hidden border border-slate-800/80">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-900/90 border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3.5 px-4">DB Identifier</th>
                <th className="py-3.5 px-4">Engine</th>
                <th className="py-3.5 px-4">Instance Class</th>
                <th className="py-3.5 px-4">Allocated Storage</th>
                <th className="py-3.5 px-4">Multi-AZ</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Endpoint</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {instances.map((db) => (
                <tr key={db.dbIdentifier} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3.5 px-4 font-bold text-slate-100 flex items-center gap-2">
                    <Database className="w-4 h-4 text-purple-400" />
                    {db.dbIdentifier}
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-amber-300 capitalize">
                    {db.engine} <span className="text-[10px] text-slate-400">v{db.engineVersion}</span>
                  </td>
                  <td className="py-3.5 px-4 font-mono font-bold text-purple-300">
                    {db.instanceClass}
                  </td>
                  <td className="py-3.5 px-4 font-bold text-slate-200">
                    {db.allocatedStorageGb} GB <span className="text-[10px] text-slate-400 uppercase">({db.storageType})</span>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold border ${
                      db.multiAz 
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}>
                      {db.multiAz ? 'Multi-AZ (Enabled)' : 'Single-AZ'}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="inline-flex items-center gap-1 font-bold text-emerald-400">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {db.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-[11px] text-slate-400 max-w-xs truncate" title={maskEndpoint(db.endpoint)}>
                    {maskEndpoint(db.endpoint)}
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
