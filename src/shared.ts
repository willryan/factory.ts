export declare type RecPartial<T> = {
  [P in keyof T]?: unknown extends T[P] ? unknown : RecPartial<T[P]>;
};

export type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;

/** Plain `{}` or `Object.create(null)` — safe to walk for RecPartial-style merge. */
function isPlainRecord(x: unknown): x is Record<string, unknown> {
  if (x === null || typeof x !== "object") {
    return false;
  }
  const proto = Object.getPrototypeOf(x);
  return proto === Object.prototype || proto === null;
}

export function recursivePartialOverride<U>(x: U, y: RecPartial<U>): U {
  if (y === undefined || y === null) return x;
  const objProto = Object.getPrototypeOf({});
  if (Object.getPrototypeOf(y) != objProto) return y as any;
  let v = Object.assign({}, x);
  let yKeys = Object.keys(y);
  const allKeys = uniq(Object.keys(v).concat(yKeys));
  for (const key of allKeys) {
    if (yKeys.indexOf(key) >= 0) {
      const itemKeyVal = (y as any)[key];
      if (null != itemKeyVal && typeof itemKeyVal === "object") {
        const baseKeyVal = (v as any)[key];
        const basePlain = isPlainRecord(baseKeyVal);
        const overridePlain = isPlainRecord(itemKeyVal);
        if (basePlain && overridePlain) {
          (v as any)[key] = recursivePartialOverride(baseKeyVal, itemKeyVal);
        } else if (!basePlain && overridePlain) {
          // e.g. scalar/array default + object override (#87); walk override from {} so
          // nested plain objects get the same merge rules, not a shared user reference.
          (v as any)[key] = recursivePartialOverride({} as any, itemKeyVal) as any;
        } else {
          // Arrays, Dates, class instances, etc.: existing entry hook returns `y` as-is.
          (v as any)[key] = recursivePartialOverride(baseKeyVal, itemKeyVal);
        }
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
