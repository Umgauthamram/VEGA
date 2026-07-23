'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Sidebar } from '../components/Sidebar';
import { ChatView } from '../components/ChatView';
import { Composer } from '../components/Composer';
import { RightPanel } from '../components/RightPanel';
import { SettingsModal } from '../components/SettingsModal';
import { SubViews } from '../components/SubViews';
import { ArtifactsPanel } from './ArtifactsPanel';

import { ollamaClient } from './ollama';
import { 
  loadConversations, saveConversation, deleteConversation, loadMessages, saveMessage, 
  loadPresets, savePreset, loadProjects, saveProject, deleteProject, loadProjectFiles, 
  saveUserMemory, loadUserMemory 
} from './storage';
import { OllamaModel, Conversation, ChatMessage, ModelPreset, RunningModel, Project, ProjectFile, Attachment } from './types';
import { readTextOrFile } from './attachments';
import { ingestProjectFile, queryRelevantChunks } from './rag';
import { BUILTIN_TOOLS, executeToolLocally } from './agent';
import { getMcpServers, saveMcpServer, deleteMcpServer, connectMcpServer, executeMcpTool, getLoadedMcpTools, McpServerConfig } from './mcp';
import { getSchedules, saveSchedule, deleteSchedule, triggerNotification, SavedSchedule, initScheduler } from './scheduler';
import { ConfirmDialog, registerConfirmTrigger, triggerConfirmDialog } from '../components/ConfirmDialog';

export default function Home() {
  // Navigation states
  const [activeTab, setActiveTab] = useState<'home' | 'code'>('home');
  const [mainView, setMainView] = useState<'chat' | 'projects' | 'artifacts' | 'schedules'>('chat');

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
  const [newProjectName, setNewProjectName] = useState<string>('');
  const [newProjectPrompt, setNewProjectPrompt] = useState<string>('');
  const [projectFilesList, setProjectFilesList] = useState<ProjectFile[]>([]);
  const projectFileInputRef = useRef<HTMLInputElement>(null);

  // Memory
  const [userMemoryText, setUserMemoryText] = useState<string>('');
  const [userFirstName, setUserFirstName] = useState<string>('VEGA');
  const [userLastName, setUserLastName] = useState<string>('user');

  // Agent Mode config
  const [agentMode, setAgentMode] = useState<boolean>(false);
  const [agentLogs, setAgentLogs] = useState<{ step: string; type: 'call' | 'response' | 'error'; timestamp: number }[]>([]);
  const [showLogsPanel, setShowLogsPanel] = useState<boolean>(false);
  const [workspaceDir, setWorkspaceDir] = useState<string>('G:\\projects\\laude\\workspace');
  const [safetyLevel, setSafetyLevel] = useState<'yolo' | 'ask_dangerous' | 'ask_always'>('ask_dangerous');
  const [pendingApproval, setPendingApproval] = useState<{ toolCallId: string; name: string; args: any; onApprove: () => void; onReject: () => void } | null>(null);

  // MCP Servers configurations
  const [mcpServers, setMcpServers] = useState<McpServerConfig[]>([]);
  const [newMcpName, setNewMcpName] = useState<string>('');
  const [newMcpCommand, setNewMcpCommand] = useState<string>('');
  const [newMcpArgs, setNewMcpArgs] = useState<string>('');

  // Schedules state
  const [schedulesList, setSchedulesList] = useState<SavedSchedule[]>([]);
  const [newSchedName, setNewSchedName] = useState<string>('');
  const [newSchedCron, setNewSchedCron] = useState<string>('');
  const [newSchedPrompt, setNewSchedPrompt] = useState<string>('');
  const [newSchedMode, setNewSchedMode] = useState<'chat' | 'agent'>('chat');

  // ConfirmDialog configuration state
  const [confirmDialogConfig, setConfirmDialogConfig] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    monospaceDetail?: string;
    checkboxLabel?: string;
    checkboxChecked?: boolean;
    confirmText?: string;
    cancelText?: string;
    isDestructive?: boolean;
    iconType?: 'danger' | 'warning' | 'info' | 'shield';
    hideCancel?: boolean;
    resolve?: (val: { ok: boolean; checked: boolean }) => void;
  }>({
    isOpen: false,
    title: '',
    description: ''
  });

  useEffect(() => {
    registerConfirmTrigger((options) => {
      return new Promise<{ ok: boolean; checked: boolean }>((resolve) => {
        setConfirmDialogConfig({
          isOpen: true,
          title: options.title,
          description: options.description,
          monospaceDetail: options.monospaceDetail,
          checkboxLabel: options.checkboxLabel,
          checkboxChecked: false,
          confirmText: options.confirmText,
          cancelText: options.cancelText,
          isDestructive: options.isDestructive,
          iconType: options.iconType,
          hideCancel: options.hideCancel,
          resolve
        });
      });
    });
  }, []);

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

  // Providers list state variables
  const [providersList, setProvidersList] = useState<any[]>([]);
  const [activeProviderName, setActiveProviderName] = useState<string>('');
  const [newProvName, setNewProvName] = useState<string>('');
  const [newProvBaseUrl, setNewProvBaseUrl] = useState<string>('');
  const [newProvApiKey, setNewProvApiKey] = useState<string>('');
  const [newProvType, setNewProvType] = useState<'ollama' | 'openai-compatible'>('ollama');
  const [showApiKey, setShowApiKey] = useState<boolean>(false);
  const [showBrowserWarning, setShowBrowserWarning] = useState<boolean>(false);

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
      
      // Load MCP Servers and init Schedules list via croner engine
      setMcpServers(getMcpServers());
      await initScheduler((newConv, msgs) => {
        setConversations(prev => [newConv, ...prev]);
        setSchedulesList([...getSchedules()]);
        if (activeConvId === null) {
          setActiveConvId(newConv.id);
        }
      });
      setSchedulesList(getSchedules());

      // Load LLM Providers
      const { loadProviders, saveProviders } = await import('./storage');
      let providers = await loadProviders();
      if (providers.length === 0) {
        providers = [
          { name: 'Ollama (Local)', baseUrl: 'http://localhost:11434', type: 'ollama' },
          { name: 'OpenRouter', baseUrl: 'https://openrouter.ai/api', type: 'openai-compatible', apiKey: '' },
          { name: 'Groq', baseUrl: 'https://api.groq.com/openai', type: 'openai-compatible', apiKey: '' },
          { name: 'LM Studio', baseUrl: 'http://localhost:1234', type: 'openai-compatible', apiKey: '' }
        ];
        await saveProviders(providers);
      }
      setProvidersList(providers);
      const activeP = providers[0];
      setActiveProviderName(activeP.name);
      ollamaClient.setProvider(activeP);
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
    if (list.length > 0) {
      if (!list.some(m => m.name === selectedModel)) {
        setSelectedModel(list[0].name);
      }
    } else {
      setSelectedModel('');
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
    const confirmRes = await triggerConfirmDialog({
      title: 'Delete Chat',
      description: 'Are you sure you want to delete this chat conversation? This operation cannot be undone.',
      confirmText: 'Delete',
      isDestructive: true,
      iconType: 'danger'
    });
    if (confirmRes.ok) {
      await deleteConversation(id);
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (activeConvId === id) {
        setActiveConvId(null);
      }
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

  async function handleRenameChat(id: string, newTitle: string) {
    const conv = conversations.find(c => c.id === id);
    if (conv) {
      const updated = { ...conv, title: newTitle, updated_at: Date.now() };
      await saveConversation(updated);
      setConversations((prev) => prev.map((c) => (c.id === id ? updated : c)));
    }
  }

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

  function removeAttachment(index: number) {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleProjectFileAdd(e: React.ChangeEvent<HTMLInputElement>) {
    if (!activeProjectId || !e.target.files) return;
    const files = Array.from(e.target.files);
    for (const f of files) {
      try {
        const textData = await readTextOrFile(f);
        await ingestProjectFile(activeProjectId, f.name, textData.content, embeddingModel);
        const list = await loadProjectFiles(activeProjectId);
        setProjectFilesList(list);
      } catch (err) {
        console.error('Failed to ingest file into project index:', err);
      }
    }
  }

  async function handleCreateProject() {
    if (!newProjectName.trim()) return;
    const project: Project = {
      id: 'proj_' + Date.now(),
      name: newProjectName.trim(),
      system_prompt: newProjectPrompt.trim(),
      created_at: Date.now(),
    };
    await saveProject(project);
    setProjects((prev) => [...prev, project]);
    setNewProjectName('');
    setNewProjectPrompt('');
    setActiveProjectId(project.id);
  }

  async function handleDeleteProject(id: string) {
    const confirmRes = await triggerConfirmDialog({
      title: 'Delete Project',
      description: 'Are you sure you want to delete this project? All associated indexes will be discarded.',
      confirmText: 'Delete',
      isDestructive: true,
      iconType: 'danger'
    });
    if (confirmRes.ok) {
      await deleteProject(id);
      setProjects((prev) => prev.filter((p) => p.id !== id));
      if (activeProjectId === id) {
        setActiveProjectId(null);
      }
    }
  }

  async function handleSaveMemory() {
    await saveUserMemory(userMemoryText);
    await triggerConfirmDialog({
      title: 'Memory Saved',
      description: 'User Memory instructions have been updated successfully.',
      confirmText: 'Close',
      iconType: 'info',
      hideCancel: true
    });
  }

  // LLM Providers Handlers
  async function handleAddProvider() {
    if (!newProvName.trim() || !newProvBaseUrl.trim()) return;
    const newProv = {
      name: newProvName.trim(),
      baseUrl: newProvBaseUrl.trim(),
      apiKey: newProvApiKey.trim(),
      type: newProvType
    };
    const updated = [...providersList, newProv];
    setProvidersList(updated);
    const { saveProviders } = await import('./storage');
    await saveProviders(updated);
    setNewProvName('');
    setNewProvBaseUrl('');
    setNewProvApiKey('');
  }

  async function handleDeleteProvider(name: string) {
    const updated = providersList.filter(p => p.name !== name);
    setProvidersList(updated);
    const { saveProviders } = await import('./storage');
    await saveProviders(updated);
    if (activeProviderName === name && updated.length > 0) {
      handleSelectProvider(updated[0]);
    }
  }

  async function handleSelectProvider(p: any) {
    setActiveProviderName(p.name);
    ollamaClient.setProvider(p);
    setBaseUrl(p.baseUrl);
    await checkOllamaHealth();
  }

  function handleBackupExport() {
    const backupData = {
      conversations,
      presets,
      projects,
      mcpServers,
      userMemory: userMemoryText
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vega_backup_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleBackupImport(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.conversations) setConversations(data.conversations);
        if (data.presets) setPresets(data.presets);
        if (data.projects) setProjects(data.projects);
        if (data.mcpServers) setMcpServers(data.mcpServers);
        if (data.userMemory) setUserMemoryText(data.userMemory);
        await triggerConfirmDialog({
          title: 'Import Success',
          description: 'Backup payload has been fully applied to your active database.',
          confirmText: 'Close',
          iconType: 'info',
          hideCancel: true
        });
      } catch (err) {
        await triggerConfirmDialog({
          title: 'Import Failure',
          description: 'Invalid backup file structure. Parse aborted.',
          confirmText: 'Close',
          iconType: 'danger',
          hideCancel: true
        });
      }
    };
    reader.readAsText(file);
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
    const confirmRes = await triggerConfirmDialog({
      title: 'Delete Model',
      description: `Are you sure you want to delete local model ${modelName}? This will clear disk space.`,
      confirmText: 'Delete',
      isDestructive: true,
      iconType: 'danger'
    });
    if (confirmRes.ok) {
      await ollamaClient.deleteModel(modelName);
      await refreshModels();
    }
  }

  function getEstimatedContextUsage() {
    const totalChars = messages.reduce((sum, m) => sum + m.content.length, 0) + input.length;
    const estTokens = Math.ceil(totalChars / 4);
    return {
      tokens: estTokens,
      pct: Math.min(100, Math.round((estTokens / activePreset.num_ctx) * 100))
    };
  }

  // Parameter presets configuration temporary state
  const [tempPreset, setTempPreset] = useState<ModelPreset>({
    id: 'default',
    name: 'Default Balanced',
    temperature: 0.7,
    top_p: 0.9,
    top_k: 40,
    num_ctx: 4096,
    repeat_penalty: 1.1,
    system_prompt: 'You are a helpful precise assistant.',
  });

  async function handleSaveCustomPreset(name: string) {
    const newPreset: ModelPreset = {
      ...tempPreset,
      id: 'preset_' + Date.now(),
      name
    };
    await savePreset(newPreset);
    setPresets((prev) => [...prev, newPreset]);
    setActivePreset(newPreset);
  }

  async function handlePickWorkspace() {
    const isTauri = typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__ !== undefined;
    if (isTauri) {
      try {
        const { open } = await import('@tauri-apps/plugin-dialog');
        const selected = await open({
          directory: true,
          multiple: false
        });
        if (selected && typeof selected === 'string') {
          setWorkspaceDir(selected);
        }
      } catch (e) {
        console.warn('Tauri open folder dialog failed:', e);
      }
    } else {
      const path = prompt('Enter sandbox folder path manually:', workspaceDir);
      if (path) setWorkspaceDir(path);
    }
  }

  function handlePullModelDialog() {
    setShowSettings(true);
  }

  // Schedule task handlers
  function handleAddSchedule() {
    if (!newSchedName.trim() || !newSchedPrompt.trim()) return;
    const sched: SavedSchedule = {
      id: 'sched_' + Date.now(),
      name: newSchedName.trim(),
      cronExpression: newSchedCron.trim() || 'daily',
      prompt: newSchedPrompt.trim(),
      model: selectedModel || 'qwen2.5:14b',
      mode: newSchedMode,
      enabled: true,
    };
    saveSchedule(sched);
    setSchedulesList([...getSchedules()]);
    setNewSchedName('');
    setNewSchedCron('');
    setNewSchedPrompt('');
  }

  async function handleDeleteSchedule(id: string) {
    const confirmRes = await triggerConfirmDialog({
      title: 'Delete Schedule',
      description: 'Are you sure you want to delete this automation schedule? Next executions will be cancelled.',
      confirmText: 'Delete',
      isDestructive: true,
      iconType: 'danger'
    });
    if (confirmRes.ok) {
      deleteSchedule(id);
      setSchedulesList([...getSchedules()]);
    }
  }

  // Build database-driven list of real artifacts from conversation message strings
  const getRealArtifacts = () => {
    const list: { id: string; title: string; language: string; code: string; timestamp: number }[] = [];
    messages.forEach((msg) => {
      // Find code blocks inside message content
      const matches = msg.content.matchAll(/```(\w+)\s+title="([^"]+)"\s*\n([\s\S]*?)\n```/g);
      for (const m of matches) {
        list.push({
          id: msg.id + '_' + m[2],
          title: m[2],
          language: m[1],
          code: m[3],
          timestamp: msg.timestamp
        });
      }
    });
    return list;
  };

  async function handleToggleScheduleEnabled(id: string, enabled: boolean) {
    const sched = schedulesList.find(s => s.id === id);
    if (sched) {
      sched.enabled = enabled;
      await saveSchedule(sched, (newConv, msgs) => {
        setConversations(prev => [newConv, ...prev]);
        setSchedulesList([...getSchedules()]);
      });
      setSchedulesList([...getSchedules()]);
    }
  }

  async function handleRunScheduleNow(sched: SavedSchedule) {
    const { executeScheduleTask } = await import('./scheduler');
    await executeScheduleTask(sched, (newConv, msgs) => {
      setConversations(prev => [newConv, ...prev]);
      setSchedulesList([...getSchedules()]);
      setActiveConvId(newConv.id);
      setMainView('chat');
    });
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
    messages.forEach((m) => {
      historyForOllama.push({ role: m.role, content: m.content });
    });
    historyForOllama.push({ role: 'user', content: augmentedInput });

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    if (!agentMode) {
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
          const errMsgContent = accumulatedText + `\n\n*(Error: ${e.message || 'Stream interrupted'})*`;
          const errorMsg: ChatMessage = {
            id: assistantMsgId,
            conversation_id: currentConvId,
            role: 'assistant',
            content: errMsgContent,
            timestamp: Date.now(),
            model_used: selectedModel,
          };
          await saveMessage(errorMsg);
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantMsgId ? { ...m, content: errMsgContent } : m))
          );
        }
      } finally {
        setIsStreaming(false);
        abortControllerRef.current = null;
      }
    } else {
      // Agentic tool calling loop
      try {
        setAgentLogs([]);
        setShowLogsPanel(true);
        let currentMessages = [...historyForOllama];
        let iteration = 0;
        const maxIterations = 15;
        let finalResponseText = '';

        const modelInfo = await ollamaClient.showModelInfo(selectedModel || activeConv.model);
        const caps: string[] = modelInfo?.capabilities || [];
        const supportsTools = caps.includes('tools');

        if (!supportsTools) {
          setAgentLogs((prev) => [
            ...prev,
            { step: `Selected model does not support native tools. Falling back to ReAct JSON instructions scaffold.`, type: 'call', timestamp: Date.now() }
          ]);
          const reactScaffoldPrompt = `
You are running in ReAct fallback mode. You have access to the following tools:
${JSON.stringify(BUILTIN_TOOLS, null, 2)}

To call a tool, you MUST reply with a JSON object inside a markdown code block starting with \`\`\`json containing 'tool' and 'arguments' keys.
Example:
\`\`\`json
{
  "tool": "read_file",
  "arguments": {
    "path": "package.json"
  }
}
\`\`\`
If you have completed your task, reply normally without any JSON block.
`;
          currentMessages.push({ role: 'system', content: reactScaffoldPrompt });
        }

        const dynamicTools = [
          ...BUILTIN_TOOLS,
          ...getLoadedMcpTools().map((t) => ({
            name: t.name,
            description: t.description,
            parameters: t.inputSchema,
          }))
        ];

        while (iteration < maxIterations) {
          iteration++;
          setAgentLogs((prev) => [...prev, { step: `Starting agent loop iteration ${iteration}`, type: 'call', timestamp: Date.now() }]);

          const response = await ollamaClient.streamChat(
            selectedModel || activeConv.model,
            currentMessages,
            activePreset,
            keepAlive,
            undefined,
            abortController.signal,
            supportsTools ? dynamicTools : undefined
          );

          if (response.content) {
            finalResponseText += response.content + '\n';
            setMessages((prev) =>
              prev.map((m) => (m.id === assistantMsgId ? { ...m, content: finalResponseText } : m))
            );
          }

          let toolCallToRun: any = null;
          if (supportsTools && response.tool_calls && response.tool_calls.length > 0) {
            toolCallToRun = response.tool_calls[0];
          } else if (!supportsTools && response.content) {
            const match = response.content.match(/```json\s*([\s\S]*?)\s*```/);
            if (match) {
              try {
                const parsed = JSON.parse(match[1]);
                if (parsed.tool && parsed.arguments) {
                  toolCallToRun = {
                    id: 'tc_' + Date.now(),
                    function: {
                      name: parsed.tool,
                      arguments: parsed.arguments
                    }
                  };
                }
              } catch (err: any) {
                setAgentLogs((prev) => [
                  ...prev,
                  { step: `Failed to parse ReAct JSON tool output: ${err.message}`, type: 'error', timestamp: Date.now() }
                ]);
              }
            }
          }

          if (toolCallToRun) {
            const { name, arguments: args } = toolCallToRun.function || toolCallToRun;

            setAgentLogs((prev) => [
              ...prev,
              { step: `Model requested tool: ${name} with arguments: ${JSON.stringify(args)}`, type: 'call', timestamp: Date.now() }
            ]);

            const isMcp = getLoadedMcpTools().some((t) => t.name === name);
            let toolOutput = '';

            const needsApproval = safetyLevel === 'ask_always' || (safetyLevel === 'ask_dangerous' && ['write_file', 'run_shell'].includes(name));

            if (needsApproval) {
              toolOutput = await new Promise<string>((resolve) => {
                setPendingApproval({
                  toolCallId: toolCallToRun.id || 'tc_' + Date.now(),
                  name,
                  args,
                  onApprove: async () => {
                    setPendingApproval(null);
                    const res = isMcp ? await executeMcpTool(name, args) : await executeToolLocally(name, args, workspaceDir, safetyLevel);
                    resolve(res);
                  },
                  onReject: () => {
                    setPendingApproval(null);
                    resolve(`User rejected execution for tool ${name}.`);
                  }
                });
              });
            } else {
              toolOutput = isMcp ? await executeMcpTool(name, args) : await executeToolLocally(name, args, workspaceDir, safetyLevel);
            }

            setAgentLogs((prev) => [
              ...prev,
              { step: `Tool response: ${toolOutput}`, type: 'response', timestamp: Date.now() }
            ]);

            if (supportsTools) {
              currentMessages.push({ role: 'assistant', content: response.content || '', tool_calls: response.tool_calls } as any);
              currentMessages.push({ role: 'tool', content: toolOutput, name } as any);
            } else {
              currentMessages.push({ role: 'assistant', content: response.content || '' });
              currentMessages.push({ role: 'user', content: `Tool execution response:\n${toolOutput}` });
            }
          } else {
            setAgentLogs((prev) => [...prev, { step: `Agent finished execution loop successfully.`, type: 'response', timestamp: Date.now() }]);
            break;
          }
        }
      } catch (e: any) {
        console.error('Agent loop failed:', e);
      } finally {
        setIsStreaming(false);
        abortControllerRef.current = null;
      }
    }
  }

  function handleStopStream() {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }

  const activeConv = conversations.find((c) => c.id === activeConvId);

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      {/* 1. Left Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        conversations={conversations}
        activeConvId={activeConvId}
        setActiveConvId={setActiveConvId}
        handleCreateNewChat={handleCreateNewChat}
        handleTogglePin={handleTogglePin}
        handleDeleteChat={handleDeleteChat}
        isConnected={isConnected}
        ollamaVersion={ollamaVersion}
        activeProviderName={activeProviderName}
        setShowSettings={setShowSettings}
        mainView={mainView}
        setMainView={setMainView}
        setAgentMode={setAgentMode}
        setShowLogsPanel={setShowLogsPanel}
        handleRenameChat={handleRenameChat}
        handleBackupExport={handleBackupExport}
        handleBackupImport={handleBackupImport}
        userFirstName={userFirstName}
        userLastName={userLastName}
      />

      {/* 2. Main content view controller */}
      <div className="flex-1 flex flex-col justify-between overflow-hidden relative">
        {mainView === 'chat' ? (
          <>
            <ChatView
              messages={messages}
              selectedModel={selectedModel}
              setSelectedModel={setSelectedModel}
              models={models}
              isConnected={isConnected}
              onCodeBlockClick={(lang, code) => setSelectedArtifact({ language: lang, code })}
              chatEndRef={chatEndRef}
              isStreaming={isStreaming}
              activeConvTitle={activeConv?.title || 'New Chat'}
              handleCreateNewChat={handleCreateNewChat}
            />

            <Composer
              input={input}
              setInput={setInput}
              selectedModel={selectedModel}
              setSelectedModel={setSelectedModel}
              models={models}
              activeProviderName={activeProviderName}
              presets={presets}
              activePreset={activePreset}
              setActivePreset={setActivePreset}
              agentMode={agentMode}
              setAgentMode={setAgentMode}
              attachments={attachments}
              removeAttachment={removeAttachment}
              fileInputRef={fileInputRef}
              handleFileChange={handleFileChange}
              handleSendMessage={handleSendMessage}
              isStreaming={isStreaming}
              handleStopStream={handleStopStream}
              contextUsage={getEstimatedContextUsage()}
              keepAlive={keepAlive}
              projects={projects}
              activeProjectId={activeProjectId}
              setActiveProjectId={setActiveProjectId}
              isConnected={isConnected}
              checkOllamaHealth={checkOllamaHealth}
              workspaceDir={workspaceDir}
              handlePickWorkspace={handlePickWorkspace}
              tempPreset={tempPreset}
              setTempPreset={setTempPreset}
              handleSaveCustomPreset={handleSaveCustomPreset}
              handlePullModelDialog={handlePullModelDialog}
            />
          </>
        ) : (
          <SubViews
            viewType={mainView as any}
            projects={projects}
            activeProjectId={activeProjectId}
            setActiveProjectId={setActiveProjectId}
            newProjectName={newProjectName}
            setNewProjectName={setNewProjectName}
            newProjectPrompt={newProjectPrompt}
            setNewProjectPrompt={setNewProjectPrompt}
            handleCreateProject={handleCreateProject}
            handleDeleteProject={handleDeleteProject}
            projectFilesList={projectFilesList}
            handleProjectFileAdd={handleProjectFileAdd}
            projectFileInputRef={projectFileInputRef}
            schedulesList={schedulesList}
            newSchedName={newSchedName}
            setNewSchedName={setNewSchedName}
            newSchedCron={newSchedCron}
            setNewSchedCron={setNewSchedCron}
            newSchedPrompt={newSchedPrompt}
            setNewSchedPrompt={setNewSchedPrompt}
            newSchedMode={newSchedMode}
            setNewSchedMode={setNewSchedMode}
            handleAddSchedule={handleAddSchedule}
            handleDeleteSchedule={handleDeleteSchedule}
            handleToggleScheduleEnabled={handleToggleScheduleEnabled}
            handleRunScheduleNow={handleRunScheduleNow}
            realArtifactsList={getRealArtifacts()}
            setSelectedArtifact={setSelectedArtifact}
          />
        )}
      </div>

      {/* 3. Right Collapsible logs panel */}
      <RightPanel
        agentLogs={agentLogs}
        showLogsPanel={showLogsPanel}
        setShowLogsPanel={setShowLogsPanel}
        attachments={attachments}
        projectFilesList={projectFilesList}
        mcpServers={mcpServers}
      />

      {/* 4. Settings modal container */}
      <SettingsModal
        showSettings={showSettings}
        setShowSettings={setShowSettings}
        providersList={providersList}
        activeProviderName={activeProviderName}
        newProvName={newProvName}
        setNewProvName={setNewProvName}
        newProvBaseUrl={newProvBaseUrl}
        setNewProvBaseUrl={setNewProvBaseUrl}
        newProvApiKey={newProvApiKey}
        setNewProvApiKey={setNewProvApiKey}
        newProvType={newProvType}
        setNewProvType={setNewProvType}
        showApiKey={showApiKey}
        setShowApiKey={setShowApiKey}
        handleAddProvider={handleAddProvider}
        handleDeleteProvider={handleDeleteProvider}
        handleSelectProvider={handleSelectProvider}
        baseUrl={baseUrl}
        setBaseUrl={setBaseUrl}
        keepAlive={keepAlive}
        setKeepAlive={setKeepAlive}
        embeddingModel={embeddingModel}
        setEmbeddingModel={setEmbeddingModel}
        pullModelInput={pullModelInput}
        setPullModelInput={setPullModelInput}
        pullProgress={pullProgress}
        handlePullModel={handlePullModel}
        models={models}
        handleDeleteModel={handleDeleteModel}
        runningModels={runningModels}
        workspaceDir={workspaceDir}
        setWorkspaceDir={setWorkspaceDir}
        safetyLevel={safetyLevel}
        setSafetyLevel={setSafetyLevel}
        userMemoryText={userMemoryText}
        setUserMemoryText={setUserMemoryText}
        handleSaveMemory={handleSaveMemory}
        presets={presets}
        activePreset={activePreset}
        setActivePreset={setActivePreset}
        handleBackupExport={handleBackupExport}
        handleBackupImport={handleBackupImport}
        userFirstName={userFirstName}
        setUserFirstName={setUserFirstName}
        userLastName={userLastName}
        setUserLastName={setUserLastName}
        conversationsCount={conversations.length}
        totalGeneratedTokens={1358}
        mcpServers={mcpServers}
        setMcpServers={setMcpServers}
        newMcpName={newMcpName}
        setNewMcpName={setNewMcpName}
        newMcpCommand={newMcpCommand}
        setNewMcpCommand={setNewMcpCommand}
        newMcpArgs={newMcpArgs}
        setNewMcpArgs={setNewMcpArgs}
      />

      {/* 5. Floating Artifact side preview iframe */}
      {selectedArtifact && (
        <ArtifactsPanel
          language={selectedArtifact.language}
          code={selectedArtifact.code}
          onClose={() => setSelectedArtifact(null)}
        />
      )}

      {/* Pending user dangerous action approval modal */}
      {pendingApproval && (
        <div className="fixed inset-0 bg-black/75 z-55 flex items-center justify-center p-6 backdrop-blur-xs text-foreground text-xs">
          <div className="bg-card-bg border border-border-color p-6 rounded-xl shadow-2xl max-w-sm space-y-4">
            <h3 className="font-bold text-sm text-accent uppercase">Approve Action Request</h3>
            <div>
              <strong>Tool:</strong> <code>{pendingApproval.name}</code>
            </div>
            <pre className="p-2 bg-sidebar border border-border-color rounded text-[10px] overflow-auto max-h-32 font-mono">
              {JSON.stringify(pendingApproval.args, null, 2)}
            </pre>
            <div className="flex gap-2 justify-end pt-2">
              <button onClick={pendingApproval.onReject} className="px-3 py-1.5 border border-border-color rounded hover:bg-sidebar transition">
                Deny
              </button>
              <button onClick={pendingApproval.onApprove} className="px-3 py-1.5 bg-accent hover:bg-accent-hover text-white rounded font-bold transition">
                Approve
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ConfirmDialog custom promise-based modal */}
      <ConfirmDialog
        isOpen={confirmDialogConfig.isOpen}
        title={confirmDialogConfig.title}
        description={confirmDialogConfig.description}
        monospaceDetail={confirmDialogConfig.monospaceDetail}
        checkboxLabel={confirmDialogConfig.checkboxLabel}
        checkboxChecked={confirmDialogConfig.checkboxChecked}
        onCheckboxChange={(checked) => setConfirmDialogConfig({ ...confirmDialogConfig, checkboxChecked: checked })}
        confirmText={confirmDialogConfig.confirmText}
        cancelText={confirmDialogConfig.cancelText}
        isDestructive={confirmDialogConfig.isDestructive}
        iconType={confirmDialogConfig.iconType}
        hideCancel={confirmDialogConfig.hideCancel}
        onConfirm={() => {
          if (confirmDialogConfig.resolve) {
            confirmDialogConfig.resolve({ ok: true, checked: !!confirmDialogConfig.checkboxChecked });
          }
          setConfirmDialogConfig({ ...confirmDialogConfig, isOpen: false });
        }}
        onCancel={() => {
          if (confirmDialogConfig.resolve) {
            confirmDialogConfig.resolve({ ok: false, checked: !!confirmDialogConfig.checkboxChecked });
          }
          setConfirmDialogConfig({ ...confirmDialogConfig, isOpen: false });
        }}
      />
    </div>
  );
}
