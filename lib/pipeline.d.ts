import * as Async from "./async";
import { RecPartial } from "./shared";
declare type MaybePromise<T> = T | Promise<T>;
declare type MaybePromiseFunc<P, T> = T | ((p: P) => MaybePromise<T>);
declare type PipePartial<P, T> = MaybePromiseFunc<P, RecPartial<T>>;
export declare class Pipeline<P extends Object = {}> implements PromiseLike<P> {
    private current;
    constructor(current: Promise<P>);
    static start(): Pipeline<{}>;
    addValues<P2 extends Object>(val: MaybePromiseFunc<P, P2>): Pipeline<P & P2>;
    addFactoryFunc<T, U, K extends string>(factory: Async.FactoryFunc<T, U>, key: K, partial: PipePartial<P, T>): Pipeline<P & {
        [k in K]: U;
    }>;
    addFactory<T, K extends string>(factory: Async.Factory<T>, key: K, partial: PipePartial<P, T>): Pipeline<P & {
        [k in K]: T;
    }>;
    addTxFactory<T, U, K extends string>(factory: Async.TransformFactory<T, U>, key: K, partial: PipePartial<P, T>): Pipeline<P & {
        [k in K]: U;
    }>;
    then<TResult1 = P, TResult2 = never>(onfulfilled?: (value: P) => TResult1 | PromiseLike<TResult1>, onrejected?: (reason: any) => TResult2 | PromiseLike<TResult2>): Promise<TResult1 | TResult2>;
}
export {};
