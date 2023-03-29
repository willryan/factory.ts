import { RecPartial, Omit, recursivePartialOverride } from "./shared";
import * as cloneDeep from "clone-deep";

export interface SyncFactoryConfig {
  readonly startingSequenceNumber?: number;
}

export type FactoryFunc<T, K extends keyof T> = keyof T extends K
  ? (item?: RecPartial<T>) => T
  : (item: RecPartial<T> & Omit<T, K>) => T;

export type ListFactoryFunc<T, K extends keyof T> = keyof T extends K
  ? (count: number, item?: RecPartial<T>) => T[]
  : (count: number, item: RecPartial<T> & Omit<T, K>) => T[];

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

export interface IFactory<T, K extends keyof T> {
  build: FactoryFunc<T, K>;
  buildList: ListFactoryFunc<T, K>;
}

export class Factory<T, K extends keyof T = keyof T> implements IFactory<T, K> {
  private seqNum: number;
  private getStartingSequenceNumber = () =>
    (this.config && this.config.startingSequenceNumber) || 0;

  private expandBuilder(): Builder<T, K> {
    return typeof this.builder === "function" ? this.builder() : this.builder;
  }

  constructor(
    readonly builder: Builder<T, K> | BuilderFactory<T, K>,
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
    return this.buildInner(null, item);
  }) as FactoryFunc<T, K>;

  private buildInner = (
    buildKeys: (keyof T)[] | null,
    item?: RecPartial<T> & Omit<T, K>
  ): T => {
    const seqNum = this.seqNum;
    this.seqNum++;
    const base = buildBase(seqNum, this.expandBuilder());
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
        // console.log(`skip unspecified build key ${der.key}`);
        continue;
      }
      if (directlySpecifiedKeys.includes(der.key)) {
        // console.log(`skip explicitly defined build key ${der.key}`);
        continue;
      }
      (v as any)[der.key] = der.derived.build(v, seqNum);
    }
    return v;
  };

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
    const builder = () => Object.assign({}, this.expandBuilder(), def);
    return new Factory(builder, this.config);
  }

  public combine<U, K2 extends keyof U>(
    other: Factory<U, K2>
  ): Factory<T & U, K | K2> {
    const builder = (() =>
      Object.assign(
        {},
        this.expandBuilder(),
        other.expandBuilder()
      )) as BuilderFactory<T & U, K | K2>;
    return new Factory<T & U, K | K2>(builder, this.config);
  }

  public withSelfDerivation<KOut extends K>(
    kOut: KOut,
    f: (v1: T, seq: number) => T[KOut]
  ): Factory<T, K> {
    const partial: any = {};
    partial[kOut] = new Derived<T, T[KOut]>((v2, seq) => {
      delete v2[kOut];
      const origValue = this.buildInner([kOut], v2)[kOut];
      v2[kOut] = origValue;
      return f(v2, seq);
    });
    return this.extend(partial);
  }

  public withDerivation<KOut extends K>(
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
  [P in K]: T[P] | Generator<T[P]> | Derived<T, T[P]>;
};

export type BuilderFactory<T, K extends keyof T = keyof T> = () => Builder<
  T,
  K
>;

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
  builder: Builder<T> | BuilderFactory<T>,
  config?: SyncFactoryConfig
): Factory<T> {
  return new Factory(builder, config);
}

export function makeFactoryWithRequired<T, K extends keyof T>(
  builder:
    | Builder<T, Exclude<keyof T, K>>
    | BuilderFactory<T, Exclude<keyof T, K>>,
  config?: SyncFactoryConfig
): Factory<T, Exclude<keyof T, K>> {
  return new Factory(builder, config);
}
