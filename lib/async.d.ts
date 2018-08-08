export declare type RecPartial<T> = {
    [P in keyof T]?: RecPartial<T[P]>;
};
export declare type FactoryFunc<T> = (item: RecPartial<T>) => T | Promise<T>;
export declare class Generator<T> {
    readonly func: (seq: number) => T | Promise<T>;
    constructor(func: (seq: number) => T | Promise<T>);
    build(seq: number): Promise<T>;
}
export declare class Derived<TOwner, TProperty> {
    readonly func: (owner: TOwner, seq: number) => TProperty | Promise<TProperty>;
    constructor(func: (owner: TOwner, seq: number) => TProperty | Promise<TProperty>);
    build(owner: TOwner, seq: number): Promise<TProperty>;
}
export interface IFactory<T, U> {
    build(item?: RecPartial<T>): Promise<U>;
    buildList(count: number, item?: RecPartial<T>): Promise<U[]>;
}
export declare class Factory<T> implements IFactory<T, T> {
    readonly builder: Builder<T>;
    private seqNum;
    constructor(builder: Builder<T>);
    build(item?: RecPartial<T>): Promise<T>;
    private static recursivePartialOverride;
    buildList(count: number, item?: RecPartial<T>): Promise<T[]>;
    extend(def: RecPartial<Builder<T>>): Factory<T>;
    combine<U>(other: Factory<U>): Factory<T & U>;
    transform<U>(fn: (t: T) => U | Promise<U>): IFactory<T, U>;
    withDerivation<KOut extends keyof T>(kOut: KOut, f: (v1: T, seq: number) => T[KOut] | Promise<T[KOut]>): Factory<T>;
    withDerivation1<K1 extends keyof T, KOut extends keyof T>(kInput: [K1], kOut: KOut, f: (v1: T[K1], seq: number) => T[KOut] | Promise<T[KOut]>): Factory<T>;
    withDerivation2<K1 extends keyof T, K2 extends keyof T, KOut extends keyof T>(kInput: [K1, K2], kOut: KOut, f: (v1: T[K1], v2: T[K2], seq: number) => T[KOut] | Promise<T[KOut]>): Factory<T>;
    withDerivation3<K1 extends keyof T, K2 extends keyof T, K3 extends keyof T, KOut extends keyof T>(kInput: [K1, K2, K3], kOut: KOut, f: (v1: T[K1], v2: T[K2], v3: T[K3], seq: number) => T[KOut] | Promise<T[KOut]>): Factory<T>;
    withDerivation4<K1 extends keyof T, K2 extends keyof T, K3 extends keyof T, K4 extends keyof T, KOut extends keyof T>(kInput: [K1, K2, K3, K4], kOut: KOut, f: (v1: T[K1], v2: T[K2], v3: T[K3], v4: T[K4], seq: number) => T[KOut] | Promise<T[KOut]>): Factory<T>;
    withDerivation5<K1 extends keyof T, K2 extends keyof T, K3 extends keyof T, K4 extends keyof T, K5 extends keyof T, KOut extends keyof T>(kInput: [K1, K2, K3, K4, K5], kOut: KOut, f: (v1: T[K1], v2: T[K2], v3: T[K3], v4: T[K4], v5: T[K5], seq: number) => T[KOut] | Promise<T[KOut]>): Factory<T>;
}
export declare class TransformFactory<T, U> implements IFactory<T, U> {
    private readonly inner;
    private readonly transform;
    constructor(inner: Factory<T>, transform: (t: T) => U | Promise<U>);
    build(item?: RecPartial<T>): Promise<U>;
    buildList(count: number, item?: RecPartial<T>): Promise<U[]>;
}
export declare type Builder<T> = {
    [P in keyof T]: T[P] | Promise<T[P]> | Generator<T[P]> | Derived<T, T[P]>;
};
export declare function val<T>(val: T): Generator<T>;
export declare function each<T>(f: (seqNum: number) => T | Promise<T>): Generator<T>;
export declare function makeFactory<T>(builder: Builder<T>): Factory<T>;
