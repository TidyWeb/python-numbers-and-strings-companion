import { loadPyodide } from "https://cdn.jsdelivr.net/pyodide/v314.0.2/full/pyodide.mjs";

let pyodide;
let pendingInput;

try {
  if (typeof WebAssembly.Suspending !== "function") {
    throw new Error("This exercise requires a current version of Chrome.");
  }
  pyodide = await loadPyodide();
  self.postMessage({ type: "ready" });
} catch (error) {
  self.postMessage({ type: "init-error", error: error.message });
}

self.onmessage = async ({ data }) => {
  if (data.type === "input-response" && pendingInput) {
    const resolve = pendingInput;
    pendingInput = null;
    resolve(data.value);
    return;
  }
  if (data.type !== "run" || !pyodide) return;

  const stdoutDecoder = new TextDecoder();
  const stderrDecoder = new TextDecoder();
  pyodide.setStdout({ write: (buffer) => {
    self.postMessage({ type: "stdout", id: data.id, text: stdoutDecoder.decode(buffer, { stream: true }) });
    return buffer.length;
  }});
  pyodide.setStderr({ write: (buffer) => {
    self.postMessage({ type: "stderr", id: data.id, text: stderrDecoder.decode(buffer, { stream: true }) });
    return buffer.length;
  }});
  pyodide.globals.set("__browser_input", () => new Promise((resolve) => {
    pendingInput = resolve;
    self.postMessage({ type: "input-request", id: data.id });
  }));

  try {
    pyodide.globals.set("__learner_code", data.code);
    await pyodide.runPythonAsync(`
import builtins
from pyodide.ffi import run_sync

_original_input = builtins.input
def _interactive_input(prompt=""):
    print(prompt, end="", flush=True)
    return run_sync(__browser_input())

builtins.input = _interactive_input
try:
    exec(compile(__learner_code, "main.py", "exec"), {"__name__": "__main__"})
finally:
    builtins.input = _original_input
`);
    self.postMessage({ type: "result", id: data.id, exitCode: 0, timedOut: false });
  } catch (error) {
    self.postMessage({ type: "stderr", id: data.id, text: `${error.message}\n` });
    self.postMessage({ type: "result", id: data.id, exitCode: 1, timedOut: false });
  }
};
