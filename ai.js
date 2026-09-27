/* =========================================================
   DAYOS V1 — AI CORE
   AI.js
   ========================================================= */

const DAYOS_AI = {
  version: "1.0.0",

  states: {
    IDLE: "IDLE",
    LISTENING: "LISTENING",
    UNDERSTANDING: "UNDERSTANDING",
    REASONING: "REASONING",
    PLANNING: "PLANNING",
    READY: "READY",
    ACTING: "ACTING"
  },

  state: "IDLE",

  memory: {
    tasks: [],
    goals: [],
    completions: [],
    preferences: {},
    interactions: [],
    recommendations: []
  }
};


/* =========================================================
   MEMORY
   ========================================================= */

function loadAIMemory() {
  try {
    const saved = localStorage.getItem("DAYOS_AI_MEMORY");

    if (saved) {
      const parsed = JSON.parse(saved);

      DAYOS_AI.memory = {
        ...DAYOS_AI.memory,
        ...parsed
      };
    }
  } catch (error) {
    console.warn("DAYOS memory load failed:", error);
  }
}

function saveAIMemory() {
  try {
    localStorage.setItem(
      "DAYOS_AI_MEMORY",
      JSON.stringify(DAYOS_AI.memory)
    );
  } catch (error) {
    console.warn("DAYOS memory save failed:", error);
  }
}

function remember(type, data) {
  if (!DAYOS_AI.memory[type]) {
    DAYOS_AI.memory[type] = [];
  }

  DAYOS_AI.memory[type].push({
    ...data,
    timestamp: Date.now()
  });

  // Prevent unlimited local memory
  if (DAYOS_AI.memory[type].length > 100) {
    DAYOS_AI.memory[type].shift();
  }

  saveAIMemory();
}


/* =========================================================
   CORE STATE
   ========================================================= */

function setAICoreState(state) {
  DAYOS_AI.state = state;

  const stateElement = document.getElementById("coreState");

  if (stateElement) {
    stateElement.textContent = state;
  }

  const core = document.getElementById("aiCore");

  if (core) {
    core.dataset.state = state;
  }

  console.log("DAYOS AI:", state);
}


/* =========================================================
   INTENT UNDERSTANDING
   ========================================================= */

function processUserIntent(input, context = {}) {
  setAICoreState(DAYOS_AI.states.UNDERSTANDING);

  const text = String(input || "").trim();

  if (!text) {
    return {
      intent: "unknown",
      text: "",
      priority: "normal"
    };
  }

  const lower = text.toLowerCase();

  let intent = "create_task";

  if (
    lower.includes("what should i do") ||
    lower.includes("what now") ||
    lower.includes("next task") ||
    lower.includes("what's next")
  ) {
    intent = "recommend";
  }

  if (
    lower.includes("finish") ||
    lower.includes("complete") ||
    lower.includes("done")
  ) {
    intent = "complete_task";
  }

  if (
    lower.includes("plan") ||
    lower.includes("schedule")
  ) {
    intent = "create_plan";
  }

  let priority = "normal";

  if (
    lower.includes("urgent") ||
    lower.includes("asap") ||
    lower.includes("important") ||
    lower.includes("exam") ||
    lower.includes("deadline")
  ) {
    priority = "high";
  }

  if (
    lower.includes("whenever") ||
    lower.includes("later") ||
    lower.includes("not urgent")
  ) {
    priority = "low";
  }

  return {
    intent,
    text,
    priority,
    context
  };
}


/* =========================================================
   TASK REASONING
   ========================================================= */

function reasonAboutTasks(tasks = [], constraints = {}) {
  setAICoreState(DAYOS_AI.states.REASONING);

  if (!Array.isArray(tasks) || tasks.length === 0) {
    return {
      selectedTask: null,
      reason: "There are no active tasks."
    };
  }

  const now = Date.now();

  const scoredTasks = tasks
    .filter(task => !task.completed)
    .map(task => {

      let score = 0;

      // Priority
      if (task.priority === "high") score += 50;
      if (task.priority === "medium") score += 30;
      if (task.priority === "normal") score += 20;
      if (task.priority === "low") score += 5;

      // Deadline
      if (task.deadline) {
        const deadline = new Date(task.deadline).getTime();
        const hoursLeft = (deadline - now) / 3600000;

        if (hoursLeft < 0) score += 100;
        else if (hoursLeft < 2) score += 80;
        else if (hoursLeft < 6) score += 60;
        else if (hoursLeft < 24) score += 40;
        else if (hoursLeft < 72) score += 20;
      }

      // Short tasks get a small boost
      if (task.duration) {
        const duration = Number(task.duration);

        if (duration <= 15) score += 10;
        else if (duration <= 30) score += 6;
      }

      return {
        task,
        score
      };
    });

  scoredTasks.sort((a, b) => b.score - a.score);

  const selected = scoredTasks[0];

  if (!selected) {
    return {
      selectedTask: null,
      reason: "All tasks are completed."
    };
  }

  return {
    selectedTask: selected.task,
    score: selected.score,
    reason: generateReason(selected.task, selected.score)
  };
}


/* =========================================================
   REASON GENERATOR
   ========================================================= */

function generateReason(task, score) {
  if (!task) {
    return "No task is currently available.";
  }

  if (task.deadline) {
    const deadline = new Date(task.deadline).getTime();
    const hoursLeft = (deadline - Date.now()) / 3600000;

    if (hoursLeft < 0) {
      return "This task is already past its deadline.";
    }

    if (hoursLeft < 6) {
      return "This task has a nearby deadline.";
    }
  }

  if (task.priority === "high") {
    return "This task has high priority.";
  }

  if (task.duration && Number(task.duration) <= 15) {
    return "This is a quick task that can be completed now.";
  }

  return "This is currently the highest-priority active task.";
}


/* =========================================================
   PLAN CREATION
   ========================================================= */

function createPlan(goal, context = {}) {
  setAICoreState(DAYOS_AI.states.PLANNING);

  const text = String(goal || "").trim();

  if (!text) {
    return {
      goal: "",
      steps: []
    };
  }

  const steps = [
    {
      id: createID(),
      title: `Start: ${text}`,
      status: "pending"
    },
    {
      id: createID(),
      title: `Work on the main part of ${text}`,
      status: "pending"
    },
    {
      id: createID(),
      title: `Review the result`,
      status: "pending"
    },
    {
      id: createID(),
      title: `Complete ${text}`,
      status: "pending"
    }
  ];

  const plan = {
    goal: text,
    steps,
    createdAt: Date.now()
  };

  remember("goals", {
    goal: text
  });

  return plan;
}


/* =========================================================
   NEXT ACTION
   ========================================================= */

function chooseNextAction(
  tasks = [],
  plan = null,
  constraints = {}
) {
  setAICoreState(DAYOS_AI.states.REASONING);

  const result = reasonAboutTasks(tasks, constraints);

  if (result.selectedTask) {
    const recommendation = {
      action: result.selectedTask,
      reason: result.reason,
      timestamp: Date.now()
    };

    remember("recommendations", {
      task: result.selectedTask,
      reason: result.reason
    });

    setAICoreState(DAYOS_AI.states.READY);

    return recommendation;
  }

  if (plan && Array.isArray(plan.steps)) {
    const nextStep = plan.steps.find(
      step => step.status !== "completed"
    );

    if (nextStep) {
      setAICoreState(DAYOS_AI.states.READY);

      return {
        action: nextStep,
        reason: "This is the next step in your current plan."
      };
    }
  }

  setAICoreState(DAYOS_AI.states.IDLE);

  return {
    action: null,
    reason: "Nothing needs your attention right now."
  };
}


/* =========================================================
   COMPLETE ACTION
   ========================================================= */

function completeTask(task) {
  if (!task) return null;

  setAICoreState(DAYOS_AI.states.ACTING);

  remember("completions", {
    taskId: task.id || null,
    title: task.title || task.text || "Task"
  });

  setAICoreState(DAYOS_AI.states.READY);

  return {
    success: true,
    task
  };
}


/* =========================================================
   AI PROVIDER
   ========================================================= */

/*
   This function is intentionally separated from the local
   reasoning engine.

   Later we can connect your actual AI backend here without
   rebuilding DAYOS.
*/

async function callRealAI(prompt, context = {}) {

  const endpoint = localStorage.getItem("DAYOS_AI_ENDPOINT");

  if (!endpoint) {
    return null;
  }

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        prompt,
        context
      })
    });

    if (!response.ok) {
      throw new Error(`AI server error: ${response.status}`);
    }

    return await response.json();

  } catch (error) {
    console.warn(
      "Real AI unavailable. Using local reasoning.",
      error
    );

    return null;
  }
}


/* =========================================================
   UNIFIED AI RESPONSE
   ========================================================= */

async function askDAYOS(input, context = {}) {

  setAICoreState(DAYOS_AI.states.LISTENING);

  const intent = processUserIntent(input, context);

  remember("interactions", {
    input: intent.text,
    intent: intent.intent
  });

  // Try real AI first
  const realAI = await callRealAI(
    intent.text,
    {
      ...context,
      memory: DAYOS_AI.memory
    }
  );

  if (realAI) {
    setAICoreState(DAYOS_AI.states.READY);
    return realAI;
  }

  // Local fallback
  if (intent.intent === "create_plan") {
    return createPlan(intent.text, context);
  }

  if (intent.intent === "recommend") {
    return chooseNextAction(
      context.tasks || [],
      context.plan || null,
      context.constraints || {}
    );
  }

  return {
    type: "task",
    intent,
    response: `Task understood: ${intent.text}`
  };
}


/* =========================================================
   UTILITIES
   ========================================================= */

function createID() {
  return (
    Date.now().toString(36) +
    Math.random().toString(36).substring(2, 8)
  );
}


/* =========================================================
   INITIALIZE
   ========================================================= */

function initializeDAYOSAI() {
  loadAIMemory();

  setAICoreState(DAYOS_AI.states.IDLE);

  console.log(
    `%cDAYOS AI Core v${DAYOS_AI.version} ONLINE`,
    "font-weight:bold;"
  );
}

initializeDAYOSAI();


/* =========================================================
   PUBLIC API
   ========================================================= */

window.DAYOS_AI = DAYOS_AI;

window.processUserIntent = processUserIntent;
window.reasonAboutTasks = reasonAboutTasks;
window.createPlan = createPlan;
window.chooseNextAction = chooseNextAction;
window.completeTask = completeTask;
window.askDAYOS = askDAYOS;
window.callRealAI = callRealAI;
