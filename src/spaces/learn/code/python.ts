import PyWorker from './py.worker.ts?worker&inline';
import type { RunRequest, RunResponse } from './py.worker';

type Request = RunRequest extends infer R ? (R extends unknown ? Omit<R, 'id'> : never) : never;

export type { RunResponse, TestResult } from './py.worker';

const RUN_TIMEOUT_MS = 6000;
const INIT_TIMEOUT_MS = 90_000;

let worker: Worker | null = null;
let ready: Promise<void> | null = null;
let nextId = 1;

function call(req: Request, timeout: number): Promise<RunResponse> {
  const w = worker!;
  const id = nextId++;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      // Boucle infinie ou calcul trop long : on repart d'un interpréteur neuf.
      w.terminate();
      worker = null;
      ready = null;
      reject(new Error(`Temps dépassé (${timeout / 1000} s). Une boucle ne s’arrête peut-être jamais ?`));
    }, timeout);
    const onMsg = (e: MessageEvent<RunResponse>) => {
      if (e.data.id !== id) return;
      clearTimeout(timer);
      w.removeEventListener('message', onMsg);
      resolve(e.data);
    };
    w.addEventListener('message', onMsg);
    w.postMessage({ ...req, id });
  });
}

/** Charge Python (≈ 13 Mo la première fois, ensuite depuis le cache). */
export function loadPython(): Promise<void> {
  if (ready) return ready;
  worker = new PyWorker();
  const indexURL = new URL(`${import.meta.env.BASE_URL}pyodide/`, location.href).href;
  // L'aperçu « une seule page » ne sert pas les .zip : la bibliothèque standard y est renommée.
  const stdLibURL = import.meta.env.MODE === 'artifact' ? `${indexURL}python_stdlib.wasm` : undefined;
  ready = call({ type: 'init', indexURL, stdLibURL }, INIT_TIMEOUT_MS).then((r) => {
    if (r.error) {
      ready = null;
      throw new Error(r.error);
    }
  });
  return ready;
}

export async function runPython(code: string, tests: { name: string; code: string }[]): Promise<RunResponse> {
  await loadPython();
  return call({ type: 'run', code, tests }, RUN_TIMEOUT_MS);
}
