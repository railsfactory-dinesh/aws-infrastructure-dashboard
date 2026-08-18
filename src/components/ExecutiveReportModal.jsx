import React, { useState } from 'react';
import { FileText, Download, Printer, X, Check, Building } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

export default function ExecutiveReportModal({ isOpen, onClose, data }) {
  const [clientName, setClientName] = useState('Pricebook Leadership Team');

  if (!isOpen) return null;

  const handlePrintOrDownload = () => {
    const token = sessionStorage.getItem('auth_token');

    fetch(`${API_BASE_URL}/api/export-report`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify({ data, clientName })
    })
      .then(res => {
        if (!res.ok) throw new Error(`Server error: ${res.status}`);
        return res.text();
      })
      .then(html => {
        const win = window.open('', '_blank');
        if (win) {
          win.document.write(html);
          win.document.close();
          setTimeout(() => win.print(), 600);
        } else {
          alert('Please allow popups for this site to generate the PDF report.');
        }
      })
      .catch(err => {
        console.error('Export report error:', err);
        alert(`Failed to generate report: ${err.message}`);
      });
  };

  const summary = data?.summary || {};

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="glass-card rounded-2xl border border-slate-700/80 max-w-3xl w-full p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-50">Generate Executive Infrastructure Report</h3>
              <p className="text-xs text-slate-400">Export client-ready summary for PMs, TLs, and stakeholders</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Client Name Input */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
            <Building className="w-3.5 h-3.5 text-amber-400" />
            Report Recipient / Client Organization Name:
          </label>
          <input
            type="text"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-amber-500/50"
            placeholder="e.g. Pricebook Executive Board"
          />
        </div>

        {/* Executive Summary Preview Box */}
        <div className="bg-slate-900/90 rounded-xl p-5 border border-slate-800 space-y-4">
          <h4 className="text-xs font-extrabold text-amber-400 uppercase tracking-wider">
            Report Summary Highlights
          </h4>
          
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-bold">ECS Clusters</span>
              <p className="text-lg font-black text-amber-400">{summary.totalClusters || 0}</p>
            </div>
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-bold">Microservices</span>
              <p className="text-lg font-black text-sky-400">{summary.totalServices || 0}</p>
            </div>
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-bold">Total EC2</span>
              <p className="text-lg font-black text-purple-400">{summary.totalEc2Instances || 0}</p>
            </div>
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-bold">RDS Storage</span>
              <p className="text-lg font-black text-emerald-400">{summary.totalRdsStorageGb || 0} GB</p>
            </div>
          </div>

          <ul className="text-xs text-slate-300 space-y-1.5 pt-2">
            <li className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-400" />
              <span>Full task CPU/Memory allocation details included.</span>
            </li>
            <li className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-400" />
              <span>Includes explicit distinction between ECS container nodes and standalone EC2 instances.</span>
            </li>
            <li className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-400" />
              <span>RDS Multi-AZ resilience and database engine specifications detailed.</span>
            </li>
          </ul>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-900 text-slate-300 hover:bg-slate-800"
          >
            Cancel
          </button>
          <button
            onClick={handlePrintOrDownload}
            className="px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-lg shadow-amber-500/20 hover:from-amber-400 hover:to-orange-400 flex items-center gap-2"
          >
            <Printer className="w-4 h-4" />
            <span>Generate & Export HTML/PDF</span>
          </button>
        </div>

      </div>
    </div>
  );
}
