'use client';

import React, { useState } from 'react';
import { 
  FolderPlus, Trash2, Database, Save, Calendar, Clock, Share2, Eye
} from 'lucide-react';
import { Project, ProjectFile } from '../app/types';
import { SavedSchedule } from '../app/scheduler';

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
  // Artifacts panel
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
  setSelectedArtifact
}: SubViewsProps) {

  return (
    <div className="flex-1 flex flex-col bg-background text-foreground select-none overflow-y-auto p-8 space-y-6">
      
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
                    // Trigger simulated create
                    setTimeout(handleCreateProject, 100);
                  }
                }}
                className="bg-accent hover:bg-accent-hover text-white text-xs font-bold px-3 py-2 rounded-lg transition shadow-xs"
              >
                New project
              </button>
            </div>
          </div>

          {/* Search bar */}
          <div className="relative">
            <input 
              type="text" 
              placeholder="🔍 Search projects..." 
              className="w-full bg-card-bg border border-border-color focus:border-accent rounded-xl px-4 py-2.5 text-xs text-foreground outline-none transition"
            />
          </div>

          {/* Category Filter Tabs */}
          <div className="flex items-center gap-4 border-b border-border-color/40 pb-2 text-xs font-bold uppercase tracking-wider text-foreground/45">
            <span className="text-foreground border-b-2 border-accent pb-2 cursor-pointer">Your projects</span>
            <span className="hover:text-foreground cursor-pointer">Organization</span>
            <span className="hover:text-foreground cursor-pointer">Shared with you</span>
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
              <p className="text-xs text-foreground/50">Run automated prompt commands at custom periodic intervals locally.</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-foreground/60 cursor-pointer">Sort by Next run ▾</span>
              <button 
                onClick={() => {
                  const name = prompt("Enter scheduled task name:");
                  if (name) {
                    setNewSchedName(name);
                  }
                }}
                className="bg-accent hover:bg-accent-hover text-white text-xs font-bold px-3 py-2 rounded-lg transition"
              >
                New task ▾
              </button>
            </div>
          </div>

          {/* Execution Environment Banner */}
          <div className="flex items-center justify-between bg-card-bg border border-border-color p-3.5 rounded-xl text-xs text-foreground/80">
            <span className="flex items-center gap-2">
              <span className="text-amber-500 font-bold">⚠</span> Scheduled tasks only run while your computer is awake and online.
            </span>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-foreground/40 font-bold uppercase tracking-wider">Keep awake</span>
              <input type="checkbox" className="rounded border-border-color focus:ring-accent accent-accent w-4 h-4 cursor-pointer" defaultChecked />
            </div>
          </div>

          {/* Empty State Canvas / Grid list */}
          {schedulesList.length === 0 ? (
            <div className="bg-card-bg border border-border-color rounded-2xl p-12 text-center flex flex-col items-center justify-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-sidebar border border-border-color/60 flex items-center justify-center text-3xl">
                ⏰
              </div>
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
                <div key={sched.id} className="bg-card-bg border border-border-color rounded-xl p-4 flex flex-col justify-between h-36">
                  <div>
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-foreground text-sm">{sched.name}</span>
                      <span className="text-[10px] font-mono bg-sidebar px-2 py-0.5 rounded border border-border-color">{sched.cronExpression}</span>
                    </div>
                    <p className="text-xs text-foreground/50 mt-2 line-clamp-2 italic">"{sched.prompt}"</p>
                  </div>
                  <div className="flex justify-between items-center text-[10px] text-foreground/40 pt-2 border-t border-border-color/10 font-bold uppercase tracking-wider">
                    <span>Mode: {sched.mode}</span>
                    <button onClick={() => handleDeleteSchedule(sched.id)} className="text-rose-500 hover:underline">Delete</button>
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
            <div className="flex items-center gap-3">
              <span className="text-xs text-foreground/60 cursor-pointer">Filter by All ▾</span>
              <span className="text-xs text-accent hover:underline cursor-pointer">Import from link</span>
              <button className="bg-accent hover:bg-accent-hover text-white text-xs font-bold px-3 py-2 rounded-lg transition">New artifact ▾</button>
            </div>
          </div>

          <div className="relative">
            <input 
              type="text" 
              placeholder="🔍 Search artifacts..." 
              className="w-full bg-card-bg border border-border-color focus:border-accent rounded-xl px-4 py-2.5 text-xs text-foreground outline-none transition"
            />
          </div>

          {/* Interactive Card Matrix */}
          <div className="grid grid-cols-3 gap-6">
            <div className="bg-card-bg border border-border-color hover:border-accent/40 rounded-xl p-4 flex flex-col justify-between h-40 cursor-pointer transition">
              <div>
                <span className="text-[9px] font-bold uppercase tracking-wider bg-accent/15 text-accent px-1.5 py-0.5 rounded">Chat</span>
                <h4 className="font-bold text-foreground text-sm mt-2 truncate">System design plan diagram</h4>
                <p className="text-xs text-foreground/50 mt-1 line-clamp-2">Mermaid layout mapping of the micro-agent connection layers...</p>
              </div>
              <span className="text-[10px] text-foreground/45 mt-2">Edited 2 hrs ago</span>
            </div>
            <div className="bg-card-bg border border-border-color hover:border-accent/40 rounded-xl p-4 flex flex-col justify-between h-40 cursor-pointer transition">
              <div>
                <span className="text-[9px] font-bold uppercase tracking-wider bg-accent/15 text-accent px-1.5 py-0.5 rounded">Chat</span>
                <h4 className="font-bold text-foreground text-sm mt-2 truncate">Database backup exporter</h4>
                <p className="text-xs text-foreground/50 mt-1 line-clamp-2">Node.js file handler utility function to format schemas into JSON blobs...</p>
              </div>
              <span className="text-[10px] text-foreground/45 mt-2">Edited 1 day ago</span>
            </div>
          </div>
        </div>
      )}
      
    </div>
  );
}
