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
            {/* File context attachment + */}
            <button 
              onClick={() => fileInputRef.current?.click()} 
              className="p-1.5 bg-sidebar hover:bg-background border border-border-color rounded-xl text-foreground/60 transition" 
              title="Add File / Context"
            >
              +
            </button>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} multiple className="hidden" />

            {/* Mode Segmented Toggle: Chat vs Cowork */}
            <div className="flex items-center bg-sidebar border border-border-color rounded-xl p-0.5 text-[11px] font-bold uppercase tracking-wider">
              <button 
                onClick={() => {
                  setAgentMode(false);
                }}
                className={`px-2.5 py-1 rounded-lg transition ${!agentMode ? 'bg-card-bg text-foreground' : 'text-foreground/50'}`}
              >
                Chat
              </button>
              <button 
                onClick={() => {
                  setAgentMode(true);
                  const isTauri = typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__ !== undefined;
                  if (!isTauri) {
                    setShowBrowserWarning(true);
                  }
                }}
                className={`px-2.5 py-1 rounded-lg transition ${agentMode ? 'bg-card-bg text-foreground' : 'text-foreground/50'}`}
              >
                Cowork
              </button>
            </div>

            {/* Model select chip */}
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="bg-sidebar border border-border-color text-foreground/80 text-[11px] font-bold uppercase tracking-wider rounded-xl px-2.5 py-1 outline-none transition"
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

            {/* Parameter slider dropdown button */}
            <button 
              onClick={() => setShowPresetDropdown(!showPresetDropdown)}
              className="p-1.5 bg-sidebar border border-border-color rounded-xl text-foreground/50 hover:text-foreground/80 transition"
              title="Preset Parameters"
            >
              <Sliders className="w-3.5 h-3.5" />
            </button>

            {showPresetDropdown && (
              <div className="absolute bottom-12 left-2 bg-card-bg border border-border-color rounded-xl shadow-lg p-2.5 z-40 w-56 text-xs text-foreground space-y-1">
                <div className="font-bold text-foreground/50 text-[9px] uppercase px-2 mb-1">Preset configurations</div>
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
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Dictate Microphone Placeholder */}
            <button className="p-1.5 text-foreground/40 cursor-not-allowed" title="Voice Input (Disabled)" disabled>
              🎙️
            </button>

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

        {/* Context Tray (Bottom row inside the composer card) */}
        <div className="flex items-center gap-2.5 mt-2 pt-2 border-t border-border-color/20 text-[10px] font-bold text-foreground/50 uppercase tracking-wider">
          <div className="relative">
            <button 
              onClick={() => setShowProjectPicker(!showProjectPicker)} 
              className="flex items-center gap-1 hover:text-foreground transition"
            >
              📁 {activeProjectId ? projects.find(p => p.id === activeProjectId)?.name : 'Link Workspace'} ▾
            </button>
            {showProjectPicker && (
              <div className="absolute bottom-6 left-0 bg-card-bg border border-border-color rounded-xl shadow-lg p-2 z-40 w-56 text-xs text-foreground space-y-1">
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

          <span className="text-border-color/60">|</span>

          {/* Execution Control Selector */}
          <span className="cursor-pointer hover:text-foreground transition">🖐️ Manual ▾</span>

          <span className="text-border-color/60 ml-auto">|</span>

          {/* Usage Meter Indicator */}
          <span className="text-accent">⚡ 2x usage allowance active</span>
        </div>
      </div>

      <div className="max-w-[46rem] mx-auto flex items-center justify-between text-[10px] text-foreground/40 mt-2 px-1 font-mono">
        <span>Estimated context tokens: {contextUsage.tokens} / {activePreset.num_ctx}</span>
        <span>Local model • responses may be inaccurate</span>
      </div>
    </div>
  );
}
