import { RUNTIME_CONFIG } from "./runtimeConfig";
import * as esbuild from "esbuild-wasm";

export async function prewarmEsbuild() {
  try {
    await esbuild.initialize({
      wasmURL: new URL("esbuild-wasm/esbuild.wasm", import.meta.url).href,
    });
    const w = window as unknown as { esbuild?: typeof esbuild };
    w.esbuild = esbuild;
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