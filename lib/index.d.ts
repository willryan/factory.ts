export declare type FactoryFunc<T> = (item: Partial<T>) => T;
export declare class Generator<T> {
    readonly func: (seq: number) => T;
    constructor(func: (seq: number) => T);
    build(seq: number): T;
}
export declare class Derived<TOwner, TProperty> {
    readonly func: (owner: TOwner, seq: number) => TProperty;
    constructor(func: (owner: TOwner, seq: number) => TProperty);
    build(owner: TOwner, seq: number): TProperty;
}
export declare class Factory<T> {
    readonly builder: Builder<T>;
    private seqNum;
    constructor(builder: Builder<T>);
    build(item?: Partial<T>): T;
    buildList(count: number, item?: Partial<T>): T[];
    extend(def: Partial<Builder<T>>): Factory<T>;
    withDerivation<KOut extends keyof T>(kOut: KOut, f: (v1: T, seq: number) => T[KOut]): Factory<T>;
    withDerivation1<K1 extends keyof T, KOut extends keyof T>(kInput: [K1], kOut: KOut, f: (v1: T[K1], seq: number) => T[KOut]): Factory<T>;
    withDerivation2<K1 extends keyof T, K2 extends keyof T, KOut extends keyof T>(kInput: [K1, K2], kOut: KOut, f: (v1: T[K1], v2: T[K2], seq: number) => T[KOut]): Factory<T>;
    withDerivation3<K1 extends keyof T, K2 extends keyof T, K3 extends keyof T, KOut extends keyof T>(kInput: [K1, K2, K3], kOut: KOut, f: (v1: T[K1], v2: T[K2], v3: T[K3], seq: number) => T[KOut]): Factory<T>;
    withDerivation4<K1 extends keyof T, K2 extends keyof T, K3 extends keyof T, K4 extends keyof T, KOut extends keyof T>(kInput: [K1, K2, K3, K4], kOut: KOut, f: (v1: T[K1], v2: T[K2], v3: T[K3], v4: T[K4], seq: number) => T[KOut]): Factory<T>;
    withDerivation5<K1 extends keyof T, K2 extends keyof T, K3 extends keyof T, K4 extends keyof T, K5 extends keyof T, KOut extends keyof T>(kInput: [K1, K2, K3, K4, K5], kOut: KOut, f: (v1: T[K1], v2: T[K2], v3: T[K3], v4: T[K4], v5: T[K5], seq: number) => T[KOut]): Factory<T>;
}
export declare type Builder<T> = {
    [P in keyof T]: T[P] | Generator<T[P]> | Derived<T, T[P]>;
};
export declare function val<T>(val: T): Generator<T>;
export declare function each<T>(f: (seqNum: number) => T): Generator<T>;
export declare function makeFactory<T>(builder: Builder<T>): Factory<T>;
