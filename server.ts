import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";

dotenv.config();

// Validate Gemini API Key early
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.warn("WARNING: GEMINI_API_KEY environment variable is not set. AI features will fail.");
}

// Lazy initialization of Gemini Client
let aiClient: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY environment variable is required for this action.");
    }
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// Resilient helper to parse JSON text from Gemini responses, bypassing optional markdown tags
function parseResilientJson(text: string): any {
  let cleanText = text.trim();
  if (cleanText.startsWith("```json")) {
    cleanText = cleanText.substring(7);
  }
  if (cleanText.startsWith("```")) {
    cleanText = cleanText.substring(3);
  }
  if (cleanText.endsWith("```")) {
    cleanText = cleanText.substring(0, cleanText.length - 3);
  }
  return JSON.parse(cleanText.trim());
}

async function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Global robust caller that performs exponential backoff on 429/Resource Exhausted errors
// and falls back to a custom TS programmatic backup if the limits are exhausted.
async function safeGenerateContent(
  generateConfig: any,
  fallbackGenerator: () => any
): Promise<any> {
  const maxRetries = 2;
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      const ai = getGenAI();
      const response = await ai.models.generateContent(generateConfig);
      if (response && response.text) {
        return parseResilientJson(response.text);
      }
      throw new Error("Empty response received from Gemini API.");
    } catch (error: any) {
      attempt++;
      const errMsg = error.message || String(error);
      const isRateLimit =
        errMsg.includes("429") ||
        errMsg.includes("RESOURCE_EXHAUSTED") ||
        errMsg.includes("quota") ||
        errMsg.includes("Quota");

      if (isRateLimit && attempt < maxRetries) {
        console.warn(
          `[Gemini API] Rate limit (429/RESOURCE_EXHAUSTED) hit on attempt ${attempt}. Retrying in ${1.5 * attempt}s...`
        );
        await delay(1500 * attempt);
        continue;
      }

      console.error(
        `[Gemini API Error] Failed to generate content (Attempt ${attempt}/${maxRetries}):`,
        errMsg
      );
      break;
    }
  }

  console.warn(
    "[Gemini API] Reached failure threshold. Activating programmatic robust fallback to ensure seamless user experience."
  );
  return fallbackGenerator();
}

// --- Dynamic Fallback Generators ---

function getPanicModeFallback(tasks: any[], currentTime?: string) {
  const sortedTasks = [...(tasks || [])]
    .filter((t: any) => !t.isCompleted)
    .sort((a: any, b: any) => {
      const deadlineA = new Date(a.deadline).getTime();
      const deadlineB = new Date(b.deadline).getTime();
      if (deadlineA !== deadlineB) {
        return deadlineA - deadlineB;
      }
      return (b.importance || 3) - (a.importance || 3);
    });

  const rankedTasks = sortedTasks.map((task: any, index: number) => {
    const rank = index + 1;
    let category = "Medium";
    if (rank === 1) category = "Critical";
    else if (rank === 2) category = "High";
    else if (rank > 4) category = "Low";

    const recommendedDuration = task.estimatedMinutes && task.estimatedMinutes <= 25 ? 15 : 25;

    return {
      taskId: task.id,
      rank,
      category,
      recommendedDuration,
      reasoning: `Highly ranked due to its urgency (deadline: ${new Date(task.deadline).toLocaleDateString()}) and importance factor of ${task.importance || 3}/5.`,
      procrastinationBuster: `Take a deep breath and work on "${task.title}" for just 2 minutes. The hardest part is simply starting.`
    };
  });

  return {
    rationale: "I've structured a focused, low-stress prioritization sequence for your tasks. We front-loaded urgent items and structured 2-minute 'procrastination busters' to help you build focus momentum smoothly.",
    rankedTasks
  };
}

function getDailyPlanFallback(tasks: any[], settings: any, currentTime?: string) {
  const startHour = settings?.workingHourStart || "09:00";
  const endHour = settings?.workingHourEnd || "22:00";
  const energy = settings?.energyPattern || "flexible";

  let [startH, startM] = startHour.split(":").map(Number);
  let [endH, endM] = endHour.split(":").map(Number);
  if (isNaN(startH)) { startH = 9; startM = 0; }
  if (isNaN(endH)) { endH = 22; endM = 0; }

  const timeBlocks: any[] = [];
  let currentH = startH;
  let currentM = startM;

  function addMinutes(h: number, m: number, mins: number) {
    const totalMins = h * 60 + m + mins;
    const newH = Math.floor(totalMins / 60) % 24;
    const newM = totalMins % 60;
    return [newH, newM];
  }

  function formatTime(h: number, m: number) {
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  }

  const activeTasks = (tasks || []).filter((t: any) => !t.isCompleted);
  
  const sortedTasks = [...activeTasks].sort((a: any, b: any) => {
    if (energy === "morning") {
      return (b.importance || 3) - (a.importance || 3);
    }
    return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
  });

  let taskIndex = 0;

  while (true) {
    const currentTotalMins = currentH * 60 + currentM;
    const endTotalMins = endH * 60 + endM;
    if (currentTotalMins >= endTotalMins) {
      break;
    }

    const startStr = formatTime(currentH, currentM);

    const hasLunch = timeBlocks.some((b: any) => b.taskTitle === "Lunch Break");
    if (currentH >= 12 && !hasLunch) {
      const [nextH, nextM] = addMinutes(currentH, currentM, 60);
      timeBlocks.push({
        startTime: startStr,
        endTime: formatTime(nextH, nextM),
        taskTitle: "Lunch Break",
        type: "personal",
        notes: "Take a real step away from your workspace, nourish yourself, and completely rest."
      });
      currentH = nextH;
      currentM = nextM;
      continue;
    }

    if (taskIndex < sortedTasks.length) {
      const currentTask = sortedTasks[taskIndex];
      const duration = Math.min(60, currentTask.estimatedMinutes || 45);
      const [nextH, nextM] = addMinutes(currentH, currentM, duration);
      
      timeBlocks.push({
        startTime: startStr,
        endTime: formatTime(nextH, nextM),
        taskTitle: currentTask.title,
        type: "focus",
        notes: `Focus purely on "${currentTask.title}". Keep distractions away and proceed with your outline.`
      });

      currentH = nextH;
      currentM = nextM;
      taskIndex++;

      if (currentH * 60 + currentM < endTotalMins) {
        const breakStartStr = formatTime(currentH, currentM);
        const [breakNextH, breakNextM] = addMinutes(currentH, currentM, 15);
        timeBlocks.push({
          startTime: breakStartStr,
          endTime: formatTime(breakNextH, breakNextM),
          taskTitle: "Rest and Stretch Break",
          type: "break",
          notes: "Do a quick physical stretch, drink some water, and rest your eyes from screens."
        });
        currentH = breakNextH;
        currentM = breakNextM;
      }
    } else {
      const [nextH, nextM] = addMinutes(currentH, currentM, 45);
      timeBlocks.push({
        startTime: startStr,
        endTime: formatTime(nextH, nextM),
        taskTitle: "Admin Review & Buffer",
        type: "buffer",
        notes: "Wrap up loose ends, organize notes, and outline your target list for tomorrow."
      });
      currentH = nextH;
      currentM = nextM;
      break;
    }
  }

  return {
    rationale: `I've prepared a highly optimized daily schedule tailored to your ${energy} energy pattern. Focused blocks are balanced with short stretches and a dedicated rest window.`,
    timeBlocks
  };
}

function getSubtaskBreakdownFallback(title: string, description?: string) {
  return {
    subtasks: [
      `Review task requirements and clarify final deliverables for "${title}".`,
      "Draft a basic structural outline or clear action steps checklist.",
      "Tackle the first micro-component for 20 minutes to clear the start resistance.",
      "Flesh out the main sections with continuous, uninhibited focus.",
      "Review your output, polish presentation, and tick off as complete."
    ]
  };
}

function getWeeklyGoalReviewFallback(goals: any[], tasks: any[]) {
  const activeTasks = (tasks || []).filter((t: any) => !t.isCompleted);
  const completedTasks = (tasks || []).filter((t: any) => t.isCompleted);
  const activeGoals = (goals || []).filter((g: any) => !g.isCompleted);

  return {
    reviewText: `Fantastic job tracking your progress! You've successfully completed ${completedTasks.length} tasks and have ${activeTasks.length} active. Out of your ${activeGoals.length} goals, make sure you are tackling a small sub-step daily. Consistency builds monumental milestones!`
  };
}

function getVoiceAssistantFallback(transcript: string, tasks: any[], goals: any[], currentTime?: string) {
  const text = (transcript || "").toLowerCase().trim();
  const now = currentTime ? new Date(currentTime) : new Date();

  function getRelativeDate(daysOffset: number): string {
    const target = new Date(now);
    target.setDate(target.getDate() + daysOffset);
    return target.toISOString().split("T")[0];
  }

  if (text.includes("clear") || text.includes("wipe") || text.includes("delete") || text.includes("empty")) {
    if (text.includes("plan") || text.includes("schedule") || text.includes("day") || text.includes("today")) {
      return {
        spokenResponse: "I have cleared your planned tasks and daily schedule for today. You can start fresh whenever you'd like!",
        action: "clear_plan"
      };
    }
  }

  if (text.includes("what should i do") || text.includes("panic") || text.includes("recommend") || text.includes("prioritize") || text.includes("choose") || text.includes("next")) {
    const activeTasks = (tasks || []).filter((t: any) => !t.isCompleted);
    if (activeTasks.length > 0) {
      const topTask = [...activeTasks].sort((a: any, b: any) => {
        const diff = new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
        if (Math.abs(diff) < 2 * 60 * 60 * 1000) {
          return (b.importance || 3) - (a.importance || 3);
        }
        return diff;
      })[0];

      return {
        spokenResponse: `Based on your deadlines, I recommend dedicating your immediate focus to "${topTask.title}". It has the highest priority and starting only takes two minutes!`,
        action: "panic_mode"
      };
    } else {
      return {
        spokenResponse: "You don't have any active tasks on your plate right now. You are fully caught up! Try adding a task to get started.",
        action: "none"
      };
    }
  }

  if (text.includes("show my schedule") || text.includes("view schedule") || text.includes("show plan") || text.includes("view plan") || text.includes("timeline")) {
    return {
      spokenResponse: "Let's check out your daily timeline! Here is what we have scheduled for today.",
      action: "view_plan"
    };
  }

  if (text.includes("goal")) {
    let title = "My New Strategic Goal";
    let targetDate = getRelativeDate(14);

    const matchGoalTo = text.match(/goal to\s+(.+)/);
    const matchGoal = text.match(/goal\s+(.+)/);
    const rawTarget = matchGoalTo ? matchGoalTo[1] : (matchGoal ? matchGoal[1] : "");

    if (rawTarget) {
      let cleanTitle = rawTarget;
      const byMatch = rawTarget.match(/(.+)by\s+(.+)/);
      if (byMatch) {
        cleanTitle = byMatch[1].trim();
        const relativeText = byMatch[2].trim();
        if (relativeText.includes("tomorrow")) targetDate = getRelativeDate(1);
        else if (relativeText.includes("next week")) targetDate = getRelativeDate(7);
        else if (relativeText.includes("friday")) targetDate = getRelativeDate(4);
      }
      title = cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1).trim();
    }

    return {
      spokenResponse: `I have created a new goal for you: "${title}", with a target date of ${targetDate}.`,
      action: "add_goal",
      goalData: {
        title,
        description: "Milestone established via smart voice command.",
        targetDate
      }
    };
  }

  if (text.includes("add") || text.includes("task") || text.includes("remind") || text.includes("schedule")) {
    let title = "New Important Task";
    let deadline = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16);
    let estimatedMinutes = 30;
    let importance = 3;

    const matchTaskTo = text.match(/(?:add task|remind me to|schedule)\s+(.+)/);
    const matchAdd = text.match(/add\s+(.+)/);
    const rawTarget = matchTaskTo ? matchTaskTo[1] : (matchAdd ? matchAdd[1] : "");

    if (rawTarget) {
      let cleanTitle = rawTarget;
      const byMatch = rawTarget.match(/(.+)by\s+(.+)/);
      if (byMatch) {
        cleanTitle = byMatch[1].trim();
        const relativeText = byMatch[2].trim();
        if (relativeText.includes("tomorrow")) {
          const tom = new Date(now);
          tom.setDate(tom.getDate() + 1);
          deadline = tom.toISOString().slice(0, 16);
        } else if (relativeText.includes("today")) {
          const today = new Date(now);
          today.setHours(today.getHours() + 4);
          deadline = today.toISOString().slice(0, 16);
        }
      }
      title = cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1).trim();
    }

    return {
      spokenResponse: `I've drafted that task for you! I scheduled it for tomorrow with an estimated ${estimatedMinutes} minutes. Shall we add it?`,
      action: "add_task",
      taskData: {
        title,
        deadline,
        estimatedMinutes,
        importance
      }
    };
  }

  return {
    spokenResponse: `I hear you! I'm here to help you get organized. You can ask me to add tasks, prioritize, or clear your schedule anytime.`,
    action: "none"
  };
}

const app = express();
const PORT = 3000;

app.use(express.json());

// API: Panic Mode prioritization
app.post("/api/panic-mode", async (req, res) => {
  try {
    const { tasks, currentTime } = req.body;
    if (!tasks || !Array.isArray(tasks) || tasks.length === 0) {
      return res.status(400).json({ error: "At least one task is required for Panic Mode." });
    }

    const systemPrompt = `You are "The Last-Minute Life Saver" priority engine. You are a calm, hyper-rational, encouraging assistant who helps people beat procrastination and decision paralysis.
Given a list of chaotic tasks, you must prioritize them, recommend focus durations, explain your choice in a reassuring 1-2 sentence statement, and provide a tiny, concrete, ultra-simple "procrastination buster" action step (something the user can do in exactly 2 minutes to start without friction).

Current date and time: ${currentTime || new Date().toISOString()}`;

    const prompt = `Please prioritize these tasks. The user feels overwhelmed. Focus on deadlines, importance (scale 1-5), and time estimates.
Tasks:
${JSON.stringify(tasks, null, 2)}`;

    const result = await safeGenerateContent(
      {
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              rationale: {
                type: Type.STRING,
                description: "A calming overview of why this ranking works and an encouraging message.",
              },
              rankedTasks: {
                type: Type.ARRAY,
                description: "The prioritized tasks, ranked from 1 (highest priority) to N.",
                items: {
                  type: Type.OBJECT,
                  properties: {
                    taskId: { type: Type.STRING, description: "The original ID of the task." },
                    rank: { type: Type.INTEGER, description: "Priority rank number, starting from 1." },
                    category: { type: Type.STRING, description: "Calculated level: 'Critical' (urgently due), 'High', 'Medium', or 'Low'." },
                    recommendedDuration: { type: Type.INTEGER, description: "Suggested focus timer duration in minutes (e.g., 15, 25, 45)." },
                    reasoning: { type: Type.STRING, description: "1-2 sentences of calm, logical reasoning on why this task is in this position." },
                    procrastinationBuster: { type: Type.STRING, description: "An ultra-simple 2-minute starter step. E.g., 'Just open your book to page 1' or 'Create a blank document and title it'." }
                  },
                  required: ["taskId", "rank", "category", "recommendedDuration", "reasoning", "procrastinationBuster"]
                }
              }
            },
            required: ["rationale", "rankedTasks"]
          }
        }
      },
      () => getPanicModeFallback(tasks, currentTime)
    );

    res.json(result);
  } catch (error: any) {
    console.error("Error in /api/panic-mode:", error);
    res.status(500).json({ error: error.message || "Failed to analyze priorities." });
  }
});

// API: Generate Daily Schedule Plan
app.post("/api/daily-plan", async (req, res) => {
  try {
    const { tasks, settings, currentTime } = req.body;

    const startHour = settings?.workingHourStart || "09:00";
    const endHour = settings?.workingHourEnd || "22:00";
    const energy = settings?.energyPattern || "flexible";

    const systemPrompt = `You are a scheduling genius. You design realistic daily timelines that combat burnout and maximize productivity.
You will receive a list of tasks, user working hours (${startHour} to ${endHour}), and their energy pattern (${energy}).
Create a chronological list of time blocks spanning their day, including focus sessions for their tasks, short breaks, a meal break, and buffer/rest blocks.
Make sure to follow their energy pattern:
- morning: front-load highly important/difficult tasks in the morning.
- afternoon: schedule deep work in the afternoon.
- evening: schedule deep work in the evening.
- flexible: space out deep work evenly.

Do not plan more than 90 minutes of consecutive deep work without a break.
Use the estimated durations of the tasks but feel free to break them into smaller slots if needed.`;

    const prompt = `Current time: ${currentTime || new Date().toISOString()}
Working hours: ${startHour} to ${endHour}
Energy Pattern: ${energy}
Tasks to schedule:
${JSON.stringify(tasks || [], null, 2)}`;

    const result = await safeGenerateContent(
      {
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              rationale: {
                type: Type.STRING,
                description: "A friendly explanation of how today's schedule is structured based on energy levels and deadlines.",
              },
              timeBlocks: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    startTime: { type: Type.STRING, description: "Start time of block in 24-hour HH:MM format." },
                    endTime: { type: Type.STRING, description: "End time of block in 24-hour HH:MM format." },
                    taskTitle: { type: Type.STRING, description: "Title of the task being worked on, or 'Short Break', 'Lunch Break', 'Buffer Block'." },
                    type: { type: Type.STRING, description: "One of: 'focus' (deep work), 'break' (short rest), 'buffer' (admin/email), 'personal' (meals/hygiene)." },
                    notes: { type: Type.STRING, description: "Specific guidance for this slot (e.g., 'Work on introduction', 'Grab a glass of water and walk away from screens')." }
                  },
                  required: ["startTime", "endTime", "taskTitle", "type", "notes"]
                }
              }
            },
            required: ["rationale", "timeBlocks"]
          }
        }
      },
      () => getDailyPlanFallback(tasks, settings, currentTime)
    );

    res.json(result);
  } catch (error: any) {
    console.error("Error in /api/daily-plan:", error);
    res.status(500).json({ error: error.message || "Failed to generate daily plan." });
  }
});

// API: Subtask Breakdown
app.post("/api/subtask-breakdown", async (req, res) => {
  try {
    const { title, description } = req.body;
    if (!title) {
      return res.status(400).json({ error: "Task title is required." });
    }

    const systemPrompt = `You are a micro-planning specialist. Your job is to take a scary, intimidating task and break it down into 3 to 6 micro-steps.
Each step must be extremely clear, bite-sized, and actionable. They should be ordered logically from first to last.
E.g. for "Write Research Paper", steps could be "Create draft file and write the title", "Write a 3-bullet-point outline", etc.`;

    const prompt = `Task Title: "${title}"
Task Description: "${description || "None"}"`;

    const result = await safeGenerateContent(
      {
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              subtasks: {
                type: Type.ARRAY,
                description: "A list of actionable micro-step strings.",
                items: { type: Type.STRING }
              }
            },
            required: ["subtasks"]
          }
        }
      },
      () => getSubtaskBreakdownFallback(title, description)
    );

    res.json(result);
  } catch (error: any) {
    console.error("Error in /api/subtask-breakdown:", error);
    res.status(500).json({ error: error.message || "Failed to generate subtask breakdown." });
  }
});

// API: Voice Assistant parsing and speech synthesis logic
app.post("/api/voice-assistant", async (req, res) => {
  try {
    const { transcript, tasks, goals, currentTime } = req.body;
    if (!transcript) {
      return res.status(400).json({ error: "Transcript is required." });
    }

    const systemPrompt = `You are "The Last-Minute Life Saver" Voice Assistant. You speak directly to the user.
Your tone is friendly, positive, concise, and incredibly supportive. You help the user manage tasks, panic levels, and schedules.

Current Time: ${currentTime || new Date().toISOString()}

You must analyze the user's transcript and decide:
1. Is the user trying to ADD a task? (e.g., "add task study physics tomorrow at five", "remind me to pay bills in three hours", "schedule workout today at 6 PM")
   If yes:
   - Set 'action' = "add_task"
   - Populate 'taskData' with title, calculated ISO deadline (or YYYY-MM-DDTHH:mm based on current time), estimated duration (minutes), and importance (1 to 5, default 3).
   - In 'spokenResponse', say: "I've drafted that task for you! I scheduled it for [deadline date/time] with an estimated [duration] minutes. Shall we add it?"
2. Is the user asking for recommendations or what to do next? (e.g., "what should I do?", "help me choose what to work on", "I'm panicking")
   If yes:
   - Set 'action' = "panic_mode" (or "recommendation")
   - In 'spokenResponse', say a comforting sentence and highlight the single most important task they should focus on from their list: ${JSON.stringify(tasks || [])}. Mention why based on deadlines.
3. Is the user asking to see their schedule or timeline? (e.g., "show my schedule", "what is my plan for today?")
   If yes:
   - Set 'action' = "view_plan"
   - In 'spokenResponse', say: "Let's check out your daily timeline! Here is what we have scheduled."
4. Is the user asking to CLEAR today's planned tasks or daily schedule? (e.g., "clear my plan", "clear today's schedule", "wipe daily plan", "clear planned tasks", "clear my day")
   If yes:
   - Set 'action' = "clear_plan"
   - In 'spokenResponse', say: "I have cleared your planned tasks and daily schedule for today."
5. Is the user trying to CREATE a new goal directly? (e.g., "add a goal to read 5 books by next week", "create a goal to run a marathon by September 20th", "new goal to learn React by Friday", "set a goal to build a website")
   If yes:
   - Set 'action' = "add_goal"
   - Populate 'goalData' with 'title', 'description' (optional/default summary), and 'targetDate' (formatted as YYYY-MM-DD, calculated based on current time or user request).
   - In 'spokenResponse', say: "I have created a new goal for you: '[goal title]', with a target date of [targetDate]."
6. Otherwise:
   - Set 'action' = "none"
   - In 'spokenResponse', provide a brief (1-3 sentences), warm answer addressing their question. E.g., if they say hello, greet them. If they talk about stress, offer comfort. Refer to their current tasks ${JSON.stringify(tasks || [])} and goals ${JSON.stringify(goals || [])} to stay contextual.`;

    const prompt = `User said: "${transcript}"`;

    const result = await safeGenerateContent(
      {
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              spokenResponse: {
                type: Type.STRING,
                description: "A short, engaging speech-friendly response to read back using browser text-to-speech."
              },
              action: {
                type: Type.STRING,
                description: "One of: 'add_task', 'panic_mode', 'view_plan', 'clear_plan', 'add_goal', or 'none'."
              },
              taskData: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING, description: "Title of the task." },
                  deadline: { type: Type.STRING, description: "Calculated ISO date string or YYYY-MM-DDTHH:mm." },
                  estimatedMinutes: { type: Type.INTEGER, description: "Estimated task duration in minutes." },
                  importance: { type: Type.INTEGER, description: "Importance rating, from 1 (low) to 5 (high)." }
                }
              },
              goalData: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING, description: "Title of the goal." },
                  description: { type: Type.STRING, description: "Short description of the goal." },
                  targetDate: { type: Type.STRING, description: "Calculated target date in YYYY-MM-DD format." }
                },
                required: ["title", "targetDate"]
              }
            },
            required: ["spokenResponse", "action"]
          }
        }
      },
      () => getVoiceAssistantFallback(transcript, tasks, goals, currentTime)
    );

    res.json(result);
  } catch (error: any) {
    console.error("Error in /api/voice-assistant:", error);
    res.status(500).json({ error: error.message || "Failed in Voice Assistant." });
  }
});

// API: Weekly Goal Review & Coaching
app.post("/api/weekly-goal-review", async (req, res) => {
  try {
    const { goals, tasks } = req.body;

    const systemPrompt = `You are a high-performance productivity coach. You review the user's goals and tasks, and provide a direct, actionable, yet hyper-encouraging coaching review.
Highlight what they did well, point out any goals that have lagging tasks, and offer exactly two specific tips to help them progress this week.
Be warm, professional, and empathetic. Limit your review to about 4-5 sentences total.`;

    const prompt = `Current Goals:
${JSON.stringify(goals || [], null, 2)}

Current Tasks:
${JSON.stringify(tasks || [], null, 2)}`;

    const result = await safeGenerateContent(
      {
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              reviewText: {
                type: Type.STRING,
                description: "A solid, cohesive paragraph of coaching advice."
              }
            },
            required: ["reviewText"]
          }
        }
      },
      () => getWeeklyGoalReviewFallback(goals, tasks)
    );

    res.json(result);
  } catch (error: any) {
    console.error("Error in /api/weekly-goal-review:", error);
    res.status(500).json({ error: error.message || "Failed to generate goal review." });
  }
});

async function startServer() {
  // Vite integration
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
