// Runtime and prefetch configuration
export const RUNTIME_CONFIG = {
  PREFETCH_AHEAD: 3,
  PREFETCH_CACHE_LIMIT: 5,
  THREAD_BODY_CACHE_LIMIT: 300,
  PRELOAD_ESBUILD: true,
  PRELOAD_PYODIDE: true, // prewarm Pyodide by default to reduce first-run latency
};

export default RUNTIME_CONFIG;
