/* =========================================================
   DAYOS V1 — APP CONTROLLER
   ========================================================= */

const DAYOS_APP = {
  tasks: [],
  currentPlan: null,
  initialized: false
};


/* =========================================================
   START
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {
  initializeDAYOSApp();
});


function initializeDAYOSApp() {

  if (DAYOS_APP.initialized) return;

  loadAppData();
  connectUI();
  renderTasks();

  DAYOS_APP.initialized = true;

  console.log("DAYOS APP ONLINE");
}


/* =========================================================
   UI
   ========================================================= */

function getInput() {
  return (
    document.getElementById("userInput") ||
    document.getElementById("taskInput")
  );
}


function getOutput() {
  return (
    document.getElementById("output") ||
    document.getElementById("aiOutput") ||
    document.getElementById("response")
  );
}


function connectUI() {

  const input = getInput();

  if (input) {

    input.addEventListener("keydown", event => {

      if (
        event.key === "Enter" &&
        !event.shiftKey
      ) {

        event.preventDefault();

        handleUserInput();
      }

    });
  }

  const button =
    document.getElementById("sendButton");

  if (button) {

    button.addEventListener(
      "click",
      handleUserInput
    );
  }
}


/* =========================================================
   MAIN INPUT
   ========================================================= */

async function handleUserInput() {

  const input = getInput();

  if (!input) {

    console.error(
      "DAYOS ERROR: userInput not found"
    );

    return;
  }

  const text =
    input.value.trim();

  if (!text) return;

  input.value = "";

  showOutput("DAYOS is thinking...");

  setState("LISTENING");

  try {

    /*
     * Make absolutely sure AI.js loaded.
     */

    if (
      typeof window.askDAYOS !==
      "function"
    ) {

      throw new Error(
        "AI.js did not load correctly. Check that the filename is exactly AI.js."
      );
    }


    /*
     * Send request to AI core.
     */

    const result =
      await window.askDAYOS(
        text,
        {
          tasks: DAYOS_APP.tasks,
          plan: DAYOS_APP.currentPlan
        }
      );


    /*
     * Process response.
     */

    if (!result) {

      throw new Error(
        "AI returned an empty response."
      );
    }

    processAIResult(result);

  } catch (error) {

    console.error(
      "DAYOS ERROR:",
      error
    );

    setState("IDLE");

    showOutput(
      "DAYOS ERROR:\n\n" +
      error.message
    );
  }
}


/* =========================================================
   PROCESS AI RESPONSE
   ========================================================= */

function processAIResult(result) {

  if (result.goal &&
      Array.isArray(result.steps)) {

    DAYOS_APP.currentPlan =
      result;

    saveAppData();

    renderPlan(result);

    setState("READY");

    return;
  }


  if (result.action) {

    const action =
      result.action.title ||
      result.action.text ||
      "Next action";

    showOutput(
      action +
      "\n\n" +
      (result.reason || "")
    );

    setState("READY");

    return;
  }


  if (result.response) {

    showOutput(
      result.response
    );

    setState("READY");

    /*
     * If AI understood it as a task,
     * add it to the task list.
     */

    if (
      result.type === "task" &&
      result.intent
    ) {

      createTask(
        result.intent.text,
        result.intent.priority
      );
    }

    return;
  }


  showOutput(
    JSON.stringify(
      result,
      null,
      2
    )
  );

  setState("READY");
}


/* =========================================================
   TASKS
   ========================================================= */

function createTask(
  title,
  priority = "normal"
) {

  const task = {

    id:
      Date.now().toString(36),

    title,

    priority,

    completed: false,

    createdAt:
      Date.now()
  };

  DAYOS_APP.tasks.push(task);

  saveAppData();

  renderTasks();

  return task;
}


function finishTask(id) {

  const task =
    DAYOS_APP.tasks.find(
      item => item.id === id
    );

  if (!task) return;

  task.completed = true;

  if (
    typeof window.completeTask ===
    "function"
  ) {

    window.completeTask(task);
  }

  saveAppData();

  renderTasks();

  showOutput(
    "Completed: " +
    task.title
  );
}


/* =========================================================
   TASK UI
   ========================================================= */

function renderTasks() {

  const container =
    document.getElementById(
      "taskList"
    );

  if (!container) return;

  container.innerHTML = "";

  DAYOS_APP.tasks.forEach(task => {

    const item =
      document.createElement("div");

    item.className =
      "dayos-task";

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
   PLAN UI
   ========================================================= */

function renderPlan(plan) {

  let text =
    "PLAN: " +
    plan.goal +
    "\n\n";

  plan.steps.forEach(
    (step, index) => {

      text +=
        `${index + 1}. ${step.title}\n`;

    }
  );

  showOutput(text);
}


/* =========================================================
   OUTPUT
   ========================================================= */

function showOutput(message) {

  const output =
    getOutput();

  if (!output) {

    console.log(
      "DAYOS:",
      message
    );

    return;
  }

  output.textContent =
    String(message);
}


/* =========================================================
   STATE
   ========================================================= */

function setState(state) {

  if (
    typeof window.setAICoreState ===
    "function"
  ) {

    window.setAICoreState(
      state
    );

    return;
  }

  const element =
    document.getElementById(
      "coreState"
    );

  if (element) {
    element.textContent =
      state;
  }
}


/* =========================================================
   STORAGE
   ========================================================= */

function saveAppData() {

  localStorage.setItem(
    "DAYOS_APP_DATA",
    JSON.stringify({
      tasks:
        DAYOS_APP.tasks,

      currentPlan:
        DAYOS_APP.currentPlan
    })
  );
}


function loadAppData() {

  try {

    const saved =
      localStorage.getItem(
        "DAYOS_APP_DATA"
      );

    if (!saved) return;

    const data =
      JSON.parse(saved);

    DAYOS_APP.tasks =
      Array.isArray(data.tasks)
        ? data.tasks
        : [];

    DAYOS_APP.currentPlan =
      data.currentPlan || null;

  } catch (error) {

    console.error(
      "Storage error:",
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
   GLOBALS
   ========================================================= */

window.DAYOS_APP =
  DAYOS_APP;

window.handleUserInput =
  handleUserInput;

window.createTask =
  createTask;

window.finishTask =
  finishTask;

window.renderTasks =
  renderTasks;
