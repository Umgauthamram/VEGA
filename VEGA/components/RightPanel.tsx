'use client';

import React, { useState } from 'react';
import { 
  Activity, Layers, ChevronDown, ChevronUp, FileText, Server, AlertTriangle, Terminal
} from 'lucide-react';
import { Attachment, ProjectFile } from '../app/types';
import { getMcpLogs } from '../app/mcp';

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
  const [selectedMcpLogServer, setSelectedMcpLogServer] = useState<string | null>(null);
  const [showMcpLogsSection, setShowMcpLogsSection] = useState(false);

  if (!showLogsPanel) return null;

  return (
    <div className="w-80 border-l border-border-color bg-sidebar flex flex-col h-full shrink-0 select-none text-foreground font-sans">
      {/* Header title */}
      <div className="h-14 border-b border-border-color px-4 flex items-center justify-between bg-sidebar/50">
        <span className="font-semibold text-xs text-foreground flex items-center gap-1.5 uppercase tracking-wider font-mono">
          Execution Progress
        </span>
        <button onClick={() => setShowLogsPanel(false)} className="text-foreground/40 hover:text-foreground text-xl">×</button>
      </div>

      <div className="flex-1 p-4 overflow-y-auto space-y-4">
        {/* PROGRESS MODULE CARD */}
        <div className="bg-card-bg border border-border-color rounded-xl p-3.5 space-y-3 shadow-sm">
          <div className="text-[10px] font-bold text-foreground/40 uppercase tracking-wider">Agent Trace Logs</div>
          
          {agentLogs.length === 0 ? (
            <div className="text-[11px] text-foreground/40 text-center py-4 italic">No logs recorded. Toggle Agent Mode to track run steps.</div>
          ) : (
            <div className="space-y-2">
              {agentLogs.map((log, idx) => (
                <div 
                  key={idx} 
                  className={`p-2 rounded-lg border text-[11px] leading-relaxed transition-all ${
                    log.type === 'error' ? 'bg-rose-950/20 border-rose-900/40 text-rose-300' :
                    log.type === 'response' ? 'bg-sidebar border-border-color text-foreground/80' : 
                    'bg-accent/10 border-accent/20 text-accent'
                  }`}
                >
                  <div 
                    onClick={() => setExpandedLogIdx(expandedLogIdx === idx ? null : idx)}
                    className="flex justify-between items-center cursor-pointer font-bold text-[9px] uppercase font-mono"
                  >
                    <span>{log.type} • {new Date(log.timestamp).toLocaleTimeString()}</span>
                    {expandedLogIdx === idx ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </div>
                  {(expandedLogIdx === idx || idx === agentLogs.length - 1) && (
                    <div className="mt-1.5 pt-1.5 border-t border-border-color/30 font-mono text-[10px] whitespace-pre-wrap break-all max-h-36 overflow-y-auto">
                      {log.step}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* MCP LOG MODULE CARD (Real stdio/SSE raw RPC packets) */}
        {mcpServers.length > 0 && (
          <div className="bg-card-bg border border-border-color rounded-xl p-3.5 space-y-3 shadow-sm">
            <button 
              onClick={() => setShowMcpLogsSection(!showMcpLogsSection)}
              className="w-full flex justify-between items-center text-[10px] font-bold text-foreground/45 uppercase tracking-wider text-left"
            >
              <span className="flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-accent" /> MCP Connector Logs
              </span>
              {showMcpLogsSection ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {showMcpLogsSection && (
              <div className="space-y-3 pt-1">
                <select
                  value={selectedMcpLogServer || ''}
                  onChange={(e) => setSelectedMcpLogServer(e.target.value || null)}
                  className="w-full bg-sidebar border border-border-color rounded p-1 text-[11px] text-foreground outline-none"
                >
                  <option value="">Select MCP Server</option>
                  {mcpServers.map(s => (
                    <option key={s.name} value={s.name}>{s.name}</option>
                  ))}
                </select>

                {selectedMcpLogServer ? (
                  <div className="bg-sidebar border border-border-color rounded-lg p-2 font-mono text-[9px] text-foreground/80 overflow-y-auto max-h-48 space-y-1">
                    {getMcpLogs(selectedMcpLogServer).length === 0 ? (
                      <div className="italic text-foreground/40 text-center py-2">No logs recorded for this session.</div>
                    ) : (
                      getMcpLogs(selectedMcpLogServer).map((line, idx) => (
                        <div key={idx} className="border-b border-border-color/10 pb-0.5 whitespace-pre-wrap break-all">
                          {line}
                        </div>
                      ))
                    )}
                  </div>
                ) : (
                  <div className="text-[10px] text-foreground/40 italic text-center py-1">Select a server to view raw JSON-RPC logs.</div>
                )}
              </div>
            )}
          </div>
        )}

        {/* CONTEXT MODULE CARD */}
        <div className="bg-card-bg border border-border-color rounded-xl p-3.5 space-y-3 shadow-sm">
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
