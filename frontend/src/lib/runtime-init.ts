import { RUNTIME_CONFIG } from "./runtimeConfig";

export async function prewarmEsbuild() {
  try {
    // load esbuild-wasm script
    const s = document.createElement("script");
    s.src = "https://unpkg.com/esbuild-wasm@0.18.11/lib/umd/esbuild.min.js";
    s.crossOrigin = "anonymous";
    document.head.appendChild(s);
    await new Promise<void>((resolve, reject) => {
      s.onload = () => resolve();
      s.onerror = () => reject(new Error("Failed to load esbuild"));
    });
    // allow access to the esbuild global injected by the script
    const w = window as unknown as { esbuild?: { initialize?: (opts: { wasmURL: string }) => Promise<void> } };
    if (w.esbuild && typeof w.esbuild.initialize === "function") {
      await w.esbuild.initialize({ wasmURL: "https://unpkg.com/esbuild-wasm@0.18.11/esbuild.wasm" });
    }
    return true;
  } catch (e) {
    console.warn("esbuild prewarm failed:", e);
    return false;
  }
}

export async function prewarmPyodide() {
  try {
    const s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/pyodide/v0.23.4/full/pyodide.js";
    s.crossOrigin = "anonymous";
    document.head.appendChild(s);
    await new Promise<void>((resolve, reject) => {
      s.onload = () => resolve();
      s.onerror = () => reject(new Error("Failed to load pyodide"));
    });
    // leave loadPyodide for on-demand to reduce startup cost
    return true;
  } catch (e) {
    console.warn("pyodide prewarm failed:", e);
    return false;
  }
}

export async function prewarmAll() {
  if (RUNTIME_CONFIG.PRELOAD_ESBUILD) {
    prewarmEsbuild().catch(() => {});
  }
  if (RUNTIME_CONFIG.PRELOAD_PYODIDE) {
    prewarmPyodide().catch(() => {});
  }
}

export default prewarmAll;
