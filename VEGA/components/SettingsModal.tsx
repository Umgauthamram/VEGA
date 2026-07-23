'use client';

import React, { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { 
  Sliders, Server, Database, Trash2, FolderPlus, BookOpen, Calendar, Share2, Clipboard, RefreshCw, BarChart2, Plus, Play, Pause, Power
} from 'lucide-react';
import { OllamaModel, ModelPreset, RunningModel, Project, ProjectFile } from '../app/types';
import { useTheme } from '../app/ThemeProvider';
import { getMcpStatus, getMcpToolsCount, disconnectMcpServer, connectMcpServer, deleteMcpServer, saveMcpServer } from '../app/mcp';

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
  // Profile settings
  userName: string;
  setUserName: (val: string) => void;
  userCallName: string;
  setUserCallName: (val: string) => void;
  // Stats details
  conversationsCount: number;
  totalGeneratedTokens: number;
  // MCP Connectors list
  mcpServers: any[];
  setMcpServers: (val: any[]) => void;
  newMcpName: string;
  setNewMcpName: (val: string) => void;
  newMcpCommand: string;
  setNewMcpCommand: (val: string) => void;
  newMcpArgs: string;
  setNewMcpArgs: (val: string) => void;
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
  handleBackupImport,
  userName,
  setUserName,
  userCallName,
  setUserCallName,
  conversationsCount,
  totalGeneratedTokens,
  mcpServers,
  setMcpServers,
  newMcpName,
  setNewMcpName,
  newMcpCommand,
  setNewMcpCommand,
  newMcpArgs,
  setNewMcpArgs
}: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<Tab>('general');
  const { theme, setTheme } = useTheme();
  const [useSerifFont, setUseSerifFont] = useState(false);

  // MCP connector form type state
  const [newMcpType, setNewMcpType] = useState<'stdio' | 'http'>('stdio');
  const [newMcpUrl, setNewMcpUrl] = useState('');

  if (!showSettings) return null;

  const handleAddMcpConnector = () => {
    if (!newMcpName.trim()) return;
    const serverConfig = {
      name: newMcpName.trim(),
      command: newMcpType === 'stdio' ? newMcpCommand.trim() : '',
      args: newMcpType === 'stdio' ? newMcpArgs.split(',').map(s => s.trim()).filter(Boolean) : [],
      enabled: true,
      type: newMcpType,
      url: newMcpType === 'http' ? newMcpUrl.trim() : ''
    };
    saveMcpServer(serverConfig);
    setMcpServers([...mcpServers, serverConfig]);
    setNewMcpName('');
    setNewMcpCommand('');
    setNewMcpArgs('');
    setNewMcpUrl('');
  };

  const handleImportClaudeConfig = async () => {
    // Attempt load config via Tauri
    const isTauri = typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__ !== undefined;
    if (!isTauri) {
      alert('Tauri app connection required to read local Claude Desktop configuration files.');
      return;
    }
    try {
      const { readTextFile } = await import('@tauri-apps/plugin-fs');
      // Read Claude config on Windows
      const appData = await invoke<string>('mcp_get_appdata_path'); // we fallback to appdata path loader
      const configPath = `C:\\Users\\gauth\\AppData\\Roaming\\Claude\\claude_desktop_config.json`; // standard windows appdata path
      const content = await readTextFile(configPath);
      const parsed = JSON.parse(content);
      if (parsed.mcpServers) {
        const importedList = [...mcpServers];
        Object.entries(parsed.mcpServers).forEach(([name, val]: [string, any]) => {
          if (!importedList.some(s => s.name === name)) {
            const srv = {
              name,
              command: val.command || '',
              args: val.args || [],
              enabled: true,
              type: 'stdio' as const
            };
            saveMcpServer(srv);
            importedList.push(srv);
          }
        });
        setMcpServers(importedList);
        alert('Claude configuration servers imported successfully!');
      }
    } catch (e: any) {
      alert(`Config file not found or failed to read: ${e.message || e}`);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-6 backdrop-blur-xs text-foreground font-sans">
      <div className="bg-card-bg border border-border-color rounded-xl w-full max-w-3xl h-[640px] flex overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Left Side Navigation Panel */}
        <div className="w-56 bg-sidebar border-r border-border-color flex flex-col p-4 space-y-4">
          <input 
            type="text" 
            placeholder="🔍 Search" 
            className="w-full bg-background border border-border-color rounded-lg px-2.5 py-1.5 text-xs text-foreground outline-none focus:border-accent/40"
          />
          <div className="space-y-4 flex-1 overflow-y-auto min-h-0 select-none">
            <div className="space-y-1">
              <div className="text-[10px] font-bold text-foreground/40 uppercase tracking-wider px-2">Settings</div>
              <button
                onClick={() => setActiveTab('general')}
                className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold transition ${activeTab === 'general' ? 'bg-background text-foreground shadow-xs' : 'text-foreground/70 hover:bg-background/40'}`}
              >
                General & Profile
              </button>
              <button
                onClick={() => setActiveTab('providers')}
                className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold transition ${activeTab === 'providers' ? 'bg-background text-foreground shadow-xs' : 'text-foreground/70 hover:bg-background/40'}`}
              >
                Account & Providers
              </button>
              <button
                onClick={() => setActiveTab('capabilities')}
                className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold transition ${activeTab === 'capabilities' ? 'bg-background text-foreground shadow-xs' : 'text-foreground/70 hover:bg-background/40'}`}
              >
                Capabilities / Models
              </button>
              <button
                onClick={() => setActiveTab('agent')}
                className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold transition ${activeTab === 'agent' ? 'bg-background text-foreground shadow-xs' : 'text-foreground/70 hover:bg-background/40'}`}
              >
                Agent Configuration
              </button>
            </div>

            <div className="space-y-1">
              <div className="text-[10px] font-bold text-foreground/40 uppercase tracking-wider px-2">Customize</div>
              <button 
                onClick={() => setActiveTab('connectors')}
                className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold transition ${activeTab === 'connectors' ? 'bg-background text-foreground shadow-xs' : 'text-foreground/70 hover:bg-background/40'}`}
              >
                MCP Connectors
              </button>
            </div>
          </div>



          <button 
            onClick={() => setShowSettings(false)} 
            className="w-full text-center py-2 border border-border-color hover:bg-background/50 rounded-lg text-xs font-bold transition"
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
                {/* Profile Section */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-foreground/50">Profile Details</h3>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-accent flex items-center justify-center text-white font-bold text-lg font-serif">
                      {userCallName.slice(0, 2).toUpperCase() || 'U'}
                    </div>
                    <div className="flex-1 grid grid-cols-2 gap-2 text-xs">
                      <div className="space-y-1">
                        <span className="font-semibold text-foreground/70">Full Name</span>
                        <input 
                          type="text" 
                          value={userName} 
                          onChange={(e) => setUserName(e.target.value)}
                          className="w-full bg-background border border-border-color rounded-lg px-2.5 py-1.5 text-xs text-foreground outline-none focus:border-accent/40" 
                        />
                      </div>
                      <div className="space-y-1">
                        <span className="font-semibold text-foreground/70">Call Name</span>
                        <input 
                          type="text" 
                          value={userCallName} 
                          onChange={(e) => setUserCallName(e.target.value)}
                          className="w-full bg-background border border-border-color rounded-lg px-2.5 py-1.5 text-xs text-foreground outline-none focus:border-accent/40" 
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Local Stats Section */}
                <div className="border-t border-border-color/50 pt-4 space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-foreground/50 flex items-center gap-1.5">
                    <BarChart2 className="w-3.5 h-3.5 text-accent" /> Stats Dashboard
                  </h3>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="bg-sidebar p-3 border border-border-color rounded-xl">
                      <div className="text-lg font-bold">{conversationsCount}</div>
                      <div className="text-[10px] text-foreground/45 uppercase tracking-wider font-semibold">Total chats</div>
                    </div>
                    <div className="bg-sidebar p-3 border border-border-color rounded-xl">
                      <div className="text-lg font-bold">{totalGeneratedTokens}</div>
                      <div className="text-[10px] text-foreground/45 uppercase tracking-wider font-semibold">Tokens generated</div>
                    </div>
                    <div className="bg-sidebar p-3 border border-border-color rounded-xl">
                      <div className="text-lg font-bold">{models.length}</div>
                      <div className="text-[10px] text-foreground/45 uppercase tracking-wider font-semibold">Models installed</div>
                    </div>
                  </div>
                </div>

                <div className="border-t border-border-color/50 pt-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-foreground/50 mb-2">Instructions for VEGA (User Memory)</h3>
                  <textarea
                    value={userMemoryText}
                    onChange={(e) => setUserMemoryText(e.target.value)}
                    rows={3}
                    placeholder="Provide developer details, instructions, preferred languages, coding styles, etc..."
                    className="w-full bg-background border border-border-color rounded-lg p-2.5 text-xs outline-none focus:border-accent text-foreground resize-none"
                  />
                  <button onClick={handleSaveMemory} className="mt-2 bg-accent hover:bg-accent-hover text-white text-xs font-bold px-3 py-1.5 rounded-lg transition">
                    Save Instructions
                  </button>
                </div>

                <div className="border-t border-border-color/50 pt-4 space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-foreground/50">Preferences</h3>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold">Appearance Theme</span>
                    <div className="flex items-center bg-sidebar border border-border-color rounded-lg p-0.5">
                      <button 
                        onClick={() => setTheme('light')} 
                        className={`px-3 py-1.5 rounded-md text-[10px] uppercase font-bold transition ${theme === 'light' ? 'bg-background text-foreground shadow-sm' : 'text-foreground/60'}`}
                      >
                        Light
                      </button>
                      <button 
                        onClick={() => setTheme('dark')} 
                        className={`px-3 py-1.5 rounded-md text-[10px] uppercase font-bold transition ${theme === 'dark' ? 'bg-background text-foreground shadow-sm' : 'text-foreground/60'}`}
                      >
                        Dark
                      </button>
                      <button 
                        onClick={() => setTheme('system')} 
                        className={`px-3 py-1.5 rounded-md text-[10px] uppercase font-bold transition ${theme === 'system' ? 'bg-background text-foreground shadow-sm' : 'text-foreground/60'}`}
                      >
                        System
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold">Chat Font Style</span>
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
                      className="bg-sidebar border border-border-color text-xs rounded-lg p-1.5 text-foreground focus:outline-none"
                    >
                      <option value="sans">System Default (Sans)</option>
                      <option value="serif">Anthropic Serif style</option>
                    </select>
                  </div>
                </div>

                <div className="border-t border-border-color/50 pt-4 space-y-2">
                  <h3 className="text-[11px] font-bold uppercase tracking-wider text-foreground/50">Database Backup</h3>
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

            {/* MCP CONNECTORS TAB */}
            {activeTab === 'connectors' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-foreground/50">MCP Configured Connectors</h3>
                  <button 
                    onClick={handleImportClaudeConfig}
                    className="text-[10px] text-accent hover:underline font-bold uppercase tracking-wider"
                  >
                    Import from Claude Desktop
                  </button>
                </div>

                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {mcpServers.length === 0 ? (
                    <div className="text-xs text-foreground/45 italic p-4 bg-sidebar rounded-xl border border-border-color/50 text-center">
                      No MCP connectors active. Configure a connector server below.
                    </div>
                  ) : (
                    mcpServers.map((srv) => (
                      <div key={srv.name} className="bg-sidebar border border-border-color rounded-xl p-3 text-xs space-y-2 relative">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-foreground">{srv.name}</span>
                              <span className={`w-2 h-2 rounded-full ${
                                getMcpStatus(srv.name) === 'connected' ? 'bg-emerald-500' :
                                getMcpStatus(srv.name) === 'connecting' ? 'bg-amber-500 animate-pulse' :
                                getMcpStatus(srv.name) === 'disabled' ? 'bg-foreground/20' : 'bg-rose-500'
                              }`} />
                              <span className="text-[9px] text-foreground/45 uppercase font-semibold">
                                {srv.type === 'http' ? 'HTTP/SSE' : 'STDIO'} • {getMcpToolsCount(srv.name)} tools
                              </span>
                            </div>
                            <div className="text-[10px] text-foreground/50 font-mono mt-1 break-all">
                              {srv.type === 'http' ? srv.url : `${srv.command} ${srv.args?.join(' ') || ''}`}
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button 
                              onClick={() => {
                                const active = !srv.enabled;
                                srv.enabled = active;
                                saveMcpServer(srv);
                                setMcpServers([...mcpServers]);
                                if (active) connectMcpServer(srv).catch(() => {});
                                else disconnectMcpServer(srv.name);
                              }}
                              className={`p-1 rounded text-[10px] font-bold uppercase ${srv.enabled ? 'text-rose-500 hover:bg-rose-950/20' : 'text-emerald-500 hover:bg-emerald-950/20'}`}
                            >
                              {srv.enabled ? <Power className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                            </button>
                            <button 
                              onClick={() => {
                                deleteMcpServer(srv.name);
                                setMcpServers(mcpServers.filter(s => s.name !== srv.name));
                              }}
                              className="text-foreground/40 hover:text-rose-500 p-1"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="border-t border-border-color/50 pt-4 space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-foreground/50">Add MCP Server Connector</h3>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <input
                      type="text"
                      value={newMcpName}
                      onChange={(e) => setNewMcpName(e.target.value)}
                      placeholder="Server Name (e.g. filesystem)"
                      className="bg-background border border-border-color rounded p-2 text-xs text-foreground outline-none focus:border-accent"
                    />
                    <select
                      value={newMcpType}
                      onChange={(e) => setNewMcpType(e.target.value as any)}
                      className="bg-sidebar border border-border-color rounded p-2 text-xs text-foreground outline-none"
                    >
                      <option value="stdio">stdio transport</option>
                      <option value="http">http/sse transport</option>
                    </select>

                    {newMcpType === 'stdio' ? (
                      <>
                        <input
                          type="text"
                          value={newMcpCommand}
                          onChange={(e) => setNewMcpCommand(e.target.value)}
                          placeholder="Command path (e.g. node, npx)"
                          className="bg-background border border-border-color rounded p-2 text-xs text-foreground outline-none focus:border-accent col-span-2"
                        />
                        <input
                          type="text"
                          value={newMcpArgs}
                          onChange={(e) => setNewMcpArgs(e.target.value)}
                          placeholder="Arguments (comma-separated, e.g. -y, @modelcontextprotocol/server-filesystem)"
                          className="bg-background border border-border-color rounded p-2 text-xs text-foreground outline-none focus:border-accent col-span-2"
                        />
                      </>
                    ) : (
                      <input
                        type="text"
                        value={newMcpUrl}
                        onChange={(e) => setNewMcpUrl(e.target.value)}
                        placeholder="SSE Endpoint URL (e.g. http://localhost:3001)"
                        className="bg-background border border-border-color rounded p-2 text-xs text-foreground outline-none focus:border-accent col-span-2"
                      />
                    )}
                  </div>
                  <button onClick={handleAddMcpConnector} className="bg-accent hover:bg-accent-hover text-white text-xs font-bold px-4 py-2 rounded-lg transition flex items-center gap-1">
                    <Plus className="w-3.5 h-3.5" /> Save Connector
                  </button>
                </div>
              </div>
            )}
            
          </div>
        </div>
      </div>
    </div>
  );
}
