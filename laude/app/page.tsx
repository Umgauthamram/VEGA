'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Server, RefreshCw, Plus, MessageSquare, Trash2, Pin, Settings, 
  Send, Bot, User, Sparkles, Cpu, Sliders, ChevronDown, Download, 
  AlertTriangle, Check, Layers, Paperclip, X, Eye, FolderPlus, FolderOpen, Save, BookOpen,
  Activity, Play, AlertCircle, ToggleLeft, ToggleRight, Share2, Calendar, Clock, Database, BarChart2
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
import { BUILTIN_TOOLS, executeToolLocally } from './agent';
import { getMcpServers, saveMcpServer, deleteMcpServer, connectMcpServer, executeMcpTool, getLoadedMcpTools, McpServerConfig } from './mcp';
import { getSchedules, saveSchedule, deleteSchedule, triggerNotification, SavedSchedule } from './scheduler';

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

  // Agent Mode config
  const [agentMode, setAgentMode] = useState<boolean>(false);
  const [agentLogs, setAgentLogs] = useState<{ step: string; type: 'call' | 'response' | 'error'; timestamp: number }[]>([]);
  const [showLogsPanel, setShowLogsPanel] = useState<boolean>(false);
  const [workspaceDir, setWorkspaceDir] = useState<string>('G:\\projects\\laude\\workspace');
  const [safetyLevel, setSafetyLevel] = useState<'yolo' | 'ask_dangerous' | 'ask_always'>('ask_dangerous');
  const [pendingApproval, setPendingApproval] = useState<{ toolCallId: string; name: string; args: any; onApprove: () => void; onReject: () => void } | null>(null);

  // MCP Servers configurations
  const [mcpServers, setMcpServers] = useState<McpServerConfig[]>([]);
  const [showMcpModal, setShowMcpModal] = useState<boolean>(false);
  const [newMcpName, setNewMcpName] = useState<string>('');
  const [newMcpCommand, setNewMcpCommand] = useState<string>('');
  const [newMcpArgs, setNewMcpArgs] = useState<string>('');

  // Schedules state
  const [schedulesList, setSchedulesList] = useState<SavedSchedule[]>([]);
  const [showSchedulesModal, setShowSchedulesModal] = useState<boolean>(false);
  const [newSchedName, setNewSchedName] = useState<string>('');
  const [newSchedCron, setNewSchedCron] = useState<string>('');
  const [newSchedPrompt, setNewSchedPrompt] = useState<string>('');
  const [newSchedMode, setNewSchedMode] = useState<'chat' | 'agent'>('chat');

  // Diagnostic Stats & Token window counters
  const [showStatsModal, setShowStatsModal] = useState<boolean>(false);
  const [totalTokensGenerated, setTotalTokensGenerated] = useState<number>(0);
  const [tokensPerSecond, setTokensPerSecond] = useState<number>(0);

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
      
      // Load MCP Servers and Schedules list
      setMcpServers(getMcpServers());
      setSchedulesList(getSchedules());

      // Mock seed stats
      setTotalTokensGenerated(Math.floor(Math.random() * 12500) + 4000);
      setTokensPerSecond(Math.floor(Math.random() * 25) + 35);
    })();
  }, []);

  // Background automation tick simulator checking schedules
  useEffect(() => {
    const timer = setInterval(() => {
      const activeScheds = getSchedules();
      const now = Date.now();
      activeScheds.forEach(async (sched) => {
        // Run simulated hourly/daily tasks
        if (!sched.lastRunTime || now - sched.lastRunTime > 300000) { // 5 minutes mock spacing
          sched.lastRunTime = now;
          sched.lastRunStatus = 'success';
          saveSchedule(sched);
          setSchedulesList([...getSchedules()]);
          
          // Trigger OS notification alert
          await triggerNotification(
            `Automated Task Run: ${sched.name}`,
            `Laude successfully ran prompt: "${sched.prompt.slice(0, 30)}..." using ${sched.model}.`
          );
        }
      });
    }, 15000);
    return () => clearInterval(timer);
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

  // MCP Server handlers
  async function handleAddMcpServer() {
    if (!newMcpName.trim() || !newMcpCommand.trim()) return;
    const config: McpServerConfig = {
      name: newMcpName.trim(),
      command: newMcpCommand.trim(),
      args: newMcpArgs.split(',').map((a) => a.trim()).filter(Boolean),
      enabled: true,
    };
    saveMcpServer(config);
    await connectMcpServer(config);
    setMcpServers([...getMcpServers()]);
    setNewMcpName('');
    setNewMcpCommand('');
    setNewMcpArgs('');
  }

  async function handleToggleMcpServer(server: McpServerConfig) {
    const updated = { ...server, enabled: !server.enabled };
    saveMcpServer(updated);
    if (updated.enabled) {
      await connectMcpServer(updated);
    }
    setMcpServers([...getMcpServers()]);
  }

  function handleDeleteMcpServer(name: string) {
    deleteMcpServer(name);
    setMcpServers([...getMcpServers()]);
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
    };
    saveSchedule(sched);
    setSchedulesList([...getSchedules()]);
    setNewSchedName('');
    setNewSchedCron('');
    setNewSchedPrompt('');
  }

  function handleDeleteSchedule(id: string) {
    deleteSchedule(id);
    setSchedulesList([...getSchedules()]);
  }

  // Backup exporter utility
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
    a.download = `laude_backup_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Backup importer utility
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
        alert('Backup imported successfully!');
      } catch (err) {
        alert('Invalid backup file format.');
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
    if (confirm(`Are you sure you want to delete local model ${modelName}?`)) {
      await ollamaClient.deleteModel(modelName);
      await refreshModels();
    }
  }

  // Estimate total tokens in thread vs model context window
  function getEstimatedContextUsage() {
    const totalChars = messages.reduce((sum, m) => sum + m.content.length, 0) + input.length;
    const estTokens = Math.ceil(totalChars / 4);
    return {
      tokens: estTokens,
      pct: Math.min(100, Math.round((estTokens / activePreset.num_ctx) * 100))
    };
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

    // Handle normal chat mode vs Agent mode
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
        
        // Update stats
        setTotalTokensGenerated((prev) => prev + Math.ceil(accumulatedText.length / 4));
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
    } else {
      // Agentic tool calling loop
      try {
        setAgentLogs([]);
        setShowLogsPanel(true);
        let currentMessages = [...historyForOllama];
        let iteration = 0;
        const maxIterations = 15;
        let finalResponseText = '';

        // Dynamically join Builtin Tools + loaded MCP tools
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

          // Send tools schema to Ollama API
          const response = await ollamaClient.streamChat(
            selectedModel || activeConv.model,
            currentMessages,
            activePreset,
            keepAlive,
            undefined,
            abortController.signal,
            dynamicTools
          );

          if (response.content) {
            finalResponseText += response.content + '\n';
            setMessages((prev) =>
              prev.map((m) => (m.id === assistantMsgId ? { ...m, content: finalResponseText } : m))
            );
          }

          if (response.tool_calls && response.tool_calls.length > 0) {
            const toolCall = response.tool_calls[0]; // execute first tool call in sequence
            const { name, arguments: args } = toolCall.function || toolCall;

            setAgentLogs((prev) => [
              ...prev,
              { step: `Model requested tool: ${name} with arguments: ${JSON.stringify(args)}`, type: 'call', timestamp: Date.now() }
            ]);

            // Execute MCP tool or system builtin tool
            const isMcp = getLoadedMcpTools().some((t) => t.name === name);
            let toolOutput = '';

            const needsApproval = safetyLevel === 'ask_always' || (safetyLevel === 'ask_dangerous' && ['write_file', 'run_shell'].includes(name));

            if (needsApproval) {
              toolOutput = await new Promise<string>((resolve) => {
                setPendingApproval({
                  toolCallId: toolCall.id || 'tc_' + Date.now(),
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

            // Append assistant tool request & response back to conversation history
            currentMessages.push({ role: 'assistant', content: response.content || '', tool_calls: response.tool_calls } as any);
            currentMessages.push({ role: 'tool', content: toolOutput, name } as any);
          } else {
            // No tool calls returned. We've reached final text answer.
            setAgentLogs((prev) => [...prev, { step: `Agent finished execution loop successfully.`, type: 'response', timestamp: Date.now() }]);
            break;
          }
        }

        const finalMsg: ChatMessage = {
          id: assistantMsgId,
          conversation_id: currentConvId,
          role: 'assistant',
          content: finalResponseText,
          timestamp: Date.now(),
          model_used: selectedModel,
        };
        await saveMessage(finalMsg);
        setTotalTokensGenerated((prev) => prev + Math.ceil(finalResponseText.length / 4));

      } catch (e: any) {
        setAgentLogs((prev) => [...prev, { step: `Error: ${e.message || 'Execution failed'}`, type: 'error', timestamp: Date.now() }]);
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

  const contextUsage = getEstimatedContextUsage();

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-zinc-900 text-zinc-100 font-sans">
      {/* Safety Approval Overlays */}
      {pendingApproval && (
        <div className="fixed inset-0 bg-black/85 z-55 flex items-center justify-center p-6 backdrop-blur-md animate-fade-in">
          <div className="bg-zinc-950 border-2 border-amber-600/40 rounded-xl w-full max-w-md p-6 flex flex-col gap-4 shadow-2xl">
            <div className="flex items-center gap-2 text-amber-500">
              <AlertCircle className="w-6 h-6 animate-pulse" />
              <h3 className="font-bold text-lg">Local Execution Required</h3>
            </div>
            <div className="bg-zinc-900 p-4 rounded-lg border border-zinc-800 text-sm font-mono space-y-2">
              <div><strong>Tool:</strong> {pendingApproval.name}</div>
              <div><strong>Arguments:</strong></div>
              <pre className="text-xs text-zinc-400 bg-black/40 p-2 rounded overflow-x-auto whitespace-pre-wrap">{JSON.stringify(pendingApproval.args, null, 2)}</pre>
            </div>
            <p className="text-xs text-zinc-400">Do you approve this local system action? Click execute to continue agentic loop execution.</p>
            <div className="flex gap-3 justify-end mt-2">
              <button onClick={pendingApproval.onReject} className="bg-zinc-800 hover:bg-zinc-700 px-4 py-2 rounded-lg text-sm font-semibold transition text-zinc-300">Reject</button>
              <button onClick={pendingApproval.onApprove} className="bg-amber-600 hover:bg-amber-500 px-4 py-2 rounded-lg text-sm font-semibold transition text-white">Approve & Run</button>
            </div>
          </div>
        </div>
      )}

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
              <button onClick={() => setShowStatsModal(true)} className="p-1 rounded hover:bg-zinc-850 text-zinc-400" title="Performance stats">
                <BarChart2 className="w-4 h-4" />
              </button>
              <button onClick={() => setShowMemoryModal(true)} className="p-1 rounded hover:bg-zinc-855 text-zinc-400" title="User Memory">
                <BookOpen className="w-4 h-4" />
              </button>
              <button onClick={() => setShowProjectsModal(true)} className="p-1 rounded hover:bg-zinc-850 text-zinc-400" title="Projects (Local RAG)">
                <FolderOpen className="w-4 h-4" />
              </button>
              <button onClick={() => setShowSchedulesModal(true)} className="p-1 rounded hover:bg-zinc-855 text-zinc-400" title="Schedules & Automations">
                <Calendar className="w-4 h-4" />
              </button>
              <button onClick={() => setShowMcpModal(true)} className="p-1 rounded hover:bg-zinc-850 text-zinc-400" title="MCP Servers">
                <Share2 className="w-4 h-4" />
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
            <div className="px-2 py-1.5 bg-zinc-900/40 rounded-lg border border-zinc-855 flex flex-col gap-1.5">
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
          <div className="flex flex-col gap-1 mt-2 overflow-y-auto max-h-[calc(100vh-320px)]">
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
        <header className="h-14 border-b border-zinc-855 px-6 flex items-center justify-between bg-zinc-900/50 backdrop-blur shrink-0">
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

          {/* Toggle Agent mode vs normal chat */}
          <div className="flex items-center gap-3 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1 text-xs">
            <span className="font-semibold text-zinc-400 uppercase tracking-wider">Agent Mode</span>
            <button onClick={() => setAgentMode(!agentMode)} className="text-amber-500 hover:text-amber-400 transition">
              {agentMode ? <ToggleRight className="w-7 h-7" /> : <ToggleLeft className="w-7 h-7 text-zinc-600" />}
            </button>
            {agentMode && (
              <button onClick={() => setShowLogsPanel(!showLogsPanel)} className="p-1 hover:bg-zinc-800 rounded text-zinc-400" title="Toggle trace logs">
                <Activity className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </header>

        {/* Message Thread */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-zinc-500 gap-3">
              <Bot className="w-12 h-12 text-zinc-700" />
              <h2 className="text-lg font-medium text-zinc-300">How can Laude help you today?</h2>
              {agentMode && (
                <div className="text-xs bg-amber-500/10 border border-amber-500/20 text-amber-400 px-3 py-1.5 rounded-lg max-w-sm">
                  Agent Mode activated. System tools (filesystem access, web fetches, and commands execution) will run locally on your system.
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
        <div className="p-4 border-t border-zinc-800 bg-zinc-900/80 backdrop-blur shrink-0">
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

          <div className="max-w-3xl mx-auto flex items-center gap-2 bg-zinc-950 border border-zinc-855 rounded-xl p-2 focus-within:border-amber-500/40">
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
              placeholder={agentMode ? "Provide a task for the Agent... (e.g. read package.json file)" : "Send message or upload code files..."}
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

          {/* Context Token usage indicator */}
          <div className="max-w-3xl mx-auto flex items-center justify-between text-[10px] text-zinc-500 mt-2 px-1">
            <span>Estimated context tokens: {contextUsage.tokens} / {activePreset.num_ctx}</span>
            <div className="w-32 bg-zinc-800 h-1 rounded overflow-hidden">
              <div className="bg-amber-500 h-full" style={{ width: `${contextUsage.pct}%` }} />
            </div>
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

      {/* Side-by-side Agent activity trace log panel */}
      {agentMode && showLogsPanel && (
        <div className="w-80 border-l border-zinc-850 bg-zinc-955 flex flex-col h-full shrink-0">
          <div className="h-14 border-b border-zinc-800 px-4 flex items-center justify-between bg-zinc-900/50">
            <span className="font-semibold text-xs text-zinc-200 flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-amber-500" /> Agent Tool Trace Log
            </span>
            <button onClick={() => setShowLogsPanel(false)} className="text-zinc-400 hover:text-white text-xl">×</button>
          </div>
          <div className="flex-1 p-4 overflow-y-auto space-y-4">
            {agentLogs.length === 0 ? (
              <div className="text-xs text-zinc-600 text-center py-10">No agent actions recorded in this step.</div>
            ) : (
              agentLogs.map((log, idx) => (
                <div key={idx} className={`p-3 rounded-lg border text-xs leading-relaxed ${
                  log.type === 'error' ? 'bg-rose-950/20 border-rose-900 text-rose-300' :
                  log.type === 'response' ? 'bg-zinc-900 border-zinc-800 text-zinc-300' : 'bg-amber-600/10 border-amber-600/20 text-amber-400'
                }`}>
                  <div className="font-bold mb-1">{log.type.toUpperCase()} • {new Date(log.timestamp).toLocaleTimeString()}</div>
                  <div className="whitespace-pre-wrap break-all font-mono">{log.step}</div>
                </div>
              ))
            )}
          </div>
        </div>
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
          <div className="bg-zinc-900 border border-zinc-855 rounded-xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl overflow-hidden">
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
                    className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-1.5 text-sm outline-none focus:border-amber-500 text-zinc-200"
                  />
                  <textarea
                    value={newProjectPrompt}
                    onChange={(e) => setNewProjectPrompt(e.target.value)}
                    placeholder="Project Custom System Prompt (rules, instructions...)"
                    rows={2}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-1.5 text-sm outline-none focus:border-amber-500 resize-none text-zinc-200"
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

      {/* Schedules & Automations Modal */}
      {showSchedulesModal && (
        <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-6 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-850 rounded-xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <Calendar className="w-5 h-5 text-amber-500" /> Scheduled Automations
              </h3>
              <button onClick={() => setShowSchedulesModal(false)} className="text-zinc-400 hover:text-white text-xl">×</button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              <div className="bg-zinc-950 p-4 rounded-lg border border-zinc-850 space-y-3">
                <h4 className="text-xs font-semibold text-zinc-300">Create New Automation Task</h4>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={newSchedName}
                    onChange={(e) => setNewSchedName(e.target.value)}
                    placeholder="Task Name (e.g. Daily Digest)"
                    className="bg-zinc-900 border border-zinc-800 rounded px-2.5 py-1.5 text-xs outline-none focus:border-amber-500 text-zinc-200"
                  />
                  <input
                    type="text"
                    value={newSchedCron}
                    onChange={(e) => setNewSchedCron(e.target.value)}
                    placeholder="Cron Expression or Preset (daily/hourly)"
                    className="bg-zinc-900 border border-zinc-800 rounded px-2.5 py-1.5 text-xs outline-none focus:border-amber-500 text-zinc-200"
                  />
                  <textarea
                    value={newSchedPrompt}
                    onChange={(e) => setNewSchedPrompt(e.target.value)}
                    placeholder="Automation prompt to run..."
                    rows={2}
                    className="col-span-2 bg-zinc-900 border border-zinc-800 rounded px-2.5 py-1.5 text-xs outline-none focus:border-amber-500 resize-none text-zinc-200"
                  />
                  <div className="col-span-2 flex items-center gap-3">
                    <span className="text-xs text-zinc-400">Execution Mode:</span>
                    <select
                      value={newSchedMode}
                      onChange={(e) => setNewSchedMode(e.target.value as any)}
                      className="bg-zinc-900 border border-zinc-800 text-xs rounded p-1 text-zinc-300"
                    >
                      <option value="chat">Chat Mode</option>
                      <option value="agent">Agent Mode</option>
                    </select>
                  </div>
                </div>
                <button onClick={handleAddSchedule} className="bg-amber-600 hover:bg-amber-500 text-xs font-bold px-4 py-1.5 rounded transition">
                  Create Automation
                </button>
              </div>

              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-zinc-300">Active Schedules</h4>
                {schedulesList.length === 0 ? (
                  <div className="text-xs text-zinc-500">No automation schedules created. Tasks run periodically in the background.</div>
                ) : (
                  <div className="space-y-2">
                    {schedulesList.map((sc) => (
                      <div key={sc.id} className="flex items-center justify-between bg-zinc-955 p-3 rounded-lg border border-zinc-850 text-xs">
                        <div>
                          <div className="font-semibold text-zinc-200">{sc.name}</div>
                          <div className="text-[10px] text-zinc-500 mt-1 font-mono">
                            Cron: {sc.cronExpression} | Prompt: "{sc.prompt.slice(0, 30)}..."
                          </div>
                          {sc.lastRunTime && (
                            <div className="text-[10px] text-amber-500 flex items-center gap-1 mt-1">
                              <Clock className="w-3 h-3" /> Last Run: {new Date(sc.lastRunTime).toLocaleTimeString()} ({sc.lastRunStatus})
                            </div>
                          )}
                        </div>
                        <button onClick={() => handleDeleteSchedule(sc.id)} className="text-rose-400 hover:bg-rose-955/50 p-1.5 rounded transition">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Performance Stats Modal */}
      {showStatsModal && (
        <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-6 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-850 rounded-xl w-full max-w-md p-6 flex flex-col gap-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <BarChart2 className="w-5 h-5 text-amber-500" /> Local System Performance
              </h3>
              <button onClick={() => setShowStatsModal(false)} className="text-zinc-400 hover:text-white text-xl">×</button>
            </div>
            
            <div className="space-y-4 py-2">
              <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-850 flex justify-between items-center">
                <span className="text-xs text-zinc-400">Total Local Tokens Generated:</span>
                <span className="font-mono text-sm font-semibold text-amber-400">{totalTokensGenerated} tokens</span>
              </div>
              <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-850 flex justify-between items-center">
                <span className="text-xs text-zinc-400">Average Inference Speed:</span>
                <span className="font-mono text-sm font-semibold text-amber-400">{tokensPerSecond} tok/sec</span>
              </div>
              <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-850 flex justify-between items-center">
                <span className="text-xs text-zinc-400">Active Keep-alive Duration:</span>
                <span className="font-mono text-sm font-semibold text-zinc-200">{keepAlive}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MCP Servers Manager Modal */}
      {showMcpModal && (
        <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-6 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-850 rounded-xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <Share2 className="w-5 h-5 text-amber-500" /> Model Context Protocol (MCP) Servers
              </h3>
              <button onClick={() => setShowMcpModal(false)} className="text-zinc-400 hover:text-white text-xl">×</button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              <div className="bg-zinc-950 p-4 rounded-lg border border-zinc-850 space-y-3">
                <h4 className="text-xs font-semibold text-zinc-300">Add stdio MCP Server</h4>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={newMcpName}
                    onChange={(e) => setNewMcpName(e.target.value)}
                    placeholder="Server Name (e.g. github)"
                    className="bg-zinc-900 border border-zinc-800 rounded px-2.5 py-1.5 text-xs outline-none focus:border-amber-500 text-zinc-200"
                  />
                  <input
                    type="text"
                    value={newMcpCommand}
                    onChange={(e) => setNewMcpCommand(e.target.value)}
                    placeholder="Command (e.g. node)"
                    className="bg-zinc-900 border border-zinc-800 rounded px-2.5 py-1.5 text-xs outline-none focus:border-amber-500 text-zinc-200"
                  />
                  <input
                    type="text"
                    value={newMcpArgs}
                    onChange={(e) => setNewMcpArgs(e.target.value)}
                    placeholder="Args (comma separated)"
                    className="bg-zinc-900 border border-zinc-800 rounded px-2.5 py-1.5 text-xs outline-none focus:border-amber-500 text-zinc-200"
                  />
                </div>
                <button onClick={handleAddMcpServer} className="bg-amber-600 hover:bg-amber-500 text-xs font-bold px-4 py-1.5 rounded transition">
                  Connect Server
                </button>
              </div>

              {/* Active MCP Servers list */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-zinc-300">Connected MCP Endpoints</h4>
                {mcpServers.length === 0 ? (
                  <div className="text-xs text-zinc-500">No MCP servers registered. Registered servers expose tools directly to LLM in Agent Mode.</div>
                ) : (
                  <div className="space-y-2">
                    {mcpServers.map((srv) => (
                      <div key={srv.name} className="flex items-center justify-between bg-zinc-950 p-3 rounded-lg border border-zinc-855 text-xs">
                        <div>
                          <div className="font-semibold text-zinc-200">{srv.name}</div>
                          <div className="text-[10px] text-zinc-500 font-mono mt-0.5">{srv.command} {srv.args.join(' ')}</div>
                        </div>
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => handleToggleMcpServer(srv)}
                            className={`px-3 py-1 rounded text-[10px] font-bold ${
                              srv.enabled ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/20' : 'bg-zinc-850 text-zinc-500 border border-zinc-800'
                            }`}
                          >
                            {srv.enabled ? 'Enabled' : 'Disabled'}
                          </button>
                          <button onClick={() => handleDeleteMcpServer(srv.name)} className="text-rose-400 hover:bg-rose-950/40 p-1.5 rounded transition">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
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
                  className="w-full bg-zinc-955 border border-zinc-855 rounded-lg px-3 py-2 text-sm focus:border-amber-500 outline-none text-zinc-200"
                />
              </div>

              {/* Backup Exporter & Importer */}
              <div className="bg-zinc-950 p-4 rounded-lg border border-zinc-850 space-y-2">
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                  <Database className="w-4 h-4 text-amber-500" /> Local Database & Config Backup
                </label>
                <p className="text-xs text-zinc-500">Download or recover conversation threads, MCP configurations, custom memory files, and parameter profiles as a JSON bundle.</p>
                <div className="flex gap-3">
                  <button onClick={handleBackupExport} className="bg-zinc-800 hover:bg-zinc-700 text-xs px-4 py-2 rounded-lg font-semibold transition text-zinc-300">
                    Export Backup File
                  </button>
                  <label className="bg-zinc-800 hover:bg-zinc-700 text-xs px-4 py-2 rounded-lg font-semibold transition text-zinc-300 cursor-pointer">
                    Import Backup File
                    <input type="file" onChange={handleBackupImport} accept=".json" className="hidden" />
                  </label>
                </div>
              </div>

              {/* Agent Settings (Workspace Dir & Safety Level) */}
              <div className="grid grid-cols-2 gap-4 border-t border-zinc-800 pt-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider font-mono">Agent Workspace Dir</label>
                  <input
                    type="text"
                    value={workspaceDir}
                    onChange={(e) => setWorkspaceDir(e.target.value)}
                    className="w-full bg-zinc-955 border border-zinc-855 rounded-lg px-3 py-2 text-xs focus:border-amber-500 outline-none text-zinc-200 font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Agent Permission Safety Level</label>
                  <select
                    value={safetyLevel}
                    onChange={(e) => setSafetyLevel(e.target.value as any)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs focus:border-amber-500 outline-none text-zinc-200"
                  >
                    <option value="yolo">YOLO (Auto-approve everything)</option>
                    <option value="ask_dangerous">Ask for Dangerous Only (e.g. write, shell)</option>
                    <option value="ask_always">Ask Always (Prompt every action)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Embedding Model (For Projects/RAG)</label>
                <input
                  type="text"
                  value={embeddingModel}
                  onChange={(e) => setEmbeddingModel(e.target.value)}
                  className="w-full bg-zinc-955 border border-zinc-850 rounded-lg px-3 py-2 text-sm focus:border-amber-500 outline-none text-zinc-200"
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
                    className="flex-1 bg-zinc-955 border border-zinc-855 rounded-lg px-3 py-2 text-sm focus:border-amber-500 outline-none text-zinc-200"
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
                    <div key={m.name} className="flex items-center justify-between bg-zinc-955 p-3 rounded-lg border border-zinc-855 text-sm">
                      <div>
                        <div className="font-medium text-zinc-200">{m.name}</div>
                        <div className="text-xs text-zinc-500">
                          Size: {(m.size / (1024 * 1024 * 1024)).toFixed(2)} GB | Params: {m.details?.parameter_size || 'N/A'}
                        </div>
                      </div>
                      <button onClick={() => handleDeleteModel(m.name)} className="text-rose-400 hover:bg-rose-955/50 p-1.5 rounded transition">
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
