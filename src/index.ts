export type FactoryFunc<T> = (item : Partial<T>) => T

export class Generator<T> {
  constructor(readonly func: (seq: number) => T) {
  }
  public build(seq : number) : T
  {
    return this.func(seq);
  }
}
export class Derived<TOwner,TProperty> {
  constructor(readonly func: (owner: TOwner, seq: number) => TProperty) { }
  public build(owner : TOwner, seq: number) : TProperty
  {
    const ret = this.func(owner, seq);
    return ret;
  }
}

export class Factory<T> {
  private seqNum: number;
  constructor(readonly builder: Builder<T>) {
    this.seqNum = 0;
  }

  public build(item: Partial<T>) : T
  {
    this.seqNum++;
    const base = buildBase(this.seqNum, this.builder);
    const v = Object.assign({}, base.value, item);
    const keys = Object.keys(item);
    for (const der of base.derived) {
      if (keys.indexOf(der.key) < 0) {
        (v as any)[der.key] = (der.derived as any).build(v, this.seqNum);
      }
    }
    return v;

  }

  public extend(def: Partial<Builder<T>>) : Factory<T> {
    const builder = Object.assign({}, this.builder, def);
    return new Factory(builder);
  }

  public withDerivation<KOut extends keyof T>(kOut: KOut, f: (v1: T, seq: number) => T[KOut]) : Factory<T> {
    const partial : any = {};
    partial[kOut] = new Derived<T,T[KOut]>(f);
    return this.extend(partial);
  }

  public withDerivation1<K1 extends keyof T, KOut extends keyof T >(
      kInput: [K1], kOut: KOut, f: (v1: T[K1], seq: number) => T[KOut]) : Factory<T> {
    const partial : any = {};
    partial[kOut] = new Derived<T,T[KOut]>((t, i) => f(t[kInput[0]], i));
    return this.extend(partial);
  }

  public withDerivation2<K1 extends keyof T, K2 extends keyof T, KOut extends keyof T>(
      kInput: [K1, K2], kOut: KOut, f: (v1: T[K1], v2: T[K2], seq: number) => T[KOut]) : Factory<T>  {
    const partial : any = {};
    partial[kOut] = new Derived<T,T[KOut]>((t, i) => f(t[kInput[0]],t[kInput[1]], i));
    return this.extend(partial);
  }

  public withDerivation3<K1 extends keyof T, K2 extends keyof T, K3 extends keyof T, KOut extends keyof T>(
      kInput:[K1, K2, K3], kOut: KOut, f: (v1: T[K1], v2: T[K2], v3: T[K3], seq: number) => T[KOut]) : Factory<T> {
    const partial : any = {};
    partial[kOut] = new Derived<T,T[KOut]>((t, i) => f(t[kInput[0]],t[kInput[1]], t[kInput[2]], i));
    return this.extend(partial);
  }

  public withDerivation4<K1 extends keyof T, K2 extends keyof T, K3 extends keyof T, K4 extends keyof T, KOut extends keyof T>(
      kInput:[K1, K2, K3, K4], kOut: KOut, f: (v1: T[K1], v2: T[K2], v3: T[K3], v4: T[K4], seq: number) => T[KOut]) : Factory<T> {
    const partial : any = {};
    partial[kOut] = new Derived<T,T[KOut]>((t, i) => f(t[kInput[0]],t[kInput[1]], t[kInput[2]],t[kInput[3]], i));
    return this.extend(partial);
  }

  public withDerivation5<K1 extends keyof T, K2 extends keyof T, K3 extends keyof T, K4 extends keyof T, K5 extends keyof T, KOut extends keyof T>(
      kInput:[K1, K2, K3, K4, K5], kOut: KOut, f: (v1: T[K1], v2: T[K2], v3: T[K3], v4: T[K4], v5: T[K5], seq: number) => T[KOut]) : Factory<T> {
    const partial : any = {};
    partial[kOut] = new Derived<T,T[KOut]>((t, i) => f(t[kInput[0]],t[kInput[1]], t[kInput[2]],t[kInput[3]], t[kInput[4]], i));
    return this.extend(partial);
  }

}

export type Builder<T> = {
  [P in keyof T]: T[P] | Generator<T[P]> | Derived<T,T[P]>;
}

export function val<T>(val : T) : Generator<T> { 
  return new Generator(() => val);
} 

export function each<T>(f: (seqNum:number) => T) : Generator<T> { 
  return new Generator(f);
} 

interface BaseDerived {
  derived: Function
  key: string
}

interface BaseBuild<T> {
  readonly value : T
  readonly derived: BaseDerived[]
}

function buildBase<T>(seqNum : number, builder: Builder<T>) : BaseBuild<T> {
  const t : {[key: string]: any } = {};
  const keys = Object.getOwnPropertyNames(builder);
  const derived : BaseDerived[] = [];
  for (const key of keys) {
    const v = (builder as any)[key];
    let value = v;
    if (!!v && typeof v === 'object') {
      if (v.constructor === Generator) {
        value = v.build(seqNum);
      }
      else if (v.constructor == Derived) {
        derived.push({key, derived: v});
      }
    } 
    t[key] = value;
  }
  return { value: t as T, derived };
}

export function makeFactory<T>(builder: Builder<T>) : Factory<T> {
  return new Factory(builder);
}
