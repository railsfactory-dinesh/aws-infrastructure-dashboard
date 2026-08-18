import React, { useState } from 'react';
import { 
  FolderArchive, 
  Search, 
  HardDrive, 
  Calendar, 
  Globe, 
  BarChart3, 
  CheckCircle2, 
  Layers,
  PieChart
} from 'lucide-react';

export default function S3Overview({ s3Data = {}, isClientMode }) {
  const buckets = s3Data.buckets || [];
  const summary = s3Data.summary || {};
  const storageLensConfigs = s3Data.storageLens || [];

  const [searchTerm, setSearchTerm] = useState('');

  const filteredBuckets = buckets.filter(b => 
    b.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const maskBucketName = (name) => {
    if (!name) return name;
    if (isClientMode && name.includes('7101')) {
      return name.replace(/7101\d+/, '7101******');
    }
    return name;
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner & Storage Lens Card */}
      <div className="glass-panel p-5 rounded-2xl border border-slate-800/80">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-base font-extrabold text-slate-100 flex items-center gap-2">
              <FolderArchive className="w-5 h-5 text-emerald-400" />
              S3 Object Storage & Storage Lens Analytics
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Bucket inventory, creation timelines, and S3 Storage Lens account-level telemetry
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              {summary.totalBuckets || buckets.length} S3 Buckets
            </span>
            {summary.totalSizeFormatted && (
              <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
                {summary.totalSizeFormatted}
              </span>
            )}
          </div>
        </div>

        {/* Storage Lens Insights Box */}
        {storageLensConfigs.length > 0 && storageLensConfigs[0]?.metrics && (
          <div className="bg-slate-900/90 rounded-xl p-4 border border-slate-800 mb-2">
            <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
              <span className="text-xs font-bold text-amber-400 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-amber-500" />
                S3 Storage Lens Dashboard ({storageLensConfigs[0].configId})
              </span>
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                {storageLensConfigs[0].status}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Standard Storage</span>
                <p className="text-sm font-black text-slate-100">{storageLensConfigs[0].metrics.standardStorageGb}</p>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Infrequent Access</span>
                <p className="text-sm font-black text-sky-400">{storageLensConfigs[0].metrics.infrequentAccessGb}</p>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Glacier Archive</span>
                <p className="text-sm font-black text-purple-400">{storageLensConfigs[0].metrics.glacierStorageGb}</p>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Object Count</span>
                <p className="text-sm font-black text-amber-400">{storageLensConfigs[0].metrics.objectCount}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <h3 className="text-sm font-bold text-slate-200">
          Bucket Inventory ({filteredBuckets.length})
        </h3>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search bucket name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900 text-xs text-slate-100 rounded-xl pl-9 pr-4 py-2 border border-slate-800 focus:outline-none focus:border-emerald-500/50"
          />
        </div>
      </div>

      {/* Buckets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredBuckets.map((bucket) => (
          <div key={bucket.name} className="glass-card rounded-2xl p-4 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <FolderArchive className="w-4 h-4" />
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800">
                  {bucket.region || 'us-east-1'}
                </span>
              </div>

              <h4 className="font-bold text-xs text-slate-100 break-all mb-3">
                {maskBucketName(bucket.name)}
              </h4>
            </div>

            <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3 text-slate-400" />
                Created: {bucket.creationDate ? new Date(bucket.creationDate).toLocaleDateString() : 'N/A'}
              </span>
              {bucket.estimatedSizeFormatted && (
                <span className="font-bold text-amber-400">
                  {bucket.estimatedSizeFormatted}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}
