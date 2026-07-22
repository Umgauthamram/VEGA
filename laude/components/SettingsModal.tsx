'use client';

import React, { useState } from 'react';
import { 
  Sliders, Server, Database, Activity, Trash2, FolderPlus, BookOpen, Calendar, Share2, Clipboard, RefreshCw
} from 'lucide-react';
import { OllamaModel, ModelPreset, RunningModel, Project, ProjectFile } from '../app/types';
import { useTheme } from '../app/ThemeProvider';

interface SettingsModalProps {
  showSettings: boolean;
  setShowSettings: (show: boolean) => void;
  // Providers list
  providersList: any[];
  activeProviderName: string;
  newProvName: string;
  setNewProvName: (val: string) => void;
  newProvBaseUrl: string;
  setNewProvBaseUrl: (val: string) => void;
  newProvApiKey: string;
  setNewProvApiKey: (val: string) => void;
  newProvType: 'ollama' | 'openai-compatible';
  setNewProvType: (val: 'ollama' | 'openai-compatible') => void;
  showApiKey: boolean;
  setShowApiKey: (show: boolean) => void;
  handleAddProvider: () => void;
  handleDeleteProvider: (name: string) => void;
  handleSelectProvider: (p: any) => void;
  // Ollama capabilities/pull
  baseUrl: string;
  setBaseUrl: (val: string) => void;
  keepAlive: string;
  setKeepAlive: (val: string) => void;
  embeddingModel: string;
  setEmbeddingModel: (val: string) => void;
  pullModelInput: string;
  setPullModelInput: (val: string) => void;
  pullProgress: { status: string; percent?: number } | null;
  handlePullModel: () => void;
  models: OllamaModel[];
  handleDeleteModel: (name: string) => void;
  runningModels: RunningModel[];
  // Agent
  workspaceDir: string;
  setWorkspaceDir: (val: string) => void;
  safetyLevel: 'yolo' | 'ask_dangerous' | 'ask_always';
  setSafetyLevel: (val: 'yolo' | 'ask_dangerous' | 'ask_always') => void;
  // Memory / Customization
  userMemoryText: string;
  setUserMemoryText: (val: string) => void;
  handleSaveMemory: () => void;
  presets: ModelPreset[];
  activePreset: ModelPreset;
  setActivePreset: (preset: ModelPreset) => void;
  // Backup
  handleBackupExport: () => void;
  handleBackupImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

type Tab = 'general' | 'providers' | 'capabilities' | 'agent' | 'connectors';

export function SettingsModal({
  showSettings,
  setShowSettings,
  providersList,
  activeProviderName,
  newProvName,
  setNewProvName,
  newProvBaseUrl,
  setNewProvBaseUrl,
  newProvApiKey,
  setNewProvApiKey,
  newProvType,
  setNewProvType,
  showApiKey,
  setShowApiKey,
  handleAddProvider,
  handleDeleteProvider,
  handleSelectProvider,
  baseUrl,
  setBaseUrl,
  keepAlive,
  setKeepAlive,
  embeddingModel,
  setEmbeddingModel,
  pullModelInput,
  setPullModelInput,
  pullProgress,
  handlePullModel,
  models,
  handleDeleteModel,
  runningModels,
  workspaceDir,
  setWorkspaceDir,
  safetyLevel,
  setSafetyLevel,
  userMemoryText,
  setUserMemoryText,
  handleSaveMemory,
  presets,
  activePreset,
  setActivePreset,
  handleBackupExport,
  handleBackupImport
}: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<Tab>('general');
  const { theme, setTheme } = useTheme();
  const [useSerifFont, setUseSerifFont] = useState(false);

  if (!showSettings) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-6 backdrop-blur-xs text-foreground">
      <div className="bg-card-bg border border-border-color rounded-xl w-full max-w-3xl h-[640px] flex overflow-hidden shadow-2xl">
        {/* Left Side Navigation Panel */}
        <div className="w-56 bg-sidebar border-r border-border-color flex flex-col p-4 space-y-4">
          <div className="text-xs font-bold text-foreground/40 uppercase tracking-wider px-2">Settings</div>
          <div className="space-y-0.5 flex-1">
            <button
              onClick={() => setActiveTab('general')}
              className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium transition ${activeTab === 'general' ? 'bg-background font-semibold' : 'hover:bg-background/40'}`}
            >
              General & Profile
            </button>
            <button
              onClick={() => setActiveTab('providers')}
              className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium transition ${activeTab === 'providers' ? 'bg-background font-semibold' : 'hover:bg-background/40'}`}
            >
              LLM Providers
            </button>
            <button
              onClick={() => setActiveTab('capabilities')}
              className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium transition ${activeTab === 'capabilities' ? 'bg-background font-semibold' : 'hover:bg-background/40'}`}
            >
              Models & Capabilities
            </button>
            <button
              onClick={() => setActiveTab('agent')}
              className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium transition ${activeTab === 'agent' ? 'bg-background font-semibold' : 'hover:bg-background/40'}`}
            >
              Agent Configuration
            </button>
          </div>
          <button 
            onClick={() => setShowSettings(false)} 
            className="w-full text-center py-2 border border-border-color hover:bg-background/50 rounded-lg text-xs font-semibold transition"
          >
            Close Settings
          </button>
        </div>

        {/* Right Side Settings Panel Content */}
        <div className="flex-1 flex flex-col overflow-hidden bg-card-bg">
          <div className="p-6 overflow-y-auto flex-1 space-y-6">
            
            {/* GENERAL TAB */}
            {activeTab === 'general' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-foreground/50 mb-2">Instructions for Laude (User Memory)</h3>
                  <textarea
                    value={userMemoryText}
                    onChange={(e) => setUserMemoryText(e.target.value)}
                    rows={4}
                    placeholder="Provide developer details, instructions, preferred languages, coding styles, etc..."
                    className="w-full bg-background border border-border-color rounded-lg p-2.5 text-xs outline-none focus:border-accent text-foreground resize-none"
                  />
                  <button onClick={handleSaveMemory} className="mt-2 bg-accent hover:bg-accent-hover text-white text-xs font-bold px-3 py-1.5 rounded-lg transition">
                    Save Instructions
                  </button>
                </div>

                <div className="border-t border-border-color/50 pt-4 space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-foreground/50">Preferences</h3>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium">Appearance Theme</span>
                    <div className="flex items-center bg-sidebar border border-border-color rounded-lg p-0.5">
                      <button 
                        onClick={() => setTheme('light')} 
                        className={`px-3 py-1.5 rounded-md text-[10px] uppercase font-bold transition ${theme === 'light' ? 'bg-background text-foreground' : 'text-foreground/60'}`}
                      >
                        Light
                      </button>
                      <button 
                        onClick={() => setTheme('dark')} 
                        className={`px-3 py-1.5 rounded-md text-[10px] uppercase font-bold transition ${theme === 'dark' ? 'bg-background text-foreground' : 'text-foreground/60'}`}
                      >
                        Dark
                      </button>
                      <button 
                        onClick={() => setTheme('system')} 
                        className={`px-3 py-1.5 rounded-md text-[10px] uppercase font-bold transition ${theme === 'system' ? 'bg-background text-foreground' : 'text-foreground/60'}`}
                      >
                        System
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium">Chat Font Style</span>
                    <select
                      value={useSerifFont ? 'serif' : 'sans'}
                      onChange={(e) => {
                        const isSerif = e.target.value === 'serif';
                        setUseSerifFont(isSerif);
                        const chatEl = window.document.getElementById('chat-messages-container');
                        if (chatEl) {
                          if (isSerif) {
                            chatEl.classList.add('font-serif');
                          } else {
                            chatEl.classList.remove('font-serif');
                          }
                        }
                      }}
                      className="bg-sidebar border border-border-color text-xs rounded-lg p-1.5 text-foreground"
                    >
                      <option value="sans">System Default (Sans)</option>
                      <option value="serif">Claude Serif Style</option>
                    </select>
                  </div>
                </div>

                <div className="border-t border-border-color/50 pt-4 space-y-2">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-foreground/50">Database Backup</h3>
                  <div className="flex gap-2">
                    <button onClick={handleBackupExport} className="bg-sidebar border border-border-color hover:bg-background/50 text-xs px-3 py-2 rounded-lg transition font-medium">
                      Export Local Database
                    </button>
                    <label className="bg-sidebar border border-border-color hover:bg-background/50 text-xs px-3 py-2 rounded-lg transition font-medium cursor-pointer">
                      Import Database File
                      <input type="file" onChange={handleBackupImport} accept=".json" className="hidden" />
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* PROVIDERS TAB */}
            {activeTab === 'providers' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-foreground/50 mb-2 font-mono">Current LLM Providers</h3>
                  <div className="space-y-2">
                    {providersList.map((p) => (
                      <div key={p.name} className="flex justify-between items-center text-xs bg-sidebar p-3 rounded-lg border border-border-color/50">
                        <div>
                          <div className="font-bold text-foreground">{p.name}</div>
                          <div className="text-[10px] text-foreground/50 font-mono mt-0.5">{p.baseUrl} ({p.type})</div>
                        </div>
                        <div className="flex items-center gap-2">
                          {activeProviderName !== p.name && (
                            <button onClick={() => handleSelectProvider(p)} className="bg-accent hover:bg-accent-hover text-white text-[10px] font-bold px-2 py-1 rounded transition">
                              Select
                            </button>
                          )}
                          {p.name !== 'Ollama (Local)' && (
                            <button onClick={() => handleDeleteProvider(p.name)} className="text-rose-500 hover:bg-rose-950/20 p-1.5 rounded transition">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t border-border-color/50 pt-4 space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-foreground/50">Add Custom API Provider</h3>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={newProvName}
                      onChange={(e) => setNewProvName(e.target.value)}
                      placeholder="Provider Name (e.g. OpenRouter)"
                      className="bg-background border border-border-color rounded p-2 text-xs text-foreground outline-none focus:border-accent"
                    />
                    <input
                      type="text"
                      value={newProvBaseUrl}
                      onChange={(e) => setNewProvBaseUrl(e.target.value)}
                      placeholder="Base connection URL"
                      className="bg-background border border-border-color rounded p-2 text-xs text-foreground outline-none focus:border-accent"
                    />
                    <div className="col-span-2 flex gap-2">
                      <select
                        value={newProvType}
                        onChange={(e) => setNewProvType(e.target.value as any)}
                        className="bg-sidebar border border-border-color text-xs rounded p-2 text-foreground"
                      >
                        <option value="ollama">Ollama</option>
                        <option value="openai-compatible">OpenAI Compatible</option>
                      </select>
                      {newProvType === 'openai-compatible' && (
                        <div className="flex-1 flex gap-2">
                          <input
                            type={showApiKey ? "text" : "password"}
                            value={newProvApiKey}
                            onChange={(e) => setNewProvApiKey(e.target.value)}
                            placeholder="API Key"
                            className="flex-1 bg-background border border-border-color rounded p-2 text-xs text-foreground outline-none focus:border-accent"
                          />
                          <button
                            onClick={() => setShowApiKey(!showApiKey)}
                            type="button"
                            className="bg-sidebar text-foreground/60 text-xs px-2.5 rounded border border-border-color"
                          >
                            {showApiKey ? "Hide" : "Show"}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  <button onClick={handleAddProvider} className="bg-accent hover:bg-accent-hover text-white text-xs font-bold px-4 py-2 rounded-lg transition">
                    Add Provider
                  </button>
                </div>
              </div>
            )}

            {/* CAPABILITIES TAB */}
            {activeTab === 'capabilities' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-foreground/50 mb-2">Connection Settings</h3>
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div className="space-y-1">
                      <span className="font-semibold">Ollama Endpoint URL</span>
                      <input
                        type="text"
                        value={baseUrl}
                        onChange={(e) => setBaseUrl(e.target.value)}
                        className="w-full bg-background border border-border-color rounded-lg px-2.5 py-1.5 text-xs text-foreground outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <span className="font-semibold">Keep Alive Period</span>
                      <input
                        type="text"
                        value={keepAlive}
                        onChange={(e) => setKeepAlive(e.target.value)}
                        className="w-full bg-background border border-border-color rounded-lg px-2.5 py-1.5 text-xs text-foreground outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="border-t border-border-color/50 pt-4 space-y-3">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-foreground/50">Pull Custom Model</h3>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={pullModelInput}
                      onChange={(e) => setPullModelInput(e.target.value)}
                      placeholder="e.g. qwen2.5:7b, nomic-embed-text..."
                      className="flex-1 bg-background border border-border-color rounded-lg px-3 py-1.5 text-xs text-foreground outline-none"
                    />
                    <button onClick={handlePullModel} className="bg-accent hover:bg-accent-hover text-white text-xs font-bold px-4 py-1.5 rounded-lg transition">
                      Pull
                    </button>
                  </div>
                  {pullProgress && (
                    <div className="text-xs text-accent font-mono">
                      {pullProgress.status} {pullProgress.percent !== undefined ? `(${pullProgress.percent}%)` : ''}
                    </div>
                  )}
                </div>

                <div className="border-t border-border-color/50 pt-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-foreground/50 mb-2">Installed Models</h3>
                  <div className="space-y-2 max-h-56 overflow-y-auto">
                    {models.map((m) => (
                      <div key={m.name} className="flex items-center justify-between bg-sidebar p-3 rounded-lg border border-border-color/50 text-xs">
                        <div>
                          <div className="font-bold text-foreground">{m.name}</div>
                          <div className="text-[10px] text-foreground/50">
                            Size: {(m.size / (1024 * 1024 * 1024)).toFixed(2)} GB | Params: {m.details?.parameter_size || 'N/A'}
                          </div>
                        </div>
                        <button onClick={() => handleDeleteModel(m.name)} className="text-rose-500 hover:bg-rose-950/20 p-1.5 rounded transition">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* AGENT TAB */}
            {activeTab === 'agent' && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div className="space-y-1">
                    <span className="font-semibold font-mono">Agent Workspace sandbox folder</span>
                    <input
                      type="text"
                      value={workspaceDir}
                      onChange={(e) => setWorkspaceDir(e.target.value)}
                      className="w-full bg-background border border-border-color rounded-lg px-2.5 py-1.5 text-xs text-foreground font-mono outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <span className="font-semibold">Agent Safety Execution Level</span>
                    <select
                      value={safetyLevel}
                      onChange={(e) => setSafetyLevel(e.target.value as any)}
                      className="w-full bg-background border border-border-color rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none"
                    >
                      <option value="yolo">YOLO (Auto-approve everything)</option>
                      <option value="ask_dangerous">Ask for Dangerous Only (write, shell)</option>
                      <option value="ask_always">Ask Always (Prompt every action)</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
            
          </div>
        </div>
      </div>
    </div>
  );
}
