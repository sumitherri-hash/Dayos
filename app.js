// DAYOS V1
// Understand → Prioritize → Recommend → Act → Remember

const STORAGE_KEY = "dayos_tasks_v1";

let tasks = loadTasks();
let currentTaskId = null;

// --------------------
// DOM
// --------------------

const taskInput = document.getElementById("taskInput");
const addButton = document.getElementById("addButton");
const micButton = document.getElementById("micButton");

const taskList = document.getElementById("taskList");
const taskCount = document.getElementById("taskCount");

const nextAction = document.getElementById("nextAction");
const nextReason = document.getElementById("nextReason");
const completeButton = document.getElementById("completeButton");

const coreState = document.getElementById("coreState");
const aiCore = document.getElementById("aiCore");

// --------------------
// MEMORY
// --------------------

function loadTasks() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveTasks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

// --------------------
// AI CORE
// --------------------

function setCoreState(state) {
  coreState.textContent = state;
}

function thinking(callback) {
  setCoreState("THINKING");

  setTimeout(() => {
    callback();
    setCoreState("READY");
  }, 350);
}

// --------------------
// TEXT UNDERSTANDING
// --------------------

function cleanTaskText(text) {
  let result = text.trim();

  result = result.replace(/\s+/g, " ");

  // Remove common speech fillers.
  result = result.replace(
    /^(uh|um|hey|okay|ok|so|actually)[,\s]+/i,
    ""
  );

  if (!result) return "";

  return result.charAt(0).toUpperCase() + result.slice(1);
}

function detectPriority(text) {
  const lower = text.toLowerCase();

  if (
    lower.includes("urgent") ||
    lower.includes("asap") ||
    lower.includes("exam") ||
    lower.includes("tomorrow") ||
    lower.includes("due")
  ) {
    return 3;
  }

  if (
    lower.includes("important") ||
    lower.includes("soon")
  ) {
    return 2;
  }

  if (
    lower.includes("optional") ||
    lower.includes("later") ||
    lower.includes("maybe")
  ) {
    return 1;
  }

  return 2;
}

function detectDuration(text) {
  const lower = text.toLowerCase();

  const match = lower.match(
    /(\d+)\s*(min|mins|minute|minutes|hr|hrs|hour|hours)/
  );

  if (!match) return 30;

  const amount = Number(match[1]);
  const unit = match[2];

  if (
    unit.includes("hr") ||
    unit.includes("hour")
  ) {
    return amount * 60;
  }

  return amount;
}

function detectDeadline(text) {
  const lower = text.toLowerCase();
  const now = new Date();

  if (lower.includes("today")) {
    return endOfDay(now);
  }

  if (lower.includes("tomorrow")) {
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return endOfDay(tomorrow);
  }

  return null;
}

function endOfDay(date) {
  const result = new Date(date);

  result.setHours(23, 59, 59, 999);

  return result.toISOString();
}

// --------------------
// TASK CREATION
// --------------------

function createTask(rawText) {
  const title = cleanTaskText(rawText);

  if (!title) return null;

  return {
    id:
      window.crypto && crypto.randomUUID
        ? crypto.randomUUID()
        : Date.now().toString(),

    title,

    priority: detectPriority(title),

    duration: detectDuration(title),

    deadline: detectDeadline(title),

    completed: false,

    createdAt: new Date().toISOString(),

    completedAt: null
  };
}

// --------------------
// REASONING / PRIORITY
// --------------------

function deadlineScore(task) {
  if (!task.deadline) return 0;

  const now = Date.now();
  const deadline = new Date(task.deadline).getTime();

  const hoursLeft =
    (deadline - now) / (1000 * 60 * 60);

  if (hoursLeft <= 0) return 100;
  if (hoursLeft <= 2) return 80;
  if (hoursLeft <= 6) return 60;
  if (hoursLeft <= 24) return 40;

  return 10;
}

function calculateScore(task) {
  if (task.completed) return -Infinity;

  const priorityScore =
    task.priority * 30;

  const urgencyScore =
    deadlineScore(task);

  // Small preference for shorter actions
  // when other factors are similar.
  const effortScore =
    Math.max(0, 30 - task.duration / 2);

  return (
    priorityScore +
    urgencyScore +
    effortScore
  );
}

function chooseNextTask() {
  const activeTasks =
    tasks.filter(task => !task.completed);

  if (activeTasks.length === 0) {
    return null;
  }

  return [...activeTasks].sort(
    (a, b) =>
      calculateScore(b) -
      calculateScore(a)
  )[0];
}

// --------------------
// WHAT NOW?
// --------------------

function updateRecommendation() {
  setCoreState("REASONING");

  setTimeout(() => {
    const task = chooseNextTask();

    if (!task) {
      currentTaskId = null;

      nextAction.textContent =
        "You're clear.";

      nextReason.textContent =
        "Add a goal or task and DAYOS will decide what deserves attention next.";

      completeButton.hidden = true;

      setCoreState("READY");

      return;
    }

    currentTaskId = task.id;

    nextAction.textContent =
      task.title;

    nextReason.textContent =
      buildReason(task);

    completeButton.hidden = false;

    setCoreState("READY");
  }, 300);
}

function buildReason(task) {
  const reasons = [];

  if (task.priority === 3) {
    reasons.push("high priority");
  }

  if (task.deadline) {
    const deadline =
      new Date(task.deadline);

    if (
      deadline.toDateString() ===
      new Date().toDateString()
    ) {
      reasons.push("due today");
    } else {
      reasons.push("has a deadline");
    }
  }

  if (task.duration <= 20) {
    reasons.push("quick to complete");
  }

  if (reasons.length === 0) {
    return "This is currently the highest-value next action.";
  }

  return (
    "DAYOS selected this because it is " +
    reasons.join(" and ") +
    "."
  );
}

// --------------------
// RENDER TASKS
// --------------------

function renderTasks() {
  taskList.innerHTML = "";

  const sortedTasks = [...tasks].sort(
    (a, b) =>
      Number(a.completed) -
      Number(b.completed)
  );

  sortedTasks.forEach(task => {
    const element =
      document.createElement("div");

    element.className =
      "task" +
      (task.completed
        ? " completed"
        : "");

    const info =
      document.createElement("div");

    info.className = "task-info";

    const title =
      document.createElement("div");

    title.className = "task-title";

    title.textContent =
      task.title;

    const meta =
      document.createElement("div");

    meta.className = "task-meta";

    meta.textContent =
      createTaskMeta(task);

    info.appendChild(title);
    info.appendChild(meta);

    const button =
      document.createElement("button");

    button.textContent =
      task.completed
        ? "✓"
        : "DONE";

    button.onclick = () => {
      completeTask(task.id);
    };

    element.appendChild(info);
    element.appendChild(button);

    taskList.appendChild(element);
  });

  taskCount.textContent =
    tasks.filter(task => !task.completed)
      .length;
}

function createTaskMeta(task) {
  const parts = [];

  parts.push(
    `${task.duration} min`
  );

  if (task.deadline) {
    parts.push(
      new Date(task.deadline)
        .toLocaleDateString()
    );
  }

  if (task.priority === 3) {
    parts.push("High priority");
  }

  return parts.join(" • ");
}

// --------------------
// ADD TASK
// --------------------

function addTask() {
  const rawText =
    taskInput.value.trim();

  if (!rawText) return;

  setCoreState("UNDERSTANDING");

  setTimeout(() => {
    const task =
      createTask(rawText);

    if (!task) {
      setCoreState("READY");
      return;
    }

    tasks.push(task);

    saveTasks();

    taskInput.value = "";

    renderTasks();

    updateRecommendation();
  }, 300);
}

// --------------------
// COMPLETE TASK
// --------------------

function completeTask(id) {
  const task =
    tasks.find(task => task.id === id);

  if (!task || task.completed) {
    return;
  }

  task.completed = true;

  task.completedAt =
    new Date().toISOString();

  saveTasks();

  currentTaskId = null;

  renderTasks();

  updateRecommendation();
}

// --------------------
// BUTTONS
// --------------------

addButton.addEventListener(
  "click",
  addTask
);

completeButton.addEventListener(
  "click",
  () => {
    if (currentTaskId) {
      completeTask(currentTaskId);
    }
  }
);

taskInput.addEventListener(
  "keydown",
  event => {
    if (event.key === "Enter") {
      addTask();
    }
  }
);

// --------------------
// VOICE INPUT
// --------------------

let recognition = null;

if (
  "SpeechRecognition" in window ||
  "webkitSpeechRecognition" in window
) {
  const SpeechRecognition =
    window.SpeechRecognition ||
    window.webkitSpeechRecognition;

  recognition =
    new SpeechRecognition();

  recognition.continuous = false;
  recognition.interimResults = false;

  recognition.lang = "en-US";

  recognition.onstart = () => {
    setCoreState("LISTENING");
    micButton.textContent = "●";
  };

  recognition.onresult = event => {
    const transcript =
      event.results[0][0].transcript;

    const cleaned =
      cleanTaskText(transcript);

    taskInput.value = cleaned;

    setCoreState("READY");
  };

  recognition.onerror = () => {
    setCoreState("READY");

    micButton.textContent = "🎙";
  };

  recognition.onend = () => {
    micButton.textContent = "🎙";

    if (
      coreState.textContent ===
      "LISTENING"
    ) {
      setCoreState("READY");
    }
  };

  micButton.addEventListener(
    "click",
    () => {
      try {
        recognition.start();
      } catch {
        // Prevent duplicate start errors.
      }
    }
  );
} else {
  micButton.addEventListener(
    "click",
    () => {
      alert(
        "Voice input is not supported by this browser."
      );
    }
  );
}

// --------------------
// CORE INTERACTION
// --------------------

aiCore.addEventListener(
  "click",
  () => {
    taskInput.focus();
  }
);

// --------------------
// INITIALIZE
// --------------------

renderTasks();
updateRecommendation();
