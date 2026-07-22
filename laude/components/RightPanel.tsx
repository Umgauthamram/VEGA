'use client';

import React, { useState } from 'react';
import { 
  Activity, Layers, ChevronDown, ChevronUp, FileText, Server, AlertTriangle
} from 'lucide-react';
import { Attachment, ProjectFile } from '../app/types';

interface RightPanelProps {
  agentLogs: { step: string; type: 'call' | 'response' | 'error'; timestamp: number }[];
  showLogsPanel: boolean;
  setShowLogsPanel: (show: boolean) => void;
  attachments: Attachment[];
  projectFilesList: ProjectFile[];
  mcpServers: any[];
}

export function RightPanel({
  agentLogs,
  showLogsPanel,
  setShowLogsPanel,
  attachments,
  projectFilesList,
  mcpServers
}: RightPanelProps) {
  const [expandedLogIdx, setExpandedLogIdx] = useState<number | null>(null);

  if (!showLogsPanel) return null;

  return (
    <div className="w-80 border-l border-border-color bg-sidebar flex flex-col h-full shrink-0 select-none text-foreground">
      {/* Header title */}
      <div className="h-14 border-b border-border-color px-4 flex items-center justify-between bg-sidebar/50">
        <span className="font-semibold text-xs text-foreground flex items-center gap-1.5 uppercase tracking-wider font-mono">
          <Activity className="w-4 h-4 text-accent" /> Execution Progress
        </span>
        <button onClick={() => setShowLogsPanel(false)} className="text-foreground/40 hover:text-foreground text-xl">×</button>
      </div>

      <div className="flex-1 p-4 overflow-y-auto space-y-4">
        {/* PROGRESS MODULE CARD */}
        <div className="bg-card-bg border border-border-color rounded-xl p-3.5 space-y-3">
          <div className="text-[10px] font-bold text-foreground/40 uppercase tracking-wider">Agent Trace Logs</div>
          
          {agentLogs.length === 0 ? (
            <div className="text-[11px] text-foreground/40 text-center py-4 italic">No logs recorded. Toggle Agent Mode to track run steps.</div>
          ) : (
            <div className="space-y-2">
              {agentLogs.map((log, idx) => (
                <div 
                  key={idx} 
                  className={`p-2.5 rounded-lg border text-xs leading-relaxed transition-all ${
                    log.type === 'error' ? 'bg-rose-950/20 border-rose-900/40 text-rose-300' :
                    log.type === 'response' ? 'bg-sidebar border-border-color text-foreground/80' : 
                    'bg-accent/10 border-accent/20 text-accent'
                  }`}
                >
                  <div 
                    onClick={() => setExpandedLogIdx(expandedLogIdx === idx ? null : idx)}
                    className="flex justify-between items-center cursor-pointer font-semibold text-[10px] uppercase font-mono"
                  >
                    <span>{log.type} • {new Date(log.timestamp).toLocaleTimeString()}</span>
                    {expandedLogIdx === idx ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </div>
                  {(expandedLogIdx === idx || idx === agentLogs.length - 1) && (
                    <div className="mt-1.5 pt-1.5 border-t border-border-color/30 font-mono text-[11px] whitespace-pre-wrap break-all">
                      {log.step}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* CONTEXT MODULE CARD */}
        <div className="bg-card-bg border border-border-color rounded-xl p-3.5 space-y-3">
          <div className="text-[10px] font-bold text-foreground/40 uppercase tracking-wider">Session Context</div>
          
          <div className="space-y-3">
            {/* Attachments */}
            {attachments.length > 0 && (
              <div className="space-y-1">
                <div className="text-[9px] uppercase font-bold text-foreground/40 flex items-center gap-1">
                  <FileText className="w-3 h-3" /> Attached Context files
                </div>
                <div className="space-y-1">
                  {attachments.map((a, i) => (
                    <div key={i} className="text-xs truncate text-foreground/80 bg-sidebar/50 px-2 py-1 rounded border border-border-color/30">
                      {a.name}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Project files */}
            {projectFilesList.length > 0 && (
              <div className="space-y-1">
                <div className="text-[9px] uppercase font-bold text-foreground/40 flex items-center gap-1">
                  <Layers className="w-3 h-3" /> RAG Knowledge Base files
                </div>
                <div className="space-y-1">
                  {projectFilesList.map((pf) => (
                    <div key={pf.id} className="text-xs truncate text-foreground/80 bg-sidebar/50 px-2 py-1 rounded border border-border-color/30">
                      {pf.name} ({(pf.size / 1024).toFixed(1)} KB)
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* MCP Servers */}
            {mcpServers.filter(s => s.enabled).length > 0 && (
              <div className="space-y-1">
                <div className="text-[9px] uppercase font-bold text-foreground/40 flex items-center gap-1">
                  <Server className="w-3 h-3" /> Connected MCP Servers
                </div>
                <div className="space-y-1">
                  {mcpServers.filter(s => s.enabled).map((srv) => (
                    <div key={srv.name} className="text-xs truncate text-foreground/80 bg-sidebar/50 px-2 py-1 rounded border border-border-color/30 flex items-center justify-between">
                      <span>{srv.name}</span>
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {attachments.length === 0 && projectFilesList.length === 0 && mcpServers.filter(s => s.enabled).length === 0 && (
              <div className="text-[11px] text-foreground/40 text-center py-4 italic">
                Track tools and referenced files used in this task.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
