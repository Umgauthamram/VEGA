'use client';

import React, { useState } from 'react';
import { 
  FolderPlus, Trash2, Calendar, Clock, Share2, Eye, Plus, Play, Info
} from 'lucide-react';
import { Project, ProjectFile } from '../app/types';
import { SavedSchedule } from '../app/scheduler';
import { Cron } from 'croner';

interface SubViewsProps {
  viewType: 'projects' | 'artifacts' | 'schedules';
  // Projects states & actions
  projects: Project[];
  activeProjectId: string | null;
  setActiveProjectId: (id: string | null) => void;
  newProjectName: string;
  setNewProjectName: (val: string) => void;
  newProjectPrompt: string;
  setNewProjectPrompt: (val: string) => void;
  handleCreateProject: () => void;
  handleDeleteProject: (id: string) => void;
  projectFilesList: ProjectFile[];
  handleProjectFileAdd: (e: React.ChangeEvent<HTMLInputElement>) => void;
  projectFileInputRef: React.RefObject<HTMLInputElement | null>;
  // Schedules states & actions
  schedulesList: SavedSchedule[];
  newSchedName: string;
  setNewSchedName: (val: string) => void;
  newSchedCron: string;
  setNewSchedCron: (val: string) => void;
  newSchedPrompt: string;
  setNewSchedPrompt: (val: string) => void;
  newSchedMode: 'chat' | 'agent';
  setNewSchedMode: (val: 'chat' | 'agent') => void;
  handleAddSchedule: () => void;
  handleDeleteSchedule: (id: string) => void;
  handleToggleScheduleEnabled: (id: string, enabled: boolean) => void;
  handleRunScheduleNow: (sched: SavedSchedule) => void;
  // Artifacts panel
  realArtifactsList: { id: string; title: string; language: string; code: string; timestamp: number }[];
  setSelectedArtifact: (art: { language: string; code: string } | null) => void;
}

export function SubViews({
  viewType,
  projects,
  activeProjectId,
  setActiveProjectId,
  newProjectName,
  setNewProjectName,
  newProjectPrompt,
  setNewProjectPrompt,
  handleCreateProject,
  handleDeleteProject,
  projectFilesList,
  handleProjectFileAdd,
  projectFileInputRef,
  schedulesList,
  newSchedName,
  setNewSchedName,
  newSchedCron,
  setNewSchedCron,
  newSchedPrompt,
  setNewSchedPrompt,
  newSchedMode,
  setNewSchedMode,
  handleAddSchedule,
  handleDeleteSchedule,
  handleToggleScheduleEnabled,
  handleRunScheduleNow,
  realArtifactsList,
  setSelectedArtifact
}: SubViewsProps) {
  
  // Schedule creator details
  const [showScheduleBuilder, setShowScheduleBuilder] = useState(false);
  const [cronPreviewLines, setCronPreviewLines] = useState<string[]>([]);

  const handleCronChange = (val: string) => {
    setNewSchedCron(val);
    if (!val.trim()) {
      setCronPreviewLines([]);
      return;
    }
    try {
      const c = new Cron(val);
      const dates = [];
      let next = c.nextRun();
      for (let i = 0; i < 3; i++) {
        if (next) {
          dates.push(next.toLocaleString());
          next = c.nextRun(next);
        }
      }
      setCronPreviewLines(dates);
    } catch {
      setCronPreviewLines(['(Invalid cron pattern)']);
    }
  };

  const getHumanReadableCadence = (cronExpr: string) => {
    if (cronExpr === '0 9 * * *') return 'Daily at 09:00';
    if (cronExpr === '0 18 * * 5') return 'Weekly on Fridays at 18:00';
    if (cronExpr === '0 * * * *') return 'Every hour';
    if (cronExpr === '*/2 * * * *') return 'Every 2 minutes';
    return `Cron: ${cronExpr}`;
  };

  return (
    <div className="flex-1 flex flex-col bg-background text-foreground select-none overflow-y-auto p-8 space-y-6 font-sans">
      
      {/* PROJECTS MAIN VIEW */}
      {viewType === 'projects' && (
        <div className="max-w-5xl mx-auto w-full space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-serif font-bold text-foreground">Projects</h2>
              <p className="text-xs text-foreground/50">Inject local custom documents context directly into conversational prompt contexts.</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-foreground/60 cursor-pointer select-none">Sort by Last updated ▾</span>
              <button 
                onClick={() => {
                  const name = prompt("Enter project name:");
                  if (name) {
                    setNewProjectName(name);
                    setTimeout(handleCreateProject, 100);
                  }
                }}
                className="bg-accent hover:bg-accent-hover text-white text-xs font-bold px-3 py-2 rounded-lg transition shadow-xs"
              >
                New project
              </button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-6">
            {/* Create new project inline helper card */}
            <div className="col-span-1 bg-card-bg border border-border-color rounded-xl p-4 space-y-3 h-fit shadow-xs">
              <h3 className="text-xs font-bold text-foreground/55 uppercase tracking-wider">Quick Create</h3>
              <div className="space-y-2">
                <input
                  type="text"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="Project Title"
                  className="w-full bg-background border border-border-color rounded-lg px-2.5 py-1.5 text-xs text-foreground outline-none focus:border-accent"
                />
                <textarea
                  value={newProjectPrompt}
                  onChange={(e) => setNewProjectPrompt(e.target.value)}
                  placeholder="Project system prompt rules..."
                  rows={3}
                  className="w-full bg-background border border-border-color rounded-lg px-2.5 py-1.5 text-xs text-foreground outline-none focus:border-accent resize-none"
                />
                <button onClick={handleCreateProject} className="w-full bg-accent hover:bg-accent-hover text-white text-xs font-bold py-2 rounded-lg transition">
                  Create Project
                </button>
              </div>
            </div>

            {/* Project List Grid */}
            <div className="col-span-2 space-y-4">
              <h3 className="text-xs font-bold text-foreground/55 uppercase tracking-wider">Workspace Index</h3>
              {projects.length === 0 ? (
                <div className="text-xs text-foreground/40 italic p-6 bg-sidebar rounded-xl border border-border-color/50 text-center">
                  No active projects. Build a project to start context file injection.
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {projects.map((p) => (
                    <div 
                      key={p.id} 
                      className={`p-4 rounded-xl border transition-all flex flex-col justify-between h-40 ${
                        activeProjectId === p.id 
                          ? 'bg-card-bg border-accent shadow-xs' 
                          : 'bg-sidebar border-border-color hover:bg-card-bg'
                      }`}
                    >
                      <div>
                        <div className="flex justify-between items-start">
                          <h4 onClick={() => setActiveProjectId(p.id)} className="text-sm font-bold text-foreground cursor-pointer hover:underline truncate mr-2">{p.name}</h4>
                          <span className="text-[9px] uppercase tracking-wider bg-background px-1.5 py-0.5 rounded text-foreground/40 font-bold border border-border-color/30">Private</span>
                        </div>
                        <p className="text-xs text-foreground/50 mt-1.5 line-clamp-3">{p.system_prompt || 'No description provided.'}</p>
                      </div>

                      <div className="flex justify-between items-center pt-2 border-t border-border-color/10 text-[10px] text-foreground/40">
                        <span>Updated today</span>
                        <button onClick={() => handleDeleteProject(p.id)} className="text-foreground/40 hover:text-rose-500 transition">
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SCHEDULES MAIN VIEW */}
      {viewType === 'schedules' && (
        <div className="max-w-5xl mx-auto w-full space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-serif font-bold text-foreground">Scheduled Tasks</h2>
                 </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setShowScheduleBuilder(!showScheduleBuilder)}
                className="bg-accent hover:bg-accent-hover text-white text-xs font-bold px-3 py-2 rounded-lg transition"
              >
                {showScheduleBuilder ? 'Close Builder' : 'New Task'} ▾
              </button>
            </div>
          </div>

          {/* New Task Dialog / Schedule Builder Panel */}
          {showScheduleBuilder && (
            <div className="bg-card-bg border border-border-color rounded-xl p-4 space-y-3 text-xs animate-in slide-in-from-top-2 duration-150 shadow-sm">
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground/60">Schedule Automation Builder</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <span>Task Name</span>
                  <input
                    type="text"
                    value={newSchedName}
                    onChange={(e) => setNewSchedName(e.target.value)}
                    placeholder="e.g. Daily Brief, Hourly check"
                    className="w-full bg-background border border-border-color rounded-lg px-2.5 py-1.5 text-xs text-foreground outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <span>Cron Expression</span>
                  <input
                    type="text"
                    value={newSchedCron}
                    onChange={(e) => handleCronChange(e.target.value)}
                    placeholder="e.g. */5 * * * *"
                    className="w-full bg-background border border-border-color rounded-lg px-2.5 py-1.5 text-xs text-foreground font-mono outline-none"
                  />
                </div>

                <div className="col-span-2 space-y-1">
                  <span>Execution Prompt</span>
                  <textarea
                    value={newSchedPrompt}
                    onChange={(e) => setNewSchedPrompt(e.target.value)}
                    placeholder="System prompt instruction details..."
                    rows={2}
                    className="w-full bg-background border border-border-color rounded-lg px-2.5 py-1.5 text-xs text-foreground outline-none resize-none"
                  />
                </div>

                <div className="space-y-1">
                  <span>Run Mode</span>
                  <select
                    value={newSchedMode}
                    onChange={(e) => setNewSchedMode(e.target.value as any)}
                    className="w-full bg-sidebar border border-border-color rounded-lg p-2 text-xs text-foreground"
                  >
                    <option value="chat">Chat Mode</option>
                    <option value="agent">Agent Mode</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-foreground/40 uppercase block">Presets Quick-apply</span>
                  <div className="flex gap-1.5">
                    <button 
                      onClick={() => handleCronChange('0 9 * * *')} 
                      className="bg-sidebar border border-border-color px-2 py-1 rounded text-[10px]"
                    >
                      Daily 9am
                    </button>
                    <button 
                      onClick={() => handleCronChange('*/2 * * * *')} 
                      className="bg-sidebar border border-border-color px-2 py-1 rounded text-[10px]"
                    >
                      2 Min
                    </button>
                  </div>
                </div>

                {cronPreviewLines.length > 0 && (
                  <div className="col-span-2 bg-sidebar/55 border border-border-color p-2 rounded-lg text-[10px] font-mono text-foreground/60 space-y-0.5">
                    <div className="font-bold">Next 3 runs preview:</div>
                    {cronPreviewLines.map((line, idx) => (
                      <div key={idx}>• {line}</div>
                    ))}
                  </div>
                )}
              </div>

              <button 
                onClick={() => {
                  handleAddSchedule();
                  setShowScheduleBuilder(false);
                }} 
                className="w-full bg-accent hover:bg-accent-hover text-white text-xs font-bold py-2 rounded-lg transition"
              >
                Save Schedule
              </button>
            </div>
          )}

          {/* Execution Environment Banner */}
          <div className="flex items-center justify-between bg-card-bg border border-border-color p-3.5 rounded-xl text-xs text-foreground/80 shadow-xs">
            <span className="flex items-center gap-2">
              <span className="text-amber-500 font-bold"></span> Scheduled tasks only run while your computer is awake and online.
            </span>
          </div>

          {/* Empty State Canvas / Grid list */}
          {schedulesList.length === 0 ? (
            <div className="bg-card-bg border border-border-color rounded-2xl p-12 text-center flex flex-col items-center justify-center space-y-4">
         
              <div>
                <h3 className="font-serif font-bold text-foreground text-lg">No scheduled tasks</h3>
                <p className="text-xs text-foreground/50 mt-1 max-w-sm mx-auto">Create scheduled automations using templates below or add a custom script execution schedule.</p>
              </div>
              <div className="flex items-center gap-3 pt-2">
                <button 
                  onClick={() => {
                    setNewSchedName("Daily Brief");
                    setNewSchedCron("0 9 * * *");
                    setNewSchedPrompt("Summarize all changes across workspace folders.");
                  }}
                  className="bg-sidebar border border-border-color hover:bg-background text-xs font-semibold px-4 py-2 rounded-xl transition"
                >
                  Daily Brief template
                </button>
                <button 
                  onClick={() => {
                    setNewSchedName("Weekly Review");
                    setNewSchedCron("0 18 * * 5");
                    setNewSchedPrompt("Write a review of coding metrics and outputs.");
                  }}
                  className="bg-sidebar border border-border-color hover:bg-background text-xs font-semibold px-4 py-2 rounded-xl transition"
                >
                  Weekly Review template
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {schedulesList.map((sched) => (
                <div key={sched.id} className="bg-card-bg border border-border-color rounded-xl p-4 flex flex-col justify-between h-40 shadow-xs">
                  <div>
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="font-bold text-foreground text-sm block">{sched.name}</span>
                        <span className="text-[10px] text-foreground/45 mt-0.5 block">{getHumanReadableCadence(sched.cronExpression)}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="checkbox"
                          checked={sched.enabled}
                          onChange={(e) => handleToggleScheduleEnabled(sched.id, e.target.checked)}
                          className="rounded border-border-color text-accent focus:ring-accent accent-accent w-4 h-4 cursor-pointer"
                        />
                        <span className="text-[9px] uppercase tracking-wider text-foreground/40 font-bold">Enabled</span>
                      </div>
                    </div>
                    <p className="text-xs text-foreground/50 mt-2.5 line-clamp-2 italic">"{sched.prompt}"</p>
                  </div>
                  <div className="flex justify-between items-center text-[10px] text-foreground/40 pt-2 border-t border-border-color/10 font-bold uppercase tracking-wider">
                    <span className="flex items-center gap-1">
                      Mode: {sched.mode}
                      {sched.lastRunStatus && (
                        <span className={`px-1.5 py-0.5 rounded text-[8px] ${sched.lastRunStatus === 'success' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                          {sched.lastRunStatus}
                        </span>
                      )}
                    </span>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => handleRunScheduleNow(sched)}
                        className="text-accent hover:underline flex items-center gap-0.5"
                      >
                        <Play className="w-2.5 h-2.5" /> Run Now
                      </button>
                      <button onClick={() => handleDeleteSchedule(sched.id)} className="text-rose-500 hover:underline">Delete</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ARTIFACTS MAIN VIEW */}
      {viewType === 'artifacts' && (
        <div className="max-w-5xl mx-auto w-full space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-serif font-bold text-foreground">Artifacts</h2>
              <p className="text-xs text-foreground/50">Browse code blocks and responsive content generated by assistant models.</p>
            </div>
          </div>

          <div className="bg-card-bg border border-border-color rounded-2xl p-12 text-center text-xs text-foreground/45 shadow-xs">
            Still under development.
          </div>
        </div>
      )}
      
    </div>
  );
}
