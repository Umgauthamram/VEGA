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
        <div className="max-w-4xl mx-auto w-full space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-serif font-bold text-foreground">Projects RAG Workspace</h2>
              <p className="text-xs text-foreground/50">Inject local custom documents context directly into conversational prompt contexts.</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-6">
            {/* Create new project card */}
            <div className="col-span-1 bg-card-bg border border-border-color rounded-xl p-4 space-y-3 h-fit shadow-xs">
              <h3 className="text-xs font-bold text-foreground/55 uppercase tracking-wider">Create Project</h3>
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

            {/* Project List */}
            <div className="col-span-2 space-y-4">
              <h3 className="text-xs font-bold text-foreground/55 uppercase tracking-wider">Configured Projects</h3>
              {projects.length === 0 ? (
                <div className="text-xs text-foreground/40 italic p-6 bg-sidebar rounded-xl border border-border-color/50 text-center">
                  No active projects. Build a project to start context file injection.
                </div>
              ) : (
                <div className="space-y-3">
                  {projects.map((p) => (
                    <div 
                      key={p.id} 
                      className={`p-4 rounded-xl border transition-all ${
                        activeProjectId === p.id 
                          ? 'bg-card-bg border-accent shadow-xs' 
                          : 'bg-sidebar border-border-color hover:bg-card-bg'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div onClick={() => setActiveProjectId(p.id)} className="cursor-pointer flex-1">
                          <h4 className="text-sm font-bold text-foreground">{p.name}</h4>
                          <p className="text-xs text-foreground/50 mt-1 line-clamp-2">{p.system_prompt}</p>
                        </div>
                        <button onClick={() => handleDeleteProject(p.id)} className="text-foreground/40 hover:text-rose-500 transition p-1 rounded">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {activeProjectId === p.id && (
                        <div className="mt-4 pt-4 border-t border-border-color/30 space-y-3">
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-semibold">Knowledge base files</span>
                            <button 
                              onClick={() => projectFileInputRef.current?.click()}
                              className="text-accent hover:text-accent-hover font-bold text-[11px] flex items-center gap-1"
                            >
                              <FolderPlus className="w-3.5 h-3.5" /> Upload file
                            </button>
                            <input type="file" ref={projectFileInputRef} onChange={handleProjectFileAdd} multiple className="hidden" />
                          </div>

                          <div className="space-y-1 max-h-40 overflow-y-auto">
                            {projectFilesList.length === 0 ? (
                              <div className="text-[10px] text-foreground/40 italic">No files loaded in project. Add code or text files above.</div>
                            ) : (
                              projectFilesList.map((pf) => (
                                <div key={pf.id} className="text-xs flex justify-between items-center bg-background px-3 py-1.5 rounded border border-border-color/30">
                                  <span className="truncate max-w-xs">{pf.name}</span>
                                  <span className="text-[10px] text-foreground/40">{(pf.size / 1024).toFixed(1)} KB</span>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      )}
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
        <div className="max-w-4xl mx-auto w-full space-y-6">
          <div>
            <h2 className="text-2xl font-serif font-bold text-foreground">Schedules & Automations</h2>
            <p className="text-xs text-foreground/50">Run automated prompt commands at custom periodic intervals locally.</p>
          </div>

          <div className="grid grid-cols-3 gap-6">
            {/* Create Schedule Card */}
            <div className="col-span-1 bg-card-bg border border-border-color rounded-xl p-4 space-y-3 h-fit shadow-xs">
              <h3 className="text-xs font-bold text-foreground/55 uppercase tracking-wider">New schedule</h3>
              <div className="space-y-2 text-xs">
                <input
                  type="text"
                  value={newSchedName}
                  onChange={(e) => setNewSchedName(e.target.value)}
                  placeholder="Task Name"
                  className="w-full bg-background border border-border-color rounded-lg px-2.5 py-1.5 text-xs text-foreground outline-none"
                />
                <input
                  type="text"
                  value={newSchedCron}
                  onChange={(e) => setNewSchedCron(e.target.value)}
                  placeholder="Cron Expression (e.g. */5 * * * *)"
                  className="w-full bg-background border border-border-color rounded-lg px-2.5 py-1.5 text-xs text-foreground font-mono outline-none"
                />
                <textarea
                  value={newSchedPrompt}
                  onChange={(e) => setNewSchedPrompt(e.target.value)}
                  placeholder="Execution Prompt query text..."
                  rows={3}
                  className="w-full bg-background border border-border-color rounded-lg px-2.5 py-1.5 text-xs text-foreground outline-none resize-none"
                />
                <select
                  value={newSchedMode}
                  onChange={(e) => setNewSchedMode(e.target.value as any)}
                  className="w-full bg-sidebar border border-border-color text-xs rounded-lg p-2 text-foreground"
                >
                  <option value="chat">Chat Mode</option>
                  <option value="agent">Agent Mode</option>
                </select>
                <button onClick={handleAddSchedule} className="w-full bg-accent hover:bg-accent-hover text-white text-xs font-bold py-2 rounded-lg transition">
                  Save Schedule
                </button>
              </div>
            </div>

            {/* Schedules list */}
            <div className="col-span-2 space-y-4">
              <h3 className="text-xs font-bold text-foreground/55 uppercase tracking-wider">Scheduled Tasks</h3>
              {schedulesList.length === 0 ? (
                <div className="text-xs text-foreground/40 italic p-6 bg-sidebar rounded-xl border border-border-color/50 text-center">
                  No schedules active. Create an automation schedule to run prompts periodically.
                </div>
              ) : (
                <div className="space-y-2">
                  {schedulesList.map((sched) => (
                    <div key={sched.id} className="bg-card-bg border border-border-color rounded-xl p-4 flex justify-between items-center text-xs">
                      <div className="space-y-1">
                        <div className="font-bold text-foreground">{sched.name}</div>
                        <div className="text-[10px] text-foreground/50 font-mono">Cron: {sched.cronExpression} • Mode: {sched.mode}</div>
                        <div className="text-[10px] text-foreground/60 line-clamp-1 italic">Prompt: "{sched.prompt}"</div>
                      </div>
                      <button onClick={() => handleDeleteSchedule(sched.id)} className="text-foreground/40 hover:text-rose-500 transition p-1">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ARTIFACTS MAIN VIEW */}
      {viewType === 'artifacts' && (
        <div className="max-w-4xl mx-auto w-full space-y-6">
          <div>
            <h2 className="text-2xl font-serif font-bold text-foreground">Artifacts Gallery</h2>
            <p className="text-xs text-foreground/50">Browse code blocks and responsive content generated by assistant models.</p>
          </div>

          <div className="bg-card-bg border border-border-color rounded-xl p-6 text-center text-xs text-foreground/40 italic">
            Artifacts generated inside chats will populate in this view gallery block.
          </div>
        </div>
      )}
      
    </div>
  );
}
