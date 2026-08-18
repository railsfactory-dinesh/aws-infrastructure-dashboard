import React, { useState } from 'react';
import { 
  Layers, 
  Box, 
  Cpu, 
  HardDrive, 
  Server, 
  CheckCircle2, 
  AlertTriangle, 
  Search,
  Activity,
  Info,
  ChevronRight,
  Terminal
} from 'lucide-react';

export default function ECSOverview({ ecsData = {}, isClientMode }) {
  const clusters = ecsData.clusters || [];
  const [selectedClusterName, setSelectedClusterName] = useState(clusters[0]?.name || '');
  const [searchTerm, setSearchTerm] = useState('');

  const activeCluster = clusters.find(c => c.name === selectedClusterName) || clusters[0] || {};
  const services = activeCluster.services || [];

  const filteredServices = services.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.taskDefinition.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const maskArn = (arn) => {
    if (!arn) return 'N/A';
    if (isClientMode) {
      return arn.replace(/\d{12}/, '7101******17');
    }
    return arn;
  };

  const maskIpOrId = (id) => {
    if (!id) return 'N/A';
    if (isClientMode && id.startsWith('i-')) {
      return id.substring(0, 5) + '****' + id.substring(id.length - 4);
    }
    return id;
  };

  return (
    <div className="space-y-6">
      
      {/* Cluster Selection Bar */}
      <div className="glass-panel p-5 rounded-2xl border border-slate-800/80">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-base font-extrabold text-slate-100 flex items-center gap-2">
              <Layers className="w-5 h-5 text-amber-500" />
              ECS Clusters & Containerized Services
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Detailed task specs, assigned CPU/Memory per service, and supporting EC2 instances
            </p>
          </div>

          {/* Cluster Selector Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
            {clusters.map((cluster) => {
              const isSelected = (cluster.name === (activeCluster.name));
              return (
                <button
                  key={cluster.name}
                  onClick={() => setSelectedClusterName(cluster.name)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 ${
                    isSelected
                      ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                      : 'bg-slate-900/80 text-slate-300 hover:bg-slate-800 border border-slate-800'
                  }`}
                >
                  <Box className="w-3.5 h-3.5" />
                  <span>{cluster.name}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    isSelected ? 'bg-slate-950/20 text-slate-950' : 'bg-slate-800 text-amber-400'
                  }`}>
                    {cluster.services?.length || 0}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Cluster Summary Banner */}
        {activeCluster.name && (
          <div className="bg-slate-900/90 rounded-xl p-4 border border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Cluster ARN</span>
              <p className="text-xs font-mono text-slate-300 truncate" title={maskArn(activeCluster.arn)}>
                {maskArn(activeCluster.arn)}
              </p>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Running Tasks</span>
              <p className="text-sm font-black text-amber-400 flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-amber-500" />
                {activeCluster.runningTasksCount} Active Tasks
              </p>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">ECS EC2 Hosts</span>
              <p className="text-sm font-black text-sky-400 flex items-center gap-1.5">
                <Server className="w-4 h-4 text-sky-500" />
                {activeCluster.registeredContainerInstancesCount} Container Instances
              </p>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Services</span>
              <p className="text-sm font-black text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                {activeCluster.activeServicesCount} Microservices
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Services Header & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold text-slate-200">
            Services in Cluster <span className="text-amber-400">"{activeCluster.name}"</span>
          </h3>
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
            {filteredServices.length} Services
          </span>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search service or task def..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900 text-xs text-slate-100 rounded-xl pl-9 pr-4 py-2 border border-slate-800 focus:outline-none focus:border-amber-500/50"
          />
        </div>
      </div>

      {/* Services Grid Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredServices.map((svc) => {
          const isHealthy = svc.runningCount >= svc.desiredCount;
          return (
            <div 
              key={svc.name}
              className="glass-card rounded-2xl p-5 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between"
            >
              <div>
                {/* Service Header */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm text-slate-100">{svc.name}</h4>
                    </div>
                    <span className="text-[11px] font-mono text-slate-400">
                      Def: <span className="text-amber-400 font-semibold">{svc.taskDefinition}</span>
                    </span>
                  </div>
                  <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border shadow-sm ${
                    svc.launchType?.toUpperCase().includes('FARGATE') 
                      ? 'bg-purple-500/20 text-purple-300 border-purple-500/40 shadow-purple-500/10' 
                      : 'bg-sky-500/20 text-sky-300 border-sky-500/40 shadow-sky-500/10'
                  }`}>
                    {svc.launchType?.toUpperCase().includes('FARGATE') ? 'FARGATE' : 'EC2'}
                  </span>
                </div>

                {/* Desired vs Running Tasks Gauge */}
                <div className="bg-slate-950/70 p-3 rounded-xl mb-4 border border-slate-800/80">
                  <div className="flex justify-between items-center text-xs mb-1.5">
                    <span className="font-semibold text-slate-400">Tasks Status:</span>
                    <span className={`font-extrabold flex items-center gap-1 ${
                      isHealthy ? 'text-emerald-400' : 'text-amber-400 animate-pulse'
                    }`}>
                      {isHealthy ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                      {svc.runningCount} / {svc.desiredCount} Tasks Running
                    </span>
                  </div>
                  {/* Progress Bar */}
                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        isHealthy ? 'bg-gradient-to-r from-emerald-500 to-teal-400' : 'bg-gradient-to-r from-amber-500 to-orange-500'
                      }`}
                      style={{ width: `${Math.min(100, (svc.runningCount / (svc.desiredCount || 1)) * 100)}%` }}
                    />
                  </div>
                </div>

                {/* Resource Allocations (CPU & Memory per Task & Total) */}
                <div className="grid grid-cols-2 gap-2 mb-4">
                  <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800/60">
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 mb-1">
                      <Cpu className="w-3.5 h-3.5 text-amber-400" />
                      Assigned CPU
                    </div>
                    <p className="text-xs font-extrabold text-slate-100">{svc.cpuPerTask}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Total: <span className="text-amber-400 font-bold">{svc.totalCpu}</span></p>
                  </div>

                  <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800/60">
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 mb-1">
                      <HardDrive className="w-3.5 h-3.5 text-sky-400" />
                      Assigned Memory
                    </div>
                    <p className="text-xs font-extrabold text-slate-100">{svc.memoryPerTask}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Total: <span className="text-sky-400 font-bold">{svc.totalMemory}</span></p>
                  </div>
                </div>
              </div>

              {/* EC2 Instance mapping */}
              {svc.instances && svc.instances.length > 0 && (
                <div className="pt-3 border-t border-slate-800/80">
                  <div className="flex items-center justify-between text-[11px] mb-1.5">
                    <span className="font-semibold text-slate-400 flex items-center gap-1">
                      <Server className="w-3 h-3 text-slate-400" />
                      Hosted EC2 Instances ({svc.instancesCount || svc.instances.length}):
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {svc.instances.map(instId => (
                      <span key={instId} className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-900 text-sky-300 border border-sky-500/20">
                        {maskIpOrId(instId)}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

    </div>
  );
}
