import React, { useState } from 'react';
import { Calendar, Clock, AlertTriangle, CheckSquare, Trash2, RefreshCw, Layers, ArrowRight, Check, Play, Edit, CheckSquare2, Square } from 'lucide-react';
import { Task, Goal } from '../types';

interface TaskListProps {
  tasks: Task[];
  goals: Goal[];
  onToggleTask: (id: string, isCompleted: boolean, actualMinutes?: number) => void;
  onToggleSubtask: (taskId: string, subtaskId: string, isCompleted: boolean) => void;
  onDeleteTask: (id: string) => void;
  onTriggerPanic: () => void;
}

type FilterTab = 'all' | 'today' | 'overdue' | 'done';

export default function TaskList({ tasks, goals, onToggleTask, onToggleSubtask, onDeleteTask, onTriggerPanic }: TaskListProps) {
  const [filter, setFilter] = useState<FilterTab>('all');
  const [editingActualTimeId, setEditingActualTimeId] = useState<string | null>(null);
  const [actualTimeInput, setActualTimeInput] = useState<number>(30);

  const getGoalTitle = (id?: string) => {
    if (!id) return '';
    const goal = goals.find(g => g.id === id);
    return goal ? goal.title : '';
  };

  const getUrgencyClass = (task: Task) => {
    if (task.isCompleted) return 'border-slate-100 bg-slate-50/50 opacity-70';
    const deadlineTime = new Date(task.deadline).getTime();
    const now = Date.now();
    const diffHours = (deadlineTime - now) / (1000 * 60 * 60);

    if (diffHours < 0) return 'border-rose-100 bg-rose-50/20'; // Overdue
    if (diffHours <= 12) return 'border-amber-100 bg-amber-50/20'; // Very urgent
    return 'border-slate-100 bg-white hover:border-slate-200';
  };

  const isOverdue = (task: Task) => {
    return !task.isCompleted && new Date(task.deadline).getTime() < Date.now();
  };

  const isDueToday = (task: Task) => {
    if (task.isCompleted) return false;
    const deadlineDate = new Date(task.deadline).toDateString();
    const todayDate = new Date().toDateString();
    return deadlineDate === todayDate;
  };

  const filteredTasks = tasks.filter(task => {
    if (filter === 'done') return task.isCompleted;
    if (filter === 'overdue') return isOverdue(task);
    if (filter === 'today') return isDueToday(task);
    return !task.isCompleted; // 'all' shows active tasks
  });

  // Sort: Overdue first, then by earliest deadline
  const sortedTasks = [...filteredTasks].sort((a, b) => {
    if (a.isCompleted !== b.isCompleted) {
      return a.isCompleted ? 1 : -1;
    }
    return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
  });

  const getRelativeTimeString = (isoString: string) => {
    const time = new Date(isoString).getTime();
    const now = Date.now();
    const diffMs = time - now;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (diffMs < 0) {
      const absHours = Math.abs(diffHours);
      if (absHours === 0) return `Overdue by ${Math.abs(diffMins)}m`;
      return `Overdue by ${absHours}h ${Math.abs(diffMins)}m`;
    }

    if (diffHours === 0) return `Due in ${diffMins}m`;
    if (diffHours < 24) return `Due in ${diffHours}h ${diffMins}m`;
    return `Due on ${new Date(isoString).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`;
  };

  const handleToggleCompletionClick = (task: Task) => {
    if (!task.isCompleted) {
      // Prompt actual time input on complete (AF-8: time tracking)
      setEditingActualTimeId(task.id);
      setActualTimeInput(task.estimatedMinutes);
    } else {
      onToggleTask(task.id, false);
    }
  };

  const submitActualMinutes = (taskId: string) => {
    onToggleTask(taskId, true, Number(actualTimeInput));
    setEditingActualTimeId(null);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-50 p-2 rounded-xl border border-slate-150">
        <div className="flex flex-wrap items-center gap-1">
          {(['all', 'today', 'overdue', 'done'] as FilterTab[]).map((tab) => {
            const count = tasks.filter(t => {
              if (tab === 'done') return t.isCompleted;
              if (tab === 'overdue') return isOverdue(t);
              if (tab === 'today') return isDueToday(t);
              return !t.isCompleted;
            }).length;

            return (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`px-4 py-2 rounded-lg text-xs font-bold capitalize transition-all cursor-pointer ${
                  filter === tab
                    ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                id={`filter-tab-${tab}`}
              >
                {tab === 'all' ? 'Active List' : tab}
                <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 font-bold text-[10px]">
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {tasks.filter(t => !t.isCompleted).length > 2 && (
          <button
            onClick={onTriggerPanic}
            className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white font-bold rounded-lg text-xs transition-all flex items-center justify-center gap-1.5 shadow-sm shadow-rose-500/10 cursor-pointer"
            id="panic-mode-list-trigger"
          >
            <AlertTriangle className="h-3.5 w-3.5 animate-pulse" />
            Launch Panic Prioritizer
          </button>
        )}
      </div>

      {/* Task List Grid */}
      {sortedTasks.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center flex flex-col items-center justify-center gap-3">
          <CheckSquare className="h-10 w-10 text-slate-300" />
          <h4 className="text-base font-bold text-slate-700">No action plans here!</h4>
          <p className="text-sm text-slate-400 max-w-xs">
            {filter === 'done'
              ? 'You have not completed any tasks yet today. Make an action step!'
              : filter === 'overdue'
              ? 'Excellent job! You do not have any overdue plans right now.'
              : 'Add some messy notes or ask the voice assistant to draft your tasks!'}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {sortedTasks.map((task) => (
            <div
              key={task.id}
              className={`border rounded-2xl p-5 flex flex-col gap-4.5 transition-all ${getUrgencyClass(task)}`}
              id={`task-card-${task.id}`}
            >
              <div className="flex items-start justify-between gap-3 min-w-0">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  {/* Task Checkbox */}
                  <button
                    onClick={() => handleToggleCompletionClick(task)}
                    className="mt-1 text-slate-400 hover:text-emerald-500 cursor-pointer transition-colors shrink-0"
                    id={`toggle-task-checkbox-${task.id}`}
                  >
                    {task.isCompleted ? (
                      <CheckSquare2 className="h-5.5 w-5.5 text-emerald-500" />
                    ) : (
                      <Square className="h-5.5 w-5.5 hover:border-emerald-500" />
                    )}
                  </button>

                  <div className="flex flex-col gap-1 min-w-0 flex-1">
                    <span className={`text-base font-bold leading-tight break-words ${task.isCompleted ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                      {task.title}
                    </span>
                    {task.description && (
                      <p className={`text-xs break-words ${task.isCompleted ? 'text-slate-400' : 'text-slate-500'}`}>
                        {task.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Delete Button */}
                <button
                  onClick={() => onDeleteTask(task.id)}
                  className="text-slate-350 hover:text-red-500 p-1.5 rounded-lg hover:bg-slate-50 transition-colors"
                  title="Delete Action"
                  id={`delete-task-button-${task.id}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              {/* Subtasks / Checklist (AF-9) */}
              {task.subtasks.length > 0 && (
                <div className="bg-slate-50/50 rounded-xl p-3 border border-slate-100 flex flex-col gap-2 ml-8.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Task Checklist</span>
                  <div className="flex flex-col gap-2">
                    {task.subtasks.map((subtask) => (
                      <div key={subtask.id} className="flex items-center gap-2">
                        <button
                          onClick={() => onToggleSubtask(task.id, subtask.id, !subtask.isCompleted)}
                          className="text-slate-400 hover:text-emerald-500 cursor-pointer transition-colors"
                          id={`toggle-subtask-${subtask.id}`}
                        >
                          {subtask.isCompleted ? (
                            <CheckSquare2 className="h-4 w-4 text-emerald-400" />
                          ) : (
                            <Square className="h-4 w-4" />
                          )}
                        </button>
                        <span className={`text-xs font-medium ${subtask.isCompleted ? 'line-through text-slate-400' : 'text-slate-700'}`}>
                          {subtask.title}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* actual minutes popover on complete (AF-8) */}
              {editingActualTimeId === task.id && (
                <div className="bg-emerald-50/80 border border-emerald-100 rounded-xl p-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 ml-8.5 animate-pulse">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-emerald-600" />
                    <span className="text-xs font-bold text-emerald-800">Track Actual Completion Time:</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={actualTimeInput}
                      onChange={(e) => setActualTimeInput(Number(e.target.value))}
                      className="w-16 px-2 py-1 bg-white border border-emerald-200 rounded text-xs text-center font-bold outline-none text-emerald-800 focus:ring-1 focus:ring-emerald-400"
                      id="actual-minutes-input"
                    />
                    <span className="text-xs text-emerald-600">mins</span>
                    <button
                      onClick={() => submitActualMinutes(task.id)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1 rounded text-xs font-bold transition-colors cursor-pointer"
                      id="save-actual-minutes"
                    >
                      Complete
                    </button>
                  </div>
                </div>
              )}

              {/* Badge Strip */}
              <div className="flex flex-wrap items-center gap-2.5 ml-8.5 text-xs text-slate-400 font-semibold border-t border-slate-100/50 pt-2.5 mt-0.5">
                {/* Deadline */}
                <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                  isOverdue(task)
                    ? 'bg-red-100 text-red-800 border border-red-200'
                    : isDueToday(task)
                    ? 'bg-amber-100 text-amber-800 border border-amber-200'
                    : 'bg-slate-100 text-slate-600 border border-slate-150'
                }`}>
                  <Calendar className="h-3.5 w-3.5" />
                  {getRelativeTimeString(task.deadline)}
                </span>

                {/* Estimate */}
                <span className="flex items-center gap-1 bg-slate-50 text-slate-500 border border-slate-150 px-2.5 py-1 rounded-full text-[11px]">
                  <Clock className="h-3.5 w-3.5" />
                  Est: {task.estimatedMinutes}m
                  {task.actualMinutes && (
                    <span className="text-emerald-600 font-bold">
                      (Act: {task.actualMinutes}m)
                    </span>
                  )}
                </span>

                {/* Importance Priority */}
                <span className="bg-slate-50 text-slate-500 border border-slate-150 px-2.5 py-1 rounded-full text-[11px] font-bold">
                  Importance: {task.importance}/5
                </span>

                {/* Recurrence rule (AF-10) */}
                {task.recurrence !== 'none' && (
                  <span className="bg-blue-50 text-blue-700 border border-blue-150 px-2.5 py-1 rounded-full text-[11px] font-bold capitalize flex items-center gap-1">
                    <RefreshCw className="h-3 w-3 animate-spin-slow" />
                    {task.recurrence} Auto
                  </span>
                )}

                {/* Linked Long-Term Goal Badge (AF-7) */}
                {task.goalId && (
                  <span className="bg-emerald-50 text-emerald-700 border border-emerald-150 px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1">
                    <Layers className="h-3.5 w-3.5" />
                    Goal: {getGoalTitle(task.goalId)}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
