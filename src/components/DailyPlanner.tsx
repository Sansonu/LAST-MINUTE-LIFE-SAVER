import React, { useState } from 'react';
import { Calendar, Clock, Sparkles, Loader2, RefreshCw, ChevronRight, CheckSquare2, Square, MessageSquareQuote } from 'lucide-react';
import { Task, DailyPlan, UserSettings, TimeBlock } from '../types';

interface DailyPlannerProps {
  tasks: Task[];
  settings: UserSettings;
  currentPlan: DailyPlan | null;
  onSavePlan: (plan: DailyPlan) => void;
  onClearPlan: () => void;
}

export default function DailyPlanner({ tasks, settings, currentPlan, onSavePlan, onClearPlan }: DailyPlannerProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [completedBlocks, setCompletedBlocks] = useState<Record<string, boolean>>({});

  const activeTasks = tasks.filter(t => !t.isCompleted);

  const handleGeneratePlan = async () => {
    if (activeTasks.length === 0) {
      alert("No active tasks found! Please add some tasks first.");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/daily-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tasks: activeTasks,
          settings,
          currentTime: new Date().toISOString()
        })
      });

      if (!response.ok) throw new Error('Daily schedule planning failed');
      const data = await response.json();
      
      const newPlan: DailyPlan = {
        id: `plan-${Date.now()}`,
        date: new Date().toISOString().split('T')[0],
        rationale: data.rationale,
        timeBlocks: data.timeBlocks.map((tb: any, idx: number) => ({
          ...tb,
          id: `tb-${idx}-${Date.now()}`
        }))
      };

      onSavePlan(newPlan);
      // Reset blocks completed state
      setCompletedBlocks({});
    } catch (err) {
      console.error(err);
      alert('Could not plan schedule. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleBlockCompletion = (blockId: string) => {
    setCompletedBlocks(prev => ({
      ...prev,
      [blockId]: !prev[blockId]
    }));
  };

  const getBlockTypeStyle = (type: string, isCompleted: boolean) => {
    if (isCompleted) {
      return 'border-slate-100 bg-slate-50/50 text-slate-400 opacity-60';
    }

    switch (type) {
      case 'focus':
        return 'border-emerald-100 bg-emerald-50/40 text-emerald-800';
      case 'break':
        return 'border-blue-100 bg-blue-50/40 text-blue-800';
      case 'buffer':
        return 'border-amber-100 bg-amber-50/40 text-amber-800';
      case 'personal':
        return 'border-purple-100 bg-purple-50/40 text-purple-800';
      default:
        return 'border-slate-100 bg-white text-slate-800';
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
      {/* Schedule Configuration / Generator Trigger */}
      <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm flex flex-col gap-5 h-fit">
        <h3 className="text-base font-bold text-slate-800 flex items-center gap-1.5">
          <Calendar className="h-5 w-5 text-emerald-500" />
          AI Day Planner Engine
        </h3>

        <div className="flex flex-col gap-3 text-xs text-slate-500 font-semibold border-b border-slate-50 pb-4">
          <div className="flex justify-between">
            <span>Configured Work hours:</span>
            <span className="text-slate-800">{settings.workingHourStart} – {settings.workingHourEnd}</span>
          </div>
          <div className="flex justify-between">
            <span>Peak Energy Pattern:</span>
            <span className="text-slate-800 capitalize">{settings.energyPattern} Peak</span>
          </div>
          <div className="flex justify-between">
            <span>Schedule Load:</span>
            <span className="text-slate-800">{activeTasks.length} Active Tasks</span>
          </div>
        </div>

        <p className="text-xs text-slate-500 leading-relaxed font-medium">
          The Day Planner distributes your active tasks across custom focus sessions, scheduling resting buffers to maximize sustained workflow and prevent brain fatigue.
        </p>

        <button
          onClick={handleGeneratePlan}
          disabled={isLoading || activeTasks.length === 0}
          className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer text-xs disabled:opacity-50"
          id="generate-daily-plan-button"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Scheduling your timeline...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 text-emerald-100 animate-pulse" />
              Generate Daily Schedule
            </>
          )}
        </button>

        {currentPlan && (
          <button
            onClick={onClearPlan}
            className="w-full py-2 bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-700 font-bold rounded-xl transition-colors text-xs border border-slate-200 cursor-pointer"
            id="clear-daily-plan-button"
          >
            Clear Schedule Plan
          </button>
        )}
      </div>

      {/* Generated Plan Timeline Display */}
      <div className="lg:col-span-2 flex flex-col gap-5">
        {currentPlan ? (
          <>
            {/* AI Plan Rationale Statement */}
            <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5 flex gap-3">
              <MessageSquareQuote className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-amber-800 uppercase tracking-wider mb-0.5">Scheduling Rationale</h4>
                <p className="text-sm text-amber-950 font-medium leading-relaxed">
                  {currentPlan.rationale}
                </p>
              </div>
            </div>

            {/* Vertical Timeline list */}
            <div className="flex flex-col gap-3.5 relative pl-6 sm:pl-8 before:absolute before:left-[11px] sm:before:left-[15px] before:top-4 before:bottom-4 before:w-0.5 before:bg-slate-200">
              {currentPlan.timeBlocks.map((block) => {
                const isCompleted = !!completedBlocks[block.id];
                return (
                  <div
                    key={block.id}
                    className={`relative border rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 transition-all shadow-sm ${getBlockTypeStyle(block.type, isCompleted)}`}
                    id={`time-block-${block.id}`}
                  >
                    {/* Time dot indicator aligned with top-6 */}
                    <div className={`absolute -left-[17px] sm:-left-[21px] top-6 -translate-y-1/2 h-2.5 w-2.5 rounded-full border-2 bg-white transition-all ${
                      isCompleted ? 'border-slate-350 bg-slate-350' : 'border-emerald-500'
                    }`}></div>

                    <div className="flex items-start gap-3">
                      {/* Checkbox */}
                      <button
                        onClick={() => toggleBlockCompletion(block.id)}
                        className="mt-1 text-slate-400 hover:text-emerald-600 transition-colors cursor-pointer"
                        id={`toggle-block-checkbox-${block.id}`}
                      >
                        {isCompleted ? (
                          <CheckSquare2 className="h-5 w-5 text-slate-400" />
                        ) : (
                          <Square className="h-5 w-5" />
                        )}
                      </button>

                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold font-mono tracking-wide">
                            {block.startTime} – {block.endTime}
                          </span>
                          <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider ${
                            block.type === 'focus'
                              ? 'bg-emerald-100 text-emerald-800'
                              : block.type === 'break'
                              ? 'bg-blue-100 text-blue-800'
                              : block.type === 'buffer'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-purple-100 text-purple-800'
                          }`}>
                            {block.type}
                          </span>
                        </div>
                        <h4 className={`text-base font-extrabold leading-tight ${isCompleted ? 'line-through text-slate-400' : ''}`}>
                          {block.taskTitle}
                        </h4>
                        {block.notes && (
                          <p className={`text-xs ${isCompleted ? 'text-slate-400' : 'text-slate-550'} mt-0.5 font-medium`}>
                            {block.notes}
                          </p>
                        )}
                      </div>
                    </div>

                    {isCompleted && (
                      <span className="text-xs font-bold text-slate-400 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg self-start sm:self-auto">
                        Focus Block Done
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-100 p-16 text-center flex flex-col items-center justify-center gap-3 shadow-sm">
            <Calendar className="h-12 w-12 text-slate-300 animate-pulse" />
            <h4 className="text-lg font-bold text-slate-700">No active plan for today!</h4>
            <p className="text-sm text-slate-400 max-w-sm">
              Ready to crush your goals? Select your working preferences and trigger the Day Planner Engine to create an organized day.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
