import { RecPartial, Omit, recursivePartialOverride } from "./shared";
import * as cloneDeep from "clone-deep";

export interface SyncFactoryConfig {
  readonly startingSequenceNumber?: number;
}

export class Generator<T> {
  constructor(readonly func: (seq: number) => T) {}
  public build(seq: number): T {
    return this.func(seq);
  }
}
export class Derived<TOwner, TProperty> {
  constructor(readonly func: (owner: TOwner, seq: number) => TProperty) {}
  public build(owner: TOwner, seq: number): TProperty {
    const ret = this.func(owner, seq);
    return ret;
  }
}

export type FactoryFunc<T, K extends keyof T> = keyof T extends K
  ? (item?: RecPartial<T>) => T
  : (item: RecPartial<T> & Omit<T, K>) => T;

export type ListFactoryFunc<T, K extends keyof T> = keyof T extends K
  ? (count: number, item?: RecPartial<T>) => T[]
  : (count: number, item: RecPartial<T> & Omit<T, K>) => T[];

export class Factory<T, K extends keyof T = keyof T> {
  private seqNum: number;
  private getStartingSequenceNumber = () =>
    (this.config && this.config.startingSequenceNumber) || 0;

  constructor(
    readonly builder: Builder<T, K>,
    private readonly config: SyncFactoryConfig | undefined
  ) {
    this.seqNum = this.getStartingSequenceNumber();
  }

  public resetSequenceNumber(newSequenceNumber?: number) {
    this.seqNum = newSequenceNumber
      ? newSequenceNumber
      : this.getStartingSequenceNumber();
  }

  public build = ((item?: RecPartial<T> & Omit<T, K>): T => {
    const seqNum = this.seqNum;
    this.seqNum++;
    const base = buildBase(seqNum, this.builder);
    let v = Object.assign({}, base.value); //, item);
    if (item) {
      v = recursivePartialOverride(v, item);
    }
    const keys = Object.keys(item || {});
    for (const der of base.derived) {
      if (keys.indexOf(der.key) < 0) {
        (v as any)[der.key] = der.derived.build(v, seqNum);
      }
    }
    return v;
  }) as FactoryFunc<T, K>;

  public buildList = ((
    count: number,
    item?: RecPartial<T> & Omit<T, K>
  ): T[] => {
    const ts: T[] = Array(count); // allocate to correct size
    for (let i = 0; i < count; i++) {
      ts[i] = this.build(item as any);
    }
    return ts;
  }) as ListFactoryFunc<T, K>;

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

  public withDerivation<KOut extends keyof T>(
    kOut: KOut,
    f: (v1: T, seq: number) => T[KOut]
  ): Factory<T, K> {
    const partial: any = {};
    partial[kOut] = new Derived<T, T[KOut]>(f);
    return this.extend(partial);
  }

  public withDerivation1<K1 extends keyof T, KOut extends keyof T>(
    kInput: [K1],
    kOut: KOut,
    f: (v1: T[K1], seq: number) => T[KOut]
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
    f: (v1: T[K1], v2: T[K2], seq: number) => T[KOut]
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
    f: (v1: T[K1], v2: T[K2], v3: T[K3], seq: number) => T[KOut]
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
    f: (v1: T[K1], v2: T[K2], v3: T[K3], v4: T[K4], seq: number) => T[KOut]
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
    ) => T[KOut]
  ): Factory<T, K> {
    const partial: any = {};
    partial[kOut] = new Derived<T, T[KOut]>((t, i) =>
      f(t[kInput[0]], t[kInput[1]], t[kInput[2]], t[kInput[3]], t[kInput[4]], i)
    );
    return this.extend(partial);
  }
}

export type Builder<T, K extends keyof T = keyof T> = {
  [P in K]: T[P] | Generator<T[P]> | Derived<T, T[P]>
};

export function val<T>(val: T): Generator<T> {
  return new Generator(() => val);
}

export function each<T>(f: (seqNum: number) => T): Generator<T> {
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

function buildBase<T, K extends keyof T>(
  seqNum: number,
  builder: Builder<T, K>
): BaseBuild<T> {
  const t: { [key: string]: any } = {};
  const keys = Object.getOwnPropertyNames(builder);
  const derived: BaseDerived[] = [];
  for (const key of keys) {
    const v = (builder as any)[key];
    let value = v;
    if (!!v && typeof v === "object") {
      if (v.constructor === Generator) {
        value = v.build(seqNum);
      } else if (v.constructor == Derived) {
        derived.push({ key, derived: v });
      } else {
        value = cloneDeep(v);
      }
    }
    t[key] = value;
  }
  return { value: t as T, derived };
}

export function makeFactory<T>(
  builder: Builder<T>,
  config?: SyncFactoryConfig
): Factory<T> {
  return new Factory(builder, config);
}

export function makeFactoryWithRequired<T, K extends keyof T>(
  builder: Builder<T, Exclude<keyof T, K>>,
  config?: SyncFactoryConfig
): Factory<T, Exclude<keyof T, K>> {
  return new Factory(builder, config);
}
