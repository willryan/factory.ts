import { RecPartial, Omit } from "./shared";

export interface CommonFactoryConfig {
  readonly startingSequenceNumber?: number;
}

export type FactoryFunc<T, K extends keyof T, U> = keyof T extends K
  ? (item?: RecPartial<T>) => U
  : (item: RecPartial<T> & Omit<T, K>) => U;

export type ListFactoryFunc<T, K extends keyof T, U> = keyof T extends K
  ? (count: number, item?: RecPartial<T>) => U
  : (count: number, item: RecPartial<T> & Omit<T, K>) => U;

type LiftFunction<T, U> = (t: T | U) => U

// export function lift<T, U>(t: T | U): U {
//   if (isPromise(t)) {
//     return t;
//   } else {
//     return Promise.resolve(t);
//   }
// }

// Generator can return 
// U can be T or Promise<T>
export class Generator<T, U> {
  constructor(readonly func: (seq: number) => T | U, readonly lift: LiftFunction<T, U>) { }
  public build(seq: number): U {
    return this.lift(this.func(seq));
  }
}

export class Derived<TOwner, TProperty, UProperty> {
  constructor(
    readonly func: (
      owner: TOwner,
      seq: number
    ) => TProperty | UProperty,
    readonly lift: LiftFunction<TProperty, UProperty>
  ) { }
  public build(owner: TOwner, seq: number): UProperty {
    return this.lift(this.func(owner, seq));
  }
}

export interface IFactory<T, K extends keyof T, U, UArray> {
  build: FactoryFunc<T, K, U>;
  buildList: ListFactoryFunc<T, K, UArray>;
}

export class TransformFactory<T, K extends keyof T, U, UArray, V, VArray>
  implements IFactory<T, K, V, VArray> {
  constructor(
    private readonly inner: Factory<T, K, U, UArray>,
    private readonly transform: (u: U) => V,
    private readonly multiTransform: (uarr: UArray) => VArray,
    private readonly lift: (t: T | U) => U
  ) { }
  public build = ((item?: RecPartial<T> & Omit<T, K>): V => {
    const v = this.lift(this.inner.build(item as any));
    return this.transform(v);
  }) as FactoryFunc<T, K, V>;
  public buildList = ((
    count: number,
    item?: RecPartial<T> & Omit<T, K>
  ): VArray => {
    return this.multiTransform(this.inner.buildList(count, item as any));
  }) as ListFactoryFunc<T, K, VArray>;
}

export type Builder<T, K extends keyof T, UProp> = {
  [P in K]: T[P] | Generator<T[P], UProp> | Derived<T, T[P], UProp>;
};


export abstract class Factory<T, K extends keyof T, U, UArray>
  implements IFactory<T, K, U, UArray> {
  protected seqNum: number;
  private getStartingSequenceNumber = () =>
    (this.config && this.config.startingSequenceNumber) || 0;

  constructor(
    readonly builder: Builder<T, K, U>,
    readonly lift: LiftFunction<T, U>,
    readonly initArray: () => UArray,
    readonly append: (uarr: UArray, u: U) => UArray,
    private readonly config: CommonFactoryConfig | undefined
  ) {
    this.seqNum = this.getStartingSequenceNumber();
  }

  public resetSequenceNumber(newSequenceNumber?: number) {
    this.seqNum = newSequenceNumber
      ? newSequenceNumber
      : this.getStartingSequenceNumber();
  }

  public build = ((item?: RecPartial<T> & Omit<T, K>): U => {
    return this.buildInner(null, item);
  }) as FactoryFunc<T, K, U>;

  abstract buildInner(buildKeys: (keyof T)[] | null, item?: RecPartial<T> & Omit<T, K>): U;

  public buildList = ((
    count: number,
    item?: RecPartial<T> & Omit<T, K>
  ): UArray => {
    let us = this.initArray();
    // don't run in parallel, so that seq num works predictably
    for (let i = 0; i < count; i++) {
      us = this.append(us, this.build(item as any));
    }
    return us;
  }) as ListFactoryFunc<T, K, UArray>;

  abstract newWithSameConfig<T2, K2 extends keyof T2, U2, UArray2>(builder: Builder<T2, K2, U2>,
    lift: LiftFunction<T2, U2>,
    initArray: () => UArray2,
    append: (uarr: UArray2, u: U2) => UArray2,
  ): Factory<T2, K2, U2, UArray2>;

  public extend(def: RecPartial<Builder<T, K, U>>): Factory<T, K, U, UArray> {
    const builder = Object.assign({}, this.builder, def);
    return this.newWithSameConfig(builder, this.lift, this.initArray, this.append);
  }

  // TODO combining arrays is weird, can't just '&'
  public combine<T2, K2 extends keyof T2, U2, UArray2>(
    other: Factory<T2, K2, U2, UArray2>,
    lift: LiftFunction<T & T2, U & U2>,
    initArray: () => UArray & UArray2,
    append: (uarr: UArray & UArray2, u: U & U2) => UArray & UArray2,
  ): Factory<T & T2, K | K2, U & U2, UArray & UArray2> {
    const builder: Builder<T & T2, K | K2, U & U2> = Object.assign(
      {},
      this.builder,
      other.builder
    ) as any;
    return this.newWithSameConfig(builder, lift, initArray, append);// new Factory<T & T2, K | K2, U & U2, UArray & U2Array>(builder, this.config);
  }

  public transform<U2, U2Array>(fn: (u: U) => U2, multiFn: (uarray: UArray) => U2Array): TransformFactory<T, K, U, UArray, U2, U2Array> {
    return new TransformFactory(this, fn, multiFn, this.lift);
  }
}

//   public withDerivation<KOut extends keyof U, UProp>(
//     kOut: KOut,
//     f: (v1: U, seq: number) => U[KOut]
//   ): Factory<T, K, UProp, UArray> {
//     const partial: any = {};
//     partial[kOut] = new Derived<T, U[KOut], UProp>(f, this.lift);
//     return this.extend(partial);
//   }

//   public withSelfDerivation<KOut extends K>(
//     kOut: KOut,
//     f: (v1: T, seq: number) => T[KOut] | Promise<T[KOut]>
//   ): Factory<T, K> {
//     const partial: any = {};
//     partial[kOut] = new Derived<T, T[KOut]>(async (v2, seq) => {
//       delete v2[kOut];
//       const origValue = (await this.buildInner([kOut], v2))[kOut];
//       v2[kOut] = origValue;
//       return f(v2, seq);
//     });
//     return this.extend(partial);
//   }

//   public withDerivation1<K1 extends keyof T, KOut extends keyof T>(
//     kInput: [K1],
//     kOut: KOut,
//     f: (v1: T[K1], seq: number) => T[KOut] | Promise<T[KOut]>
//   ): Factory<T, K> {
//     const partial: any = {};
//     partial[kOut] = new Derived<T, T[KOut]>((t, i) => f(t[kInput[0]], i));
//     return this.extend(partial);
//   }

//   public withDerivation2<
//     K1 extends keyof T,
//     K2 extends keyof T,
//     KOut extends keyof T
//   >(
//     kInput: [K1, K2],
//     kOut: KOut,
//     f: (v1: T[K1], v2: T[K2], seq: number) => T[KOut] | Promise<T[KOut]>
//   ): Factory<T, K> {
//     const partial: any = {};
//     partial[kOut] = new Derived<T, T[KOut]>((t, i) =>
//       f(t[kInput[0]], t[kInput[1]], i)
//     );
//     return this.extend(partial);
//   }

//   public withDerivation3<
//     K1 extends keyof T,
//     K2 extends keyof T,
//     K3 extends keyof T,
//     KOut extends keyof T
//   >(
//     kInput: [K1, K2, K3],
//     kOut: KOut,
//     f: (
//       v1: T[K1],
//       v2: T[K2],
//       v3: T[K3],
//       seq: number
//     ) => T[KOut] | Promise<T[KOut]>
//   ): Factory<T, K> {
//     const partial: any = {};
//     partial[kOut] = new Derived<T, T[KOut]>((t, i) =>
//       f(t[kInput[0]], t[kInput[1]], t[kInput[2]], i)
//     );
//     return this.extend(partial);
//   }

//   public withDerivation4<
//     K1 extends keyof T,
//     K2 extends keyof T,
//     K3 extends keyof T,
//     K4 extends keyof T,
//     KOut extends keyof T
//   >(
//     kInput: [K1, K2, K3, K4],
//     kOut: KOut,
//     f: (
//       v1: T[K1],
//       v2: T[K2],
//       v3: T[K3],
//       v4: T[K4],
//       seq: number
//     ) => T[KOut] | Promise<T[KOut]>
//   ): Factory<T, K> {
//     const partial: any = {};
//     partial[kOut] = new Derived<T, T[KOut]>((t, i) =>
//       f(t[kInput[0]], t[kInput[1]], t[kInput[2]], t[kInput[3]], i)
//     );
//     return this.extend(partial);
//   }

//   public withDerivation5<
//     K1 extends keyof T,
//     K2 extends keyof T,
//     K3 extends keyof T,
//     K4 extends keyof T,
//     K5 extends keyof T,
//     KOut extends keyof T
//   >(
//     kInput: [K1, K2, K3, K4, K5],
//     kOut: KOut,
//     f: (
//       v1: T[K1],
//       v2: T[K2],
//       v3: T[K3],
//       v4: T[K4],
//       v5: T[K5],
//       seq: number
//     ) => T[KOut] | Promise<T[KOut]>
//   ): Factory<T, K> {
//     const partial: any = {};
//     partial[kOut] = new Derived<T, T[KOut]>((t, i) =>
//       f(t[kInput[0]], t[kInput[1]], t[kInput[2]], t[kInput[3]], t[kInput[4]], i)
//     );
//     return this.extend(partial);
//   }
// }

// export function val<T>(val: T): Generator<T> {
//   return new Generator(() => val);
// }

// export function each<T>(f: (seqNum: number) => T | Promise<T>): Generator<T> {
//   return new Generator(f);
// }

// interface BaseDerived {
//   derived: Derived<any, any>;
//   key: string;
// }

// interface BaseBuild<T> {
//   readonly value: T;
//   readonly derived: BaseDerived[];
// }

// async function buildBase<T, K extends keyof T>(
//   seqNum: number,
//   builder: Builder<T, K> | Promise<Builder<T, K>>
// ): Promise<BaseBuild<T>> {
//   const resolvedBuilder = await lift(builder);

//   const t: { [key: string]: any } = {};
//   const keys = Object.getOwnPropertyNames(resolvedBuilder);
//   const derived: BaseDerived[] = [];
//   for (const key of keys) {
//     const v = (resolvedBuilder as any)[key];
//     let value = v;
//     if (!!v && typeof v === "object") {
//       if (isPromise(v)) {
//         value = await v;
//       } else if (v.constructor === Generator) {
//         value = await (v as Generator<any>).build(seqNum);
//       } else if (v.constructor == Derived) {
//         derived.push({ key, derived: v });
//         value = {};
//       } else if (v.constructor === Sync.Generator) {
//         value = (v as Sync.Generator<any>).build(seqNum);
//       } else if (v.constructor == Sync.Derived) {
//         derived.push({ key, derived: new Derived(v.func) });
//         value = {};
//       } else {
//         value = cloneDeep(v);
//       }
//     }
//     t[key] = value;
//   }
//   return { value: t as T, derived };
// }

// export function makeFactory<T>(
//   builder: Builder<T, keyof T> | Promise<Builder<T, keyof T>>,
//   config?: CommonFactoryConfig
// ): Factory<T, keyof T> {
//   return new Factory(builder, config);
// }

// export function makeFactoryWithRequired<T, K extends keyof T>(
//   builder:
//     | Builder<T, Exclude<keyof T, K>>
//     | Promise<Builder<T, Exclude<keyof T, K>>>,
//   config?: CommonFactoryConfig
// ): Factory<T, Exclude<keyof T, K>> {
//   return new Factory(builder, config);
// }

// export function makeFactoryFromSync<T, K extends keyof T = keyof T>(
//   builder: Sync.Builder<T, K>,
//   config?: CommonFactoryConfig
// ): Factory<T, K> {
//   return new Factory(builder as Builder<T, K>, config);
// }
