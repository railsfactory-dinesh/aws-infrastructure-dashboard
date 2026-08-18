import React, { useState } from 'react';
import { ShieldCheck, Globe, Play, Server, Layers, Cpu, ArrowRight } from 'lucide-react';

export default function AuthRegionModal({
  isOpen,
  onClose,
  profiles = [],
  currentProfile = 'iam-role (EC2 metadata)',
  currentRegion = 'us-east-1',
  onConfirm
}) {
  if (!isOpen) return null;

  const [selectedProfile, setSelectedProfile] = useState(currentProfile || 'iam-role (EC2 metadata)');
  const [selectedRegion, setSelectedRegion] = useState(currentRegion || 'us-east-1');

  const popularRegions = [
    { code: 'us-east-1', name: 'US East (N. Virginia)' },
    { code: 'us-east-2', name: 'US East (Ohio)' },
    { code: 'us-west-2', name: 'US West (Oregon)' },
    { code: 'ap-south-1', name: 'Asia Pacific (Mumbai)' },
    { code: 'ap-southeast-1', name: 'Asia Pacific (Singapore)' },
    { code: 'eu-west-1', name: 'Europe (Ireland)' }
  ];

  const handleStartScan = () => {
    onConfirm(selectedProfile, selectedRegion);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="glass-card max-w-xl w-full rounded-3xl border border-slate-700/80 p-8 shadow-2xl shadow-amber-500/10 space-y-6 relative overflow-hidden">
        
        {/* Subtle Background Glow */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>AWS Authentication & Scan Setup</span>
          </div>
          <h2 className="text-2xl font-black text-slate-100 tracking-tight">
            Select AWS Auth Profile & Region
          </h2>
          <p className="text-xs text-slate-400">
            Choose your AWS IAM Role or CLI Profile and target Region before scanning infrastructure tasks.
          </p>
        </div>

        {/* Form Controls */}
        <div className="space-y-5">
          
          {/* Step 1: AWS Profile / Auth Method */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-300 flex items-center gap-2">
              <Server className="w-4 h-4 text-amber-400" />
              1. Choose AWS Authentication Method / Profile:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {profiles.map((p) => {
                const isSelected = selectedProfile === p;
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setSelectedProfile(p)}
                    className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                      isSelected
                        ? 'bg-amber-500/20 border-amber-500/80 text-amber-200 shadow-md shadow-amber-500/10 scale-[1.02]'
                        : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-900'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      <span className="font-bold text-xs truncate">{p}</span>
                      {isSelected && <div className="w-2 h-2 rounded-full bg-amber-400 shadow-sm shadow-amber-400" />}
                    </div>
                    <span className="text-[10px] text-slate-400">
                      {p.includes('iam-role') 
                        ? 'EC2 Instance Metadata (IAM Role)' 
                        : 'AWS CLI Config Profile'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 2: AWS Region */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-300 flex items-center gap-2">
              <Globe className="w-4 h-4 text-sky-400" />
              2. Target AWS Region:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {popularRegions.map((reg) => {
                const isRegSelected = selectedRegion === reg.code;
                return (
                  <button
                    key={reg.code}
                    type="button"
                    onClick={() => setSelectedRegion(reg.code)}
                    className={`px-3 py-2.5 rounded-xl border text-xs text-left transition-all ${
                      isRegSelected
                        ? 'bg-sky-500/20 border-sky-500/80 text-sky-200 font-bold'
                        : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    <div className="font-semibold">{reg.code}</div>
                    <div className="text-[10px] opacity-75 truncate">{reg.name}</div>
                  </button>
                );
              })}
            </div>
          </div>

        </div>

        {/* Action Button */}
        <div className="pt-2">
          <button
            type="button"
            onClick={handleStartScan}
            className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-600 to-amber-500 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-sm uppercase tracking-wider transition-all transform active:scale-95 shadow-xl shadow-amber-500/20 flex items-center justify-center gap-3"
          >
            <Play className="w-5 h-5 fill-slate-950" />
            <span>Start Infrastructure Scan Task</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

      </div>
    </div>
  );
}
