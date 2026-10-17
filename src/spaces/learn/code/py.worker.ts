/// <reference lib="webworker" />
import { HARNESS } from './harness';

// Exécute le code Python de l'élève dans un Web Worker (Pyodide), isolé de la page.
// Le thread principal coupe le worker s'il dépasse le temps imparti (boucle infinie).


interface Pyodide {
  runPython(code: string, opts?: { globals?: unknown }): unknown;
  setStdout(opts: { batched: (s: string) => void }): void;
  setStderr(opts: { batched: (s: string) => void }): void;
  globals: { get(name: string): (...a: unknown[]) => PyProxy };
  toPy(v: unknown): unknown;
}
interface PyProxy {
  set(k: string, v: unknown): void;
  get(k: string): unknown;
  toJs?: (o?: unknown) => unknown;
  destroy?: () => void;
}

export type RunRequest = { id: number; type: 'init'; indexURL: string } | { id: number; type: 'run'; code: string; tests: { name: string; code: string }[] };

export interface TestResult {
  name: string;
  ok: boolean;
  message: string;
}
export interface RunResponse {
  id: number;
  stdout: string;
  error: string | null;
  results: TestResult[];
}

let py: Pyodide | null = null;
let out: string[] = [];


self.onmessage = async (e: MessageEvent<RunRequest>) => {
  const msg = e.data;
  try {
    if (msg.type === 'init') {
      if (!py) {
        // Pyodide est servi à part (public/pyodide) : import dynamique d'une URL absolue, en worker module.
        const mod = (await import(/* @vite-ignore */ `${msg.indexURL}pyodide.mjs`)) as { loadPyodide(o: { indexURL: string }): Promise<Pyodide> };
        py = await mod.loadPyodide({ indexURL: msg.indexURL });
        py.setStdout({ batched: (s) => out.push(s) });
        py.setStderr({ batched: (s) => out.push(s) });
        py.runPython(HARNESS);
      }
      self.postMessage({ id: msg.id, stdout: '', error: null, results: [] } satisfies RunResponse);
      return;
    }
    if (!py) throw new Error('Python n’est pas chargé.');
    out = [];
    const ns = py.globals.get('dict')();
    const error = py.globals.get('_executer')(msg.code, ns) as unknown as string | undefined;
    const stdout = out.join('\n');
    let results: TestResult[] = [];
    if (!error) {
      ns.set('sortie', stdout);
      const pyTests = py.toPy(msg.tests.map((t) => [t.name, t.code]));
      const raw = py.globals.get('_tester')(pyTests, ns) as unknown as PyProxy;
      const list = raw.toJs!() as [string, boolean, string][];
      results = list.map(([name, ok, message]) => ({ name, ok, message }));
      raw.destroy?.();
    }
    ns.destroy?.();
    self.postMessage({ id: msg.id, stdout, error: error ?? null, results } satisfies RunResponse);
  } catch (err) {
    self.postMessage({ id: msg.id, stdout: out.join('\n'), error: String((err as Error).message ?? err), results: [] } satisfies RunResponse);
  }
};
