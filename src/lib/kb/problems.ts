// What is actually wrong behind a ticket, one problem per fix. Pages explain it; this file is what runs.
//
// causes.ts places each report by its tenant (locale + booking form) and channel. That covers the
// two ways a day and a month swap. It does not cover a date that moves by one day: no swap, no form
// hint, a clock problem. The desk marks those by reading them (desk-notes.json `oneDayMove`), and
// CauseTable still counts them under `parser`. Here they get their own problem, because a parser fix
// will not touch them.
import { causeOf, uniqueById, type Report, type Tenant } from '#lib/kb/causes';

export type Problem = 'parser' | 'hint' | 'one-day';
export const PROBLEMS: readonly Problem[] = ['parser', 'hint', 'one-day'];

export function problemOf(r: Report, t: Tenant | undefined, oneDay: readonly string[]): Problem | 'unplaced' {
  if (oneDay.includes(r.id)) return 'one-day';
  return causeOf(r, t) ?? 'unplaced';
}

export type ProblemGroup = {
  problem: Problem | 'unplaced';
  reports: Report[];
  tenants: string[];
  channels: Record<string, number>;
  firstSeen: string;
  lastSeen: string;
};

export function groupByProblem(
  all: Report[],
  ticket: number,
  tenantOf: (r: Report) => Tenant | undefined,
  oneDay: readonly string[],
): { merged: Report[]; groups: ProblemGroup[] } {
  const merged = uniqueById(all).filter((r) => r.mergedInto === ticket);
  const by = new Map<ProblemGroup['problem'], Report[]>();
  for (const r of merged) {
    const p = problemOf(r, tenantOf(r), oneDay);
    by.set(p, [...(by.get(p) ?? []), r]);
  }
  const order = (p: ProblemGroup['problem']) => (p === 'unplaced' ? PROBLEMS.length : PROBLEMS.indexOf(p));
  const groups = [...by.entries()]
    .map(([problem, rs]) => {
      const days = rs.map((r) => r.receivedAt.slice(0, 10)).sort();
      return {
        problem,
        reports: rs,
        tenants: [...new Set(rs.map((r) => r.tenant))].sort(),
        channels: rs.reduce<Record<string, number>>((n, r) => ({ ...n, [r.channel]: (n[r.channel] ?? 0) + 1 }), {}),
        firstSeen: days[0],
        lastSeen: days[days.length - 1],
      };
    })
    .sort((a, b) => order(a.problem) - order(b.problem));
  return { merged, groups };
}

// Reports whose intake tag names a different cause than their tenant does.
export function mistagged(g: ProblemGroup): number {
  if (g.problem !== 'parser' && g.problem !== 'hint') return 0;
  return g.reports.filter((r) => r.meta.intakeTag !== g.problem).length;
}
