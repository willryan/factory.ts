import { RecPartial, Omit, recursivePartialOverride } from "./shared";
import * as cloneDeep from "clone-deep";

export interface AsyncFactoryConfig {
  readonly startingSequenceNumber?: number;
}

export type FactoryFunc<T, K extends keyof T, U = T> = keyof T extends K
  ? (item?: RecPartial<T>) => PromiseLike<U>
  : (item: RecPartial<T> & Omit<T, K>) => PromiseLike<U>;

export type ListFactoryFunc<T, K extends keyof T, U = T> = keyof T extends K
  ? (count: number, item?: RecPartial<T>) => PromiseLike<U[]>
  : (count: number, item: RecPartial<T> & Omit<T, K>) => PromiseLike<U[]>;

function isPromiseLike<T>(t: T | PromiseLike<T>): t is PromiseLike<T> {
  return !!t && typeof (t as any)["then"] === "function";
}

type Lift = <T>(t: T | PromiseLike<T>) => PromiseLike<T>;

function serialMap<T, U>(
  ts: readonly T[],
  fn: (t: T, idx: number) => PromiseLike<U>,
  idx: number = 0
): PromiseLike<readonly U[]> {
  // naive for now
  const [first, ...rest] = ts;
  const firstOut = fn(first, idx);
  return firstOut.then((u) => {
    if (rest.length === 0) {
      return [u];
    } else {
      return serialMap(rest, fn, idx++);
    }
  });
}

function serialReduce<T, A>(
  ts: readonly T[],
  fn: (a: A, t: T, idx: number) => PromiseLike<A>,
  initAcc: PromiseLike<A>
): PromiseLike<A> {
  return ts.reduce(async (acc, elem, idx) => {
    const v = await acc;
    return await fn(v, elem, idx);
  }, initAcc);
}

export class Generator<T> {
  constructor(
    readonly func: (seq: number) => T | PromiseLike<T>,
    readonly lift: Lift
  ) {}
  public build(seq: number): PromiseLike<T> {
    return this.lift(this.func(seq));
  }
}
export class Derived<TOwner, TProperty> {
  constructor(
    readonly func: (
      owner: TOwner,
      seq: number
    ) => TProperty | PromiseLike<TProperty>,
    readonly lift: Lift
  ) {}
  public build(owner: TOwner, seq: number): PromiseLike<TProperty> {
    return this.lift(this.func(owner, seq));
  }
}

export interface IFactory<T, K extends keyof T, U> {
  build: FactoryFunc<T, K, U>;
  buildList: ListFactoryFunc<T, K, U>;
  lift: Lift;
}

export class Factory<T, K extends keyof T = keyof T>
  implements IFactory<T, K, T>
{
  private seqNum: number;
  private getStartingSequenceNumber = () =>
    (this.config && this.config.startingSequenceNumber) || 0;

  constructor(
    readonly builder: Builder<T, K> | PromiseLike<Builder<T, K>>,
    private readonly config: AsyncFactoryConfig | undefined,
    readonly lift: Lift
  ) {
    this.seqNum = this.getStartingSequenceNumber();
  }

  public resetSequenceNumber(newSequenceNumber?: number) {
    this.seqNum = newSequenceNumber
      ? newSequenceNumber
      : this.getStartingSequenceNumber();
  }

  public build = ((item?: RecPartial<T> & Omit<T, K>): PromiseLike<T> => {
    return this.buildInner(null, item);
  }) as FactoryFunc<T, K, T>;

  private buildInner = (
    buildKeys: (keyof T)[] | null,
    item?: RecPartial<T> & Omit<T, K>
  ): PromiseLike<T> => {
    const seqNum = this.seqNum;
    this.seqNum++;
    return buildBase(seqNum, this.builder, this.lift).then((base) => {
      let v = Object.assign({}, base.value) as T; //, item);
      if (item) {
        v = recursivePartialOverride(v, item);
      }
      const directlySpecifiedKeys = Object.keys(item || {});
      const useBuildKeys =
        buildKeys ?? (base.derived.map((d) => d.key) as (keyof T)[]);
      return serialReduce(
        base.derived,
        (acc, der) => {
          if (!useBuildKeys.includes(der.key as keyof T)) {
            return this.lift(acc);
          }
          if (directlySpecifiedKeys.includes(der.key)) {
            return this.lift(acc);
          }
          return der.derived.build(v, seqNum).then((r) => {
            (acc as any)[der.key] = r;
            return acc;
          });
        },
        this.lift(v)
      );
    });
  };

  public buildList = ((
    count: number,
    item?: RecPartial<T> & Omit<T, K>
  ): PromiseLike<readonly T[]> => {
    const unks: unknown[] = Array(count); // allocate to correct size
    // don't run in parallel, so that seq num works predictably
    return serialMap(unks, () => {
      return this.build(item as any);
    });
  }) as ListFactoryFunc<T, K, T>;

  public extend(def: RecPartial<Builder<T, K>>): Factory<T, K> {
    const builder = Object.assign({}, this.builder, def);
    return new Factory(builder, this.config, this.lift);
  }

  public combine<U, K2 extends keyof U>(
    other: Factory<U, K2>
  ): Factory<T & U, K | K2> {
    const builder: Builder<T & U, K | K2> = Object.assign(
      {},
      this.builder,
      other.builder
    ) as any;
    return new Factory<T & U, K | K2>(builder, this.config, this.lift);
  }

  public transform<U>(
    fn: (t: T) => U | PromiseLike<U>
  ): TransformFactory<T, K, U> {
    return new TransformFactory(this, fn);
  }

  public withDerivation<KOut extends keyof T>(
    kOut: KOut,
    f: (v1: T, seq: number) => T[KOut] | PromiseLike<T[KOut]>
  ): Factory<T, K> {
    const partial: any = {};
    partial[kOut] = new Derived<T, T[KOut]>(f, this.lift);
    return this.extend(partial);
  }

  public withSelfDerivation<KOut extends K>(
    kOut: KOut,
    f: (v1: T, seq: number) => T[KOut] | PromiseLike<T[KOut]>
  ): Factory<T, K> {
    const partial: any = {};
    partial[kOut] = new Derived<T, T[KOut]>(async (v2, seq) => {
      delete v2[kOut];
      const origValue = (await this.buildInner([kOut], v2))[kOut];
      v2[kOut] = origValue;
      return f(v2, seq);
    }, this.lift);
    return this.extend(partial);
  }

  public withDerivation1<K1 extends keyof T, KOut extends keyof T>(
    kInput: [K1],
    kOut: KOut,
    f: (v1: T[K1], seq: number) => T[KOut] | PromiseLike<T[KOut]>
  ): Factory<T, K> {
    const partial: any = {};
    partial[kOut] = new Derived<T, T[KOut]>(
      (t, i) => f(t[kInput[0]], i),
      this.lift
    );
    return this.extend(partial);
  }

  public withDerivation2<
    K1 extends keyof T,
    K2 extends keyof T,
    KOut extends keyof T
  >(
    kInput: [K1, K2],
    kOut: KOut,
    f: (v1: T[K1], v2: T[K2], seq: number) => T[KOut] | PromiseLike<T[KOut]>
  ): Factory<T, K> {
    const partial: any = {};
    partial[kOut] = new Derived<T, T[KOut]>(
      (t, i) => f(t[kInput[0]], t[kInput[1]], i),
      this.lift
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
    ) => T[KOut] | PromiseLike<T[KOut]>
  ): Factory<T, K> {
    const partial: any = {};
    partial[kOut] = new Derived<T, T[KOut]>(
      (t, i) => f(t[kInput[0]], t[kInput[1]], t[kInput[2]], i),
      this.lift
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
    ) => T[KOut] | PromiseLike<T[KOut]>
  ): Factory<T, K> {
    const partial: any = {};
    partial[kOut] = new Derived<T, T[KOut]>(
      (t, i) => f(t[kInput[0]], t[kInput[1]], t[kInput[2]], t[kInput[3]], i),
      this.lift
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
    ) => T[KOut] | PromiseLike<T[KOut]>
  ): Factory<T, K> {
    const partial: any = {};
    partial[kOut] = new Derived<T, T[KOut]>(
      (t, i) =>
        f(
          t[kInput[0]],
          t[kInput[1]],
          t[kInput[2]],
          t[kInput[3]],
          t[kInput[4]],
          i
        ),
      this.lift
    );
    return this.extend(partial);
  }
}

export class TransformFactory<T, K extends keyof T, U>
  implements IFactory<T, K, U>
{
  lift: Lift;
  constructor(
    private readonly inner: Factory<T, K>,
    private readonly transform: (t: T) => U | PromiseLike<U>
  ) {
    this.lift = inner.lift;
  }
  public build = ((item?: RecPartial<T> & Omit<T, K>): PromiseLike<U> => {
    return this.inner.build(item as any).then((v) => {
      return this.transform(v);
    });
  }) as FactoryFunc<T, K, U>;
  public buildList = ((
    count: number,
    item?: RecPartial<T> & Omit<T, K>
  ): PromiseLike<readonly U[]> => {
    return this.inner.buildList(count, item as any).then((vs) => {
      return serialMap(vs, (v) => this.lift(this.transform(v)));
    });
  }) as ListFactoryFunc<T, K, U>;
}

export type Builder<T, K extends keyof T = keyof T> = {
  [P in K]: T[P] | PromiseLike<T[P]> | Generator<T[P]> | Derived<T, T[P]>;
};

export function val<T>(val: T, lift: Lift): Generator<T> {
  return new Generator(() => val, lift);
}

export function each<T>(
  f: (seqNum: number) => T | PromiseLike<T>,
  lift: Lift
): Generator<T> {
  return new Generator(f, lift);
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
  builder: Builder<T, K> | PromiseLike<Builder<T, K>>,
  lift: Lift
): PromiseLike<BaseBuild<T>> {
  return lift(builder).then((resolvedBuilder) => {
    const keys = Object.getOwnPropertyNames(resolvedBuilder);
    const derived: BaseDerived[] = [];
    return serialReduce(
      keys,
      async (tt, key) => {
        const v = (resolvedBuilder as any)[key];
        let value = v;
        let derived = tt.derived;
        if (!!v && typeof v === "object") {
          if (isPromiseLike(v)) {
            value = await v;
          } else if (v.constructor === Generator) {
            value = await (v as Generator<any>).build(seqNum);
          } else if (v.constructor == Derived) {
            derived = [...tt.derived, { key, derived: v }];
            // } else if (v.constructor === Sync.Generator) {
            //   value = (v as Sync.Generator<any>).build(seqNum);
            // } else if (v.constructor == Sync.Derived) {
            //   derived.push({ key, derived: new Derived(v.func, lift) });
          } else {
            value = cloneDeep(v);
          }
        }
        return {
          derived,
          value: {
            ...tt.value,
            [key]: value,
          },
        };
      },
      lift({ value: {}, derived } as BaseBuild<T>)
    );
  });
}

export function makeFactory<T>(
  lift: Lift,
  builder: Builder<T, keyof T> | PromiseLike<Builder<T, keyof T>>,
  config?: AsyncFactoryConfig
): Factory<T, keyof T> {
  return new Factory(builder, config, lift);
}

export function makeFactoryWithRequired<T, K extends keyof T>(
  lift: Lift,
  builder:
    | Builder<T, Exclude<keyof T, K>>
    | PromiseLike<Builder<T, Exclude<keyof T, K>>>,
  config?: AsyncFactoryConfig
): Factory<T, Exclude<keyof T, K>> {
  return new Factory(builder, config, lift);
}
