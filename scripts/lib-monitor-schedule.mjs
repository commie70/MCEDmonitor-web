function sourceRuns(ledger) {
  if (!ledger.source_runs || typeof ledger.source_runs !== "object" || Array.isArray(ledger.source_runs)) {
    ledger.source_runs = {};
  }
  return ledger.source_runs;
}

function intervalHours(source) {
  const value = Number(source.poll_interval_hours);
  return Number.isFinite(value) && value > 0 ? value : null;
}

export function isSourceDue(source, ledger, now = new Date().toISOString()) {
  const hours = intervalHours(source);
  if (!hours) return true;
  const lastSuccess = sourceRuns(ledger)[source.source_id]?.last_success_at;
  if (!lastSuccess) return true;
  return Date.parse(now) >= Date.parse(lastSuccess) + hours * 60 * 60 * 1000;
}

export function recordSourceSuccess(ledger, source, checkedAt, itemCount) {
  const runs = sourceRuns(ledger);
  const hours = intervalHours(source);
  runs[source.source_id] = {
    last_checked_at: checkedAt,
    last_success_at: checkedAt,
    cursor_at: checkedAt,
    next_due_at: hours
      ? new Date(Date.parse(checkedAt) + hours * 60 * 60 * 1000).toISOString()
      : null,
    consecutive_failures: 0,
    first_failure_at: null,
    last_error: null,
    item_count: Number.isInteger(itemCount) && itemCount >= 0 ? itemCount : 0,
  };
  return runs[source.source_id];
}

export function recordSourceFailure(ledger, source, checkedAt, error, { cursorAt = null } = {}) {
  const runs = sourceRuns(ledger);
  const previous = runs[source.source_id] || {};
  runs[source.source_id] = {
    ...previous,
    last_checked_at: checkedAt,
    last_success_at: previous.last_success_at || null,
    cursor_at: previous.cursor_at || cursorAt || null,
    next_due_at: previous.next_due_at || null,
    consecutive_failures: Number(previous.consecutive_failures || 0) + 1,
    first_failure_at: previous.first_failure_at || checkedAt,
    last_error: String(error?.message || error || "unknown error").slice(0, 500),
    item_count: Number.isInteger(previous.item_count) ? previous.item_count : 0,
  };
  return runs[source.source_id];
}

export function sourceHasCoverageGap(source, ledger, now = null) {
  const run = sourceRuns(ledger)[source.source_id];
  if (!run?.consecutive_failures) return false;
  const hours = intervalHours(source);
  if (!hours) return run.consecutive_failures >= 3;
  const checkedAt = now || run.last_checked_at;
  return Date.parse(checkedAt) - Date.parse(run.first_failure_at) > hours * 2 * 60 * 60 * 1000;
}

export function validateMonitorRunOptions(options = {}) {
  if (Number.isFinite(options.limit) && !options.dryRun) {
    throw new Error("--limit requires --dry-run so persistent source cursors cannot skip hits");
  }
  return options;
}
