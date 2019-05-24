import * as Async from "./async";
import { RecPartial, Omit } from "./shared";

type MaybePromise<T> = T | Promise<T>;
type PromiseFunc<P, T> = (p: P) => MaybePromise<T>;
type MaybePromiseFunc<P, T> = T | PromiseFunc<P, T>;
type PipePartial<P, T> = MaybePromiseFunc<P, RecPartial<T>>;
type PipePartialRec<P, T, K extends keyof T> = MaybePromiseFunc<
  P,
  RecPartial<Pick<T, K>> & Omit<T, K>
>;

export class Pipeline<P extends Object = {}> implements PromiseLike<P> {
  constructor(private current: Promise<P>) {}

  static start() {
    return new Pipeline(Promise.resolve({}));
  }

  //add<T,U>(factory: Async.IFactory<T,U> | Async.FactoryFunc<T,U>, val: Parti (p:P) => Partial<T>)
  public addValues<P2 extends Object>(
    val: MaybePromiseFunc<P, P2>
  ): Pipeline<P & P2> {
    return new Pipeline(
      this.current.then(async c => {
        const v =
          typeof val === "function"
            ? await Async.lift((val as PromiseFunc<P, P2>)(c))
            : val;
        return {
          ...(c as any),
          ...(v as any)
        };
      })
    );
  }

  // NOTE: want to combine all addFactory() methods, but
  // Typescript and or ts-node seems to have problems
  // also want use object { key: partial } instead
  // but can't get the types right
  public addFactoryFunc<T, U, K extends string, KT extends keyof T>(
    factory: Async.FactoryFunc<T, KT, U>,
    key: K,
    partial: keyof T extends KT ? PipePartial<P, T> : PipePartialRec<P, T, KT>
  ): Pipeline<P & { [k in K]: U }> {
    return new Pipeline(
      this.current.then(async c => {
        const p =
          typeof partial === "function"
            ? await Async.lift((partial as any)(c))
            : partial;
        const val = await factory(p);
        const newV: {} = {};
        (newV as any)[key] = val;
        return {
          ...(c as any),
          ...newV
        };
      })
    );
  }

  public addFactory<T, K extends string, KT extends keyof T>(
    factory: Async.Factory<T, KT>,
    key: K,
    partial: keyof T extends KT ? PipePartial<P, T> : PipePartialRec<P, T, KT>
  ): Pipeline<P & { [k in K]: T }> {
    return this.addFactoryFunc(
      ((v: any) => factory.build(v)) as any,
      key,
      partial
    );
  }

  public addTxFactory<T, U, K extends string, KT extends keyof T = keyof T>(
    factory: Async.TransformFactory<T, KT, U>,
    key: K,
    partial: keyof T extends KT ? PipePartial<P, T> : PipePartialRec<P, T, KT>
  ): Pipeline<P & { [k in K]: U }> {
    return this.addFactoryFunc(
      ((v: any) => factory.build(v)) as any,
      key,
      partial
    );
  }

  then<TResult1 = P, TResult2 = never>(
    onfulfilled?: (value: P) => TResult1 | PromiseLike<TResult1>,
    onrejected?: (reason: any) => TResult2 | PromiseLike<TResult2>
  ): Promise<TResult1 | TResult2> {
    return this.current.then(onfulfilled, onrejected);
  }
}
