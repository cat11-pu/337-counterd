import assert from "node:assert";
import { bumpCounter, takeOf } from "../counters.js";
import { step, close } from "../counterrun.js";

const base = {
  budget: 1,
  state: { counters: [], takes: [], ledger: [], applied: [] },
  events: [{ id: 1, kind: "add", name: "a", delta: 5 }],
  delta_error_code: "E_BAD_DELTA", counter_error_code: "E_NO_COUNTER",
  event_error_code: "E_BAD_EVENT"
};

let failed = 0;
function check(name, fn) {
  try { fn(); console.log("ok " + name); } catch (e) { failed += 1; console.log("FAIL " + name + " :: " + e.message); }
}

check("bumpCounter returns rows", () => {
  assert.ok(Array.isArray(bumpCounter([], "z", 1)));
});

check("takeOf returns a number", () => {
  assert.strictEqual(typeof takeOf([], "z"), "number");
});

check("step returns a state", () => {
  assert.strictEqual(typeof step(base).state, "object");
});

check("close returns a state", () => {
  assert.strictEqual(typeof close(base).state, "object");
});

console.log("5 cases, " + failed + " failed");
process.exit(failed === 0 ? 0 : 1);
