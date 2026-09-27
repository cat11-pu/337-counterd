// counters.js：计数器累加与增量读取（表按名字升序，每行 [名字, 当前值, 上次读过]）
export function bumpCounter(counters, name, delta) {
  for (let i = 0; i < counters.length; i += 1) {
    if (counters[i][0] === name) {
      counters[i][1] += delta;
      return counters;
    }
    if (counters[i][0] > name) {
      counters.splice(i, 0, [name, delta, 0]);
      return counters;
    }
  }
  counters.push([name, delta, 0]);
  return counters;
}

export function takeOf(counters, name) {
  for (let i = 0; i < counters.length; i += 1) {
    if (counters[i][0] === name) {
      const delta = counters[i][1] - counters[i][2];
      counters[i][2] = counters[i][1];
      return delta;
    }
  }
  return -1;
}
