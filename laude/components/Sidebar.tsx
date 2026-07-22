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
    <aside className="w-64 bg-sidebar border-r border-border-color flex flex-col h-full shrink-0 select-none text-foreground">
      {/* Top Tabs */}
      <div className="p-3 grid grid-cols-2 gap-1 border-b border-border-color/50">
        <button
          onClick={() => handleTabClick('home')}
          className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition ${
            activeTab === 'home' && mainView === 'chat'
              ? 'bg-background shadow-xs text-foreground'
              : 'text-foreground/60 hover:bg-background/40 hover:text-foreground'
          }`}
        >
          <HomeIcon className="w-4 h-4" /> Home
        </button>
        <button
          onClick={() => handleTabClick('code')}
          className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition ${
            activeTab === 'code' && mainView === 'chat'
              ? 'bg-background shadow-xs text-foreground'
              : 'text-foreground/60 hover:bg-background/40 hover:text-foreground'
          }`}
        >
          <Code className="w-4 h-4" /> Code
        </button>
      </div>

      {/* Nav List */}
      <div className="p-2 space-y-0.5 border-b border-border-color/50">
        <button
          onClick={() => { setMainView('chat'); handleCreateNewChat(); }}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-foreground/80 hover:bg-background/40 hover:text-foreground transition"
        >
          <Plus className="w-4 h-4 text-accent" /> New Chat
        </button>
        <button
          onClick={() => setMainView('projects')}
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition ${
            mainView === 'projects'
              ? 'bg-background text-foreground'
              : 'text-foreground/80 hover:bg-background/40 hover:text-foreground'
          }`}
        >
          <FolderOpen className="w-4 h-4 text-foreground/50" /> Projects
        </button>
        <button
          onClick={() => setMainView('artifacts')}
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition ${
            mainView === 'artifacts'
              ? 'bg-background text-foreground'
              : 'text-foreground/80 hover:bg-background/40 hover:text-foreground'
          }`}
        >
          <Share2 className="w-4 h-4 text-foreground/50" /> Artifacts Gallery
        </button>
        <button
          onClick={() => setMainView('schedules')}
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition ${
            mainView === 'schedules'
              ? 'bg-background text-foreground'
              : 'text-foreground/80 hover:bg-background/40 hover:text-foreground'
          }`}
        >
          <Calendar className="w-4 h-4 text-foreground/50" /> Scheduled
        </button>
        <button
          onClick={() => setShowSettings(true)}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-foreground/80 hover:bg-background/40 hover:text-foreground transition"
        >
          <Settings className="w-4 h-4 text-foreground/50" /> Customize
        </button>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
        {pinnedConvs.length > 0 && (
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-foreground/40 px-3 uppercase tracking-wider block">Pinned</span>
            {pinnedConvs.map((conv) => (
              <div
                key={conv.id}
                onClick={() => { setMainView('chat'); setActiveConvId(conv.id); }}
                className={`group flex items-center justify-between px-3 py-2 rounded-lg text-xs cursor-pointer transition ${
                  activeConvId === conv.id && mainView === 'chat'
                    ? 'bg-background text-foreground font-semibold border border-border-color/30'
                    : 'text-foreground/70 hover:bg-background/30 hover:text-foreground'
                }`}
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  <MessageSquare className="w-3.5 h-3.5 shrink-0 text-foreground/40" />
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
          <span className="text-[10px] font-bold text-foreground/40 px-3 uppercase tracking-wider block">Recents</span>
          {recentConvs.length === 0 ? (
            <span className="text-[11px] text-foreground/30 px-3 italic block">No recent chats</span>
          ) : (
            recentConvs.map((conv) => (
              <div
                key={conv.id}
                onClick={() => { setMainView('chat'); setActiveConvId(conv.id); }}
                className={`group flex items-center justify-between px-3 py-2 rounded-lg text-xs cursor-pointer transition ${
                  activeConvId === conv.id && mainView === 'chat'
                    ? 'bg-background text-foreground font-semibold border border-border-color/30'
                    : 'text-foreground/70 hover:bg-background/30 hover:text-foreground'
                }`}
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  <MessageSquare className="w-3.5 h-3.5 shrink-0 text-foreground/40" />
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

      {/* Account Footer & Popover */}
      <div className="p-2 border-t border-border-color/50 relative">
        <button
          onClick={() => setShowAccountPopover(!showAccountPopover)}
          className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-background/40 transition text-left"
        >
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-7 h-7 rounded bg-accent flex items-center justify-center text-white font-bold text-sm shrink-0">
              L
            </div>
            <div className="overflow-hidden">
              <div className="text-xs font-semibold truncate text-foreground">Laude</div>
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
            <div className="px-2 py-1 font-bold text-foreground/50 text-[10px] uppercase">Connection info</div>
            <div className="px-2 pb-2 border-b border-border-color/50 space-y-0.5">
              <div>Ollama base: {isConnected ? `v${ollamaVersion}` : 'Offline'}</div>
              <div className="text-[10px] text-foreground/50">Active Provider: {activeProviderName}</div>
            </div>
            <button
              onClick={() => { setShowAccountPopover(false); setShowSettings(true); }}
              className="w-full text-left px-2 py-1.5 rounded hover:bg-sidebar transition text-foreground"
            >
              Settings
            </button>
            <div className="text-[10px] text-foreground/40 px-2 pt-1">Laude desktop v0.1.0</div>
          </div>
        )}
      </div>
    </aside>
  );
}
