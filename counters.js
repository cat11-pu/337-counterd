// counters.js：计数器累加与增量。每条计数器是 [名字, 当前值, 上次读过]，按名字升序。
export function bumpCounter(counters, name, delta) {
  for (const row of counters) {
    if (row[0] === name) {
      row[1] += delta;
      return counters;
    }
  }
  const row = [name, delta, 0];
  let at = counters.length;
  while (at > 0 && counters[at - 1][0] > name) {
    at -= 1;
  }
  counters.splice(at, 0, row);
  return counters;
}

export function takeOf(counters, name) {
  for (const row of counters) {
    if (row[0] === name) {
      const diff = row[1] - row[2];
      row[2] = row[1];
      return diff;
    }
  }
  return -1;
}
