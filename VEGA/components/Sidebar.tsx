'use client';

import React, { useState } from 'react';
import { 
  Home as HomeIcon, Code, Plus, FolderOpen, Share2, Calendar, Settings, Pin, MessageSquare, Trash2, ChevronDown, Edit2, Check, Sun, Moon, Sparkles, LogOut, Database, Upload, ArrowRightLeft
} from 'lucide-react';
import { Conversation } from '../app/types';
import { useTheme } from '../app/ThemeProvider';

interface SidebarProps {
  activeTab: 'home' | 'code';
  setActiveTab: (tab: 'home' | 'code') => void;
  conversations: Conversation[];
  activeConvId: string | null;
  setActiveConvId: (id: string | null) => void;
  handleCreateNewChat: () => void;
  handleTogglePin: (conv: Conversation, e: React.MouseEvent) => void;
  handleDeleteChat: (id: string, e: React.MouseEvent) => void;
  handleRenameChat: (id: string, newTitle: string) => void;
  isConnected: boolean | null;
  ollamaVersion: string;
  activeProviderName: string;
  setShowSettings: (show: boolean) => void;
  setMainView: (view: 'chat' | 'projects' | 'artifacts' | 'schedules') => void;
  mainView: 'chat' | 'projects' | 'artifacts' | 'schedules';
  setAgentMode: (mode: boolean) => void;
  setShowLogsPanel: (show: boolean) => void;
  // DB actions
  handleBackupExport: () => void;
  handleBackupImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function Sidebar({
  activeTab,
  setActiveTab,
  conversations,
  activeConvId,
  setActiveConvId,
  handleCreateNewChat,
  handleTogglePin,
  handleDeleteChat,
  handleRenameChat,
  isConnected,
  ollamaVersion,
  activeProviderName,
  setShowSettings,
  setMainView,
  mainView,
  setAgentMode,
  setShowLogsPanel,
  handleBackupExport,
  handleBackupImport
}: SidebarProps) {
  const [showAccountPopover, setShowAccountPopover] = useState(false);
  const [sortAlphabetical, setSortAlphabetical] = useState(false);
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editTitleText, setEditTitleText] = useState('');
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  const { theme, setTheme } = useTheme();

  const handleTabClick = (tab: 'home' | 'code') => {
    setActiveTab(tab);
    setMainView('chat');
    if (tab === 'code') {
      setAgentMode(true);
      setShowLogsPanel(true);
    } else {
      setAgentMode(false);
      setShowLogsPanel(false);
    }
  };

  // Filter conversations by search input query
  const filteredConvs = conversations.filter(c => {
    if (!searchQuery.trim()) return true;
    return c.title.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const pinnedConvs = filteredConvs.filter(c => c.pinned);
  const recentConvs = filteredConvs.filter(c => !c.pinned);

  // Apply sorting algorithm
  const sortFn = (a: Conversation, b: Conversation) => {
    if (sortAlphabetical) {
      return a.title.localeCompare(b.title);
    }
    return b.updated_at - a.updated_at;
  };

  const sortedPinned = [...pinnedConvs].sort(sortFn);
  const sortedRecents = [...recentConvs].sort(sortFn);

  const startRename = (conv: Conversation, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingChatId(conv.id);
    setEditTitleText(conv.title);
    setActiveMenuId(null);
  };

  const saveRename = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (editTitleText.trim()) {
      handleRenameChat(id, editTitleText.trim());
    }
    setEditingChatId(null);
  };

  return (
    <aside className="w-[250px] bg-sidebar border-r border-border-color flex flex-col h-full shrink-0 select-none text-foreground font-sans">
      {/* A. Header & View Toggle (Top Left) */}
      <div className="p-4 space-y-3 shrink-0">
        <div className="grid grid-cols-2 gap-1 bg-background/50 p-1 rounded-xl border border-border-color">
          <button
            onClick={() => handleTabClick('home')}
            className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wide transition ${
              activeTab === 'home' && mainView === 'chat'
                ? 'bg-background shadow-sm text-foreground'
                : 'text-foreground/60 hover:text-foreground'
            }`}
          >
            Home
          </button>
          <button
            onClick={() => handleTabClick('code')}
            className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wide transition ${
              activeTab === 'code' && mainView === 'chat'
                ? 'bg-background shadow-sm text-foreground'
                : 'text-foreground/60 hover:text-foreground'
            }`}
          >
            Code
          </button>
        </div>

        <button
          onClick={() => { setMainView('chat'); handleCreateNewChat(); }}
          className="w-full flex items-center justify-between px-3 py-2 bg-accent hover:bg-accent-hover text-white rounded-lg text-xs font-bold transition shadow-sm"
        >
          <span className="flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5" /> New Chat
          </span>
          <span className="text-[10px] opacity-75 font-mono">Ctrl+N</span>
        </button>
      </div>

      {/* B. Workspace Navigation List */}
      <div className="px-2 space-y-0.5 shrink-0">
        <button
          onClick={() => setMainView('projects')}
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition ${
            mainView === 'projects'
              ? 'bg-background text-foreground'
              : 'text-foreground/70 hover:bg-background/40 hover:text-foreground'
          }`}
        >
          <FolderOpen className="w-4 h-4 text-foreground/50" /> Projects
        </button>
        <button
          onClick={() => setMainView('artifacts')}
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition ${
            mainView === 'artifacts'
              ? 'bg-background text-foreground'
              : 'text-foreground/70 hover:bg-background/40 hover:text-foreground'
          }`}
        >
          <Share2 className="w-4 h-4 text-foreground/50" /> Artifacts
        </button>
        <button
          onClick={() => setMainView('schedules')}
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition ${
            mainView === 'schedules'
              ? 'bg-background text-foreground'
              : 'text-foreground/70 hover:bg-background/40 hover:text-foreground'
          }`}
        >
          <Calendar className="w-4 h-4 text-foreground/50" /> Scheduled
        </button>

      </div>

      {/* C. Pinned & Recents Navigation Groups */}
      <div className="flex-1 overflow-y-auto px-2 py-4 space-y-4 min-h-0">
        {/* Real Search Input at the top of the Recents list */}
        <div className="px-2 mb-2">
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-background/50 border border-border-color/70 rounded-lg px-2.5 py-1 text-xs text-foreground outline-none focus:border-accent/40 placeholder:text-foreground/35"
          />
        </div>

        {sortedPinned.length > 0 && (
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-foreground/40 px-3 uppercase tracking-wider block">Pinned</span>
            {sortedPinned.map((conv) => (
              <div
                key={conv.id}
                onClick={() => { setMainView('chat'); setActiveConvId(conv.id); }}
                className={`group flex items-center justify-between px-3 py-1.5 rounded-lg text-xs cursor-pointer transition relative ${
                  activeConvId === conv.id && mainView === 'chat'
                    ? 'bg-background text-foreground font-semibold shadow-xs'
                    : 'text-foreground/75 hover:bg-background/30'
                }`}
              >
                <div className="flex items-center gap-2 overflow-hidden flex-1 mr-2">
                  <MessageSquare className="w-3.5 h-3.5 shrink-0 text-foreground/35" />
                  {editingChatId === conv.id ? (
                    <input
                      type="text"
                      value={editTitleText}
                      onChange={(e) => setEditTitleText(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveRename(conv.id, e as any);
                      }}
                      className="bg-sidebar border border-border-color rounded px-1.5 py-0.5 text-xs text-foreground w-full outline-none focus:border-accent"
                      autoFocus
                    />
                  ) : (
                    <span className="truncate">{conv.title}</span>
                  )}
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {editingChatId === conv.id ? (
                    <button onClick={(e) => saveRename(conv.id, e)} className="p-0.5 text-emerald-500 hover:text-emerald-400">
                      <Check className="w-3 h-3" />
                    </button>
                  ) : (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                      <button 
                        onClick={(e) => { e.stopPropagation(); setActiveMenuId(activeMenuId === conv.id ? null : conv.id); }}
                        className="p-0.5 text-foreground/45 hover:text-foreground font-bold"
                      >
                        …
                      </button>
                    </div>
                  )}
                </div>

                {/* Inline Hover Menu popover */}
                {activeMenuId === conv.id && (
                  <div className="absolute right-2 top-8 bg-card-bg border border-border-color rounded-lg shadow-lg py-1 z-50 text-[11px] w-24">
                    <button onClick={(e) => handleTogglePin(conv, e)} className="w-full text-left px-2.5 py-1 hover:bg-sidebar transition flex items-center gap-1.5">
                      <Pin className="w-3 h-3 text-accent" /> Unpin
                    </button>
                    <button onClick={(e) => startRename(conv, e)} className="w-full text-left px-2.5 py-1 hover:bg-sidebar transition flex items-center gap-1.5">
                      <Edit2 className="w-3 h-3" /> Rename
                    </button>
                    <button onClick={(e) => handleDeleteChat(conv.id, e)} className="w-full text-left px-2.5 py-1 hover:bg-sidebar text-rose-500 hover:bg-rose-950/20 transition flex items-center gap-1.5">
                      <Trash2 className="w-3 h-3" /> Delete
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="space-y-1">
          <div className="flex justify-between items-center px-3 mb-1">
            <span className="text-[10px] font-bold text-foreground/40 uppercase tracking-wider">Recents</span>
            <button 
              onClick={() => setSortAlphabetical(!sortAlphabetical)}
              className="text-[10px] text-foreground/40 hover:text-foreground cursor-pointer font-bold bg-transparent border-none p-0 flex items-center gap-0.5"
              title="Toggle Sort Mode"
            >
              <ArrowRightLeft className="w-2.5 h-2.5" />
            </button>
          </div>
          {sortedRecents.length === 0 ? (
            <span className="text-[10px] text-foreground/30 px-3 italic block">No recent chats</span>
          ) : (
            sortedRecents.map((conv) => (
              <div
                key={conv.id}
                onClick={() => { setMainView('chat'); setActiveConvId(conv.id); }}
                className={`group flex items-center justify-between px-3 py-1.5 rounded-lg text-xs cursor-pointer transition relative ${
                  activeConvId === conv.id && mainView === 'chat'
                    ? 'bg-background text-foreground font-semibold shadow-xs'
                    : 'text-foreground/75 hover:bg-background/30'
                }`}
              >
                <div className="flex items-center gap-2 overflow-hidden flex-1 mr-2">
                  <MessageSquare className="w-3.5 h-3.5 shrink-0 text-foreground/35" />
                  {editingChatId === conv.id ? (
                    <input
                      type="text"
                      value={editTitleText}
                      onChange={(e) => setEditTitleText(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveRename(conv.id, e as any);
                      }}
                      className="bg-sidebar border border-border-color rounded px-1.5 py-0.5 text-xs text-foreground w-full outline-none focus:border-accent"
                      autoFocus
                    />
                  ) : (
                    <span className="truncate">{conv.title}</span>
                  )}
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {editingChatId === conv.id ? (
                    <button onClick={(e) => saveRename(conv.id, e)} className="p-0.5 text-emerald-500 hover:text-emerald-400">
                      <Check className="w-3 h-3" />
                    </button>
                  ) : (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                      <button 
                        onClick={(e) => { e.stopPropagation(); setActiveMenuId(activeMenuId === conv.id ? null : conv.id); }}
                        className="p-0.5 text-foreground/45 hover:text-foreground font-bold"
                      >
                        …
                      </button>
                    </div>
                  )}
                </div>

                {activeMenuId === conv.id && (
                  <div className="absolute right-2 top-8 bg-card-bg border border-border-color rounded-lg shadow-lg py-1 z-50 text-[11px] w-24">
                    <button onClick={(e) => handleTogglePin(conv, e)} className="w-full text-left px-2.5 py-1 hover:bg-sidebar transition flex items-center gap-1.5">
                      <Pin className="w-3 h-3" /> Pin
                    </button>
                    <button onClick={(e) => startRename(conv, e)} className="w-full text-left px-2.5 py-1 hover:bg-sidebar transition flex items-center gap-1.5">
                      <Edit2 className="w-3 h-3" /> Rename
                    </button>
                    <button onClick={(e) => handleDeleteChat(conv.id, e)} className="w-full text-left px-2.5 py-1 hover:bg-sidebar text-rose-500 hover:bg-rose-950/20 transition flex items-center gap-1.5">
                      <Trash2 className="w-3 h-3" /> Delete
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* D. Bottom Status & Account Dock */}
      <div className="p-2 border-t border-border-color/50 relative bg-sidebar shrink-0">
        <button
          onClick={() => setShowAccountPopover(!showAccountPopover)}
          className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-background/40 transition text-left"
        >
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-7 h-7 rounded bg-accent flex items-center justify-center text-white font-bold text-xs shrink-0 font-serif">
              D
            </div>
            <div className="overflow-hidden">
              <div className="text-xs font-semibold truncate text-foreground">Digital South Trust</div>
              <div className="text-[10px] text-foreground/50 flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${
                  isConnected === null ? 'bg-amber-500 animate-pulse' : isConnected ? 'bg-emerald-500' : 'bg-rose-500'
                }`} />
                {isConnected === null ? 'Connecting...' : isConnected ? 'Ollama Online' : 'Ollama Offline'}
              </div>
            </div>
          </div>
          <ChevronDown className="w-4 h-4 text-foreground/40 shrink-0" />
        </button>

        {showAccountPopover && (
          <div className="absolute bottom-14 left-2 right-2 bg-card-bg border border-border-color rounded-xl shadow-lg p-2.5 z-40 space-y-1.5 text-xs text-foreground">
            <div className="px-2 py-1 font-bold text-foreground/50 text-[10px] uppercase tracking-wider">Workspace Dock</div>
            
            <div className="px-2 pb-2 border-b border-border-color/50 space-y-1 font-mono text-[10px] text-foreground/60">
              <div>Ollama Base: {isConnected ? `v${ollamaVersion}` : 'Offline'}</div>
              <div>Active LLM: {activeProviderName}</div>
            </div>

            <div className="grid grid-cols-2 gap-1 py-1">
              <button 
                onClick={() => { setTheme(theme === 'dark' ? 'light' : 'dark'); setShowAccountPopover(false); }}
                className="flex items-center justify-center gap-1.5 py-1 rounded hover:bg-sidebar transition text-foreground"
              >
                {theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
                Theme
              </button>
              <button 
                onClick={() => { setShowAccountPopover(false); setShowSettings(true); }}
                className="flex items-center justify-center gap-1.5 py-1 rounded hover:bg-sidebar transition text-foreground"
              >
                <Settings className="w-3.5 h-3.5" />
                Settings
              </button>
            </div>

            <div className="border-t border-border-color/50 pt-2 grid grid-cols-2 gap-1">
              <button 
                onClick={() => { setShowAccountPopover(false); handleBackupExport(); }}
                className="flex items-center justify-center gap-1.5 py-1 rounded hover:bg-sidebar transition text-[10px] font-bold text-foreground/70"
              >
                <Database className="w-3 h-3" /> Export
              </button>
              <label className="flex items-center justify-center gap-1.5 py-1 rounded hover:bg-sidebar transition text-[10px] font-bold text-foreground/70 cursor-pointer">
                <Upload className="w-3 h-3" /> Import
                <input type="file" onChange={(e) => { setShowAccountPopover(false); handleBackupImport(e); }} accept=".json" className="hidden" />
              </label>
            </div>
            
            <div className="text-[9px] text-foreground/45 px-2 pt-1 border-t border-border-color/20 text-center font-mono">
              VEGA Desktop v1.0.0
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
