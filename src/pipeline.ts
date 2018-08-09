import * as Async from "./async";
import { RecPartial } from "./shared";

type MaybePromise<T> = T | Promise<T>;
type MaybePromiseFunc<P, T> = T | ((p: P) => MaybePromise<T>);
type PipePartial<P, T> = MaybePromiseFunc<P, RecPartial<T>>;

export class Pipeline<P extends Object = {}> implements PromiseLike<P> {
  constructor(private current: Promise<P>) {}

  static start() {
    return new Pipeline(Promise.resolve({}));
  }

  //add<T,U>(factory: Async.IFactory<T,U> | Async.FactoryFunc<T,U>, val: Parti (p:P) => Partial<T>)
  public addValue<P2 extends Object>(
    val: MaybePromiseFunc<P, P2>
  ): Pipeline<P & P2> {
    return new Pipeline(
      this.current.then(async c => {
        const v = typeof val === "function" ? await Async.lift(val(c)) : val;
        return {
          ...(c as any),
          ...(v as any)
        };
      })
    );
  }

  public addFactoryFunc<T, U, K extends string>(
    factory: Async.FactoryFunc<T, U>,
    key: K,
    partial?: PipePartial<P, T>
  ): Pipeline<P & { [k in K]: U }> {
    return new Pipeline(
      this.current.then(async c => {
        const p =
          typeof partial === "function"
            ? await Async.lift(partial(c))
            : partial;
        const val = await factory(p);
        const newV: { [k: string]: U } = {};
        newV[key] = val;
        return {
          ...(c as any),
          ...newV
        };
      })
    );
  }

  public addRegularFactory<T, K extends string>(
    factory: Async.Factory<T>,
    key: K,
    partial?: PipePartial<P, T>
  ): Pipeline<P & { [k in K]: T }> {
    return this.addFactoryFunc(v => factory.build(v), key, partial);
  }

  public addTxFactory<T, U, K extends string>(
    factory: Async.TransformFactory<T, U>,
    key: K,
    partial?: PipePartial<P, T>
  ): Pipeline<P & { [k in K]: U }> {
    return this.addFactoryFunc(v => factory.build(v), key, partial);
  }
  public addFactory<T, U, K extends string>(
    factory:
      | Async.FactoryFunc<T, U>
      | Async.Factory<U>
      | Async.TransformFactory<T, U>,
    key: K,
    partial?: PipePartial<P, T>
  ): Pipeline<P & { [k in K]: U }> {
    if (typeof factory === "function") {
      return this.addFactoryFunc<T, U, K>(factory, key, partial);
    } else if (factory.constructor === Async.Factory) {
      return this.addRegularFactory(factory as Async.Factory<U>, key, partial);
    }
    return this.addTxFactory(
      factory as Async.TransformFactory<T, U>,
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
