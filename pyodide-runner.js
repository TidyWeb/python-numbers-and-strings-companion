"use strict";

class BrowserPythonRunner {
  constructor() {
    this.workerUrl = new URL("pyodide-worker.mjs", document.currentScript.src);
    this.nextId = 1;
    this.pending = new Map();
    this.start();
  }

  start() {
    this.worker = new Worker(this.workerUrl, { type: "module" });
    this.ready = new Promise((resolve, reject) => {
      this.resolveReady = resolve;
      this.rejectReady = reject;
    });

    this.worker.addEventListener("message", ({ data }) => {
      if (data.type === "ready") {
        this.resolveReady();
        return;
      }
      if (data.type === "init-error") {
        this.rejectReady(new Error(data.error));
        return;
      }
      if (data.type === "result") {
        const request = this.pending.get(data.id);
        if (!request) return;
        clearTimeout(request.timer);
        this.pending.delete(data.id);
        request.resolve(data);
      }
    });

    this.worker.addEventListener("error", (event) => {
      this.rejectReady(new Error(event.message || "Python could not load."));
    });
  }

  async run(code, stdin = "") {
    try {
      await this.ready;
      return await this.runInWorker(code, stdin);
    } catch (error) {
      if (["localhost", "127.0.0.1"].includes(location.hostname)) {
        return this.runWithLocalServer(code, stdin);
      }
      throw error;
    }
  }

  runInWorker(code, stdin) {
    return new Promise((resolve) => {
      const id = this.nextId++;
      const timer = setTimeout(() => {
        this.worker.terminate();
        this.pending.clear();
        this.start();
        resolve({
          stdout: "",
          stderr: "Program stopped after four seconds. Check for an endless loop.\n",
          exitCode: 124,
          timedOut: true,
        });
      }, 4000);

      this.pending.set(id, { resolve, timer });
      this.worker.postMessage({ type: "run", id, code, stdin });
    });
  }

  async runWithLocalServer(code, stdin) {
    const response = await fetch("/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, stdin }),
    });
    if (!response.ok) throw new Error(`Local runner returned ${response.status}`);
    return response.json();
  }
}

window.browserPython = new BrowserPythonRunner();
