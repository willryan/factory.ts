import { RecPartial } from "./shared";
import * as Sync from "./sync";
import { Async } from ".";
import * as cloneDeep from "clone-deep";

export interface AsyncFactoryConfig {
  readonly startingSequenceNumber?: number
}

export type FactoryFunc<T, U = T> = (item?: RecPartial<T>) => Promise<U>;
export type ListFactoryFunc<T, U = T> = (
  count: number,
  item?: RecPartial<T>
) => Promise<U[]>;

function isPromise<T extends Object>(t: T | Promise<T>): t is Promise<T> {
  return typeof (t as any)["then"] === "function";
}

export function lift<T>(t: T | Promise<T>): Promise<T> {
  if (isPromise(t)) {
    return t;
  } else {
    return Promise.resolve(t);
  }
}

export class Generator<T> {
  constructor(readonly func: (seq: number) => T | Promise<T>) { }
  public build(seq: number): Promise<T> {
    return lift(this.func(seq));
  }
}
export class Derived<TOwner, TProperty> {
  constructor(
    readonly func: (
      owner: TOwner,
      seq: number
    ) => TProperty | Promise<TProperty>
  ) { }
  public build(owner: TOwner, seq: number): Promise<TProperty> {
    return lift(this.func(owner, seq));
  }
}

export interface IFactory<T, U> {
  build: FactoryFunc<T, U>;
  buildList: ListFactoryFunc<T, U>;
}

export class Factory<T> implements IFactory<T, T> {
  private seqNum: number;
  constructor(readonly builder: Builder<T>, private readonly config: AsyncFactoryConfig | undefined) {
    this.seqNum = this.config && this.config.startingSequenceNumber || 0;
  }

  public async build(item?: RecPartial<T>): Promise<T> {
    const seqNum = this.seqNum;
    const base = await buildBase(seqNum, this.builder);
    let v = Object.assign({}, base.value); //, item);
    if (item) {
      v = Factory.recursivePartialOverride(v, item);
    }
    const keys = Object.keys(item || {});
    for (const der of base.derived) {
      if (keys.indexOf(der.key) < 0) {
        (v as any)[der.key] = await der.derived.build(v, seqNum);
      }
    }
    this.seqNum++;
    return lift(v);
  }

  private static recursivePartialOverride<U>(x: U, y: RecPartial<U>): U {
    if (y === undefined || y === null) return x;
    const objProto = Object.getPrototypeOf({});
    if (Object.getPrototypeOf(y) != objProto) return y as any;
    let v = Object.assign({}, x);
    let yKeys = Object.keys(y);
    for (const key of Object.keys(v)) {
      if (yKeys.indexOf(key) >= 0) {
        const itemKeyVal = (y as any)[key];
        if (typeof itemKeyVal === "object") {
          const baseKeyVal = (v as any)[key];
          (v as any)[key] = Factory.recursivePartialOverride(
            baseKeyVal,
            itemKeyVal
          );
        } else {
          (v as any)[key] = itemKeyVal;
        }
      }
    }
    return v;
  }

  public buildList(count: number, item?: RecPartial<T>): Promise<T[]> {
    const ts: Promise<T>[] = Array(count); // allocate to correct size
    for (let i = 0; i < count; i++) {
      ts[i] = this.build(item);
    }
    return Promise.all(ts);
  }

  public extend(def: RecPartial<Builder<T>>): Factory<T> {
    const builder = Object.assign({}, this.builder, def);
    return new Factory(builder, this.config);
  }

  public combine<U>(other: Factory<U>): Factory<T & U> {
    const builder = Object.assign({}, this.builder, other.builder) as Builder<
      T & U
    >;
    return new Factory<T & U>(builder, this.config);
  }

  public transform<U>(fn: (t: T) => U | Promise<U>): TransformFactory<T, U> {
    return new TransformFactory(this, fn);
  }

  public withDerivation<KOut extends keyof T>(
    kOut: KOut,
    f: (v1: T, seq: number) => T[KOut] | Promise<T[KOut]>
  ): Factory<T> {
    const partial: any = {};
    partial[kOut] = new Derived<T, T[KOut]>(f);
    return this.extend(partial);
  }

  public withDerivation1<K1 extends keyof T, KOut extends keyof T>(
    kInput: [K1],
    kOut: KOut,
    f: (v1: T[K1], seq: number) => T[KOut] | Promise<T[KOut]>
  ): Factory<T> {
    const partial: any = {};
    partial[kOut] = new Derived<T, T[KOut]>((t, i) => f(t[kInput[0]], i));
    return this.extend(partial);
  }

  public withDerivation2<
    K1 extends keyof T,
    K2 extends keyof T,
    KOut extends keyof T
  >(
    kInput: [K1, K2],
    kOut: KOut,
    f: (v1: T[K1], v2: T[K2], seq: number) => T[KOut] | Promise<T[KOut]>
  ): Factory<T> {
    const partial: any = {};
    partial[kOut] = new Derived<T, T[KOut]>((t, i) =>
      f(t[kInput[0]], t[kInput[1]], i)
    );
    return this.extend(partial);
  }

  public withDerivation3<
    K1 extends keyof T,
    K2 extends keyof T,
    K3 extends keyof T,
    KOut extends keyof T
  >(
    kInput: [K1, K2, K3],
    kOut: KOut,
    f: (
      v1: T[K1],
      v2: T[K2],
      v3: T[K3],
      seq: number
    ) => T[KOut] | Promise<T[KOut]>
  ): Factory<T> {
    const partial: any = {};
    partial[kOut] = new Derived<T, T[KOut]>((t, i) =>
      f(t[kInput[0]], t[kInput[1]], t[kInput[2]], i)
    );
    return this.extend(partial);
  }

  public withDerivation4<
    K1 extends keyof T,
    K2 extends keyof T,
    K3 extends keyof T,
    K4 extends keyof T,
    KOut extends keyof T
  >(
    kInput: [K1, K2, K3, K4],
    kOut: KOut,
    f: (
      v1: T[K1],
      v2: T[K2],
      v3: T[K3],
      v4: T[K4],
      seq: number
    ) => T[KOut] | Promise<T[KOut]>
  ): Factory<T> {
    const partial: any = {};
    partial[kOut] = new Derived<T, T[KOut]>((t, i) =>
      f(t[kInput[0]], t[kInput[1]], t[kInput[2]], t[kInput[3]], i)
    );
    return this.extend(partial);
  }

  public withDerivation5<
    K1 extends keyof T,
    K2 extends keyof T,
    K3 extends keyof T,
    K4 extends keyof T,
    K5 extends keyof T,
    KOut extends keyof T
  >(
    kInput: [K1, K2, K3, K4, K5],
    kOut: KOut,
    f: (
      v1: T[K1],
      v2: T[K2],
      v3: T[K3],
      v4: T[K4],
      v5: T[K5],
      seq: number
    ) => T[KOut] | Promise<T[KOut]>
  ): Factory<T> {
    const partial: any = {};
    partial[kOut] = new Derived<T, T[KOut]>((t, i) =>
      f(t[kInput[0]], t[kInput[1]], t[kInput[2]], t[kInput[3]], t[kInput[4]], i)
    );
    return this.extend(partial);
  }
}

export class TransformFactory<T, U> implements IFactory<T, U> {
  constructor(
    private readonly inner: Factory<T>,
    private readonly transform: (t: T) => U | Promise<U>
  ) { }
  public async build(item?: RecPartial<T>): Promise<U> {
    const v = await this.inner.build(item);
    const u = await lift(this.transform(v));
    return u;
  }
  public async buildList(count: number, item?: RecPartial<T>): Promise<U[]> {
    const vs = await this.inner.buildList(count, item);
    return Promise.all(vs.map(this.transform).map(lift));
  }
}

export type Builder<T> = {
  [P in keyof T]: T[P] | Promise<T[P]> | Generator<T[P]> | Derived<T, T[P]>
};

export function val<T>(val: T): Generator<T> {
  return new Generator(() => val);
}

export function each<T>(f: (seqNum: number) => T | Promise<T>): Generator<T> {
  return new Generator(f);
}

interface BaseDerived {
  derived: Derived<any, any>;
  key: string;
}

interface BaseBuild<T> {
  readonly value: T;
  readonly derived: BaseDerived[];
}

async function buildBase<T>(
  seqNum: number,
  builder: Builder<T>
): Promise<BaseBuild<T>> {
  const t: { [key: string]: any } = {};
  const keys = Object.getOwnPropertyNames(builder);
  const derived: BaseDerived[] = [];
  for (const key of keys) {
    const v = (builder as any)[key];
    let value = v;
    if (!!v && typeof v === "object") {
      if (isPromise(v)) {
        value = await v;
      } else if (v.constructor === Generator) {
        value = await (v as Generator<any>).build(seqNum);
      } else if (v.constructor == Derived) {
        derived.push({ key, derived: v });
      } else if (v.constructor === Sync.Generator) {
        value = (v as Sync.Generator<any>).build(seqNum);
      } else if (v.constructor == Sync.Derived) {
        derived.push({ key, derived: new Derived(v.func) });
      } else {
        value = cloneDeep(v);
      }
    }
    t[key] = value;
  }
  return { value: t as T, derived };
}

export function makeFactory<T>(builder: Builder<T>, config?: AsyncFactoryConfig): Factory<T> {
  return new Factory(builder, config);
}

export function makeFactoryFromSync<T>(builder: Sync.Builder<T>, config?: AsyncFactoryConfig): Factory<T> {
  return new Factory(builder as Async.Builder<T>, config);
}
