export type RecPartial<T> = { [P in keyof T]?: RecPartial<T[P]> };

export type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;

export function recursivePartialOverride<U>(x: U, y: RecPartial<U>): U {
  if (y === undefined || y === null) return x;
  const objProto = Object.getPrototypeOf({});
  if (Object.getPrototypeOf(y) != objProto) return y as any;
  const v = Object.assign({}, x);
  const yKeys = Object.keys(y);
  const allKeys = uniq(Object.keys(v).concat(yKeys));
  for (const key of allKeys) {
    if (yKeys.indexOf(key) >= 0) {
      const itemKeyVal = (y as any)[key];
      if (null != itemKeyVal && typeof itemKeyVal === "object") {
        const baseKeyVal = (v as any)[key];
        (v as any)[key] = recursivePartialOverride(baseKeyVal, itemKeyVal);
      } else {
        (v as any)[key] = itemKeyVal;
      }
    }
  }
  return v;
}

export function uniq<T>(ts: Array<T>): Array<T> {
  const out: T[] = [];
  for (const v of ts) {
    if (out.indexOf(v) < 0) {
      out.push(v);
    }
  }
  return out;
}
