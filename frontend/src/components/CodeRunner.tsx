import { EyeOff, Play, Square, Edit3, X } from "lucide-react";
import { useMemo, useState, useEffect, useRef } from "react";
import hljs from "highlight.js";
import "highlight.js/styles/github.css";
import Editor from "@monaco-editor/react"; // <-- NEW IMPORT

type CodeRunnerProps = {
  code: string;
  language: string;
  compact?: boolean;
  readOnly?: boolean;
};

// Execution methods we support in-browser.
const runnableMap = new Map<string, "iframe" | "pyodide">([
  ["javascript", "iframe"],
  ["js", "iframe"],
  ["mjs", "iframe"],
  ["cjs", "iframe"],
  ["python", "pyodide"],
  ["py", "pyodide"],
  ["ts", "iframe"],
  ["typescript", "iframe"],
  ["tsx", "iframe"],
]);

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildRunnerSrcDoc(code: string) {
  const serializedCode = JSON.stringify(code);

  return `
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      :root {
        color-scheme: dark;
        --bg: #0f172a;
        --panel: #111827;
        --border: rgba(148, 163, 184, 0.18);
        --text: #e5e7eb;
        --muted: #94a3b8;
        --accent: #22d3ee;
        --danger: #f87171;
      }

      html, body {
        margin: 0;
        min-height: 100%;
        background: var(--bg);
        color: var(--text);
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      }

      body {
        padding: 12px;
      }

      .frame {
        border: 1px solid var(--border);
        background: var(--panel);
        border-radius: 12px;
        padding: 12px;
      }

      .label {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        font-size: 11px;
        color: var(--muted);
        text-transform: uppercase;
        letter-spacing: 0.18em;
        margin-bottom: 10px;
      }

      .line { margin-bottom: 6px; font-size: 12px; line-height: 1.5; }
      .log { color: var(--text); }
      .warn { color: #fbbf24; }
      .info { color: var(--accent); }
      .result { color: #86efac; }
      .error { color: var(--danger); }
    </style>
  </head>
  <body>
    <div class="frame">
      <div class="label">Output</div>
      <pre id="output">Running…</pre>
    </div>

    <script>
      const code = ${serializedCode};
      const output = document.getElementById("output");

      function stringify(value) {
        if (typeof value === "string") return value;
        if (value instanceof Error) return value.stack || value.message || String(value);
        try {
          return typeof value === "object" ? JSON.stringify(value, null, 2) : String(value);
        } catch {
          return String(value);
        }
      }

      function append(kind, args) {
        const line = document.createElement("div");
        line.className = "line " + kind;
        line.textContent = args.map(stringify).join(" ");
        output.appendChild(line);
      }

      const consoleProxy = {
        log: (...args) => append("log", args),
        info: (...args) => append("info", args),
        warn: (...args) => append("warn", args),
        error: (...args) => append("error", args),
      };

      window.addEventListener("error", (event) => {
        append("error", [event.error || event.message || "Unknown error"]);
      });

      window.addEventListener("unhandledrejection", (event) => {
        append("error", [event.reason || "Unhandled promise rejection"]);
      });

      (async () => {
        try {
          const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
          const runner = new AsyncFunction("console", code);
          const result = runner(consoleProxy);
          const resolved = result && typeof result.then === "function" ? await result : result;
          if (typeof resolved !== "undefined") {
            append("result", ["=>", resolved]);
          }
          if (!output.children.length) {
            output.textContent = "Done.";
          }
        } catch (error) {
          append("error", [error]);
        }
      })();
    </script>
  </body>
</html>`;
}

export function CodeRunner({
    code,
    language,
    compact = false,
    readOnly = false,
}: CodeRunnerProps) {
    const normalizedLanguage = language.toLowerCase();
    const method = runnableMap.get(normalizedLanguage);
    const runnable = Boolean(method);

    // State for Interactive Playground
    const [isEditing, setIsEditing] = useState(false);
    const [editableCode, setEditableCode] = useState(code);

    const [runId, setRunId] = useState(0);
    const [isOutputVisible, setIsOutputVisible] = useState(false);
    const [pyodideLoading, setPyodideLoading] = useState(false);
    const [pyodideOutput, setPyodideOutput] = useState<string | null>(null);
    const [detectedPackages, setDetectedPackages] = useState<string[]>([]);
    const [packageStatuses, setPackageStatuses] = useState<
        Record<string, string>
    >({});
    const installCancelRef = useRef(false);
    const [showPkgManager, setShowPkgManager] = useState(false);
    const [esbuildAvailable, setEsbuildAvailable] = useState(false);
    const [manualPkgs, setManualPkgs] = useState<string[]>([]);
    const [pkgInput, setPkgInput] = useState("");
    const [iframeSrcDoc, setIframeSrcDoc] = useState<string>(() =>
        buildRunnerSrcDoc(code),
    );

    const highlightedCode = useMemo(() => {
        try {
            if (normalizedLanguage && hljs.getLanguage(normalizedLanguage)) {
                return hljs.highlight(editableCode, {
                    language: normalizedLanguage,
                }).value;
            }
            return hljs.highlightAuto(editableCode).value;
        } catch {
            return escapeHtml(editableCode);
        }
    }, [editableCode, normalizedLanguage]);

    useEffect(() => {
        const firstLine = editableCode.split("\n")[0]?.trim() ?? "";
        const match = firstLine.match(
            /^#\s*(?:pip|pyodide-packages)\s*:\s*(.+)$/i,
        );

        if (match && match[1]) {
            const rawPackages: string[] = match[1].split(",");
            setDetectedPackages(
                rawPackages
                    .map((pkgName: string) => pkgName.trim())
                    .filter(Boolean),
            );
        } else {
            setDetectedPackages([]);
        }

        setIframeSrcDoc(buildRunnerSrcDoc(editableCode));
    }, [editableCode]);

    const addManualPackage = () => {
        const name: string = pkgInput.trim();
        if (!name) return;
        if (!manualPkgs.includes(name))
            setManualPkgs((prevPkgs: string[]) => [...prevPkgs, name]);
        setPkgInput("");
    };

    const removeManualPackage = (name: string) => {
        setManualPkgs((prevPkgs: string[]) =>
            prevPkgs.filter((x: string) => x !== name),
        );
    };

    async function installManualPackages() {
        if (!manualPkgs.length) return;
        try {
            const pyodide = (await ensurePyodide()) as {
                runPythonAsync: (src: string) => Promise<unknown>;
            };
            await pyodide.runPythonAsync("import micropip");
            installCancelRef.current = false;
            setPackageStatuses((prevStatuses: Record<string, string>) => {
                const copy: Record<string, string> = {...prevStatuses};
                manualPkgs.forEach((pkgName: string) => {
                    copy[pkgName] = "queued";
                });
                return copy;
            });
            for (const pkg of manualPkgs) {
                if (installCancelRef.current) break;
                setPackageStatuses((s) => ({...s, [pkg]: "installing"}));
                try {
                    await pyodide.runPythonAsync(
                        `import micropip\nawait micropip.install(${JSON.stringify(pkg)})`,
                    );
                    setPackageStatuses((s) => ({...s, [pkg]: "installed"}));
                } catch (e) {
                    setPackageStatuses((s) => ({
                        ...s,
                        [pkg]: `failed: ${String(e)}`,
                    }));
                }
            }
        } catch (e) {
            setPackageStatuses((s) => ({...s, error: String(e)}));
        }
    }

    async function ensurePyodide() {
        const w = window as unknown as {
            __pyodideLoadPromise?: Promise<unknown>;
            loadPyodide?: (opts: {indexURL: string}) => Promise<unknown>;
        };
        if (w.__pyodideLoadPromise) return w.__pyodideLoadPromise;

        w.__pyodideLoadPromise = (async () => {
            await new Promise<void>((resolve, reject) => {
                const s = document.createElement("script");
                s.src =
                    "https://cdn.jsdelivr.net/pyodide/v0.23.4/full/pyodide.js";
                s.onload = () => resolve();
                s.onerror = () => reject(new Error("Failed to load pyodide"));
                document.head.appendChild(s);
            });
            return w.loadPyodide?.({
                indexURL: "https://cdn.jsdelivr.net/pyodide/v0.23.4/full/",
            });
        })();
        return w.__pyodideLoadPromise;
    }

    type EsbuildType = {
        transform: (
            input: string,
            opts: {loader: string; target: string},
        ) => Promise<{code: string}>;
        initialize?: (opts: {wasmURL: string}) => Promise<void>;
    };

    async function ensureEsbuild(): Promise<EsbuildType | null> {
        const w = window as unknown as {esbuild?: EsbuildType};
        if (w.esbuild) return w.esbuild;

        try {
            await new Promise<void>((resolve, reject) => {
                const s = document.createElement("script");
                s.src =
                    "https://unpkg.com/esbuild-wasm@0.18.11/lib/umd/esbuild.min.js";
                s.onload = () => resolve();
                s.onerror = () => reject(new Error("Failed to load esbuild"));
                document.head.appendChild(s);
            });

            const loadedEsbuild = (window as unknown as {esbuild?: EsbuildType})
                .esbuild;
            if (
                loadedEsbuild &&
                typeof loadedEsbuild.initialize === "function"
            ) {
                await loadedEsbuild.initialize({
                    wasmURL:
                        "https://unpkg.com/esbuild-wasm@0.18.11/esbuild.wasm",
                });
            }
            setEsbuildAvailable(Boolean(loadedEsbuild));
            return loadedEsbuild ?? null;
        } catch {
            setEsbuildAvailable(false);
            return null;
        }
    }

    if (!runnable) {
        return (
            <pre
                className={
                    compact
                        ? "my-2 overflow-x-auto rounded-lg border border-border bg-surface p-2.5 font-code text-[11px]"
                        : "my-3 overflow-x-auto rounded-lg border border-border bg-surface p-3 font-code text-xs"
                }
            >
                <code
                    className={`language-${normalizedLanguage}`}
                    dangerouslySetInnerHTML={{__html: highlightedCode}}
                />
            </pre>
        );
    }

    async function runPython(codeStr: string) {
        try {
            setPyodideOutput(null);
            setPyodideLoading(true);
            const pyodide = (await ensurePyodide()) as {
                runPythonAsync: (src: string) => Promise<unknown>;
            };

            const lines = codeStr.split("\n");
            let packages: string[] = [];
            const firstLine = lines[0]?.trim() ?? "";
            const match = firstLine.match(
                /^#\s*(?:pip|pyodide-packages)\s*:\s*(.+)$/i,
            );
            let codeToRun = codeStr;

            if (match && match[1]) {
                const rawPackages: string[] = match[1].split(",");
                packages = rawPackages
                    .map((pkgName: string) => pkgName.trim())
                    .filter(Boolean);
                codeToRun = lines.slice(1).join("\n");
            }

            if (packages.length) {
                try {
                    await pyodide.runPythonAsync("import micropip");
                } catch (e) {
                    setPyodideOutput(`micropip not available: ${String(e)}`);
                    setPyodideLoading(false);
                    setIsOutputVisible(true);
                    return;
                }

                installCancelRef.current = false;
                setPackageStatuses((prevStatuses: Record<string, string>) => {
                    const copy: Record<string, string> = {...prevStatuses};
                    manualPkgs.forEach((pkgName: string) => {
                        copy[pkgName] = "queued";
                    });
                    return copy;
                });

                for (const pkg of packages) {
                    if (installCancelRef.current) {
                        setPackageStatuses((s) => ({...s, [pkg]: "cancelled"}));
                        continue;
                    }
                    setPackageStatuses((s) => ({...s, [pkg]: "installing"}));
                    try {
                        await pyodide.runPythonAsync(
                            `import micropip\nawait micropip.install(${JSON.stringify(pkg)})`,
                        );
                        setPackageStatuses((s) => ({...s, [pkg]: "installed"}));
                    } catch (ie) {
                        setPackageStatuses((s) => ({
                            ...s,
                            [pkg]: `failed: ${String(ie)}`,
                        }));
                    }
                }
            }

            const payload = `import sys, io, traceback\nbuf = io.StringIO()\nsys.stdout = buf\nsys.stderr = buf\ncode = ${JSON.stringify(codeToRun)}\ntry:\n    exec(code)\nexcept Exception:\n    traceback.print_exc()\n\nbuf.getvalue()`;
            const result = await pyodide.runPythonAsync(payload);
            setPyodideOutput(String(result ?? ""));
        } catch (err: unknown) {
            if (err instanceof Error) setPyodideOutput(err.message);
            else setPyodideOutput(String(err ?? "Pyodide error"));
        } finally {
            setPyodideLoading(false);
            setIsOutputVisible(true);
            setRunId((r) => r + 1);
        }
    }

    return (
        <div
            className={
                compact
                    ? "my-2 overflow-hidden rounded-lg border border-border bg-surface"
                    : "my-3 overflow-hidden rounded-lg border border-border bg-surface"
            }
        >
            <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2 bg-muted/20">
                <div className="font-code text-[10px] uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                    {normalizedLanguage}
                    {isEditing && (
                        <span className="text-neon lowercase tracking-normal">
                            (Editing mode)
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {/* Edit Toggle Button */}
                    {!readOnly && (
                        <button
                            type="button"
                            onClick={() => setIsEditing(!isEditing)}
                            className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 font-code text-[10px] transition-colors ${
                                isEditing
                                    ? "bg-accent border-accent text-accent-foreground"
                                    : "border-border text-muted-foreground hover:border-neon/40 hover:text-neon"
                            }`}
                        >
                            {isEditing ? (
                                <X className="h-3 w-3" />
                            ) : (
                                <Edit3 className="h-3 w-3" />
                            )}
                            {isEditing ? "Cancel" : "Edit"}
                        </button>
                    )}

                    {/* Run Button */}
                    <button
                        type="button"
                        onClick={async () => {
                            if (method === "pyodide") {
                                await runPython(editableCode);
                                return;
                            }

                            if (
                                ["ts", "typescript", "tsx"].includes(
                                    normalizedLanguage,
                                )
                            ) {
                                const esbuild = await ensureEsbuild();
                                if (esbuild) {
                                    try {
                                        const loader =
                                            normalizedLanguage === "tsx"
                                                ? "tsx"
                                                : "ts";
                                        const res = await esbuild.transform(
                                            editableCode,
                                            {loader, target: "es2017"},
                                        );
                                        setIframeSrcDoc(
                                            buildRunnerSrcDoc(String(res.code)),
                                        );
                                    } catch (e) {
                                        setIframeSrcDoc(
                                            buildRunnerSrcDoc(editableCode),
                                        );
                                    }
                                } else {
                                    setIframeSrcDoc(
                                        buildRunnerSrcDoc(editableCode),
                                    );
                                }
                            } else {
                                setIframeSrcDoc(
                                    buildRunnerSrcDoc(editableCode),
                                );
                            }

                            setIsOutputVisible(true);
                            setRunId((current) => current + 1);
                        }}
                        className="inline-flex items-center gap-1.5 rounded-md border border-neon/30 bg-neon/10 px-2.5 py-1 font-code text-[10px] text-neon transition-colors hover:bg-neon/20"
                    >
                        <Play className="h-3 w-3" />
                        Run
                    </button>

                    {/* Package Manager Toggle */}
                    <button
                        type="button"
                        onClick={() => setShowPkgManager((s) => !s)}
                        className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 font-code text-[10px] text-muted-foreground hover:text-neon"
                    >
                        pkg
                    </button>
                </div>
            </div>

            {/* Editor / Viewer Toggle */}
            {isEditing ? (
                <div className="pt-2 bg-[#1e1e1e]">
                    <Editor
                        height="250px"
                        language={
                            normalizedLanguage === "ts" ||
                            normalizedLanguage === "tsx"
                                ? "typescript"
                                : normalizedLanguage
                        }
                        theme="vs-dark"
                        value={editableCode}
                        onChange={(val) => setEditableCode(val || "")}
                        options={{
                            minimap: {enabled: false},
                            fontSize: compact ? 11 : 13,
                            fontFamily:
                                "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                            scrollBeyondLastLine: false,
                            padding: {top: 8, bottom: 8},
                        }}
                    />
                </div>
            ) : (
                <pre
                    className={
                        compact
                            ? "overflow-x-auto p-2.5 font-code text-[11px] leading-relaxed"
                            : "overflow-x-auto p-3 font-code text-xs leading-relaxed"
                    }
                >
                    <code
                        className={`language-${normalizedLanguage}`}
                        dangerouslySetInnerHTML={{__html: highlightedCode}}
                    />
                </pre>
            )}

            {/* Package Manager UIs (omitted for brevity, unchanged from your previous code) */}

            {/* Output Console UI */}
            {isOutputVisible && method === "iframe" && (
                <div className="border-t border-border bg-background/50 px-3 py-2">
                    <div className="mb-2 flex items-center justify-between font-code text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                            <Square className="h-3 w-3" />
                            Output
                        </div>
                        <button
                            onClick={() => setIsOutputVisible(false)}
                            className="hover:text-foreground"
                        >
                            <X className="h-3 w-3" />
                        </button>
                    </div>
                    <iframe
                        key={runId}
                        title="Code runner output"
                        sandbox="allow-scripts"
                        className={
                            compact
                                ? "h-40 w-full rounded-md border border-border bg-surface"
                                : "h-48 w-full rounded-md border border-border bg-surface"
                        }
                        srcDoc={iframeSrcDoc}
                    />
                </div>
            )}

            {method === "pyodide" && isOutputVisible && (
                <div className="border-t border-border bg-background/50 px-3 py-2">
                    <div className="mb-2 flex items-center justify-between font-code text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                            <Square className="h-3 w-3" />
                            Output
                        </div>
                        <button
                            onClick={() => setIsOutputVisible(false)}
                            className="hover:text-foreground"
                        >
                            <X className="h-3 w-3" />
                        </button>
                    </div>
                    <pre className="h-48 overflow-auto rounded-md border border-border bg-surface p-3 font-code text-xs">
                        {pyodideLoading ? (
                            <div className="text-muted-foreground">
                                Loading Python runtime…
                            </div>
                        ) : (
                            <code>{pyodideOutput ?? "Done."}</code>
                        )}
                    </pre>
                </div>
            )}
        </div>
    );
}

export default CodeRunner;