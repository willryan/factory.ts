import { RecPartial, Omit, recursivePartialOverride } from "./shared";
import * as Sync from "./sync";
import { Async } from ".";
import * as cloneDeep from "clone-deep";

export interface AsyncFactoryConfig {
  readonly startingSequenceNumber?: number;
}

export type FactoryFunc<T, K extends keyof T, U = T> = keyof T extends K
  ? (item?: RecPartial<T>) => Promise<U>
  : (item: RecPartial<T> & Omit<T, K>) => Promise<U>;

export type ListFactoryFunc<T, K extends keyof T, U = T> = keyof T extends K
  ? (count: number, item?: RecPartial<T>) => Promise<U[]>
  : (count: number, item: RecPartial<T> & Omit<T, K>) => Promise<U[]>;

function isPromise<T>(t: T | Promise<T>): t is Promise<T> {
  return !!t && typeof (t as any)["then"] === "function";
}

export function lift<T>(t: T | Promise<T>): Promise<T> {
  if (isPromise(t)) {
    return t;
  } else {
    return Promise.resolve(t);
  }
}

export class Generator<T> {
  constructor(readonly func: (seq: number) => T | Promise<T>) {}
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
  ) {}
  public build(owner: TOwner, seq: number): Promise<TProperty> {
    return lift(this.func(owner, seq));
  }
}

export interface IFactory<T, K extends keyof T, U> {
  build: FactoryFunc<T, K, U>;
  buildList: ListFactoryFunc<T, K, U>;
}

export class Factory<T, K extends keyof T = keyof T>
  implements IFactory<T, K, T>
{
  private seqNum: number;
  private getStartingSequenceNumber = () =>
    (this.config && this.config.startingSequenceNumber) || 0;

  constructor(
    readonly builder: Builder<T, K> | Promise<Builder<T, K>>,
    private readonly config: AsyncFactoryConfig | undefined
  ) {
    this.seqNum = this.getStartingSequenceNumber();
  }

  public resetSequenceNumber(newSequenceNumber?: number) {
    this.seqNum = newSequenceNumber
      ? newSequenceNumber
      : this.getStartingSequenceNumber();
  }

  public build = (async (item?: RecPartial<T> & Omit<T, K>): Promise<T> => {
    return this._build(null, item);
  }) as FactoryFunc<T, K, T>;

  public _build = async (
    buildKeys: (keyof T)[] | null,
    item?: RecPartial<T> & Omit<T, K>
  ): Promise<T> => {
    const seqNum = this.seqNum;
    this.seqNum++;
    const base = await buildBase(seqNum, this.builder);
    let v = Object.assign({}, base.value); //, item);
    if (item) {
      v = recursivePartialOverride(v, item);
    }
    const directlySpecifiedKeys = Object.keys(item || {});
    if (!buildKeys) {
      buildKeys = base.derived.map((d) => d.key) as (keyof T)[];
    }
    for (const der of base.derived) {
      if (!buildKeys.includes(der.key as keyof T)) {
        console.log(`skip unspecified build key ${der.key}`);
        continue;
      }
      if (directlySpecifiedKeys.includes(der.key)) {
        console.log(`skip explicitly defined build key ${der.key}`);
        continue;
      }
      (v as any)[der.key] = await der.derived.build(v, seqNum);
    }
    return lift(v);
  };

  public buildList = (async (
    count: number,
    item?: RecPartial<T> & Omit<T, K>
  ): Promise<T[]> => {
    const ts: T[] = Array(count); // allocate to correct size
    // don't run in parallel, so that seq num works predictably
    for (let i = 0; i < count; i++) {
      ts[i] = await this.build(item as any);
    }
    return ts;
  }) as ListFactoryFunc<T, K, T>;

  public extend(def: RecPartial<Builder<T, K>>): Factory<T, K> {
    const builder = Object.assign({}, this.builder, def);
    return new Factory(builder, this.config);
  }

  public combine<U, K2 extends keyof U>(
    other: Factory<U, K2>
  ): Factory<T & U, K | K2> {
    const builder: Builder<T & U, K | K2> = Object.assign(
      {},
      this.builder,
      other.builder
    ) as any;
    return new Factory<T & U, K | K2>(builder, this.config);
  }

  public transform<U>(fn: (t: T) => U | Promise<U>): TransformFactory<T, K, U> {
    return new TransformFactory(this, fn);
  }

  public withDerivation<KOut extends keyof T>(
    kOut: KOut,
    f: (v1: T, seq: number) => T[KOut] | Promise<T[KOut]>
  ): Factory<T, K> {
    const partial: any = {};
    partial[kOut] = new Derived<T, T[KOut]>(f);
    return this.extend(partial);
  }

  public withSelfDerivation<KOut extends K>(
    kOut: KOut,
    f: (v1: T, seq: number) => T[KOut] | Promise<T[KOut]>
  ): Factory<T, K> {
    const partial: any = {};
    partial[kOut] = new Derived<T, T[KOut]>(async (v2, seq) => {
      delete v2[kOut];
      const origValue = (await this._build([kOut], v2))[kOut];
      v2[kOut] = origValue;
      return f(v2, seq);
    });
    return this.extend(partial);
  }

  public withDerivation1<K1 extends keyof T, KOut extends keyof T>(
    kInput: [K1],
    kOut: KOut,
    f: (v1: T[K1], seq: number) => T[KOut] | Promise<T[KOut]>
  ): Factory<T, K> {
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
  ): Factory<T, K> {
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
  ): Factory<T, K> {
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
  ): Factory<T, K> {
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
  ): Factory<T, K> {
    const partial: any = {};
    partial[kOut] = new Derived<T, T[KOut]>((t, i) =>
      f(t[kInput[0]], t[kInput[1]], t[kInput[2]], t[kInput[3]], t[kInput[4]], i)
    );
    return this.extend(partial);
  }
}

export class TransformFactory<T, K extends keyof T, U>
  implements IFactory<T, K, U>
{
  constructor(
    private readonly inner: Factory<T, K>,
    private readonly transform: (t: T) => U | Promise<U>
  ) {}
  public build = (async (item?: RecPartial<T> & Omit<T, K>): Promise<U> => {
    const v = await this.inner.build(item as any);
    const u = await lift(this.transform(v));
    return u;
  }) as FactoryFunc<T, K, U>;
  public buildList = (async (
    count: number,
    item?: RecPartial<T> & Omit<T, K>
  ): Promise<U[]> => {
    const vs = await this.inner.buildList(count, item as any);
    return Promise.all(vs.map(this.transform).map(lift));
  }) as ListFactoryFunc<T, K, U>;
}

export type Builder<T, K extends keyof T = keyof T> = {
  [P in K]: T[P] | Promise<T[P]> | Generator<T[P]> | Derived<T, T[P]>;
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

async function buildBase<T, K extends keyof T>(
  seqNum: number,
  builder: Builder<T, K> | Promise<Builder<T, K>>
): Promise<BaseBuild<T>> {
  const resolvedBuilder = await lift(builder);

  const t: { [key: string]: any } = {};
  const keys = Object.getOwnPropertyNames(resolvedBuilder);
  const derived: BaseDerived[] = [];
  for (const key of keys) {
    const v = (resolvedBuilder as any)[key];
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

export function makeFactory<T>(
  builder: Builder<T, keyof T> | Promise<Builder<T, keyof T>>,
  config?: AsyncFactoryConfig
): Factory<T, keyof T> {
  return new Factory(builder, config);
}

export function makeFactoryWithRequired<T, K extends keyof T>(
  builder:
    | Builder<T, Exclude<keyof T, K>>
    | Promise<Builder<T, Exclude<keyof T, K>>>,
  config?: AsyncFactoryConfig
): Factory<T, Exclude<keyof T, K>> {
  return new Factory(builder, config);
}

export function makeFactoryFromSync<T, K extends keyof T = keyof T>(
  builder: Sync.Builder<T, K>,
  config?: AsyncFactoryConfig
): Factory<T, K> {
  return new Factory(builder as Async.Builder<T, K>, config);
}
