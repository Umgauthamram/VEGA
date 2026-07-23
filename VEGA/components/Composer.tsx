'use client';

import React, { useState } from 'react';
import { 
  Send, Sliders, Folder, Loader2, PlayCircle, RefreshCw
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
  isConnected: boolean | null;
  checkOllamaHealth: () => Promise<void>;
  workspaceDir: string;
  handlePickWorkspace: () => void;
  // Params trigger state
  tempPreset: ModelPreset;
  setTempPreset: (p: ModelPreset) => void;
  handleSaveCustomPreset: (name: string) => void;
  handlePullModelDialog: () => void;
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
  isConnected,
  checkOllamaHealth,
  workspaceDir,
  handlePickWorkspace,
  tempPreset,
  setTempPreset,
  handleSaveCustomPreset,
  handlePullModelDialog
}: ComposerProps) {
  const [showPresetDropdown, setShowPresetDropdown] = useState(false);
  const [showProjectPicker, setShowProjectPicker] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);

  const getWorkspaceFolderName = () => {
    if (!workspaceDir) return 'Link Workspace';
    const parts = workspaceDir.split(/[\\/]/);
    return parts[parts.length - 1] || workspaceDir;
  };

  const handleRetryHealth = async () => {
    setIsRetrying(true);
    await checkOllamaHealth();
    setIsRetrying(false);
  };

  return (
    <div className="p-4 bg-background shrink-0 font-sans">
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
          className="w-full bg-transparent border-none text-foreground text-sm px-2 focus:outline-none resize-none min-h-[50px] py-1 placeholder:text-foreground/45"
        />

        <div className="flex justify-between items-center mt-2 pt-2 border-t border-border-color/30">
          <div className="flex items-center gap-2">
            {/* File context attachment + */}
            <button 
              onClick={() => fileInputRef.current?.click()} 
              className="w-6 h-6 flex items-center justify-center bg-sidebar hover:bg-background border border-border-color rounded-lg text-foreground/60 transition text-xs font-bold" 
              title="Add File / Context"
            >
              +
            </button>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} multiple className="hidden" />

            {/* Mode Segmented Toggle: Chat vs Agent */}
            <div className="flex items-center bg-sidebar border border-border-color rounded-lg p-0.5 text-[10px] font-bold uppercase tracking-wider">
              <button 
                onClick={() => setAgentMode(false)}
                className={`px-2 py-0.5 rounded transition-all ${!agentMode ? 'bg-card-bg text-foreground' : 'text-foreground/50'}`}
              >
                Chat
              </button>
              <button 
                onClick={() => setAgentMode(true)}
                className={`px-2 py-0.5 rounded transition-all ${agentMode ? 'bg-card-bg text-foreground' : 'text-foreground/50'}`}
              >
                Agent
              </button>
            </div>

            {/* Model select chip */}
            {isConnected === false ? (
              <div className="relative group">
                <button className="bg-rose-950/20 border border-rose-900/40 text-rose-300 text-[10px] font-bold uppercase tracking-wider rounded-lg px-2 py-1 flex items-center gap-1 transition">
                  Ollama Offline
                </button>
                <div className="absolute bottom-8 left-0 hidden group-hover:block bg-card-bg border border-rose-900/30 rounded-xl shadow-lg p-3 z-50 w-56 text-xs text-foreground space-y-2">
                  <div className="font-bold text-rose-400">Ollama connection lost</div>
                  <p className="text-[10px] text-foreground/75 leading-relaxed">Ensure Ollama service is active. Run <code>ollama serve</code> in terminal.</p>
                  <button 
                    onClick={handleRetryHealth}
                    className="w-full flex items-center justify-center gap-1 bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-bold py-1 rounded transition"
                    disabled={isRetrying}
                  >
                    {isRetrying ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                    Retry connection
                  </button>
                </div>
              </div>
            ) : models.length === 0 ? (
              <button 
                onClick={handlePullModelDialog}
                className="bg-amber-950/20 border border-amber-900/40 text-amber-300 text-[10px] font-bold uppercase tracking-wider rounded-lg px-2 py-1 transition hover:bg-amber-900/30"
              >
                Pull chat model
              </button>
            ) : (
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="bg-sidebar border border-border-color text-foreground/80 text-[10px] font-bold uppercase tracking-wider rounded-lg px-2.5 py-1 outline-none transition"
              >
                {models.map((m) => (
                  <option key={m.name} value={m.name}>
                    {m.name}
                  </option>
                ))}
              </select>
            )}

            {/* Parameter configuration popover */}
            <div className="relative">
              <button 
                onClick={() => setShowPresetDropdown(!showPresetDropdown)}
                className="p-1 bg-sidebar border border-border-color rounded-lg text-foreground/50 hover:text-foreground/80 transition"
                title="Preset Parameters"
              >
                <Sliders className="w-3.5 h-3.5" />
              </button>

              {showPresetDropdown && (
                <div className="absolute bottom-12 left-0 bg-card-bg border border-border-color rounded-xl shadow-lg p-3.5 z-40 w-64 text-xs text-foreground space-y-3">
                  <div className="font-bold text-foreground/50 text-[9px] uppercase tracking-wider">Configure parameters</div>
                  
                  <div className="space-y-2">
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] font-semibold text-foreground/75">
                        <span>Temperature</span>
                        <span>{tempPreset.temperature}</span>
                      </div>
                      <input 
                        type="range" min="0" max="1.5" step="0.1" 
                        value={tempPreset.temperature} 
                        onChange={(e) => setTempPreset({ ...tempPreset, temperature: parseFloat(e.target.value) })}
                        className="w-full accent-accent bg-sidebar h-1 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] font-semibold text-foreground/75">
                        <span>Context window</span>
                        <span>{tempPreset.num_ctx} tokens</span>
                      </div>
                      <input 
                        type="range" min="1024" max="32768" step="1024" 
                        value={tempPreset.num_ctx} 
                        onChange={(e) => setTempPreset({ ...tempPreset, num_ctx: parseInt(e.target.value) })}
                        className="w-full accent-accent bg-sidebar h-1 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] font-semibold text-foreground/75">System Prompt</span>
                      <textarea
                        value={tempPreset.system_prompt}
                        onChange={(e) => setTempPreset({ ...tempPreset, system_prompt: e.target.value })}
                        rows={3}
                        className="w-full bg-background border border-border-color rounded-lg p-1.5 text-[10px] outline-none text-foreground resize-none"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 pt-2 border-t border-border-color/20">
                    <button 
                      onClick={() => {
                        const name = prompt("Enter custom preset name:");
                        if (name) handleSaveCustomPreset(name);
                      }}
                      className="flex-1 bg-accent hover:bg-accent-hover text-white text-[10px] font-bold py-1.5 rounded transition"
                    >
                      Save Preset
                    </button>
                    <select
                      value={activePreset.id}
                      onChange={(e) => {
                        const pr = presets.find(p => p.id === e.target.value);
                        if (pr) {
                          setActivePreset(pr);
                          setTempPreset(pr);
                        }
                      }}
                      className="bg-sidebar border border-border-color text-foreground text-[10px] p-1 rounded outline-none"
                    >
                      {presets.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
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
        <div className="flex items-center gap-3 mt-2 pt-2 border-t border-border-color/20 text-[10px] font-bold text-foreground/50 uppercase tracking-wider">
          <div className="relative">
            <button 
              onClick={() => setShowProjectPicker(!showProjectPicker)} 
              className="flex items-center gap-1 hover:text-foreground transition"
            >
              <Folder className="w-3 h-3 text-accent" /> {activeProjectId ? projects.find(p => p.id === activeProjectId)?.name : 'Link Project'} ▾
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

          {/* Real Workspace Dir Selector */}
          <button 
            onClick={handlePickWorkspace}
            className="flex items-center gap-1 hover:text-foreground transition text-[10px] font-bold uppercase"
          >
            Workspace: {getWorkspaceFolderName()}
          </button>
        </div>
      </div>

      <div className="max-w-[46rem] mx-auto flex items-center justify-between text-[10px] text-foreground/40 mt-2 px-1 font-mono">
        <span>Estimated context tokens: {contextUsage.tokens} / {activePreset.num_ctx}</span>
        <span>Local model • responses may be inaccurate</span>
      </div>
    </div>
  );
}
