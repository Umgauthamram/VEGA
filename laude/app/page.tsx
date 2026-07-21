'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Server, RefreshCw, Plus, MessageSquare, Trash2, Pin, Settings, 
  Send, Bot, User, Sparkles, Cpu, Sliders, ChevronDown, Download, AlertTriangle, Check, Layers 
} from 'lucide-react';
import { ollamaClient } from './ollama';
import { loadConversations, saveConversation, deleteConversation, loadMessages, saveMessage, loadPresets, savePreset } from './storage';
import { OllamaModel, Conversation, ChatMessage, ModelPreset, RunningModel } from './types';

export default function Home() {
  // Connection & Models state
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [ollamaVersion, setOllamaVersion] = useState<string>('');
  const [models, setModels] = useState<OllamaModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [runningModels, setRunningModels] = useState<RunningModel[]>([]);
  const [pullModelInput, setPullModelInput] = useState<string>('');
  const [pullProgress, setPullProgress] = useState<{ status: string; percent?: number } | null>(null);

  // Conversations & Chat state
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState<string>('');
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Model parameters / Settings state
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [baseUrl, setBaseUrl] = useState<string>('http://localhost:11434');
  const [keepAlive, setKeepAlive] = useState<string>('5m');
  const [presets, setPresets] = useState<ModelPreset[]>([]);
  const [activePreset, setActivePreset] = useState<ModelPreset>({
    id: 'default',
    name: 'Default Balanced',
    temperature: 0.7,
    top_p: 0.9,
    top_k: 40,
    num_ctx: 4096,
    repeat_penalty: 1.1,
    system_prompt: 'You are a helpful, precise AI assistant running locally on the user machine.',
  });

  const chatEndRef = useRef<HTMLDivElement>(null);

  // 1. Initial health check & polling
  useEffect(() => {
    checkOllamaHealth();
    const interval = setInterval(checkOllamaHealth, 5000);
    return () => clearInterval(interval);
  }, [baseUrl]);

  // Load conversations and presets from SQLite on mount
  useEffect(() => {
    (async () => {
      const convs = await loadConversations();
      setConversations(convs);
      if (convs.length > 0) {
        setActiveConvId(convs[0].id);
      }
      const loadedPresets = await loadPresets();
      if (loadedPresets.length > 0) {
        setPresets(loadedPresets);
      }
    })();
  }, []);

  // Load messages when active conversation changes
  useEffect(() => {
    if (activeConvId) {
      loadMessages(activeConvId).then(setMessages);
    } else {
      setMessages([]);
    }
  }, [activeConvId]);

  // Auto scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isStreaming]);

  async function checkOllamaHealth() {
    ollamaClient.setBaseUrl(baseUrl);
    const health = await ollamaClient.checkHealth();
    setIsConnected(health.running);
    if (health.running) {
      setOllamaVersion(health.version || 'unknown');
      refreshModels();
    }
  }

  async function refreshModels() {
    const list = await ollamaClient.listModels();
    setModels(list);
    if (list.length > 0 && !selectedModel) {
      setSelectedModel(list[0].name);
    }
    const ps = await ollamaClient.listRunningModels();
    setRunningModels(ps);
  }

  async function handleCreateNewChat() {
    const newConv: Conversation = {
      id: 'conv_' + Date.now(),
      title: 'New Chat',
      created_at: Date.now(),
      updated_at: Date.now(),
      model: selectedModel || (models[0]?.name || 'qwen2.5:14b'),
      pinned: false,
    };
    await saveConversation(newConv);
    setConversations((prev) => [newConv, ...prev]);
    setActiveConvId(newConv.id);
  }

  async function handleDeleteChat(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    await deleteConversation(id);
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (activeConvId === id) {
      setActiveConvId(null);
    }
  }

  async function handleTogglePin(conv: Conversation, e: React.MouseEvent) {
    e.stopPropagation();
    const updated = { ...conv, pinned: !conv.pinned, updated_at: Date.now() };
    await saveConversation(updated);
    setConversations((prev) =>
      prev
        .map((c) => (c.id === conv.id ? updated : c))
        .sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || b.updated_at - a.updated_at)
    );
  }

  async function handlePullModel() {
    if (!pullModelInput.trim()) return;
    const name = pullModelInput.trim();
    setPullProgress({ status: 'Starting pull...' });
    try {
      await ollamaClient.pullModel(name, (status, completed, total) => {
        let percent = undefined;
        if (completed && total && total > 0) {
          percent = Math.round((completed / total) * 100);
        }
        setPullProgress({ status, percent });
      });
      setPullProgress({ status: 'Pull complete!' });
      setTimeout(() => setPullProgress(null), 3000);
      setPullModelInput('');
      await refreshModels();
    } catch (e: any) {
      setPullProgress({ status: `Error: ${e.message || 'Pull failed'}` });
    }
  }

  async function handleDeleteModel(modelName: string) {
    if (confirm(`Are you sure you want to delete local model ${modelName}?`)) {
      await ollamaClient.deleteModel(modelName);
      await refreshModels();
    }
  }

  async function handleSendMessage() {
    if (!input.trim() || isStreaming) return;

    let currentConvId = activeConvId;
    let activeConv = conversations.find((c) => c.id === currentConvId);

    // Auto-create chat if none active
    if (!currentConvId || !activeConv) {
      const newConv: Conversation = {
        id: 'conv_' + Date.now(),
        title: input.slice(0, 30) + (input.length > 30 ? '...' : ''),
        created_at: Date.now(),
        updated_at: Date.now(),
        model: selectedModel || (models[0]?.name || 'qwen2.5:14b'),
        pinned: false,
      };
      await saveConversation(newConv);
      setConversations((prev) => [newConv, ...prev]);
      setActiveConvId(newConv.id);
      currentConvId = newConv.id;
      activeConv = newConv;
    } else if (messages.length === 0) {
      // First message, set title
      const updatedConv = { ...activeConv, title: input.slice(0, 30) + (input.length > 30 ? '...' : ''), updated_at: Date.now() };
      await saveConversation(updatedConv);
      setConversations((prev) => prev.map((c) => (c.id === updatedConv.id ? updatedConv : c)));
    }

    const userMsg: ChatMessage = {
      id: 'msg_' + Date.now(),
      conversation_id: currentConvId,
      role: 'user',
      content: input,
      timestamp: Date.now(),
    };

    await saveMessage(userMsg);
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsStreaming(true);

    const assistantMsgId = 'msg_' + (Date.now() + 1);
    const initialAssistantMsg: ChatMessage = {
      id: assistantMsgId,
      conversation_id: currentConvId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      model_used: selectedModel,
    };

    setMessages((prev) => [...prev, initialAssistantMsg]);

    const historyForOllama: { role: string; content: string }[] = [];
    if (activePreset.system_prompt) {
      historyForOllama.push({ role: 'system', content: activePreset.system_prompt });
    }
    messages.forEach((m) => historyForOllama.push({ role: m.role, content: m.content }));
    historyForOllama.push({ role: 'user', content: userMsg.content });

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    let accumulatedText = '';
    try {
      await ollamaClient.streamChat(
        selectedModel || activeConv.model,
        historyForOllama,
        activePreset,
        keepAlive,
        (chunk) => {
          accumulatedText += chunk;
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantMsgId ? { ...m, content: accumulatedText } : m))
          );
        },
        abortController.signal
      );

      const finalAssistantMsg: ChatMessage = {
        id: assistantMsgId,
        conversation_id: currentConvId,
        role: 'assistant',
        content: accumulatedText,
        timestamp: Date.now(),
        model_used: selectedModel,
      };
      await saveMessage(finalAssistantMsg);
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        const errorMsg: ChatMessage = {
          id: assistantMsgId,
          conversation_id: currentConvId,
          role: 'assistant',
          content: accumulatedText + `\n\n*(Error: ${e.message || 'Stream interrupted'})*`,
          timestamp: Date.now(),
          model_used: selectedModel,
        };
        await saveMessage(errorMsg);
      }
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  }

  function handleStopStream() {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-zinc-900 text-zinc-100 font-sans">
      {/* 1. Health Status Banner (if offline) */}
      {isConnected === false && (
        <div className="absolute top-0 left-0 right-0 z-50 bg-amber-600/90 backdrop-blur-md px-4 py-2 text-white flex items-center justify-between text-sm border-b border-amber-500">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-200" />
            <span>
              Ollama server is not connected. Run <code className="bg-black/30 px-1.5 py-0.5 rounded font-mono">ollama serve</code> in your terminal.
            </span>
          </div>
          <button
            onClick={checkOllamaHealth}
            className="flex items-center gap-1 bg-white/20 hover:bg-white/30 px-3 py-1 rounded transition text-xs font-semibold"
          >
            <RefreshCw className="w-3 h-3 animate-spin" /> Retry Connection
          </button>
        </div>
      )}

      {/* 2. Left Sidebar (Claude Style) */}
      <aside className="w-64 bg-zinc-950 border-r border-zinc-800 flex flex-col justify-between p-3">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between px-2 pt-1">
            <div className="flex items-center gap-2 font-bold text-lg tracking-tight">
              <Sparkles className="w-5 h-5 text-amber-500" />
              <span>Laude</span>
              <span className="text-[10px] bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded font-mono">v0.1</span>
            </div>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-1.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition"
              title="Settings & Model Management"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={handleCreateNewChat}
            className="flex items-center justify-center gap-2 w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-100 py-2 px-3 rounded-lg border border-zinc-700/50 transition font-medium text-sm shadow-sm"
          >
            <Plus className="w-4 h-4" /> New Chat
          </button>

          {/* Conversations List */}
          <div className="flex flex-col gap-1 mt-2 overflow-y-auto max-h-[calc(100vh-200px)]">
            <span className="text-[11px] font-semibold text-zinc-500 px-2 uppercase tracking-wider">Conversations</span>
            {conversations.map((conv) => (
              <div
                key={conv.id}
                onClick={() => setActiveConvId(conv.id)}
                className={`group flex items-center justify-between px-2.5 py-2 rounded-lg text-sm cursor-pointer transition ${
                  activeConvId === conv.id ? 'bg-zinc-800 text-white font-medium' : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
                }`}
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  <MessageSquare className="w-4 h-4 shrink-0 text-zinc-500" />
                  <span className="truncate">{conv.title}</span>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                  <button
                    onClick={(e) => handleTogglePin(conv, e)}
                    className={`p-1 hover:text-amber-400 transition ${conv.pinned ? 'text-amber-500 opacity-100' : ''}`}
                  >
                    <Pin className="w-3 h-3" />
                  </button>
                  <button onClick={(e) => handleDeleteChat(conv.id, e)} className="p-1 hover:text-red-400 transition">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Ollama Connection Indicator */}
        <div className="border-t border-zinc-850 pt-3 px-2 flex items-center justify-between text-xs text-zinc-400">
          <div className="flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-rose-500 animate-pulse'}`} />
            <span>{isConnected ? `Ollama v${ollamaVersion}` : 'Disconnected'}</span>
          </div>
          <button onClick={refreshModels} className="hover:text-white transition">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </aside>

      {/* 3. Main Pane */}
      <main className="flex-1 flex flex-col justify-between bg-zinc-900 relative">
        {/* Header Bar */}
        <header className="h-14 border-b border-zinc-800/80 px-6 flex items-center justify-between bg-zinc-900/50 backdrop-blur">
          {/* Model Switcher */}
          <div className="flex items-center gap-3">
            <Cpu className="w-4 h-4 text-zinc-400" />
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="bg-zinc-800 border border-zinc-700 text-zinc-200 text-sm rounded-md px-3 py-1.5 focus:outline-none focus:border-amber-500 transition"
            >
              {models.length === 0 ? (
                <option value="">No local models found</option>
              ) : (
                models.map((m) => (
                  <option key={m.name} value={m.name}>
                    {m.name} ({m.details?.parameter_size || 'N/A'})
                  </option>
                ))
              )}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-500">Local Inference • No limits</span>
          </div>
        </header>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-zinc-500 gap-3">
              <Bot className="w-12 h-12 text-zinc-700" />
              <h2 className="text-lg font-medium text-zinc-300">How can Laude help you today?</h2>
              <p className="text-sm max-w-sm">Connected 100% locally to Ollama. Your data stays on your machine.</p>
            </div>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className={`flex gap-4 max-w-3xl mx-auto ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-full bg-amber-600/20 border border-amber-500/30 flex items-center justify-center shrink-0">
                    <Bot className="w-4 h-4 text-amber-400" />
                  </div>
                )}
                <div
                  className={`p-4 rounded-xl text-sm leading-relaxed max-w-2xl whitespace-pre-wrap ${
                    msg.role === 'user'
                      ? 'bg-zinc-800 border border-zinc-700 text-zinc-100 rounded-tr-none'
                      : 'bg-zinc-950/80 border border-zinc-800 text-zinc-200 rounded-tl-none shadow-sm'
                  }`}
                >
                  {msg.content || (isStreaming && msg.role === 'assistant' ? <span className="animate-pulse">Thinking...</span> : '')}
                </div>
                {msg.role === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0">
                    <User className="w-4 h-4 text-zinc-400" />
                  </div>
                )}
              </div>
            ))
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Input Box */}
        <div className="p-4 border-t border-zinc-800/80 bg-zinc-900/80 backdrop-blur">
          <div className="max-w-3xl mx-auto flex items-center gap-2 bg-zinc-950 border border-zinc-800 focus-within:border-amber-500/50 rounded-xl p-2 transition">
            <textarea
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder="Send a message to local Ollama..."
              className="flex-1 bg-transparent border-none text-zinc-100 text-sm px-3 focus:outline-none resize-none max-h-32 min-h-[40px] py-2"
            />
            {isStreaming ? (
              <button
                onClick={handleStopStream}
                className="p-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg transition"
                title="Stop generation"
              >
                <div className="w-4 h-4 bg-white rounded-xs" />
              </button>
            ) : (
              <button
                onClick={handleSendMessage}
                disabled={!input.trim()}
                className="p-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-40 disabled:hover:bg-amber-600 text-white rounded-lg transition"
              >
                <Send className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </main>

      {/* 4. Settings Drawer / Model Management Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <Sliders className="w-5 h-5 text-amber-500" /> Settings & Model Management
              </h3>
              <button onClick={() => setShowSettings(false)} className="text-zinc-400 hover:text-white text-xl">
                ×
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              {/* Ollama Server Config */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Ollama Server Base URL</label>
                <input
                  type="text"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm focus:border-amber-500 outline-none"
                />
              </div>

              {/* Model Puller */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Pull New Model</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={pullModelInput}
                    onChange={(e) => setPullModelInput(e.target.value)}
                    placeholder="e.g. qwen2.5:14b, llama3.2, mistral"
                    className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm focus:border-amber-500 outline-none"
                  />
                  <button
                    onClick={handlePullModel}
                    className="bg-amber-600 hover:bg-amber-500 px-4 py-2 rounded-lg text-sm font-medium transition"
                  >
                    Pull
                  </button>
                </div>
                {pullProgress && (
                  <div className="text-xs text-amber-400 mt-1">
                    {pullProgress.status} {pullProgress.percent !== undefined ? `(${pullProgress.percent}%)` : ''}
                  </div>
                )}
              </div>

              {/* Local Installed Models */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Installed Local Models</label>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {models.map((m) => (
                    <div key={m.name} className="flex items-center justify-between bg-zinc-950 p-3 rounded-lg border border-zinc-850 text-sm">
                      <div>
                        <div className="font-medium text-zinc-200">{m.name}</div>
                        <div className="text-xs text-zinc-500">
                          Size: {(m.size / (1024 * 1024 * 1024)).toFixed(2)} GB | Params: {m.details?.parameter_size || 'N/A'}
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteModel(m.name)}
                        className="text-rose-400 hover:bg-rose-950/50 p-1.5 rounded transition"
                        title="Delete model"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Model Parameters / Preset */}
              <div className="space-y-4 border-t border-zinc-800 pt-4">
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Inference Parameters (Profile)</label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-xs text-zinc-400">Temperature: {activePreset.temperature}</span>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={activePreset.temperature}
                      onChange={(e) => setActivePreset({ ...activePreset, temperature: parseFloat(e.target.value) })}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <span className="text-xs text-zinc-400">Context Window (num_ctx): {activePreset.num_ctx}</span>
                    <input
                      type="number"
                      value={activePreset.num_ctx}
                      onChange={(e) => setActivePreset({ ...activePreset, num_ctx: parseInt(e.target.value) || 2048 })}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
