// counterrun.js：按处理预算处理事件，处理不完的连着载压账，收尾不限预算清账
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

// 结构先校验，与预算无关；增量必须是非负整数
function validateEvent(ev, code) {
  if (!ev || typeof ev !== "object"
      || (ev.kind !== "add" && ev.kind !== "take")
      || typeof ev.name !== "string" || ev.name.length === 0) {
    fail(code.event, "bad event");
  }
  if (ev.kind === "add") {
    if (typeof ev.delta !== "number" || !Number.isFinite(ev.delta)) {
      fail(code.event, "bad event");
    }
    if (!Number.isInteger(ev.delta) || ev.delta < 0) {
      fail(code.delta, "bad delta");
    }
  }
}

function cloneState(state) {
  const src = state || {};
  return {
    counters: (src.counters || []).map(function (row) { return row.slice(); }),
    takes: (src.takes || []).map(function (row) { return row.slice(); }),
    ledger: (src.ledger || []).map(function (ev) { return Object.assign({}, ev); }),
    applied: (src.applied || []).slice()
  };
}

function applyEvent(state, ev, code) {
  if (ev.kind === "add") {
    bumpCounter(state.counters, ev.name, ev.delta);
  } else {
    const value = takeOf(state.counters, ev.name);
    if (value < 0) {
      fail(code.counter, "no counter: " + ev.name);
    }
    state.takes.push([ev.name, value]);
  }
  if (ev.id !== undefined) {
    state.applied.push(ev.id);
  }
}

function displayRow(ev) {
  return ev.kind === "add" ? ["add", ev.name, ev.delta] : ["take", ev.name];
}

export function step(spec) {
  const code = codes(spec);
  const events = spec.events || [];
  events.forEach(function (ev) { validateEvent(ev, code); });
  const state = cloneState(spec.state);
  const ledgerIn = state.ledger.length;
  let budget = Math.max(0, spec.budget || 0);
  let served = 0;
  let ledgered = 0;
  while (state.ledger.length > 0 && budget > 0) {
    applyEvent(state, state.ledger.shift(), code);
    served += 1;
    budget -= 1;
  }
  events.forEach(function (ev) {
    if (ev.id !== undefined && state.applied.indexOf(ev.id) !== -1) {
      return;
    }
    if (budget > 0) {
      applyEvent(state, ev, code);
      served += 1;
      budget -= 1;
    } else {
      state.ledger.push(Object.assign({}, ev));
      ledgered += 1;
    }
  });
  return {
    state: state,
    served: served,
    ledger_before: state.ledger.length,
    ledger: state.ledger.map(displayRow),
    judged: served + ledgered,
    judged_bound: ledgerIn + events.length
  };
}

export function close(spec) {
  const code = codes(spec);
  const state = cloneState(spec.state);
  let catchup = 0;
  while (state.ledger.length > 0) {
    applyEvent(state, state.ledger.shift(), code);
    catchup += 1;
  }
  return { state: state, catchup: catchup };
}
