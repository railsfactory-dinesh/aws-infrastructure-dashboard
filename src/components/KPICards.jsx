import React from 'react';
import { 
  Box, 
  Layers, 
  Cpu, 
  HardDrive, 
  Server, 
  Database, 
  FolderArchive,
  Activity,
  CheckCircle2,
  TrendingUp,
  ShieldCheck,
  ArrowUpRight
} from 'lucide-react';

export default function KPICards({ summary = {}, ecs = {}, ec2 = {}, rds = {}, s3 = {}, isClientMode, onSelectTab, activeTab }) {
  const cards = [
    {
      tabId: 'ecs',
      title: 'ECS Clusters & Services',
      mainValue: `${summary.totalClusters || 0} Clusters`,
      subValue: `${summary.totalServices || 0} Active Services | ${summary.totalRunningTasks || 0} Tasks`,
      detail: `Allocated: ${summary.totalAllocatedCpu || '0 vCPU'} / ${summary.totalAllocatedMemory || '0 GB'}`,
      icon: Layers,
      color: 'from-amber-500 to-orange-500',
      badge: `${summary.totalRunningTasks || 0} Running Tasks`,
      badgeColor: 'bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20'
    },
    {
      tabId: 'ec2',
      title: 'EC2 Node Distribution',
      mainValue: `${summary.totalEc2Instances || 0} Total EC2`,
      subValue: `${summary.totalContainerInstances || 0} ECS Hosts | ${summary.totalStandaloneEc2 || 0} Standalone`,
      detail: `${ec2.summary?.runningCount || summary.totalEc2Instances || 0} Running, ${ec2.summary?.stoppedCount || 0} Stopped`,
      icon: Server,
      color: 'from-blue-500 to-indigo-600',
      badge: `${summary.totalContainerInstances || 0} ECS Container Nodes`,
      badgeColor: 'bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500/20'
    },
    {
      tabId: 'rds',
      title: 'RDS Databases',
      mainValue: `${summary.totalRdsInstances || 0} DB Instances`,
      subValue: `${summary.totalRdsStorageGb || 0} GB Total Allocated Storage`,
      detail: `Multi-AZ: ${rds.summary?.multiAzCount || 0} | Engine: ${rds.summary?.primaryEngine || 'PostgreSQL'}`,
      icon: Database,
      color: 'from-purple-500 to-pink-600',
      badge: 'High Availability',
      badgeColor: 'bg-purple-500/10 text-purple-400 border-purple-500/20 hover:bg-purple-500/20'
    },
    {
      tabId: 's3',
      title: 'S3 Object Storage',
      mainValue: `${summary.totalS3Buckets || 0} Buckets`,
      subValue: s3.summary?.totalSizeFormatted ? `Storage: ${s3.summary.totalSizeFormatted}` : 'Active Assets Storage',
      detail: s3.summary?.totalObjectCount ? `${s3.summary.totalObjectCount.toLocaleString()} Objects` : 'Managed S3 Repositories',
      icon: FolderArchive,
      color: 'from-emerald-500 to-teal-600',
      badge: 'Storage Lens Monitored',
      badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        const isActive = activeTab === card.tabId;

        return (
          <div 
            key={idx} 
            onClick={() => onSelectTab && onSelectTab(card.tabId)}
            className={`glass-card rounded-2xl p-5 relative overflow-hidden flex flex-col justify-between cursor-pointer transition-all duration-300 group ${
              isActive 
                ? 'ring-2 ring-amber-500/50 bg-slate-900/90 shadow-xl shadow-amber-500/5 scale-[1.01]' 
                : 'hover:-translate-y-1 hover:border-slate-700 hover:shadow-xl'
            }`}
            title={`Click to view ${card.title} details`}
          >
            {/* Background Glow Accent */}
            <div className={`absolute -right-8 -top-8 w-24 h-24 rounded-full bg-gradient-to-br ${card.color} opacity-10 group-hover:opacity-20 blur-2xl transition-opacity pointer-events-none`} />

            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider group-hover:text-amber-400 transition-colors flex items-center gap-1">
                  {card.title}
                  <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-amber-400" />
                </span>
                <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${card.color} p-0.5 shadow-md flex items-center justify-center transition-transform group-hover:scale-110`}>
                  <div className="w-full h-full bg-slate-900 rounded-[10px] flex items-center justify-center">
                    <Icon className="w-4.5 h-4.5 text-slate-100" />
                  </div>
                </div>
              </div>

              <div className="text-2xl font-black text-slate-50 tracking-tight mb-1 group-hover:text-amber-300 transition-colors">
                {card.mainValue}
              </div>

              <p className="text-xs font-semibold text-slate-300 mb-2">
                {card.subValue}
              </p>
            </div>

            <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between mt-2">
              <span className="text-[11px] font-medium text-slate-400 group-hover:text-slate-300 transition-colors">
                {card.detail}
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border transition-all ${card.badgeColor}`}>
                {card.badge}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
