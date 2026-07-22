'use client';

import React, { useState } from 'react';
import { 
  Bot, Send, Paperclip, Folder, Sparkles, ChevronDown, Sliders
} from 'lucide-react';
import { OllamaModel, ModelPreset, Attachment } from '../app/types';

interface ComposerProps {
  input: string;
  setInput: (val: string) => void;
  selectedModel: string;
  setSelectedModel: (val: string) => void;
  models: OllamaModel[];
  activeProviderName: string;
  presets: ModelPreset[];
  activePreset: ModelPreset;
  setActivePreset: (preset: ModelPreset) => void;
  agentMode: boolean;
  setAgentMode: (mode: boolean) => void;
  attachments: Attachment[];
  removeAttachment: (index: number) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleSendMessage: () => void;
  isStreaming: boolean;
  handleStopStream: () => void;
  contextUsage: { tokens: number; pct: number };
  keepAlive: string;
  projects: any[];
  activeProjectId: string | null;
  setActiveProjectId: (id: string | null) => void;
  showBrowserWarning: boolean;
  setShowBrowserWarning: (show: boolean) => void;
}

export function Composer({
  input,
  setInput,
  selectedModel,
  setSelectedModel,
  models,
  activeProviderName,
  presets,
  activePreset,
  setActivePreset,
  agentMode,
  setAgentMode,
  attachments,
  removeAttachment,
  fileInputRef,
  handleFileChange,
  handleSendMessage,
  isStreaming,
  handleStopStream,
  contextUsage,
  projects,
  activeProjectId,
  setActiveProjectId,
  setShowBrowserWarning
}: ComposerProps) {
  const [showPresetDropdown, setShowPresetDropdown] = useState(false);
  const [showProjectPicker, setShowProjectPicker] = useState(false);

  return (
    <div className="p-4 bg-background shrink-0">
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 max-w-[46rem] mx-auto mb-3">
          {attachments.map((a, idx) => (
            <div key={idx} className="flex items-center gap-1.5 bg-sidebar border border-border-color px-3 py-1 rounded-full text-xs text-foreground/80">
              <span className="truncate max-w-[150px]">{a.name}</span>
              <button onClick={() => removeAttachment(idx)} className="text-foreground/60 hover:text-foreground font-bold">×</button>
            </div>
          ))}
        </div>
      )}

      <div className="max-w-[46rem] mx-auto flex flex-col bg-card-bg border border-border-color rounded-2xl p-3 shadow-sm focus-within:border-accent/40 relative">
        <textarea
          rows={2}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSendMessage();
            }
          }}
          placeholder={agentMode ? "Provide a task for the Agent... (e.g. read package.json file)" : "How can I help you today?"}
          className="w-full bg-transparent border-none text-foreground text-sm px-2 focus:outline-none resize-none min-h-[50px] py-1 placeholder:text-foreground/40"
        />

        <div className="flex justify-between items-center mt-2 pt-2 border-t border-border-color/30">
          <div className="flex items-center gap-2">
            <button onClick={() => fileInputRef.current?.click()} className="p-2 text-foreground/50 hover:text-foreground/80 transition" title="Add File / Image Attachment">
              <Paperclip className="w-4 h-4" />
            </button>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} multiple className="hidden" />

            {/* Project Picker Folder Icon */}
            <div className="relative">
              <button 
                onClick={() => setShowProjectPicker(!showProjectPicker)} 
                className={`p-2 transition rounded ${activeProjectId ? 'text-accent' : 'text-foreground/50 hover:text-foreground/80'}`}
                title="Link Project (Local RAG)"
              >
                <Folder className="w-4 h-4" />
              </button>
              {showProjectPicker && (
                <div className="absolute bottom-10 left-0 bg-card-bg border border-border-color rounded-xl shadow-lg p-2.5 z-40 w-56 text-xs text-foreground space-y-1">
                  <div className="font-bold text-foreground/50 text-[9px] uppercase px-2 mb-1">Link Workspace Project</div>
                  <button 
                    onClick={() => { setActiveProjectId(null); setShowProjectPicker(false); }}
                    className={`w-full text-left px-2 py-1.5 rounded transition ${!activeProjectId ? 'bg-sidebar font-semibold' : 'hover:bg-sidebar/55'}`}
                  >
                    None (General Chat)
                  </button>
                  {projects.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => { setActiveProjectId(p.id); setShowProjectPicker(false); }}
                      className={`w-full text-left px-2 py-1.5 rounded transition ${activeProjectId === p.id ? 'bg-sidebar font-semibold' : 'hover:bg-sidebar/55'}`}
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Mode Select Chip */}
            <select
              value={agentMode ? 'agent' : 'chat'}
              onChange={(e) => {
                const isAgent = e.target.value === 'agent';
                setAgentMode(isAgent);
                if (isAgent) {
                  const isTauri = typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__ !== undefined;
                  if (!isTauri) {
                    setShowBrowserWarning(true);
                  }
                }
              }}
              className="bg-transparent border border-border-color text-foreground/80 text-xs rounded-lg px-2 py-1 focus:outline-none"
            >
              <option value="chat">Manual Chat</option>
              <option value="agent">Autonomous Agent</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            {/* Model select chip */}
            <div className="flex flex-col items-end">
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="bg-transparent border border-border-color text-foreground/80 text-xs rounded-lg px-2.5 py-1 outline-none text-right font-medium"
              >
                {models.length === 0 ? (
                  <option value="">No local models found</option>
                ) : (
                  models.map((m) => (
                    <option key={m.name} value={m.name}>
                      {m.name}
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* Parameters Settings Preset selector */}
            <div className="relative">
              <button 
                onClick={() => setShowPresetDropdown(!showPresetDropdown)}
                className="p-1 border border-border-color rounded-lg text-foreground/50 hover:text-foreground/80 transition"
              >
                <Sliders className="w-3.5 h-3.5" />
              </button>
              {showPresetDropdown && (
                <div className="absolute bottom-10 right-0 bg-card-bg border border-border-color rounded-xl shadow-lg p-3 z-40 w-64 text-xs text-foreground space-y-2">
                  <div className="font-bold text-foreground/50 text-[9px] uppercase">preset configurations</div>
                  <div className="space-y-1">
                    {presets.map((pr) => (
                      <button
                        key={pr.id}
                        onClick={() => { setActivePreset(pr); setShowPresetDropdown(false); }}
                        className={`w-full text-left px-2 py-1.5 rounded transition ${activePreset.id === pr.id ? 'bg-sidebar font-semibold' : 'hover:bg-sidebar/50'}`}
                      >
                        {pr.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {isStreaming ? (
              <button onClick={handleStopStream} className="p-2 bg-rose-600 hover:bg-rose-500 text-white rounded-full transition shadow-xs">
                <div className="w-3.5 h-3.5 bg-white rounded-xs" />
              </button>
            ) : (
              <button 
                onClick={handleSendMessage} 
                disabled={!input.trim() && attachments.length === 0} 
                className="p-2 bg-accent hover:bg-accent-hover disabled:opacity-40 text-white rounded-full transition shadow-xs"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-[46rem] mx-auto flex items-center justify-between text-[10px] text-foreground/40 mt-2 px-1 font-mono">
        <span>Estimated context tokens: {contextUsage.tokens} / {activePreset.num_ctx}</span>
        <span>Local model • responses may be inaccurate</span>
      </div>
    </div>
  );
}
