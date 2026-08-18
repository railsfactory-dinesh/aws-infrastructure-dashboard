import React, { useState } from 'react';
import { 
  Server, 
  Cpu, 
  Search, 
  CheckCircle2, 
  XCircle, 
  Globe, 
  Lock, 
  Layers, 
  HardDrive,
  Shield,
  Filter
} from 'lucide-react';

export default function EC2Breakdown({ ec2Data = {}, isClientMode }) {
  const instances = ec2Data.instances || [];
  const summary = ec2Data.summary || {};
  
  const [filterCategory, setFilterCategory] = useState('ALL'); // ALL, ECS, STANDALONE
  const [searchTerm, setSearchTerm] = useState('');

  const filteredInstances = instances.filter(inst => {
    const matchesCategory = 
      filterCategory === 'ALL' ? true :
      filterCategory === 'ECS' ? inst.isEcsInstance :
      !inst.isEcsInstance;

    const matchesSearch = 
      inst.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inst.instanceId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inst.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inst.privateIp.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesCategory && matchesSearch;
  });

  const maskIp = (ip) => {
    if (!ip || ip.includes('N/A')) return ip;
    if (isClientMode) {
      const parts = ip.split('.');
      if (parts.length === 4) {
        return `${parts[0]}.${parts[1]}.***.***`;
      }
      return '***.***.***.***';
    }
    return ip;
  };

  const maskId = (id) => {
    if (!id) return 'N/A';
    if (isClientMode && id.startsWith('i-')) {
      return id.substring(0, 5) + '****' + id.substring(id.length - 4);
    }
    return id;
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner & KPI Split */}
      <div className="glass-panel p-5 rounded-2xl border border-slate-800/80">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-base font-extrabold text-slate-100 flex items-center gap-2">
              <Server className="w-5 h-5 text-sky-400" />
              EC2 Instances Classification Breakdown
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Separating container hosts supporting ECS clusters from independent standalone EC2 instances
            </p>
          </div>

          {/* Categorization Tabs */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilterCategory('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                filterCategory === 'ALL'
                  ? 'bg-sky-500 text-slate-950 shadow-md shadow-sky-500/20'
                  : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
              }`}
            >
              All EC2 ({summary.totalInstances || instances.length})
            </button>
            <button
              onClick={() => setFilterCategory('ECS')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                filterCategory === 'ECS'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
              }`}
            >
              ECS Hosts ({summary.ecsContainerInstancesCount || 0})
            </button>
            <button
              onClick={() => setFilterCategory('STANDALONE')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                filterCategory === 'STANDALONE'
                  ? 'bg-purple-500 text-slate-950 shadow-md shadow-purple-500/20'
                  : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
              }`}
            >
              Standalone Non-ECS ({summary.standaloneInstancesCount || 0})
            </button>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-900/80 p-4 rounded-xl border border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">ECS Container Hosts</span>
              <p className="text-lg font-black text-amber-400">
                {summary.ecsContainerInstancesCount || 0} Nodes
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Standalone EC2 (Non-ECS)</span>
              <p className="text-lg font-black text-purple-400">
                {summary.standaloneInstancesCount || 0} Nodes
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Node Health Status</span>
              <p className="text-lg font-black text-emerald-400">
                {summary.runningCount || 0} Running / {summary.stoppedCount || 0} Stopped
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Search & Counter */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold text-slate-200">
            Showing {filteredInstances.length} EC2 Instances
          </h3>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by name, ID, type or IP..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900 text-xs text-slate-100 rounded-xl pl-9 pr-4 py-2 border border-slate-800 focus:outline-none focus:border-sky-500/50"
          />
        </div>
      </div>

      {/* Detailed EC2 Table */}
      <div className="glass-panel rounded-2xl overflow-hidden border border-slate-800/80">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-900/90 border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3.5 px-4">Instance Name</th>
                <th className="py-3.5 px-4">Instance ID</th>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4">Type</th>
                <th className="py-3.5 px-4">Public IP</th>
                <th className="py-3.5 px-4">Private IP</th>
                <th className="py-3.5 px-4">AZ</th>
                <th className="py-3.5 px-4">State</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {filteredInstances.map((inst) => {
                const isRunning = inst.state === 'running';
                return (
                  <tr key={inst.instanceId} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-100 flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${isRunning ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                      {inst.name}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-sky-400 font-bold">
                      {maskId(inst.instanceId)}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold border ${
                        inst.isEcsInstance
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          : 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                      }`}>
                        {inst.category}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-200">
                      {inst.type}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-300">
                      {maskIp(inst.publicIp)}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-400">
                      {maskIp(inst.privateIp)}
                    </td>
                    <td className="py-3.5 px-4 text-slate-300">
                      {inst.az}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center gap-1 font-bold ${
                        isRunning ? 'text-emerald-400' : 'text-rose-400'
                      }`}>
                        {isRunning ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                        {inst.state.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
