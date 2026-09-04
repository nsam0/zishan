import React, { useState } from 'react';
import { X, Copy, Check, ExternalLink, Database, RefreshCw, Sparkles } from 'lucide-react';
import { SQL_SETUP_SCRIPT, supabase } from '../lib/supabase';

export default function SqlSetupModal({ isOpen, onClose, onVerified }) {
  const [copied, setCopied] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyStatus, setVerifyStatus] = useState(null); // 'success' | 'failed'

  if (!isOpen) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(SQL_SETUP_SCRIPT);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      alert('Failed to copy to clipboard. Please select and copy manually.');
    }
  };

  const handleTestConnection = async () => {
    setIsVerifying(true);
    setVerifyStatus(null);
    try {
      const { data, error } = await supabase.from('students').select('id').limit(1);
      if (!error) {
        setVerifyStatus('success');
        if (onVerified) {
          onVerified();
        }
      } else {
        setVerifyStatus('failed');
      }
    } catch (err) {
      setVerifyStatus('failed');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fade-in">
      <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Supabase Database Setup</h3>
              <p className="text-xs text-slate-500">Run this 1-click script to create the students table</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-4 text-sm">
          
          {/* Quick instructions */}
          <div className="bg-blue-50/70 border border-blue-100 rounded-xl p-3.5 text-xs text-blue-900">
            <p className="font-semibold mb-1 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              Easy 3-step setup:
            </p>
            <ol className="list-decimal list-inside space-y-1 text-slate-700 ml-1">
              <li>
                Click <strong>"Copy SQL"</strong> below.
              </li>
              <li>
                Open your{' '}
                <a
                  href="https://supabase.com/dashboard/project/dixecnmjennqhdgehray/sql/new"
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-blue-600 underline inline-flex items-center gap-0.5 hover:text-blue-800"
                >
                  Supabase SQL Editor <ExternalLink className="w-3 h-3 inline" />
                </a>
              </li>
              <li>Paste the code, click <strong>"Run"</strong>, and return here to click <strong>"Test Connection"</strong>.</li>
            </ol>
          </div>

          {/* SQL Code Block */}
          <div className="relative">
            <div className="flex items-center justify-between bg-slate-800 text-slate-300 text-xs px-4 py-2 rounded-t-xl font-mono">
              <span>SQL Query (PostgreSQL)</span>
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded bg-slate-700 hover:bg-slate-600 text-white transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied!' : 'Copy SQL'}</span>
              </button>
            </div>
            <pre className="p-4 bg-slate-900 text-emerald-400 font-mono text-xs rounded-b-xl overflow-x-auto leading-relaxed max-h-56">
              {SQL_SETUP_SCRIPT}
            </pre>
          </div>

          {/* Verification Feedback */}
          {verifyStatus === 'success' && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span><strong>Connected!</strong> Table "students" is now live in Supabase.</span>
            </div>
          )}

          {verifyStatus === 'failed' && (
            <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs flex items-center gap-2">
              <span>Table not detected yet. Please ensure you clicked "Run" in Supabase SQL Editor.</span>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
          <a
            href="https://supabase.com/dashboard/project/dixecnmjennqhdgehray/sql/new"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800"
          >
            <span>Open Supabase SQL Editor</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={isVerifying}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs transition-colors disabled:opacity-60"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isVerifying ? 'animate-spin' : ''}`} />
              <span>{isVerifying ? 'Checking...' : 'Test Connection'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-200/60 rounded-xl transition-colors"
            >
              Close
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
