"use strict";

class BrowserPythonRunner extends EventTarget {
  constructor() {
    super();
    this.workerUrl = new URL("pyodide-worker.mjs", document.currentScript.src);
    this.nextId = 1;
    this.active = null;
    this.start();
    this.installWorkbenchUI();
  }

  start() {
    this.worker = new Worker(this.workerUrl, { type: "module" });
    this.ready = new Promise((resolve, reject) => {
      this.resolveReady = resolve;
      this.rejectReady = reject;
    });
    this.worker.addEventListener("message", ({ data }) => this.onMessage(data));
    this.worker.addEventListener("error", (event) => this.rejectReady(new Error(event.message || "Python could not load.")));
  }

  onMessage(data) {
    if (data.type === "ready") return this.resolveReady();
    if (data.type === "init-error") return this.rejectReady(new Error(data.error));
    if (!this.active || data.id !== this.active.id) return;
    if (data.type === "stdout" || data.type === "stderr") {
      this.active[data.type] += data.text;
      this.dispatchEvent(new CustomEvent(data.type, { detail: data.text }));
    } else if (data.type === "input-request") {
      clearTimeout(this.active.timer);
      this.active.timer = null;
      this.dispatchEvent(new Event("input-request"));
    } else if (data.type === "result") {
      this.finish(data);
    }
  }

  async run(code) {
    this.cancel(false);
    await this.ready;
    const id = this.nextId++;
    return new Promise((resolve) => {
      this.active = { id, resolve, timer: null, stdout: "", stderr: "" };
      this.armTimeout();
      this.worker.postMessage({ type: "run", id, code });
    });
  }

  submitInput(value) {
    if (!this.active || this.active.timer) return false;
    this.active.stdout += `${value}\n`;
    this.worker.postMessage({ type: "input-response", id: this.active.id, value });
    this.armTimeout();
    return true;
  }

  armTimeout() {
    if (!this.active) return;
    clearTimeout(this.active.timer);
    this.active.timer = setTimeout(() => {
      const resolve = this.active.resolve;
      this.stopWorker();
      resolve({ stdout: "", stderr: "Program stopped after four seconds. Check for an endless loop.\n", exitCode: 124, timedOut: true });
    }, 4000);
  }

  finish(result) {
    clearTimeout(this.active.timer);
    const { resolve, stdout, stderr } = this.active;
    this.active = null;
    resolve({ ...result, stdout, stderr });
  }

  cancel() {
    if (!this.active) return false;
    const resolve = this.active.resolve;
    this.stopWorker();
    resolve({ stdout: "", stderr: "", exitCode: 130, cancelled: true, timedOut: false });
    return true;
  }

  stopWorker() {
    if (this.active) clearTimeout(this.active.timer);
    this.worker.terminate();
    this.active = null;
    this.start();
  }

  installWorkbenchUI() {
    const consoleOutput = document.querySelector("#console-output");
    const inputPanel = document.querySelector("#input-panel");
    const runButton = document.querySelector("#run-code");
    const editor = document.querySelector("#code-editor");
    if (!consoleOutput || !runButton || !editor) return;

    if (inputPanel) {
      inputPanel.hidden = true;
      setTimeout(() => { inputPanel.hidden = true; }, 0);
    }
    const shortcut = runButton.querySelector("kbd");
    if (shortcut) shortcut.textContent = "Shift ↵";

    const append = (text) => {
      if (consoleOutput.textContent === "Running…") consoleOutput.textContent = "";
      consoleOutput.append(document.createTextNode(text));
      consoleOutput.scrollTop = consoleOutput.scrollHeight;
    };
    this.addEventListener("stdout", (event) => append(event.detail));
    this.addEventListener("stderr", (event) => append(event.detail));
    this.addEventListener("input-request", () => {
      const status = document.querySelector("#runner-status");
      if (status) status.textContent = "Waiting for input";
      const input = document.createElement("input");
      input.className = "console-input";
      input.setAttribute("aria-label", "Python program input");
      input.addEventListener("keydown", (event) => {
        if (event.key !== "Enter") return;
        event.preventDefault();
        const answer = input.value;
        if (!this.submitInput(answer)) return;
        input.replaceWith(document.createTextNode(`${answer}\n`));
        if (status) status.textContent = "Running";
      });
      consoleOutput.append(input);
      input.focus();
    });

    editor.addEventListener("keydown", (event) => {
      if (event.shiftKey && event.key === "Enter") {
        event.preventDefault();
        runButton.click();
      }
    });
    ["#clear-console", "#reset-code", ".runner-tab"].forEach((selector) => {
      document.querySelectorAll(selector).forEach((control) => control.addEventListener("click", () => this.cancel(), { capture: true }));
    });
  }
}

window.browserPython = new BrowserPythonRunner();
