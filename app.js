/* =========================================================
   DAYOS V1 — APP CONTROLLER
   app.js
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {
  initializeDAYOSApp();
});


/* =========================================================
   ELEMENTS
   ========================================================= */

const UI = {
  input: () =>
    document.getElementById("userInput") ||
    document.getElementById("taskInput") ||
    document.querySelector("textarea") ||
    document.querySelector("input[type='text']"),

  output: () =>
    document.getElementById("output") ||
    document.getElementById("aiOutput") ||
    document.getElementById("response"),

  taskList: () =>
    document.getElementById("taskList"),

  coreState: () =>
    document.getElementById("coreState")
};


/* =========================================================
   APP STATE
   ========================================================= */

const DAYOS_APP = {
  tasks: [],
  currentPlan: null,
  initialized: false
};


/* =========================================================
   INITIALIZATION
   ========================================================= */

function initializeDAYOSApp() {

  if (DAYOS_APP.initialized) return;

  loadAppData();
  connectUI();
  renderTasks();

  DAYOS_APP.initialized = true;

  console.log("DAYOS App Controller ONLINE");
}


/* =========================================================
   UI CONNECTION
   ========================================================= */

function connectUI() {

  const input = UI.input();

  if (input) {

    input.addEventListener("keydown", event => {

      if (event.key === "Enter" && !event.shiftKey) {

        event.preventDefault();

        handleUserInput();
      }

    });
  }

  // Automatically connect common buttons
  const buttons = document.querySelectorAll("button");

  buttons.forEach(button => {

    const text = button.textContent
      .trim()
      .toLowerCase();

    if (
      text.includes("send") ||
      text.includes("ask") ||
      text.includes("execute") ||
      text.includes("run")
    ) {

      button.addEventListener("click", handleUserInput);
    }

  });
}


/* =========================================================
   MAIN AI INTERACTION
   ========================================================= */

async function handleUserInput() {

  const input = UI.input();

  if (!input) {
    console.warn("DAYOS input element not found.");
    return;
  }

  const text = input.value.trim();

  if (!text) return;

  input.value = "";

  setAppState("UNDERSTANDING");

  showOutput("Thinking...");

  try {

    const result = await askDAYOS(text, {
      tasks: DAYOS_APP.tasks,
      plan: DAYOS_APP.currentPlan,
      app: "DAYOS"
    });

    processAIResult(result);

  } catch (error) {

    console.error("DAYOS AI error:", error);

    showOutput(
      "I couldn't complete that action. Please try again."
    );

    setAppState("IDLE");
  }
}


/* =========================================================
   PROCESS AI RESULT
   ========================================================= */

function processAIResult(result) {

  if (!result) {

    showOutput("No response received.");

    setAppState("IDLE");

    return;
  }

  // Plan generated
  if (
    result.goal &&
    Array.isArray(result.steps)
  ) {

    DAYOS_APP.currentPlan = result;

    saveAppData();

    renderPlan(result);

    setAppState("READY");

    return;
  }


  // Recommendation
  if (result.action) {

    const action =
      result.action.title ||
      result.action.text ||
      "Next action";

    showOutput(
      `${action}\n\n${result.reason || ""}`
    );

    setAppState("READY");

    return;
  }


  // Normal AI response
  if (result.response) {

    showOutput(result.response);

    setAppState("READY");

    return;
  }


  // Task response
  if (result.type === "task") {

    createTask(
      result.intent?.text || "New Task",
      result.intent?.priority || "normal"
    );

    showOutput(
      `Task understood:\n${result.intent?.text || "New Task"}`
    );

    setAppState("READY");

    return;
  }


  showOutput(
    typeof result === "string"
      ? result
      : JSON.stringify(result, null, 2)
  );

  setAppState("READY");
}


/* =========================================================
   TASK CREATION
   ========================================================= */

function createTask(title, priority = "normal") {

  const task = {

    id:
      typeof createID === "function"
        ? createID()
        : Date.now().toString(),

    title: title,

    priority: priority,

    completed: false,

    createdAt: Date.now()
  };

  DAYOS_APP.tasks.push(task);

  saveAppData();
  renderTasks();

  return task;
}


/* =========================================================
   COMPLETE TASK
   ========================================================= */

function finishTask(id) {

  const task = DAYOS_APP.tasks.find(
    item => item.id === id
  );

  if (!task) return;

  task.completed = true;

  if (typeof completeTask === "function") {
    completeTask(task);
  }

  saveAppData();
  renderTasks();

  showOutput(
    `Completed: ${task.title}`
  );
}


/* =========================================================
   TASK RENDERING
   ========================================================= */

function renderTasks() {

  const container = UI.taskList();

  if (!container) return;

  container.innerHTML = "";

  DAYOS_APP.tasks.forEach(task => {

    const item = document.createElement("div");

    item.className = "dayos-task";

    item.innerHTML = `
      <span>
        ${escapeHTML(task.title)}
      </span>

      <button
        onclick="finishTask('${task.id}')"
        ${task.completed ? "disabled" : ""}
      >
        ${task.completed ? "Done" : "Complete"}
      </button>
    `;

    container.appendChild(item);

  });
}


/* =========================================================
   PLAN RENDERING
   ========================================================= */

function renderPlan(plan) {

  let output = `PLAN: ${plan.goal}\n\n`;

  plan.steps.forEach((step, index) => {

    output +=
      `${index + 1}. ${step.title}\n`;

  });

  showOutput(output);
}


/* =========================================================
   AI OUTPUT
   ========================================================= */

function showOutput(message) {

  const output = UI.output();

  if (!output) {

    console.log("DAYOS:", message);

    return;
  }

  output.textContent = message;
}


/* =========================================================
   CORE STATE
   ========================================================= */

function setAppState(state) {

  if (typeof setAICoreState === "function") {

    setAICoreState(state);

    return;
  }

  const stateElement = UI.coreState();

  if (stateElement) {
    stateElement.textContent = state;
  }
}


/* =========================================================
   LOCAL STORAGE
   ========================================================= */

function saveAppData() {

  try {

    localStorage.setItem(
      "DAYOS_APP_DATA",
      JSON.stringify({
        tasks: DAYOS_APP.tasks,
        currentPlan: DAYOS_APP.currentPlan
      })
    );

  } catch (error) {

    console.warn(
      "DAYOS app data could not be saved:",
      error
    );
  }
}


function loadAppData() {

  try {

    const saved =
      localStorage.getItem("DAYOS_APP_DATA");

    if (!saved) return;

    const data = JSON.parse(saved);

    DAYOS_APP.tasks =
      Array.isArray(data.tasks)
        ? data.tasks
        : [];

    DAYOS_APP.currentPlan =
      data.currentPlan || null;

  } catch (error) {

    console.warn(
      "DAYOS app data could not be loaded:",
      error
    );
  }
}


/* =========================================================
   SECURITY
   ========================================================= */

function escapeHTML(value) {

  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


/* =========================================================
   PUBLIC API
   ========================================================= */

window.DAYOS_APP = DAYOS_APP;

window.handleUserInput = handleUserInput;
window.createTask = createTask;
window.finishTask = finishTask;
window.renderTasks = renderTasks;
