'use client';

import React, { useState } from 'react';
import { Code, Eye, ExternalLink, Download } from 'lucide-react';

interface ArtifactsPanelProps {
  language: string;
  code: string;
  onClose: () => void;
}

export const ArtifactsPanel: React.FC<ArtifactsPanelProps> = ({ language, code, onClose }) => {
  const [activeTab, setActiveTab] = useState<'preview' | 'code'>('preview');

  const handleDownload = () => {
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `artifact.${language === 'svg' ? 'svg' : language === 'html' ? 'html' : 'txt'}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Generate sandboxed content URL for iframe preview
  const getIframeSrc = () => {
    if (language === 'html') {
      return `data:text/html;charset=utf-8,${encodeURIComponent(code)}`;
    }
    if (language === 'svg') {
      return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(code)}`;
    }
    return '';
  };

  return (
    <div className="w-[500px] border-l border-zinc-800 bg-zinc-950 flex flex-col h-full shrink-0">
      {/* Header */}
      <div className="h-14 border-b border-zinc-800 px-4 flex items-center justify-between bg-zinc-900/50">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-sm text-zinc-200">Artifact Preview</span>
          <span className="text-[10px] bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded font-mono uppercase">
            {language}
          </span>
        </div>
        <button onClick={onClose} className="text-zinc-400 hover:text-white text-xl">
          ×
        </button>
      </div>

      {/* Tabs Bar */}
      <div className="flex items-center justify-between border-b border-zinc-900 bg-zinc-900/20 px-2 py-1.5">
        <div className="flex items-center gap-1">
          {['html', 'svg'].includes(language) && (
            <button
              onClick={() => setActiveTab('preview')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs transition ${
                activeTab === 'preview'
                  ? 'bg-zinc-800 text-amber-500 font-medium'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Preview</span>
            </button>
          )}
          <button
            onClick={() => setActiveTab('code')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs transition ${
              activeTab === 'code' || !['html', 'svg'].includes(language)
                ? 'bg-zinc-800 text-amber-500 font-medium'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Code className="w-3.5 h-3.5" />
            <span>Code</span>
          </button>
        </div>

        <button
          onClick={handleDownload}
          className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-200 px-2 py-1 transition"
          title="Download File"
        >
          <Download className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Body Area */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'preview' && ['html', 'svg'].includes(language) ? (
          <iframe
            src={getIframeSrc()}
            className="w-full h-full bg-white"
            sandbox="allow-scripts"
            title="Artifact Sandbox Frame"
          />
        ) : (
          <pre className="w-full h-full p-4 overflow-auto text-xs font-mono text-zinc-300 bg-zinc-950/50 leading-relaxed whitespace-pre-wrap select-text">
            <code>{code}</code>
          </pre>
        )}
      </div>
    </div>
  );
};
