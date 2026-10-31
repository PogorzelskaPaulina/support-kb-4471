<script lang="ts">
  import reports from '#lib/data/reports-4471.json';
  import notes from '#lib/data/desk-notes.json';
  import { groupByProblem, type Problem } from '#lib/kb/problems';
  import { tenantOf } from '#lib/kb/locales';
  import type { Report } from '#lib/kb/causes';

  // tickets: where each problem is tracked now, problem → { label, href }.
  let { ticket, tickets = {} }: { ticket: number; tickets?: Partial<Record<Problem, { label: string; href: string }>> } =
    $props();

  const split = $derived(groupByProblem(reports as Report[], ticket, tenantOf, notes.oneDayMove));
  const WHAT: Record<string, string> = {
    parser: 'the shared parser reads the date month first; the tenant writes it day first',
    hint: 'the booking-v3 form hint says MM/DD/YYYY; the form reads the date day first',
    unplaced: 'no tenant on file',
  };
  const list = (c: Record<string, number>) =>
    Object.entries(c)
      .sort((a, b) => b[1] - a[1])
      .map(([k, n]) => `${k} ×${n}`)
      .join(' · ');
</script>

<p class="sum">
  <strong>{split.merged.length}</strong> reports merged into #{ticket} ·
  <strong>{split.groups.length}</strong>
  {split.groups.length === 1 ? 'problem' : 'problems'}
</p>

<table>
  <thead>
    <tr><th>problem</th><th>reports</th><th>cause</th><th>tenants</th><th>channels</th><th>intake tagged</th><th>seen</th><th>ticket</th></tr>
  </thead>
  <tbody>
    {#each split.groups as g (g.problem)}
      <tr>
        <td><code>{g.problem}</code></td>
        <td><strong>{g.reports.length}</strong></td>
        <td>{WHAT[g.problem]}</td>
        <td class="small">{g.tenants.length === 11 ? 'all 11' : g.tenants.join(', ')}</td>
        <td class="small">{list(g.channels)}</td>
        <td class="small">{list(g.taggedAs)}</td>
        <td class="small">{g.firstSeen} → {g.lastSeen}</td>
        <td>
          {#if tickets[g.problem as Problem]}
            <a href={tickets[g.problem as Problem]!.href}>{tickets[g.problem as Problem]!.label}</a>
          {:else}
            <span class="none">none yet</span>
          {/if}
        </td>
      </tr>
    {/each}
  </tbody>
</table>

{#each split.groups as g (g.problem)}
  {#if g.readAsOneDay}
    <p class="note">
      <code>{g.problem}</code> includes {g.readAsOneDay} reports the desk read as a one-day move: counted by their tenant,
      in this problem.
    </p>
  {/if}
{/each}

<style>
  .sum { font-size: 1.1rem; }
  .small { color: var(--muted); font-size: 0.85em; }
  .none { color: var(--warn); font-weight: 600; }
  .note { color: var(--muted); font-size: 0.85em; }
</style>
