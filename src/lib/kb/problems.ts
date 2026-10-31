// What is actually wrong behind a ticket: one problem per thing the reports show. Pages explain
// it; this file is what runs.
//
// causes.ts splits the day/month swaps into `parser` and `hint` by tenant form and report
// `channel`. But `channel` is how the report reached the desk (app, email, the support form), not
// how the booking was made, and a swap reads the same either way. So here every swap is one
// problem. A date that moves by one day is not a swap: the desk marks those by reading them
// (desk-notes.json `oneDayMove`), and CauseTable still counts them under `parser`. Here they are
// their own problem, because a parser fix will not touch them.
import { causeOf, uniqueById, type Report, type Tenant } from '#lib/kb/causes';

export type Problem = 'swap' | 'one-day';
export const PROBLEMS: readonly Problem[] = ['swap', 'one-day'];

export function problemOf(r: Report, t: Tenant | undefined, oneDay: readonly string[]): Problem | 'unplaced' {
  if (oneDay.includes(r.id)) return 'one-day';
  return causeOf(r, t) === null ? 'unplaced' : 'swap';
}

export type ProblemGroup = {
  problem: Problem | 'unplaced';
  reports: Report[];
  tenants: string[];
  channels: Record<string, number>;
  // What causes.ts calls these reports: cause → count.
  causes: Record<string, number>;
  firstSeen: string;
  lastSeen: string;
};

const tally = (rs: Report[], key: (r: Report) => string) =>
  rs.reduce<Record<string, number>>((n, r) => ({ ...n, [key(r)]: (n[key(r)] ?? 0) + 1 }), {});

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
        channels: tally(rs, (r) => r.channel),
        causes: tally(rs, (r) => causeOf(r, tenantOf(r)) ?? 'none'),
        firstSeen: days[0],
        lastSeen: days[days.length - 1],
      };
    })
    .sort((a, b) => order(a.problem) - order(b.problem));
  return { merged, groups };
}
