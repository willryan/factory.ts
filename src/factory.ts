export type FactoryFunc<T> = (item : Partial<T>) => T

class Fact<T> {
  constructor( readonly func: (seq: number) => T) {
  }
  public build(seq : number) : T
  {
    return this.func(seq);
  }
}

type Builder<T> = {
  [P in keyof T]: T[P] | Fact<T[P]>;
}

export function val<T>(val : T) : Fact<T> { 
  return new Fact(() => val);
} 

export function each<T>(f: (seqNum:number) => T) : Fact<T> { 
  return new Fact(f);
} 

function buildBase<T>(seqNum : number, builder: Builder<T>) : T {
  const t : {[key: string]: any } = {};
  const keys = Object.getOwnPropertyNames(builder);
  for (var key of keys) {
    const v = (builder as any)[key];
    const value = (!!v && typeof v === 'object' && v.constructor === Fact) ? v.build(seqNum) : v;
    t[key] = value;
  }
  return t as T;
}

export function makeFactory<T>(builder: Builder<T>) : FactoryFunc<T> {
  let seqNum = 0;
  return (vals:Partial<T>) => {
    seqNum++;
    const v = buildBase(seqNum, builder);
    return Object.assign({}, v, vals);
  };
}
