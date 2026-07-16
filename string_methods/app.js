"use strict";

const RUNNERS = {
  "runnable-1": {
    code: `text = "Hello, Python!"
print(text.upper())
# print(text.lower())
# print(text.replace("Python", "World"))
# print(text)`,
    input: "",
  },
  "runnable-2": {
    code: "# Write your code here",
    input: "",
  },
};

const storagePrefix = "string-methods-companion-v2";
const editor = document.querySelector("#code-editor");
const consoleOutput = document.querySelector("#console-output");
const runButton = document.querySelector("#run-code");
const resetButton = document.querySelector("#reset-code");
const clearButton = document.querySelector("#clear-console");
const themeButton = document.querySelector("#theme-toggle");
const inputPanel = document.querySelector("#input-panel");
const programInput = document.querySelector("#program-input");
const status = document.querySelector("#runner-status");
const workbench = document.querySelector(".workbench");
const tabs = [...document.querySelectorAll(".runner-tab")];

let activeRunner = localStorage.getItem(`${storagePrefix}:active`) || "runnable-1";
let runnerAvailable = false;

function storageKey(runner, kind) {
  return `${storagePrefix}:${runner}:${kind}`;
}

function loadRunner(runner) {
  activeRunner = RUNNERS[runner] ? runner : "runnable-1";
  localStorage.setItem(`${storagePrefix}:active`, activeRunner);

  editor.value = localStorage.getItem(storageKey(activeRunner, "code")) ?? RUNNERS[activeRunner].code;
  programInput.value = localStorage.getItem(storageKey(activeRunner, "input")) ?? RUNNERS[activeRunner].input;
  inputPanel.hidden = true;

  tabs.forEach((tab) => {
    const isActive = tab.dataset.runner === activeRunner;
    tab.classList.toggle("active", isActive);
    tab.setAttribute("aria-selected", String(isActive));
  });

  if (runnerAvailable) setStatus("Ready");
}

function setStatus(message, state = "") {
  status.textContent = message;
  status.className = `runner-status ${state}`.trim();
}

function saveCurrentWork() {
  localStorage.setItem(storageKey(activeRunner, "code"), editor.value);
  localStorage.setItem(storageKey(activeRunner, "input"), programInput.value);
}

async function runCode() {
  if (!runnerAvailable) return;
  saveCurrentWork();
  runButton.disabled = true;
  setStatus("Running", "running");
  consoleOutput.classList.remove("error-output");
  consoleOutput.textContent = "Running…";

  try {
    const result = await window.browserPython.run(editor.value, programInput.value);
    const combined = [result.stdout, result.stderr].filter(Boolean).join("").trimEnd();
    consoleOutput.textContent = combined || "Program finished without output.";

    if (result.timedOut || result.exitCode !== 0) {
      consoleOutput.classList.add("error-output");
      setStatus(result.timedOut ? "Timed out" : "Check the error", "error");
    } else {
      setStatus("Finished");
    }
  } catch (error) {
    consoleOutput.classList.add("error-output");
    consoleOutput.textContent = [
      "Python could not start in this browser.",
      "",
      "Check your internet connection and reload the lesson.",
      "",
      `Details: ${error.message}`,
    ].join("\n");
    setStatus("Runner offline", "error");
  } finally {
    runButton.disabled = false;
  }
}

tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    saveCurrentWork();
    loadRunner(tab.dataset.runner);
  });
});

editor.addEventListener("input", saveCurrentWork);
programInput.addEventListener("input", saveCurrentWork);

editor.addEventListener("keydown", (event) => {
  if (event.key === "Tab") {
    event.preventDefault();
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    editor.setRangeText("    ", start, end, "end");
    saveCurrentWork();
  }

  if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
    event.preventDefault();
    runCode();
  }
});

runButton.addEventListener("click", runCode);

clearButton.addEventListener("click", () => {
  consoleOutput.classList.remove("error-output");
  consoleOutput.textContent = "Console cleared.";
  setStatus("Ready");
});

resetButton.addEventListener("click", () => {
  if (!window.confirm(`Reset ${activeRunner.replace("-", " ")} to its starter code?`)) {
    return;
  }

  localStorage.removeItem(storageKey(activeRunner, "code"));
  localStorage.removeItem(storageKey(activeRunner, "input"));
  loadRunner(activeRunner);
  consoleOutput.classList.remove("error-output");
  consoleOutput.textContent = "Starter code restored.";
});

themeButton.addEventListener("click", () => {
  const isLight = workbench.classList.toggle("light-editor");
  localStorage.setItem(`${storagePrefix}:light-editor`, String(isLight));
});

if (localStorage.getItem(`${storagePrefix}:light-editor`) === "true") {
  workbench.classList.add("light-editor");
}

loadRunner(activeRunner);
runButton.disabled = true;
setStatus("Preparing Python", "running");

window.browserPython.ready.then(() => {
  runnerAvailable = true;
  runButton.disabled = false;
  setStatus("Ready");
}).catch(() => {
  if (["localhost", "127.0.0.1"].includes(location.hostname)) {
    runnerAvailable = true;
    runButton.disabled = false;
    setStatus("Local runner ready");
  } else {
    setStatus("Python unavailable", "error");
  }
});
