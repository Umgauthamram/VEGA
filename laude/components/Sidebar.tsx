'use client';

import React, { useState } from 'react';
import { 
  Home as HomeIcon, Code, Plus, FolderOpen, Share2, Calendar, Settings, Pin, MessageSquare, Trash2, ChevronDown
} from 'lucide-react';
import { Conversation } from '../app/types';

interface SidebarProps {
  activeTab: 'home' | 'code';
  setActiveTab: (tab: 'home' | 'code') => void;
  conversations: Conversation[];
  activeConvId: string | null;
  setActiveConvId: (id: string | null) => void;
  handleCreateNewChat: () => void;
  handleTogglePin: (conv: Conversation, e: React.MouseEvent) => void;
  handleDeleteChat: (id: string, e: React.MouseEvent) => void;
  isConnected: boolean | null;
  ollamaVersion: string;
  activeProviderName: string;
  setShowSettings: (show: boolean) => void;
  setMainView: (view: 'chat' | 'projects' | 'artifacts' | 'schedules') => void;
  mainView: 'chat' | 'projects' | 'artifacts' | 'schedules';
  setAgentMode: (mode: boolean) => void;
  setShowLogsPanel: (show: boolean) => void;
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
  isConnected,
  ollamaVersion,
  activeProviderName,
  setShowSettings,
  setMainView,
  mainView,
  setAgentMode,
  setShowLogsPanel
}: SidebarProps) {
  const [showAccountPopover, setShowAccountPopover] = useState(false);
  const pinnedConvs = conversations.filter(c => c.pinned);
  const recentConvs = conversations.filter(c => !c.pinned);

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

  return (
    <aside className="w-[250px] bg-sidebar border-r border-border-color flex flex-col h-full shrink-0 select-none text-foreground">
      {/* A. Header & View Toggle (Top Left) */}
      <div className="p-4 space-y-3">
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
      <div className="px-2 space-y-0.5">
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
        <button
          onClick={() => setShowSettings(true)}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-foreground/70 hover:bg-background/40 hover:text-foreground transition"
        >
          <Settings className="w-4 h-4 text-foreground/50" /> Customize
        </button>
      </div>

      {/* C. Pinned & Recents Navigation Groups */}
      <div className="flex-1 overflow-y-auto px-2 py-4 space-y-4">
        {pinnedConvs.length > 0 && (
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-foreground/40 px-3 uppercase tracking-wider block">Pinned</span>
            {pinnedConvs.map((conv) => (
              <div
                key={conv.id}
                onClick={() => { setMainView('chat'); setActiveConvId(conv.id); }}
                className={`group flex items-center justify-between px-3 py-1.5 rounded-lg text-xs cursor-pointer transition ${
                  activeConvId === conv.id && mainView === 'chat'
                    ? 'bg-background text-foreground font-semibold shadow-xs'
                    : 'text-foreground/75 hover:bg-background/30'
                }`}
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  <MessageSquare className="w-3.5 h-3.5 shrink-0 text-foreground/35" />
                  <span className="truncate">{conv.title}</span>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                  <button onClick={(e) => handleTogglePin(conv, e)} className="p-0.5 text-accent">
                    <Pin className="w-3 h-3" />
                  </button>
                  <button onClick={(e) => handleDeleteChat(conv.id, e)} className="p-0.5 text-foreground/40 hover:text-rose-500">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="space-y-1">
          <div className="flex justify-between items-center px-3 mb-1">
            <span className="text-[10px] font-bold text-foreground/40 uppercase tracking-wider">Recents</span>
            <span className="text-[10px] text-foreground/40 hover:text-foreground cursor-pointer font-bold">⇅</span>
          </div>
          {recentConvs.length === 0 ? (
            <span className="text-[10px] text-foreground/30 px-3 italic block">No recent chats</span>
          ) : (
            recentConvs.map((conv) => (
              <div
                key={conv.id}
                onClick={() => { setMainView('chat'); setActiveConvId(conv.id); }}
                className={`group flex items-center justify-between px-3 py-1.5 rounded-lg text-xs cursor-pointer transition ${
                  activeConvId === conv.id && mainView === 'chat'
                    ? 'bg-background text-foreground font-semibold shadow-xs'
                    : 'text-foreground/75 hover:bg-background/30'
                }`}
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  <MessageSquare className="w-3.5 h-3.5 shrink-0 text-foreground/35" />
                  <span className="truncate">{conv.title}</span>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                  <button onClick={(e) => handleTogglePin(conv, e)} className="p-0.5 text-foreground/40 hover:text-accent">
                    <Pin className="w-3 h-3" />
                  </button>
                  <button onClick={(e) => handleDeleteChat(conv.id, e)} className="p-0.5 text-foreground/40 hover:text-rose-500">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* D. Bottom Status & Account Dock */}
      {/* Update Banner Slot */}
      <div className="px-2 pb-1">
        <div className="flex items-center justify-between bg-accent/10 border border-accent/20 rounded-lg p-2 text-[10px] text-accent font-semibold cursor-pointer hover:bg-accent/15 transition">
          <span>Relaunch to update v1.24012.1</span>
          <span>→</span>
        </div>
      </div>

      {/* Sub-Navigation Links */}
      <div className="px-4 py-2 border-t border-border-color/30 flex items-center justify-center gap-2 text-[10px] text-foreground/40 font-bold uppercase tracking-wider">
        <span className="hover:text-foreground cursor-pointer">Design</span>
        <span className="text-border-color/50">|</span>
        <span className="hover:text-foreground cursor-pointer">Labs</span>
      </div>

      <div className="p-2 border-t border-border-color/50 relative bg-sidebar">
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
              <div className="text-[10px] text-foreground/50 flex items-center gap-1">
                <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                {isConnected ? 'Ollama Online' : 'Offline'}
              </div>
            </div>
          </div>
          <ChevronDown className="w-4 h-4 text-foreground/40 shrink-0" />
        </button>

        {showAccountPopover && (
          <div className="absolute bottom-14 left-2 right-2 bg-card-bg border border-border-color rounded-xl shadow-lg p-2.5 z-40 space-y-1.5 text-xs text-foreground">
            <div className="px-2 py-1 font-bold text-foreground/50 text-[10px] uppercase">Connection Info</div>
            <div className="px-2 pb-2 border-b border-border-color/50 space-y-0.5">
              <div>Ollama Base: {isConnected ? `v${ollamaVersion}` : 'Offline'}</div>
              <div className="text-[10px] text-foreground/50">Active Provider: {activeProviderName}</div>
            </div>
            <button
              onClick={() => { setShowAccountPopover(false); setShowSettings(true); }}
              className="w-full text-left px-2 py-1.5 rounded hover:bg-sidebar transition text-foreground"
            >
              Settings
            </button>
            <div className="text-[10px] text-foreground/40 px-2 pt-1">Laude Desktop v0.1.0</div>
          </div>
        )}
      </div>
    </aside>
  );
}
