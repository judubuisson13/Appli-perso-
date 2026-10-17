import { db } from '../../core/db';
import { DAYS_KEY, DEFAULT_DAYS, PROGRAM_KEY } from './content';
import type { ProgramState } from './logic';

export async function getProgram(): Promise<ProgramState> {
  return ((await db.settings.get(PROGRAM_KEY))?.value as ProgramState | undefined) ?? {};
}

export async function setProgram(s: ProgramState) {
  await db.settings.put({ key: PROGRAM_KEY, value: s });
}

export async function getDays(): Promise<number[]> {
  return ((await db.settings.get(DAYS_KEY))?.value as number[] | undefined) ?? DEFAULT_DAYS;
}

export async function setDays(days: number[]) {
  await db.settings.put({ key: DAYS_KEY, value: [...days].sort() });
}
