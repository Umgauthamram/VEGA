'use client';

import React from 'react';
import { 
  Bot, User, Sparkles, AlertCircle, Copy, Check, RotateCw
} from 'lucide-react';
import { ChatMessage } from '../app/types';
import { MarkdownRenderer } from '../app/MarkdownRenderer';

interface ChatViewProps {
  messages: ChatMessage[];
  selectedModel: string;
  setSelectedModel: (val: string) => void;
  models: any[];
  isConnected: boolean | null;
  onCodeBlockClick: (lang: string, code: string) => void;
  chatEndRef: React.RefObject<HTMLDivElement | null>;
  isStreaming: boolean;
  activeConvTitle: string;
  handleCreateNewChat: () => void;
}

export function ChatView({
  messages,
  selectedModel,
  setSelectedModel,
  models,
  isConnected,
  onCodeBlockClick,
  chatEndRef,
  isStreaming,
  activeConvTitle,
  handleCreateNewChat
}: ChatViewProps) {
  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  const handleCopy = (content: string, id: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="flex-1 flex flex-col justify-between relative min-w-0 bg-background text-foreground">
      {/* Header Info */}
      <header className="h-14 border-b border-border-color px-6 flex items-center justify-between bg-background/50 backdrop-blur shrink-0">
        <div className="flex items-center gap-3">
          <button className="p-1.5 hover:bg-sidebar rounded text-foreground/60 transition" title="Toggle Sidebar">☰</button>
          <button className="p-1.5 hover:bg-sidebar rounded text-foreground/60 transition" title="Search">🔍</button>
          <div className="flex items-center gap-1">
            <button className="p-1 hover:bg-sidebar rounded text-foreground/60 transition">←</button>
            <button className="p-1 hover:bg-sidebar rounded text-foreground/60 transition">→</button>
          </div>
          <span className="font-serif font-bold text-sm truncate ml-2">{activeConvTitle || 'New Conversation'}</span>
        </div>
        <div className="flex items-center gap-3">
          <button className="p-1.5 hover:bg-sidebar rounded text-foreground/60 transition" title="Incognito Mode">👻</button>
          <div className="h-4 w-[1px] bg-border-color/50" />
          <div className="flex items-center gap-1.5">
            <button className="w-3 h-3 rounded-full bg-amber-500 hover:bg-amber-600 transition" title="Minimize" />
            <button className="w-3 h-3 rounded-full bg-emerald-500 hover:bg-emerald-600 transition" title="Maximize" />
            <button className="w-3 h-3 rounded-full bg-rose-500 hover:bg-rose-600 transition" title="Close" />
          </div>
        </div>
      </header>

      {/* Main chat body thread layout */}
      <div id="chat-messages-container" className="flex-1 overflow-y-auto p-6 space-y-6">
        <div className="max-w-[46rem] mx-auto space-y-8">
          {messages.length === 0 ? (
            <div className="h-[50vh] flex flex-col items-center justify-center text-center text-foreground/60 gap-4">
              <span className="text-2xl text-accent">✦</span>
              <h2 className="text-3xl font-serif text-foreground font-semibold italic">
                {(() => {
                  const hr = new Date().getHours();
                  if (hr < 12) return "Good morning.";
                  if (hr < 18) return "Good afternoon.";
                  return "Good evening.";
                })()}
              </h2>
              <p className="text-xs text-foreground/50 tracking-wide uppercase">How can I help you today?</p>
            </div>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className={`flex flex-col group ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                {msg.role === 'assistant' && (
                  <span className="text-[10px] uppercase font-bold tracking-wider text-foreground/45 mb-1.5">
                    {msg.model_used || selectedModel || 'Assistant'}
                  </span>
                )}
                <div className={`text-sm leading-relaxed max-w-full whitespace-pre-wrap ${
                  msg.role === 'user' ? 'bg-card-bg text-foreground px-4 py-3 rounded-2xl border border-border-color shadow-xs' : 
                  msg.content.includes('*(Error:') ? 'bg-rose-950/20 text-rose-300 px-4 py-3 rounded-2xl border border-rose-900/30' :
                  'text-foreground'
                }`}>
                  {msg.role === 'assistant' ? (
                    msg.content === '' ? (
                      <div className="flex items-center gap-1.5 py-1 text-accent font-mono text-xs">
                        <span className="animate-bounce font-bold">●</span>
                        <span className="animate-bounce delay-75 font-bold">●</span>
                        <span className="animate-bounce delay-150 font-bold">●</span>
                      </div>
                    ) : (
                      <MarkdownRenderer 
                        content={msg.content} 
                        onCodeBlockClick={onCodeBlockClick} 
                      />
                    )
                  ) : (
                    <span>{msg.content}</span>
                  )}
                </div>

                {msg.role === 'assistant' && msg.content !== '' && (
                  <div className="flex items-center gap-3 mt-2 opacity-0 group-hover:opacity-100 transition text-[10px] text-foreground/40 font-bold uppercase tracking-wider">
                    <button 
                      onClick={() => handleCopy(msg.content, msg.id)}
                      className="hover:text-foreground flex items-center gap-1 transition"
                    >
                      {copiedId === msg.id ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-500" /> Copied
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" /> Copy
                        </>
                      )}
                    </button>
                    <button className="hover:text-foreground transition">Regenerate</button>
                    <button className="hover:text-foreground transition">Thumbs Up</button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
        <div ref={chatEndRef} />
      </div>
    </div>
  );
}
