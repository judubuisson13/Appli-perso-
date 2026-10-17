import { describe, expect, it } from 'vitest';
import { join } from 'node:path';
import { loadPyodide } from 'pyodide';
import { HARNESS } from '../src/spaces/learn/code/harness';
import { missions } from '../src/spaces/learn/code/content';

/**
 * Fait tourner le vrai interpréteur (Pyodide, sous Node) avec le même harnais que l'appli :
 * chaque solution doit passer tous ses tests, chaque code de départ doit en rater au moins un.
 */
describe('code : missions exécutées dans Pyodide', async () => {
  const py = await loadPyodide({ indexURL: join(__dirname, '..', 'node_modules', 'pyodide') });
  let out: string[] = [];
  py.setStdout({ batched: (s: string) => out.push(s) });
  py.runPython(HARNESS);

  const run = (code: string, tests: { name: string; code: string }[]) => {
    out = [];
    const ns = py.globals.get('dict')();
    const error = py.globals.get('_executer')(code, ns);
    ns.set('sortie', out.join('\n'));
    const res = py.globals.get('_tester')(py.toPy(tests.map((t) => [t.name, t.code])), ns).toJs() as [string, boolean, string][];
    return { error, res };
  };

  for (const m of missions) {
    it(`${m.id} · la solution passe`, () => {
      const { error, res } = run(m.solution, m.tests);
      expect(error).toBeUndefined();
      expect(res.filter((r) => !r[1])).toEqual([]);
    });
    it(`${m.id} · le code de départ ne passe pas`, () => {
      expect(run(m.starter, m.tests).res.some((r) => !r[1])).toBe(true);
    });
  }

  it('signale une erreur de syntaxe avec sa ligne', () => {
    expect(run('def f(:\n  pass', []).error).toMatch(/syntaxe ligne 1/);
  });
  it('signale une exception de l’élève avec le type d’erreur', () => {
    expect(run('x = 1 / 0', []).error).toMatch(/ZeroDivisionError/);
  });
}, 60_000);
