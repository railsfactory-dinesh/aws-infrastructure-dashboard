import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar.jsx';
import KPICards from './components/KPICards.jsx';
import ECSOverview from './components/ECSOverview.jsx';
import EC2Breakdown from './components/EC2Breakdown.jsx';
import RDSOverview from './components/RDSOverview.jsx';
import S3Overview from './components/S3Overview.jsx';
import ExecutiveReportModal from './components/ExecutiveReportModal.jsx';
import AuthRegionModal from './components/AuthRegionModal.jsx';
import LoginPage from './components/LoginPage.jsx';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import { 
  Layers, 
  Server, 
  Database, 
  FolderArchive, 
  LayoutDashboard, 
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Cpu,
  HardDrive
} from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

// Helper: get auth headers for all API calls
function authHeaders() {
  const token = sessionStorage.getItem('auth_token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}

export default function App() {
  const [profiles, setProfiles] = useState(['iam-role (EC2 metadata)', 'default']);
  const [selectedProfile, setSelectedProfile] = useState('iam-role (EC2 metadata)');
  const [selectedRegion, setSelectedRegion] = useState('us-east-1');
  const [isMock, setIsMock] = useState(false);
  const [isClientMode, setIsClientMode] = useState(false);
  
  const [activeTab, setActiveTab] = useState('overview');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(true);

  // Auth state — restore from sessionStorage on reload
  const [authToken, setAuthToken] = useState(() => sessionStorage.getItem('auth_token') || '');
  const [authUser, setAuthUser] = useState(() => sessionStorage.getItem('auth_user') || '');

  const handleLogin = (token, user) => {
    setAuthToken(token);
    setAuthUser(user);
  };

  const handleLogout = () => {
    sessionStorage.removeItem('auth_token');
    sessionStorage.removeItem('auth_user');
    setAuthToken('');
    setAuthUser('');
    setData(null);
  };

  // Show login page if not authenticated
  if (!authToken) {
    return <LoginPage onLogin={handleLogin} />;
  }

  // Fetch profiles on load (with auth token)
  useEffect(() => {
    fetch(`${API_BASE_URL}/api/profiles`, { headers: authHeaders() })
      .then(res => {
        if (res.status === 401) { handleLogout(); return null; }
        return res.json();
      })
      .then(resData => {
        if (!resData) return;
        if (resData.profiles && resData.profiles.length > 0) {
          setProfiles(resData.profiles);
          setSelectedProfile(prev => resData.profiles.includes(prev) ? prev : resData.profiles[0]);
        }
      })
      .catch(err => console.warn('Profiles load error:', err));
  }, [authToken]);

  // Fetch infrastructure data when profile, region or mock mode changes
  const loadData = (overrideProfile, overrideRegion) => {
    setLoading(true);
    setError(null);

    const prof = overrideProfile || selectedProfile;
    const reg = overrideRegion || selectedRegion;

    const url = `${API_BASE_URL}/api/infrastructure?profile=${encodeURIComponent(prof)}&region=${encodeURIComponent(reg)}&mock=${isMock}`;
    
    fetch(url, { headers: authHeaders() })
      .then(res => {
        // Always parse JSON even on error responses
        return res.json().then(body => ({ ok: res.ok, status: res.status, body }));
      })
      .then(({ ok, status, body }) => {
        if (body.success && body.data) {
          setData(body.data);
          setError(null);
        } else {
          const errMsg = body.error || body.hint || `HTTP ${status}: Failed to fetch AWS data.`;
          setError(errMsg);
          console.error('[Dashboard Error]', errMsg);
        }
      })
      .catch(err => {
        console.error('Fetch error:', err);
        setError(`Connection error: ${err.message}. Is the backend running?`);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    loadData();
  }, [selectedProfile, selectedRegion, isMock]);

  const summary = data?.summary || {};
  const ecsData = data?.ecs || {};
  const ec2Data = data?.ec2 || {};
  const rdsData = data?.rds || {};
  const s3Data = data?.s3 || {};

  // Charts data preparation
  const ecsCpuMemoryChartData = (ecsData.clusters || []).map(cluster => {
    const totalCpu = (cluster.services || []).reduce((acc, s) => {
      const parsed = parseFloat(s.totalCpu);
      return acc + (isNaN(parsed) ? 0 : parsed);
    }, 0);

    const totalMem = (cluster.services || []).reduce((acc, s) => {
      const parsed = parseFloat(s.totalMemory);
      return acc + (isNaN(parsed) ? 0 : parsed);
    }, 0);

    return {
      name: cluster.name,
      tasks: cluster.runningTasksCount || 0,
      cpu: totalCpu,
      memory: totalMem
    };
  });

  const ec2DistributionChartData = [
    { name: 'ECS Container Hosts', value: summary.totalContainerInstances || 0, color: '#f59e0b' },
    { name: 'Standalone Non-ECS', value: summary.totalStandaloneEc2 || 0, color: '#a855f7' }
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans pb-16">
      
      {/* Top Executive Navbar */}
      <Navbar
        profiles={profiles}
        selectedProfile={selectedProfile}
        onProfileChange={(p) => setSelectedProfile(p)}
        selectedRegion={selectedRegion}
        onRegionChange={(r) => setSelectedRegion(r)}
        isMock={isMock}
        onToggleMock={() => setIsMock(!isMock)}
        isClientMode={isClientMode}
        onToggleClientMode={() => setIsClientMode(!isClientMode)}
        onRefresh={loadData}
        loading={loading}
        lastUpdated={data?.meta?.lastUpdated}
        onOpenReportModal={() => setReportModalOpen(true)}
      />

      {/* Main Container */}
      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 flex-1 space-y-6">
        
        {/* Warning Banner if cached fallback data was loaded */}
        {data?.meta?.warning && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex items-center justify-between text-xs text-amber-300">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>{data.meta.warning}</span>
            </div>
            <button 
              onClick={() => setIsMock(true)}
              className="px-3 py-1 bg-amber-500/20 text-amber-300 font-bold rounded-lg border border-amber-500/30 hover:bg-amber-500/30"
            >
              Switch to Demo Mode
            </button>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-1">
          <div className="flex items-center gap-2 overflow-x-auto">
            {[
              { id: 'overview', label: 'Executive Overview', icon: LayoutDashboard },
              { id: 'ecs', label: 'ECS & Tasks Specs', icon: Layers, badge: summary.totalServices || 0 },
              { id: 'ec2', label: 'EC2 Breakdown', icon: Server, badge: summary.totalEc2Instances || 0 },
              { id: 'rds', label: 'RDS Databases', icon: Database, badge: summary.totalRdsInstances || 0 },
              { id: 's3', label: 'S3 & Storage Lens', icon: FolderArchive, badge: summary.totalS3Buckets || 0 }
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all border ${
                    isActive
                      ? 'bg-amber-500/10 border-amber-500/40 text-amber-400 shadow-sm'
                      : 'bg-transparent border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-amber-400' : 'text-slate-400'}`} />
                  <span>{tab.label}</span>
                  {tab.badge !== undefined && (
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                      isActive ? 'bg-amber-500/20 text-amber-300' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="hidden md:flex items-center gap-2 text-[11px] text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Profile: <strong className="text-amber-400">{selectedProfile}</strong></span>
          </div>
        </div>

        {/* Loading Spinner State */}
        {loading && !data && (
          <div className="glass-panel rounded-2xl p-16 flex flex-col items-center justify-center text-center space-y-4 border border-slate-800">
            <RefreshCw className="w-10 h-10 text-amber-400 animate-spin" />
            <div>
              <h3 className="text-sm font-bold text-slate-100">Fetching AWS Infrastructure...</h3>
              <p className="text-xs text-slate-400 mt-1">Executing AWS CLI commands for profile "{selectedProfile}" ({selectedRegion})</p>
            </div>
          </div>
        )}

        {/* Content Render based on Active Tab */}
        {!loading && data && (
          <>
            {/* Top Key Metric KPI Cards (Clickable to switch tabs) */}
            <KPICards
              summary={summary}
              ecs={ecsData}
              ec2={ec2Data}
              rds={rdsData}
              s3={s3Data}
              isClientMode={isClientMode}
              onSelectTab={(tabId) => setActiveTab(tabId)}
              activeTab={activeTab}
            />

            {/* TAB 1: EXECUTIVE OVERVIEW */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                
                {/* Visual Charts Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  
                  {/* Chart 1: Cluster CPU & Memory Allocation Bar Chart */}
                  <div className="glass-panel p-5 rounded-2xl border border-slate-800/80 lg:col-span-2">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                          <Cpu className="w-4 h-4 text-amber-400" />
                          ECS Allocated Resources by Cluster (vCPU & GB Memory)
                        </h3>
                        <p className="text-[11px] text-slate-400">Aggregated task cpu and memory assignments</p>
                      </div>
                    </div>

                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={ecsCpuMemoryChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                          <YAxis stroke="#64748b" fontSize={11} />
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }}
                            itemStyle={{ color: '#f8fafc' }}
                          />
                          <Bar dataKey="cpu" name="Allocated vCPU" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                          <Bar dataKey="memory" name="Allocated Memory (GB)" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Chart 2: EC2 Container vs Standalone Donut */}
                  <div className="glass-panel p-5 rounded-2xl border border-slate-800/80">
                    <div className="mb-4">
                      <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                        <Server className="w-4 h-4 text-sky-400" />
                        EC2 Host Distribution
                      </h3>
                      <p className="text-[11px] text-slate-400">ECS Hosts vs Standalone VMs</p>
                    </div>

                    <div className="h-48 w-full flex items-center justify-center">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={ec2DistributionChartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={75}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {ec2DistributionChartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-slate-800 text-xs">
                      {ec2DistributionChartData.map(item => (
                        <div key={item.name} className="flex items-center justify-between">
                          <span className="flex items-center gap-2 font-medium text-slate-300">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                            {item.name}
                          </span>
                          <span className="font-bold text-slate-100">{item.value} Nodes</span>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>

                {/* Quick Quick Access Tables Preview */}
                <ECSOverview ecsData={ecsData} isClientMode={isClientMode} />

              </div>
            )}

            {/* TAB 2: ECS */}
            {activeTab === 'ecs' && (
              <ECSOverview ecsData={ecsData} isClientMode={isClientMode} />
            )}

            {/* TAB 3: EC2 */}
            {activeTab === 'ec2' && (
              <EC2Breakdown ec2Data={ec2Data} isClientMode={isClientMode} />
            )}

            {/* TAB 4: RDS */}
            {activeTab === 'rds' && (
              <RDSOverview rdsData={rdsData} isClientMode={isClientMode} />
            )}

            {/* TAB 5: S3 */}
            {activeTab === 's3' && (
              <S3Overview s3Data={s3Data} isClientMode={isClientMode} />
            )}
          </>
        )}

      </main>

      {/* Footer */}
      <footer className="mt-12 text-center text-xs text-slate-400 py-6 border-t border-slate-900">
        <p>AWS Infrastructure Executive Hub • Built for PMs, TLs, and DevOps Engineers</p>
      </footer>

      {/* Executive Report Modal */}
      <ExecutiveReportModal
        isOpen={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
        data={data}
      />

      {/* Auth & Region Setup Modal */}
      <AuthRegionModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        profiles={profiles}
        currentProfile={selectedProfile}
        currentRegion={selectedRegion}
        onConfirm={(prof, reg) => {
          setSelectedProfile(prof);
          setSelectedRegion(reg);
        }}
      />

    </div>
  );
}
