'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Server, RefreshCw, Plus, MessageSquare, Trash2, Pin, Settings, 
  Send, Bot, User, Sparkles, Cpu, Sliders, ChevronDown, Download, 
  AlertTriangle, Check, Layers, Paperclip, X, Eye, FolderPlus, FolderOpen, Save, BookOpen
} from 'lucide-react';
import { ollamaClient } from './ollama';
import { 
  loadConversations, saveConversation, deleteConversation, loadMessages, saveMessage, 
  loadPresets, savePreset, loadProjects, saveProject, deleteProject, loadProjectFiles, 
  saveUserMemory, loadUserMemory 
} from './storage';
import { OllamaModel, Conversation, ChatMessage, ModelPreset, RunningModel, Project, ProjectFile, Attachment } from './types';
import { MarkdownRenderer } from './MarkdownRenderer';
import { ArtifactsPanel } from './ArtifactsPanel';
import { readTextOrFile } from './attachments';
import { ingestProjectFile, queryRelevantChunks } from './rag';

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

  // Attachments
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Artifact
  const [selectedArtifact, setSelectedArtifact] = useState<{ language: string; code: string } | null>(null);

  // Projects & RAG
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [showProjectsModal, setShowProjectsModal] = useState<boolean>(false);
  const [newProjectName, setNewProjectName] = useState<string>('');
  const [newProjectPrompt, setNewProjectPrompt] = useState<string>('');
  const [projectFilesList, setProjectFilesList] = useState<ProjectFile[]>([]);
  const projectFileInputRef = useRef<HTMLInputElement>(null);

  // Memory
  const [userMemoryText, setUserMemoryText] = useState<string>('');
  const [showMemoryModal, setShowMemoryModal] = useState<boolean>(false);

  // Model parameters / Settings state
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [baseUrl, setBaseUrl] = useState<string>('http://localhost:11434');
  const [keepAlive, setKeepAlive] = useState<string>('5m');
  const [embeddingModel, setEmbeddingModel] = useState<string>('nomic-embed-text');
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

  // Load database items on mount
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
      const loadedProjects = await loadProjects();
      setProjects(loadedProjects);
      const memory = await loadUserMemory();
      setUserMemoryText(memory);
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

  // Load project files when active project changes
  useEffect(() => {
    if (activeProjectId) {
      loadProjectFiles(activeProjectId).then(setProjectFilesList);
    } else {
      setProjectFilesList([]);
    }
  }, [activeProjectId]);

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

  // File upload change handler
  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    for (const f of files) {
      try {
        const attach = await readTextOrFile(f);
        setAttachments((prev) => [...prev, attach]);
      } catch (err) {
        console.error('File load failed:', err);
      }
    }
  }

  // Remove attachment
  function removeAttachment(index: number) {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  }

  // Ingest knowledge file for RAG project
  async function handleProjectFileAdd(e: React.ChangeEvent<HTMLInputElement>) {
    if (!activeProjectId || !e.target.files) return;
    const files = Array.from(e.target.files);
    for (const f of files) {
      try {
        const textData = await readTextOrFile(f);
        await ingestProjectFile(activeProjectId, f.name, textData.content, embeddingModel);
      } catch (err) {
        console.error('Project file ingestion failed:', err);
      }
    }
    const updatedFiles = await loadProjectFiles(activeProjectId);
    setProjectFilesList(updatedFiles);
  }

  // Create Project
  async function handleCreateProject() {
    if (!newProjectName.trim()) return;
    const newProj: Project = {
      id: 'proj_' + Date.now(),
      name: newProjectName.trim(),
      system_prompt: newProjectPrompt.trim(),
      created_at: Date.now(),
    };
    await saveProject(newProj);
    setProjects((prev) => [newProj, ...prev]);
    setActiveProjectId(newProj.id);
    setNewProjectName('');
    setNewProjectPrompt('');
  }

  // Save memory updates
  async function handleSaveMemory() {
    await saveUserMemory(userMemoryText);
    setShowMemoryModal(false);
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
    if ((!input.trim() && attachments.length === 0) || isStreaming) return;

    let currentConvId = activeConvId;
    let activeConv = conversations.find((c) => c.id === currentConvId);

    // Auto-create chat if none active
    if (!currentConvId || !activeConv) {
      const newConv: Conversation = {
        id: 'conv_' + Date.now(),
        title: input.slice(0, 30) || 'Attachment Upload',
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
    }

    // Embed attachments or custom RAG knowledge if Project is active
    let augmentedInput = input;
    if (activeProjectId) {
      const relevantChunks = await queryRelevantChunks(activeProjectId, input, embeddingModel);
      if (relevantChunks.length > 0) {
        augmentedInput += `\n\n[Injected context from Project files]:\n` + relevantChunks.join('\n\n');
      }
    }

    // Embed file attachments contents
    if (attachments.length > 0) {
      augmentedInput += `\n\n[Attached Files]:\n` + attachments.map((a) => `File: ${a.name}\nContent:\n${a.content}`).join('\n\n');
    }

    const userMsg: ChatMessage = {
      id: 'msg_' + Date.now(),
      conversation_id: currentConvId,
      role: 'user',
      content: input + (attachments.length > 0 ? ` (${attachments.length} attachment(s))` : ''),
      timestamp: Date.now(),
    };

    await saveMessage(userMsg);
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setAttachments([]);
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
    
    // Inject memory and project prompts
    let systemPromptContent = activePreset.system_prompt;
    if (userMemoryText.trim()) {
      systemPromptContent += `\n[User Memory]:\n${userMemoryText}`;
    }
    if (activeProjectId) {
      const activeProjObj = projects.find((p) => p.id === activeProjectId);
      if (activeProjObj?.system_prompt) {
        systemPromptContent += `\n[Project Prompt]:\n${activeProjObj.system_prompt}`;
      }
    }

    historyForOllama.push({ role: 'system', content: systemPromptContent });
    messages.forEach((m) => historyForOllama.push({ role: m.role, content: m.content }));
    historyForOllama.push({ role: 'user', content: augmentedInput });

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
      {/* Health Status Banner */}
      {isConnected === false && (
        <div className="absolute top-0 left-0 right-0 z-50 bg-amber-600/90 backdrop-blur-md px-4 py-2 text-white flex items-center justify-between text-sm border-b border-amber-500">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-200" />
            <span>Ollama server offline. Run <code className="bg-black/30 px-1.5 py-0.5 rounded font-mono">ollama serve</code> in your shell.</span>
          </div>
          <button onClick={checkOllamaHealth} className="flex items-center gap-1 bg-white/20 hover:bg-white/30 px-3 py-1 rounded transition text-xs font-semibold">
            <RefreshCw className="w-3 h-3 animate-spin" /> Retry Connection
          </button>
        </div>
      )}

      {/* Left Sidebar */}
      <aside className="w-64 bg-zinc-950 border-r border-zinc-800 flex flex-col justify-between p-3 shrink-0">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between px-2 pt-1">
            <div className="flex items-center gap-2 font-bold text-lg tracking-tight">
              <Sparkles className="w-5 h-5 text-amber-500" />
              <span>Laude</span>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setShowMemoryModal(true)} className="p-1 rounded hover:bg-zinc-850 text-zinc-400" title="User Memory">
                <BookOpen className="w-4 h-4" />
              </button>
              <button onClick={() => setShowProjectsModal(true)} className="p-1 rounded hover:bg-zinc-850 text-zinc-400" title="Projects (Local RAG)">
                <FolderOpen className="w-4 h-4" />
              </button>
              <button onClick={() => setShowSettings(!showSettings)} className="p-1.5 rounded hover:bg-zinc-800 text-zinc-400" title="Settings">
                <Settings className="w-4 h-4" />
              </button>
            </div>
          </div>

          <button onClick={handleCreateNewChat} className="flex items-center justify-center gap-2 w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-100 py-2 px-3 rounded-lg border border-zinc-700/50 transition font-medium text-sm">
            <Plus className="w-4 h-4" /> New Chat
          </button>

          {/* Projects Switcher */}
          {projects.length > 0 && (
            <div className="px-2 py-1.5 bg-zinc-900/40 rounded-lg border border-zinc-850 flex flex-col gap-1.5">
              <span className="text-[10px] font-semibold text-zinc-500 uppercase">Active Project</span>
              <select
                value={activeProjectId || ''}
                onChange={(e) => setActiveProjectId(e.target.value || null)}
                className="bg-zinc-950 border border-zinc-800 text-xs rounded p-1 text-zinc-300 w-full focus:outline-none"
              >
                <option value="">None (General Chat)</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Conversations List */}
          <div className="flex flex-col gap-1 mt-2 overflow-y-auto max-h-[calc(100vh-280px)]">
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
                  <button onClick={(e) => handleTogglePin(conv, e)} className={`p-1 hover:text-amber-400 transition ${conv.pinned ? 'text-amber-500 opacity-100' : ''}`}>
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

        {/* Connection status */}
        <div className="border-t border-zinc-850 pt-3 px-2 flex items-center justify-between text-xs text-zinc-400">
          <div className="flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-rose-500'}`} />
            <span>{isConnected ? `Ollama v${ollamaVersion}` : 'Offline'}</span>
          </div>
        </div>
      </aside>

      {/* Main chat interface */}
      <main className="flex-1 flex flex-col justify-between bg-zinc-900 relative min-w-0">
        <header className="h-14 border-b border-zinc-850 px-6 flex items-center justify-between bg-zinc-900/50 backdrop-blur">
          <div className="flex items-center gap-3">
            <Cpu className="w-4 h-4 text-zinc-400" />
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="bg-zinc-800 border border-zinc-700 text-zinc-200 text-sm rounded-md px-3 py-1.5 outline-none"
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
        </header>

        {/* Message Thread */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-zinc-500 gap-3">
              <Bot className="w-12 h-12 text-zinc-700" />
              <h2 className="text-lg font-medium text-zinc-300">How can Laude help you today?</h2>
              {activeProjectId && (
                <div className="text-xs bg-amber-500/10 border border-amber-500/20 text-amber-400 px-3 py-1.5 rounded-lg max-w-sm">
                  Active Project: <strong className="underline">{projects.find(p => p.id === activeProjectId)?.name}</strong>. Knowledge base files will be queried automatically.
                </div>
              )}
            </div>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className={`flex gap-4 max-w-3xl mx-auto ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-full bg-amber-600/20 border border-amber-500/30 flex items-center justify-center shrink-0">
                    <Bot className="w-4 h-4 text-amber-400" />
                  </div>
                )}
                <div className={`p-4 rounded-xl text-sm leading-relaxed max-w-2xl whitespace-pre-wrap ${
                  msg.role === 'user' ? 'bg-zinc-800 text-zinc-100 rounded-tr-none' : 'bg-zinc-950/80 text-zinc-200 rounded-tl-none border border-zinc-850'
                }`}>
                  {msg.role === 'assistant' ? (
                    <MarkdownRenderer 
                      content={msg.content} 
                      onCodeBlockClick={(lang, code) => setSelectedArtifact({ language: lang, code })} 
                    />
                  ) : (
                    <span>{msg.content}</span>
                  )}
                </div>
                {msg.role === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center shrink-0">
                    <User className="w-4 h-4 text-zinc-400" />
                  </div>
                )}
              </div>
            ))
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Input box */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-900/80 backdrop-blur">
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 max-w-3xl mx-auto mb-3">
              {attachments.map((a, idx) => (
                <div key={idx} className="flex items-center gap-1.5 bg-zinc-800/80 border border-zinc-700 px-3 py-1 rounded-full text-xs text-zinc-300">
                  <span className="truncate max-w-[150px]">{a.name}</span>
                  <button onClick={() => removeAttachment(idx)} className="text-zinc-400 hover:text-white font-bold">×</button>
                </div>
              ))}
            </div>
          )}

          <div className="max-w-3xl mx-auto flex items-center gap-2 bg-zinc-950 border border-zinc-850 rounded-xl p-2 focus-within:border-amber-500/40">
            <button onClick={() => fileInputRef.current?.click()} className="p-2 text-zinc-500 hover:text-zinc-300 transition" title="Add File / Image Attachment">
              <Paperclip className="w-5 h-5" />
            </button>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} multiple className="hidden" />

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
              placeholder="Send message or upload code files..."
              className="flex-1 bg-transparent border-none text-zinc-100 text-sm px-2 focus:outline-none resize-none max-h-32 min-h-[40px] py-2"
            />

            {isStreaming ? (
              <button onClick={handleStopStream} className="p-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg transition">
                <div className="w-4 h-4 bg-white rounded-xs" />
              </button>
            ) : (
              <button onClick={handleSendMessage} disabled={!input.trim() && attachments.length === 0} className="p-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white rounded-lg transition">
                <Send className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </main>

      {/* Side-by-side Artifacts panel */}
      {selectedArtifact && (
        <ArtifactsPanel
          language={selectedArtifact.language}
          code={selectedArtifact.code}
          onClose={() => setSelectedArtifact(null)}
        />
      )}

      {/* Memory Modal */}
      {showMemoryModal && (
        <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-6 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-md p-6 flex flex-col gap-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-amber-500" /> Persistent Memory
              </h3>
              <button onClick={() => setShowMemoryModal(false)} className="text-zinc-400 hover:text-white text-xl">×</button>
            </div>
            <p className="text-xs text-zinc-400">Add details or context rules here. Laude automatically injects these into local LLM system prompts.</p>
            <textarea
              value={userMemoryText}
              onChange={(e) => setUserMemoryText(e.target.value)}
              rows={6}
              placeholder="e.g. I prefer writing code in TypeScript, I work mostly on React frontend apps..."
              className="bg-zinc-950 border border-zinc-850 rounded-lg p-3 text-sm focus:border-amber-500 outline-none resize-none text-zinc-200"
            />
            <button onClick={handleSaveMemory} className="bg-amber-600 hover:bg-amber-500 py-2 rounded-lg text-sm font-semibold transition flex items-center justify-center gap-2">
              <Save className="w-4 h-4" /> Save Memory
            </button>
          </div>
        </div>
      )}

      {/* Projects / Local RAG Modal */}
      {showProjectsModal && (
        <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-6 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-850 rounded-xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <FolderOpen className="w-5 h-5 text-amber-500" /> Projects & Local Knowledge Base
              </h3>
              <button onClick={() => setShowProjectsModal(false)} className="text-zinc-400 hover:text-white text-xl">×</button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {/* Create new project */}
              <div className="bg-zinc-950 p-4 rounded-lg border border-zinc-850 space-y-3">
                <h4 className="text-sm font-semibold text-zinc-300">Create New Project</h4>
                <div className="space-y-2">
                  <input
                    type="text"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    placeholder="Project Name"
                    className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-1.5 text-sm outline-none focus:border-amber-500"
                  />
                  <textarea
                    value={newProjectPrompt}
                    onChange={(e) => setNewProjectPrompt(e.target.value)}
                    placeholder="Project Custom System Prompt (rules, instructions...)"
                    rows={2}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-1.5 text-sm outline-none focus:border-amber-500 resize-none"
                  />
                  <button onClick={handleCreateProject} className="bg-zinc-800 hover:bg-zinc-700 px-4 py-1.5 rounded text-xs font-semibold transition">
                    Create Project
                  </button>
                </div>
              </div>

              {/* List of projects & files */}
              {projects.length > 0 && (
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-zinc-300">Manage Project Knowledge</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-1 border border-zinc-800 rounded-lg p-2 flex flex-col gap-1 max-h-48 overflow-y-auto bg-zinc-950">
                      {projects.map((p) => (
                        <div
                          key={p.id}
                          onClick={() => setActiveProjectId(p.id)}
                          className={`p-2 rounded text-xs cursor-pointer transition truncate ${
                            activeProjectId === p.id ? 'bg-amber-600/20 text-amber-400 font-semibold' : 'text-zinc-400 hover:bg-zinc-900'
                          }`}
                        >
                          {p.name}
                        </div>
                      ))}
                    </div>

                    <div className="col-span-2 border border-zinc-800 rounded-lg p-3 flex flex-col justify-between max-h-48 bg-zinc-950">
                      {activeProjectId ? (
                        <>
                          <div className="space-y-2 overflow-y-auto flex-1 mb-2">
                            <span className="text-[10px] text-zinc-500 uppercase font-semibold">Knowledge Files</span>
                            {projectFilesList.length === 0 ? (
                              <div className="text-xs text-zinc-600">No knowledge files uploaded.</div>
                            ) : (
                              projectFilesList.map((pf) => (
                                <div key={pf.id} className="text-xs text-zinc-300 flex items-center justify-between border-b border-zinc-900 py-1">
                                  <span className="truncate">{pf.name}</span>
                                  <span className="text-[10px] text-zinc-500">{(pf.size / 1024).toFixed(1)} KB</span>
                                </div>
                              ))
                            )}
                          </div>
                          <div>
                            <button onClick={() => projectFileInputRef.current?.click()} className="bg-amber-600 hover:bg-amber-500 text-white px-3 py-1.5 rounded text-xs font-semibold transition">
                              Add Knowledge File
                            </button>
                            <input type="file" ref={projectFileInputRef} onChange={handleProjectFileAdd} className="hidden" />
                          </div>
                        </>
                      ) : (
                        <div className="text-xs text-zinc-500 h-full flex items-center justify-center">Select a project on the left to manage files.</div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-6 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <Sliders className="w-5 h-5 text-amber-500" /> Settings & Model Management
              </h3>
              <button onClick={() => setShowSettings(false)} className="text-zinc-400 hover:text-white text-xl">×</button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Ollama Server Base URL</label>
                <input
                  type="text"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-850 rounded-lg px-3 py-2 text-sm focus:border-amber-500 outline-none text-zinc-200"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Embedding Model (For Projects/RAG)</label>
                <input
                  type="text"
                  value={embeddingModel}
                  onChange={(e) => setEmbeddingModel(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-850 rounded-lg px-3 py-2 text-sm focus:border-amber-500 outline-none text-zinc-200"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Pull New Model</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={pullModelInput}
                    onChange={(e) => setPullModelInput(e.target.value)}
                    placeholder="e.g. nomic-embed-text, qwen2.5:14b..."
                    className="flex-1 bg-zinc-950 border border-zinc-850 rounded-lg px-3 py-2 text-sm focus:border-amber-500 outline-none text-zinc-200"
                  />
                  <button onClick={handlePullModel} className="bg-amber-600 hover:bg-amber-500 px-4 py-2 rounded-lg text-sm font-medium transition">Pull</button>
                </div>
                {pullProgress && (
                  <div className="text-xs text-amber-400 mt-1">
                    {pullProgress.status} {pullProgress.percent !== undefined ? `(${pullProgress.percent}%)` : ''}
                  </div>
                )}
              </div>

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
                      <button onClick={() => handleDeleteModel(m.name)} className="text-rose-400 hover:bg-rose-950/50 p-1.5 rounded transition">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

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
                      className="w-full bg-zinc-950 border border-zinc-850 rounded px-2 py-1 text-sm text-zinc-200"
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
