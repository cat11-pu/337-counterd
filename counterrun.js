// counterrun.js：按处理预算处理并留账。step/close 都不改入参 state，返回新状态。
import { bumpCounter, takeOf } from "./counters.js";

function fail(code, message) {
  const error = new Error(message);
  error.code = code;
  throw error;
}

function codes(spec) {
  return {
    event: spec.event_error_code || "E_BAD_EVENT",
    delta: spec.delta_error_code || "E_BAD_DELTA",
    counter: spec.counter_error_code || "E_NO_COUNTER"
  };
}

// 事件结构先校验，与预算无关；增量为负同样属于校验，报 E_BAD_DELTA。
function validateEvent(event, spec) {
  const code = codes(spec);
  if (!event || typeof event !== "object") {
    fail(code.event, "bad event");
  }
  if (event.kind !== "add" && event.kind !== "take") {
    fail(code.event, "bad event kind");
  }
  if (typeof event.name !== "string" || event.name.length === 0) {
    fail(code.event, "bad event name");
  }
  if (event.kind === "add") {
    if (!Number.isInteger(event.delta)) {
      fail(code.event, "bad event delta");
    }
    if (event.delta < 0) {
      fail(code.delta, "negative delta");
    }
  }
}

function hasCounter(counters, name) {
  return counters.some(function (row) { return row[0] === name; });
}

function applyAdd(state, name, delta) {
  state.counters = bumpCounter(state.counters, name, delta);
}

function applyTake(state, name, spec) {
  if (!hasCounter(state.counters, name)) {
    fail(codes(spec).counter, "no counter " + name);
  }
  state.takes.push([name, takeOf(state.counters, name)]);
}

function applyEvent(state, event, spec) {
  if (event.kind === "add") {
    applyAdd(state, event.name, event.delta);
  } else {
    applyTake(state, event.name, spec);
  }
}

// 账上条目是 [kind, name] 或 [kind, name, delta]。
function applyEntry(state, entry, spec) {
  if (entry[0] === "add") {
    applyAdd(state, entry[1], entry[2]);
  } else {
    applyTake(state, entry[1], spec);
  }
}

function toEntry(event) {
  return event.kind === "add" ? ["add", event.name, event.delta] : ["take", event.name];
}

function cloneState(state) {
  return {
    counters: (state.counters || []).map(function (row) { return row.slice(); }),
    takes: (state.takes || []).map(function (row) { return row.slice(); }),
    ledger: (state.ledger || []).map(function (row) { return row.slice(); }),
    applied: (state.applied || []).slice()
  };
}

export function step(spec) {
  const events = spec.events || [];
  for (const event of events) {
    validateEvent(event, spec);
  }
  const state = cloneState(spec.state || {});
  let budget = spec.budget;
  let served = 0;
  const bound = events.length + state.ledger.length;
  while (budget > 0 && state.ledger.length > 0) {
    applyEntry(state, state.ledger.shift(), spec);
    budget -= 1;
    served += 1;
  }
  for (const event of events) {
    if (state.applied.indexOf(event.id) !== -1) {
      continue;
    }
    if (budget > 0) {
      applyEvent(state, event, spec);
      budget -= 1;
      served += 1;
    } else {
      state.ledger.push(toEntry(event));
    }
    state.applied.push(event.id);
  }
  return {
    state: state,
    served: served,
    ledger_before: state.ledger.length,
    ledger: state.ledger.map(function (row) { return row.slice(); }),
    judged: served,
    judged_bound: bound
  };
}

export function close(spec) {
  const state = cloneState(spec.state || {});
  let catchup = 0;
  while (state.ledger.length > 0) {
    applyEntry(state, state.ledger.shift(), spec);
    catchup += 1;
  }
  return { state: state, catchup: catchup };
}
