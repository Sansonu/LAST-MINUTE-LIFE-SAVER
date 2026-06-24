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

    const ai = getGenAI();
    const systemPrompt = `You are "The Last-Minute Life Saver" priority engine. You are a calm, hyper-rational, encouraging assistant who helps people beat procrastination and decision paralysis.
Given a list of chaotic tasks, you must prioritize them, recommend focus durations, explain your choice in a reassuring 1-2 sentence statement, and provide a tiny, concrete, ultra-simple "procrastination buster" action step (something the user can do in exactly 2 minutes to start without friction).

Current date and time: ${currentTime || new Date().toISOString()}`;

    const prompt = `Please prioritize these tasks. The user feels overwhelmed. Focus on deadlines, importance (scale 1-5), and time estimates.
Tasks:
${JSON.stringify(tasks, null, 2)}`;

    const response = await ai.models.generateContent({
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
    });

    res.json(JSON.parse(response.text || "{}"));
  } catch (error: any) {
    console.error("Error in /api/panic-mode:", error);
    res.status(500).json({ error: error.message || "Failed to analyze priorities." });
  }
});

// API: Generate Daily Schedule Plan
app.post("/api/daily-plan", async (req, res) => {
  try {
    const { tasks, settings, currentTime } = req.body;
    const ai = getGenAI();

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

    const response = await ai.models.generateContent({
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
    });

    res.json(JSON.parse(response.text || "{}"));
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

    const ai = getGenAI();
    const systemPrompt = `You are a micro-planning specialist. Your job is to take a scary, intimidating task and break it down into 3 to 6 micro-steps.
Each step must be extremely clear, bite-sized, and actionable. They should be ordered logically from first to last.
E.g. for "Write Research Paper", steps could be "Create draft file and write the title", "Write a 3-bullet-point outline", etc.`;

    const prompt = `Task Title: "${title}"
Task Description: "${description || "None"}"`;

    const response = await ai.models.generateContent({
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
    });

    res.json(JSON.parse(response.text || "{}"));
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

    const ai = getGenAI();
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

    const response = await ai.models.generateContent({
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
    });

    res.json(JSON.parse(response.text || "{}"));
  } catch (error: any) {
    console.error("Error in /api/voice-assistant:", error);
    res.status(500).json({ error: error.message || "Failed in Voice Assistant." });
  }
});

// API: Weekly Goal Review & Coaching
app.post("/api/weekly-goal-review", async (req, res) => {
  try {
    const { goals, tasks } = req.body;
    const ai = getGenAI();

    const systemPrompt = `You are a high-performance productivity coach. You review the user's goals and tasks, and provide a direct, actionable, yet hyper-encouraging coaching review.
Highlight what they did well, point out any goals that have lagging tasks, and offer exactly two specific tips to help them progress this week.
Be warm, professional, and empathetic. Limit your review to about 4-5 sentences total.`;

    const prompt = `Current Goals:
${JSON.stringify(goals || [], null, 2)}

Current Tasks:
${JSON.stringify(tasks || [], null, 2)}`;

    const response = await ai.models.generateContent({
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
    });

    res.json(JSON.parse(response.text || "{}"));
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
