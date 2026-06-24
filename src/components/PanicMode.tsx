import React, { useState, useEffect, useRef } from 'react';
import { AlertTriangle, ShieldCheck, Flame, Loader2, Sparkles, Clock, Play, Pause, RotateCcw, ChevronRight, CheckSquare2, Square, Wand2 } from 'lucide-react';
import { Task } from '../types';

interface PanicModeProps {
  tasks: Task[];
  onUpdateTasks: (tasks: Task[]) => void;
  onAddTaskSubtasks: (taskId: string, subtaskTitles: string[]) => void;
}

interface RankedTask {
  taskId: string;
  rank: number;
  category: 'Critical' | 'High' | 'Medium' | 'Low';
  recommendedDuration: number;
  reasoning: string;
  procrastinationBuster: string;
}

interface PanicAnalysis {
  rationale: string;
  rankedTasks: RankedTask[];
}

export default function PanicMode({ tasks, onUpdateTasks, onAddTaskSubtasks }: PanicModeProps) {
  const [analysis, setAnalysis] = useState<PanicAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTimerTaskId, setActiveTimerTaskId] = useState<string | null>(null);
  
  // Focus Timer state
  const [timeLeft, setTimeLeft] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const timerRef = useRef<any>(null);

  // Subtask loading states
  const [loadingSubtaskTaskId, setLoadingSubtaskTaskId] = useState<string | null>(null);

  const activeTasks = tasks.filter(t => !t.isCompleted);

  const handleTriggerPanic = async () => {
    if (activeTasks.length === 0) {
      alert("No active tasks found! Please add tasks first, then panic.");
      return;
    }

    setIsLoading(true);
    setAnalysis(null);
    try {
      const response = await fetch('/api/panic-mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tasks: activeTasks,
          currentTime: new Date().toISOString()
        })
      });

      if (!response.ok) throw new Error('Panic mode analysis failed');
      const data = await response.json();
      setAnalysis(data);
    } catch (err) {
      console.error(err);
      alert('Could not complete prioritization. Please check if server is running or try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Focus Timer Logic (AF-8)
  useEffect(() => {
    if (isTimerRunning && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && isTimerRunning) {
      handleTimerComplete();
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isTimerRunning, timeLeft]);

  const startFocusTimer = (taskId: string, recommendedDuration: number) => {
    setActiveTimerTaskId(taskId);
    setTimeLeft(recommendedDuration * 60); // minutes to seconds
    setIsTimerRunning(true);
  };

  const handleTimerComplete = () => {
    setIsTimerRunning(false);
    if (timerRef.current) clearInterval(timerRef.current);
    
    // Play alert audio
    try {
      const context = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = context.createOscillator();
      const gain = context.createGain();
      osc.connect(gain);
      gain.connect(context.destination);
      osc.type = 'sine';
      osc.frequency.value = 520; // nice C chord-like frequency
      gain.gain.setValueAtTime(0, context.currentTime);
      gain.gain.linearRampToValueAtTime(0.5, context.currentTime + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 1.2);
      osc.start();
      osc.stop(context.currentTime + 1.3);
    } catch (e) {
      console.warn("AudioContext block", e);
    }

    alert("Incredible work! Your focus session is complete. Would you like to mark this task complete?");
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Subtask Breakdown Logic (AF-9)
  const handleAIBreakdown = async (taskId: string, taskTitle: string, taskDesc?: string) => {
    setLoadingSubtaskTaskId(taskId);
    try {
      const response = await fetch('/api/subtask-breakdown', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: taskTitle, description: taskDesc })
      });

      if (!response.ok) throw new Error('Subtask breakdown failed');
      const data = await response.json();
      
      // Add subtasks to task state via prop callback
      onAddTaskSubtasks(taskId, data.subtasks);
      alert(`AI created ${data.subtasks.length} subtasks! They have been synced into your task checklist.`);
    } catch (err) {
      console.error(err);
      alert('Could not break down task. Please try again.');
    } finally {
      setLoadingSubtaskTaskId(null);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Panic Dashboard Entry Header */}
      <div className="bg-gradient-to-r from-rose-500 via-pink-600 to-amber-500 rounded-3xl p-8 text-white relative overflow-hidden shadow-xl shadow-rose-500/10">
        <div className="absolute top-0 right-0 translate-y-[-10%] translate-x-[10%] opacity-15">
          <AlertTriangle className="h-64 w-64" />
        </div>

        <div className="flex flex-col gap-5 max-w-2xl relative z-10">
          <div className="bg-white/20 border border-white/25 px-3 py-1 rounded-full text-xs font-bold tracking-wider uppercase w-fit flex items-center gap-1.5">
            <Flame className="h-4 w-4 animate-bounce text-amber-200" />
            Extreme Procrastination Buster
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Too many deadlines? Feeling overwhelmed? Let's fix that.
          </h2>

          <p className="text-sm sm:text-base text-rose-100 font-medium leading-relaxed">
            Pasting or listing your chaotic chores causes decision paralysis. Our AI-driven Panic Mode ranks your workload, generates calming reasonings, and gives you a single 2-minute actionable first step to start right now.
          </p>

          <button
            onClick={handleTriggerPanic}
            disabled={isLoading || activeTasks.length === 0}
            className="w-fit bg-white hover:bg-slate-50 text-rose-600 font-extrabold px-6 py-3 rounded-2xl shadow-lg transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer text-sm disabled:opacity-50"
            id="trigger-panic-mode-button"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Gemini prioritizing your schedule...
              </>
            ) : (
              <>
                <ShieldCheck className="h-5 w-5" />
                Analyze & Calm My Brain ({activeTasks.length} Active Tasks)
              </>
            )}
          </button>
        </div>
      </div>

      {/* Focus Timer Modal Overlay/Card (AF-8) */}
      {activeTimerTaskId && (
        <div className="bg-slate-900 text-slate-100 border border-slate-800 rounded-3xl p-6 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-6 animate-fade-in-up">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 font-extrabold text-2xl tracking-tight">
              {formatTime(timeLeft)}
            </div>
            <div>
              <span className="text-[10px] font-bold tracking-wider uppercase text-slate-500 block">Active Focus Block (Pomodoro)</span>
              <p className="text-sm font-bold text-slate-200">
                {tasks.find(t => t.id === activeTimerTaskId)?.title || 'Task Focus Session'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsTimerRunning(!isTimerRunning)}
              className={`p-3 rounded-full cursor-pointer transition-all ${
                isTimerRunning ? 'bg-amber-500 text-slate-950 hover:bg-amber-400' : 'bg-emerald-500 text-white hover:bg-emerald-400'
              }`}
              title={isTimerRunning ? 'Pause' : 'Resume'}
              id="pause-resume-timer"
            >
              {isTimerRunning ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 fill-current" />}
            </button>
            <button
              onClick={() => { setTimeLeft(25 * 60); setIsTimerRunning(false); }}
              className="p-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-full transition-all cursor-pointer"
              title="Reset Timer"
              id="reset-focus-timer"
            >
              <RotateCcw className="h-5 w-5" />
            </button>
            <button
              onClick={() => { setActiveTimerTaskId(null); setIsTimerRunning(false); }}
              className="text-xs text-slate-500 hover:text-slate-300 font-semibold px-3 py-2 border border-slate-800 rounded-xl hover:bg-slate-850"
              id="close-focus-timer"
            >
              Close Timer
            </button>
          </div>
        </div>
      )}

      {/* Prioritization Analysis Results */}
      {analysis && (
        <div className="flex flex-col gap-6 animate-fade-in">
          {/* Calming AI Overview Statement */}
          <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5 flex items-start gap-3">
            <Sparkles className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold text-amber-800 uppercase tracking-wider mb-0.5">Calming Rationale</h4>
              <p className="text-sm text-amber-900 font-medium leading-relaxed">{analysis.rationale}</p>
            </div>
          </div>

          {/* Ranked list of items */}
          <div className="flex flex-col gap-4">
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="h-4 w-4" />
              Prioritized Action Schedule
            </h3>

            {analysis.rankedTasks.map((ranked, idx) => {
              const matchedTask = tasks.find(t => t.id === ranked.taskId);
              if (!matchedTask) return null;

              const isTopPick = ranked.rank === 1;

              return (
                <div
                  key={ranked.taskId}
                  className={`border rounded-3xl p-6 flex flex-col gap-4 transition-all ${
                    isTopPick
                      ? 'border-emerald-500 bg-emerald-50/20 shadow-md ring-2 ring-emerald-500/10'
                      : 'border-slate-150 bg-white hover:border-slate-200'
                  }`}
                  id={`ranked-task-${ranked.taskId}`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <span className={`h-8 w-8 rounded-full flex items-center justify-center font-black text-sm ${
                        isTopPick ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-600'
                      }`}>
                        #{ranked.rank}
                      </span>

                      <div>
                        {isTopPick && (
                          <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block mb-0.5">DO THIS NOW</span>
                        )}
                        <h4 className="text-base font-extrabold text-slate-800 leading-tight">
                          {matchedTask.title}
                        </h4>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 self-start sm:self-auto">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                        ranked.category === 'Critical'
                          ? 'bg-rose-100 text-rose-800'
                          : ranked.category === 'High'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {ranked.category} Priority
                      </span>
                      <span className="text-xs font-bold text-slate-400 flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        AI suggests {ranked.recommendedDuration}m
                      </span>
                    </div>
                  </div>

                  {/* AI Reasoning Text */}
                  <p className="text-sm text-slate-600 font-medium leading-relaxed">
                    {ranked.reasoning}
                  </p>

                  {/* Procrastination Buster Action Box */}
                  <div className="bg-amber-50/60 rounded-2xl border border-amber-100/50 p-4 flex items-start gap-3">
                    <Flame className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <h5 className="text-xs font-bold text-amber-800 uppercase tracking-wider mb-0.5">2-Minute Frictionless Start</h5>
                      <p className="text-sm text-slate-700 font-medium leading-relaxed">{ranked.procrastinationBuster}</p>
                    </div>
                  </div>

                  {/* Checkbox subtask count */}
                  {matchedTask.subtasks.length > 0 && (
                    <div className="text-xs font-bold text-slate-400 bg-slate-50 border border-slate-100 rounded-xl px-3 py-1.5 w-fit">
                      {matchedTask.subtasks.filter(s => s.isCompleted).length} of {matchedTask.subtasks.length} Subtasks Done
                    </div>
                  )}

                  {/* Quick action buttons */}
                  <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4 mt-1">
                    {/* Focus Timer Button (AF-8) */}
                    <button
                      onClick={() => startFocusTimer(ranked.taskId, ranked.recommendedDuration)}
                      className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                      id={`start-timer-${ranked.taskId}`}
                    >
                      <Play className="h-3.5 w-3.5 fill-current" />
                      Start focus timer ({ranked.recommendedDuration}m)
                    </button>

                    {/* AI Breakdown button (AF-9) */}
                    <button
                      onClick={() => handleAIBreakdown(ranked.taskId, matchedTask.title, matchedTask.description)}
                      disabled={loadingSubtaskTaskId === ranked.taskId}
                      className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-150 font-bold text-xs px-4 py-2.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                      id={`breakdown-task-${ranked.taskId}`}
                    >
                      {loadingSubtaskTaskId === ranked.taskId ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Breaking down...
                        </>
                      ) : (
                        <>
                          <Wand2 className="h-3.5 w-3.5" />
                          Break down with AI
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
