import { loadPyodide } from "https://cdn.jsdelivr.net/pyodide/v314.0.2/full/pyodide.mjs";

let pyodide;

try {
  pyodide = await loadPyodide();
  self.postMessage({ type: "ready" });
} catch (error) {
  self.postMessage({ type: "init-error", error: error.message });
}

self.onmessage = async ({ data }) => {
  if (data.type !== "run" || !pyodide) return;

  pyodide.globals.set("__learner_code", data.code);
  pyodide.globals.set("__learner_input", data.stdin);

  try {
    const result = await pyodide.runPythonAsync(`
import contextlib
import io
import sys
import traceback

_stdout = io.StringIO()
_stderr = io.StringIO()
_original_stdin = sys.stdin
sys.stdin = io.StringIO(__learner_input)

try:
    with contextlib.redirect_stdout(_stdout), contextlib.redirect_stderr(_stderr):
        try:
            exec(compile(__learner_code, "main.py", "exec"), {"__name__": "__main__"})
        except BaseException:
            traceback.print_exc()
finally:
    sys.stdin = _original_stdin

(_stdout.getvalue(), _stderr.getvalue())
`);
    const [stdout, stderr] = result.toJs();
    result.destroy();
    self.postMessage({
      type: "result",
      id: data.id,
      stdout,
      stderr,
      exitCode: stderr ? 1 : 0,
      timedOut: false,
    });
  } catch (error) {
    self.postMessage({
      type: "result",
      id: data.id,
      stdout: "",
      stderr: `${error.message}\n`,
      exitCode: 1,
      timedOut: false,
    });
  }
};
