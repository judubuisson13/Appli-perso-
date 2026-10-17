/**
 * File d'exercices d'une leçon : une erreur renvoie l'exercice un peu plus loin,
 * pour se tromper puis réussir dans la même session.
 */
export interface QueueState<T> {
  items: T[];
  index: number;
  mistakes: Record<string, number>;
  firstTry: number;
  answered: number;
}

export function createQueue<T>(items: T[]): QueueState<T> {
  return { items: [...items], index: 0, mistakes: {}, firstTry: 0, answered: 0 };
}

export const REQUEUE_GAP = 3;
/** Au-delà, on montre la réponse et on passe : pas de boucle sans fin sur un exercice bloquant. */
export const MAX_REQUEUES = 2;

export function answer<T>(q: QueueState<T>, key: string, correct: boolean, graded = true): QueueState<T> {
  const item = q.items[q.index];
  const items = [...q.items];
  const mistakes = { ...q.mistakes };
  let { firstTry, answered } = q;
  if (graded) {
    answered++;
    const already = mistakes[key] ?? 0;
    if (correct && already === 0) firstTry++;
    if (!correct) mistakes[key] = already + 1;
    if (!correct && already < MAX_REQUEUES) {
      const at = Math.min(items.length, q.index + 1 + REQUEUE_GAP);
      items.splice(at, 0, item);
    }
  }
  return { items, index: q.index + 1, mistakes, firstTry, answered };
}

export function isFinished<T>(q: QueueState<T>): boolean {
  return q.index >= q.items.length;
}
