import React, { useState } from 'react';
import { 
  Cloud, 
  RotateCw, 
  Eye, 
  EyeOff, 
  FileText, 
  Server, 
  Layers, 
  CheckCircle2, 
  AlertCircle,
  Play,
  Settings,
  ChevronDown
} from 'lucide-react';

export default function Navbar({
  profiles,
  selectedProfile,
  onProfileChange,
  selectedRegion,
  onRegionChange,
  isMock,
  onToggleMock,
  isClientMode,
  onToggleClientMode,
  onRefresh,
  loading,
  lastUpdated,
  onOpenReportModal
}) {
  const [customProfileInput, setCustomProfileInput] = useState('');
  const [showCustomProfileInput, setShowCustomProfileInput] = useState(false);

  const [customRegionInput, setCustomRegionInput] = useState('');
  const [showCustomRegionInput, setShowCustomRegionInput] = useState(false);

  const allRegions = [
    // North America
    { code: 'us-east-1', name: 'US East (N. Virginia)' },
    { code: 'us-east-2', name: 'US East (Ohio)' },
    { code: 'us-west-1', name: 'US West (N. California)' },
    { code: 'us-west-2', name: 'US West (Oregon)' },
    { code: 'ca-central-1', name: 'Canada (Central)' },

    // Asia Pacific
    { code: 'ap-south-1', name: 'Asia Pacific (Mumbai)' },
    { code: 'ap-south-2', name: 'Asia Pacific (Hyderabad)' },
    { code: 'ap-southeast-1', name: 'Asia Pacific (Singapore)' },
    { code: 'ap-southeast-2', name: 'Asia Pacific (Sydney)' },
    { code: 'ap-southeast-3', name: 'Asia Pacific (Jakarta)' },
    { code: 'ap-southeast-4', name: 'Asia Pacific (Melbourne)' },
    { code: 'ap-northeast-1', name: 'Asia Pacific (Tokyo)' },
    { code: 'ap-northeast-2', name: 'Asia Pacific (Seoul)' },
    { code: 'ap-northeast-3', name: 'Asia Pacific (Osaka)' },

    // Europe
    { code: 'eu-central-1', name: 'Europe (Frankfurt)' },
    { code: 'eu-central-2', name: 'Europe (Zurich)' },
    { code: 'eu-west-1', name: 'Europe (Ireland)' },
    { code: 'eu-west-2', name: 'Europe (London)' },
    { code: 'eu-west-3', name: 'Europe (Paris)' },
    { code: 'eu-north-1', name: 'Europe (Stockholm)' },
    { code: 'eu-south-1', name: 'Europe (Milan)' },
    { code: 'eu-south-2', name: 'Europe (Spain)' },

    // South America, Middle East, Africa
    { code: 'sa-east-1', name: 'South America (São Paulo)' },
    { code: 'me-south-1', name: 'Middle East (Bahrain)' },
    { code: 'me-central-1', name: 'Middle East (UAE)' },
    { code: 'af-south-1', name: 'Africa (Cape Town)' },
  ];

  const handleProfileSelect = (e) => {
    const val = e.target.value;
    if (val === 'CUSTOM_INPUT') {
      setShowCustomProfileInput(true);
    } else {
      setShowCustomProfileInput(false);
      onProfileChange(val);
    }
  };

  const handleCustomProfileSubmit = (e) => {
    e.preventDefault();
    if (customProfileInput.trim()) {
      onProfileChange(customProfileInput.trim());
      setShowCustomProfileInput(false);
      setCustomProfileInput('');
    }
  };

  const handleRegionSelect = (e) => {
    const val = e.target.value;
    if (val === 'CUSTOM_REGION') {
      setShowCustomRegionInput(true);
    } else {
      setShowCustomRegionInput(false);
      onRegionChange(val);
    }
  };

  const handleCustomRegionSubmit = (e) => {
    e.preventDefault();
    if (customRegionInput.trim()) {
      onRegionChange(customRegionInput.trim());
      setShowCustomRegionInput(false);
      setCustomRegionInput('');
    }
  };

  return (
    <header className="sticky top-0 z-40 glass-panel border-b border-slate-800/80 px-6 py-3.5 mb-6">
      <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
        
        {/* Left Branding */}
        <div className="flex items-center gap-3.5 w-full lg:w-auto">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-600 p-0.5 shadow-lg shadow-amber-500/20 flex items-center justify-center">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <Cloud className="w-5 h-5 text-amber-500" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-extrabold text-lg tracking-tight text-slate-50">AWS Infrastructure Hub</h1>
            </div>
            <p className="text-xs text-slate-400 font-medium">Real-time ECS, EC2, RDS & S3 Consolidated View</p>
          </div>
        </div>

        {/* Middle Controls: Profile & Region Selectors */}
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-start lg:justify-center">
          
          {/* Profile Chooser */}
          <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-700/60 rounded-lg px-3 py-1.5 shadow-inner">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Profile:</span>
            {!showCustomProfileInput ? (
              <select
                value={selectedProfile}
                onChange={handleProfileSelect}
                className="bg-transparent text-xs font-bold text-amber-400 focus:outline-none cursor-pointer pr-2"
              >
                {profiles.map((p) => (
                  <option key={p} value={p} className="bg-slate-900 text-slate-100">
                    {p === 'default' ? 'default (AWS CLI)' : p}
                  </option>
                ))}
                <option value="CUSTOM_INPUT" className="bg-slate-900 text-amber-400 font-semibold">
                  + Custom Profile...
                </option>
              </select>
            ) : (
              <form onSubmit={handleCustomProfileSubmit} className="flex items-center gap-1">
                <input
                  type="text"
                  placeholder="Profile name..."
                  value={customProfileInput}
                  onChange={(e) => setCustomProfileInput(e.target.value)}
                  className="bg-slate-950 text-xs px-2 py-0.5 rounded border border-amber-500/50 text-amber-400 focus:outline-none w-28"
                  autoFocus
                />
                <button type="submit" className="text-[10px] bg-amber-500 text-slate-950 px-2 py-0.5 rounded font-bold">
                  Set
                </button>
                <button 
                  type="button" 
                  onClick={() => setShowCustomProfileInput(false)}
                  className="text-[10px] text-slate-400 px-1"
                >
                  ✕
                </button>
              </form>
            )}
          </div>

          {/* Region Selector */}
          <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-700/60 rounded-lg px-3 py-1.5 shadow-inner">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Region:</span>
            {!showCustomRegionInput ? (
              <select
                value={selectedRegion}
                onChange={handleRegionSelect}
                className="bg-transparent text-xs font-bold text-sky-400 focus:outline-none cursor-pointer max-w-[210px]"
              >
                {allRegions.map((r) => (
                  <option key={r.code} value={r.code} className="bg-slate-900 text-slate-100">
                    {r.code} - {r.name}
                  </option>
                ))}
                {!allRegions.some(r => r.code === selectedRegion) && (
                  <option value={selectedRegion} className="bg-slate-900 text-sky-300 font-bold">
                    {selectedRegion} (Custom)
                  </option>
                )}
                <option value="CUSTOM_REGION" className="bg-slate-900 text-sky-400 font-semibold">
                  + Custom Region...
                </option>
              </select>
            ) : (
              <form onSubmit={handleCustomRegionSubmit} className="flex items-center gap-1">
                <input
                  type="text"
                  placeholder="e.g. ap-south-2"
                  value={customRegionInput}
                  onChange={(e) => setCustomRegionInput(e.target.value)}
                  className="bg-slate-950 text-xs px-2 py-0.5 rounded border border-sky-500/50 text-sky-400 focus:outline-none w-28"
                  autoFocus
                />
                <button type="submit" className="text-[10px] bg-sky-500 text-slate-950 px-2 py-0.5 rounded font-bold">
                  Set
                </button>
                <button 
                  type="button" 
                  onClick={() => setShowCustomRegionInput(false)}
                  className="text-[10px] text-slate-400 px-1"
                >
                  ✕
                </button>
              </form>
            )}
          </div>

          {/* Mode Switchers */}
          <button
            onClick={onToggleMock}
            className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all ${
              isMock
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
            }`}
            title={isMock ? 'Currently viewing cached sample data' : 'Querying real AWS CLI'}
          >
            <span className={`w-2 h-2 rounded-full ${isMock ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`} />
            {isMock ? 'Demo Dataset' : 'Live AWS Connected'}
          </button>

          <button
            onClick={onToggleClientMode}
            className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all ${
              isClientMode
                ? 'bg-purple-500/20 border-purple-500/40 text-purple-300'
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
            }`}
            title="Mask sensitive Account IDs, IPs and internal ARNs for external client presentations"
          >
            {isClientMode ? <EyeOff className="w-3.5 h-3.5 text-purple-400" /> : <Eye className="w-3.5 h-3.5 text-slate-400" />}
            {isClientMode ? 'Client Privacy ON' : 'Client Mode'}
          </button>
        </div>

        {/* Right Action Buttons */}
        <div className="flex items-center gap-2.5 w-full lg:w-auto justify-end">
          <button
            onClick={onRefresh}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/80 transition-all disabled:opacity-50"
          >
            <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-amber-400' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={onOpenReportModal}
            className="flex items-center gap-2 text-xs font-bold px-4 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 shadow-md shadow-amber-500/20 transition-all transform active:scale-95"
          >
            <FileText className="w-4 h-4" />
            <span>Export Executive Report</span>
          </button>
        </div>

      </div>
    </header>
  );
}
