import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Volume2, VolumeX, Sparkles, X, Plus } from 'lucide-react';
import { Task, Goal } from '../types';

interface VoiceAssistantProps {
  tasks: Task[];
  goals: Goal[];
  onAddTaskDraft: (draft: { title: string; deadline: string; estimatedMinutes: number; importance: number }) => void;
  onNavigateToTab: (tab: string) => void;
  onClearPlan: () => void;
  onAddGoal: (goalData: { title: string; description?: string; targetDate: string }) => void;
}

export default function VoiceAssistant({ tasks, goals, onAddTaskDraft, onNavigateToTab, onClearPlan, onAddGoal }: VoiceAssistantProps) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isMinimized, setIsMinimized] = useState(true);

  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    // Check SpeechRecognition support
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = 'en-US';

      rec.onstart = () => {
        setIsListening(true);
        setTranscript('Listening...');
      };

      rec.onerror = (event: any) => {
        console.error('Speech recognition error', event);
        setIsListening(false);
        setTranscript('Sorry, couldn\'t capture that. Try again!');
      };

      rec.onend = () => {
        setIsListening(false);
      };

      rec.onresult = (event: any) => {
        const resultText = event.results[0][0].transcript;
        setTranscript(resultText);
        handleVoiceCommand(resultText);
      };

      recognitionRef.current = rec;
    }

    if ('speechSynthesis' in window) {
      synthRef.current = window.speechSynthesis;
    }

    return () => {
      if (synthRef.current) {
        synthRef.current.cancel();
      }
    };
  }, [tasks, goals]);

  const speakText = (text: string) => {
    if (!synthRef.current || !soundEnabled) return;
    
    // Stop any existing speech
    synthRef.current.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utteranceRef.current = utterance;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    // Pick a high-quality English voice if possible
    const voices = synthRef.current.getVoices();
    const cleanVoice = voices.find(v => v.lang.startsWith('en') && v.name.includes('Google')) || 
                       voices.find(v => v.lang.startsWith('en')) || 
                       voices[0];
    if (cleanVoice) utterance.voice = cleanVoice;

    synthRef.current.speak(utterance);
  };

  const handleVoiceCommand = async (text: string) => {
    setIsLoading(true);
    setIsMinimized(false);
    try {
      const response = await fetch('/api/voice-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: text,
          tasks: tasks.filter(t => !t.isCompleted),
          goals: goals.filter(g => !g.isCompleted),
          currentTime: new Date().toISOString()
        })
      });

      if (!response.ok) {
        throw new Error('Failed to get voice recommendation');
      }

      const data = await response.json();
      setAiResponse(data.spokenResponse);
      speakText(data.spokenResponse);

      // Perform actions based on parsed response
      if (data.action === 'add_task' && data.taskData) {
        onAddTaskDraft({
          title: data.taskData.title || 'New Voice Task',
          deadline: data.taskData.deadline || new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString().slice(0, 16),
          estimatedMinutes: data.taskData.estimatedMinutes || 30,
          importance: data.taskData.importance || 3
        });
      } else if (data.action === 'panic_mode') {
        setTimeout(() => onNavigateToTab('panic'), 1500);
      } else if (data.action === 'view_plan') {
        setTimeout(() => onNavigateToTab('plan'), 1500);
      } else if (data.action === 'clear_plan') {
        onClearPlan();
        setTimeout(() => onNavigateToTab('plan'), 1500);
      } else if (data.action === 'add_goal' && data.goalData) {
        onAddGoal({
          title: data.goalData.title,
          description: data.goalData.description,
          targetDate: data.goalData.targetDate
        });
        setTimeout(() => onNavigateToTab('goals'), 1500);
      }
    } catch (error) {
      console.error(error);
      setAiResponse('Sorry, I couldn\'t connect to Gemini. Let me know if I can help manually.');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert('Speech recognition is not supported in this browser. Please use Chrome for voice features.');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      setIsMinimized(false);
      if (synthRef.current) {
        synthRef.current.cancel();
      }
      recognitionRef.current.start();
    }
  };

  const stopSpeaking = () => {
    if (synthRef.current) {
      synthRef.current.cancel();
      setIsSpeaking(false);
    }
  };

  return (
    <>
      {/* Floating Widget Trigger Button */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
        {!isMinimized && (
          <div className="bg-slate-900 text-slate-100 border border-slate-800 rounded-2xl shadow-2xl p-4 w-80 max-w-[calc(100vw-2rem)] mb-2 flex flex-col gap-3 relative animate-fade-in-up">
            <button 
              onClick={() => { setIsMinimized(true); stopSpeaking(); }}
              className="absolute top-2 right-2 text-slate-400 hover:text-slate-200 transition-colors"
              id="close-voice-assistant"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-emerald-400 animate-pulse" />
              <span className="text-xs font-semibold tracking-wide uppercase text-slate-400">Gemini Productivity Companion</span>
            </div>

            {/* Transcript Area */}
            <div className="bg-slate-950 p-2.5 rounded-lg text-sm font-medium min-h-10 text-slate-300 border border-slate-850">
              {transcript || <span className="text-slate-500 italic">Say "Help me prioritize", "Clear today's schedule", or "Create a goal to run a marathon by September"</span>}
            </div>

            {/* AI Response Area */}
            {aiResponse && (
              <div className="bg-emerald-950/40 p-3 rounded-lg text-sm text-emerald-200 border border-emerald-900/30">
                <p className="font-semibold text-xs text-emerald-400 mb-1">AI Companion:</p>
                {aiResponse}
              </div>
            )}

            {/* Control Strip */}
            <div className="flex items-center justify-between border-t border-slate-800 pt-2.5 mt-1">
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  className={`p-1.5 rounded-md transition-colors ${soundEnabled ? 'text-emerald-400 hover:bg-slate-800' : 'text-slate-500 hover:bg-slate-800'}`}
                  title={soundEnabled ? 'Mute Speech Output' : 'Unmute Speech Output'}
                  id="toggle-voice-sound"
                >
                  {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                </button>
                {isSpeaking && (
                  <button
                    onClick={stopSpeaking}
                    className="text-xs text-red-400 font-medium px-2 py-0.5 rounded border border-red-950 bg-red-950/20 hover:bg-red-950/40"
                    id="stop-voice-speaking"
                  >
                    Stop voice
                  </button>
                )}
              </div>

              {isLoading && (
                <div className="text-xs text-slate-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping"></span>
                  Processing...
                </div>
              )}
            </div>
          </div>
        )}

        {/* The Action Microphone Button */}
        <button
          onClick={toggleListening}
          className={`h-14 w-14 rounded-full flex items-center justify-center shadow-xl border cursor-pointer transform transition-all hover:scale-105 active:scale-95 relative ${
            isListening
              ? 'bg-red-500 text-white border-red-400 animate-pulse'
              : 'bg-slate-900 text-emerald-400 border-slate-800 hover:bg-slate-850 hover:border-emerald-500/50'
          }`}
          title={isListening ? 'Listening... Click to stop' : 'Ask Voice Assistant'}
          id="mic-action-button"
        >
          {isListening ? (
            <MicOff className="h-6 w-6 animate-bounce" />
          ) : (
            <Mic className="h-6 w-6" />
          )}

          {isListening && (
            <span className="absolute -inset-1 rounded-full border border-red-400 animate-ping opacity-60"></span>
          )}
        </button>
      </div>
    </>
  );
}
