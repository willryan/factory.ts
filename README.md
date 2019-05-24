# factory.ts

A library to ease creation of factories for test data for Typescript

Given an interface or type definition, create a factory for generating test data. Values for each key may be defaulted or be calculated each time based on a sequence number and the values for other keys.

Version 0.3.2 introduces a new set of async factory methods for cases where asynchronicity is required to generate values. See sync.spec.ts for examples.

Version 0.3.3 introduces a pipeline mechanism for building up a key-value set of data. See pipeline.spec.ts for an example.

## Example

### Interface

```typescript
interface Person {
  id: number;
  firstName: string;
  lastName: string;
  fullName: string;
  age: number;
}
```

### Basic factory

```typescript
import * as Factory from "factory.ts";

const personFactory = Factory.Sync.makeFactory<Person>({
  id: Factory.each(i => i),
  firstName: "Bob",
  lastName: "Smith",
  fullName: "Robert J. Smith, Jr.",
  age: Factory.each(i => 20 + (i % 10))
});
```

For each property of Person, you can specify a default value, or call `Factory.Sync.each`. `Factory.Sync.each` takes a lambda with a sequence number that is incremented automatically between generating instances of your type (`Person` in our example).

You can call `personFactory.build` with a subset of field data (`Partial<Person>`) to override defaults, and the output will be an object that conforms to Person using the definition specified in `makeFactory`.

```typescript
const james = personFactory.build({
  firstName: "James",
  fullName: "James Smith"
});
// { id: 1, firstName: 'James', lastName: 'Smith', fullName: 'James Smith', age: 21 };

const youngBob = personFactory.build({ age: 5 });
// { id: 2, firstName: 'Bob', lastName: 'Smith', fullName: 'Robert J. Smith, Jr.', age: 5 };
```

You can also call `personFactory.build` with no arguments to use factory defaults:

```typescript
const anybody = personFactory.build();
```

And you can create an array of objects from factory using `buildList` (with or without the `Partial` override):

```typescript
const theBradyBunch = personFactory.buildList(8, { lastName: "Brady" });
```

To reset the factory's sequence number used by 'build' and 'buildList':

```typescript
personFactory.resetSequenceNumber();
```

### Extending factories

Occasionally you may want to extend an existing factory with some changes. For example, we might want to create a personFactory that emits a totally random age range:

```typescript
const anyAgeFactory = personFactory.extend({
  age: Factory.each(() => randomAge(0, 100)) // randomAge(min:number, max:number) => number
});

anyAgeFactory.build(); // { id: 1, ..., age: <random value> };
```

Extending a Factory creates a new, immutable Factory. Your initial factory remains unchanged.

### Derived values

One specific way to extend an existing factory is to make a new factory where one of the keys/properties is determined by other properties. For example. we can use this to specify fullName from firstName and lastName:

```typescript
const autoFullNameFactory = personFactory.withDerivation2(
  ["firstName", "lastName"],
  "fullName",
  (fName, lName) => `${lName}, ${fName} ${lName}`
);

const jamesBond = autoFullNameFactory.build({
  firstName: "James",
  lastName: "Bond"
});
// { id: 1, firstName: 'James', lastName: 'Bond', fullName: 'Bond, James Bond', age: 21 };
```

The `withDerivation*N*` functions consume an array of dependent key names (of length N), then the name of the property to define, then a lambda that takes the appropriate types for arguments based on the values of the dependent keys, and expects a return type that matches the derived key value type. `withDerivation1` through `withDerivation5` are provided. Ideally these would be overrides, but I have yet to figure out a way to make the Typescript compiler accept this.

Note that any misspelling of dependent or derived key names in a call to `withDerivation*N*` will result in a compile error - aren't mapped types the best?

Alternatively, if you need to read more than 5 properties, or just don't want to specify dependencies explicitly, `withDerivation` expects a property key to derive and a lambda that goes from a value of the overall type being built to a value of the type of the dependent property. For our fullName case that would be:

```typescript
const autoFullNameFactory = personFactory.withDerivation(
  "fullName",
  person => `${person.lName}, ${person.fName} ${person.lName}`
);
```

Personally I prefer to be explicit about the dependent keys, but it doesn't really matter.

Derivations are processed in the order they are defined, and all `withDerivation` functions produce a new immutable Factory.

Finally, you could instantiate a `Derived<TOwner,TProperty>` for the value of a property inside a `Factory.makeFactory` definition, but the type inference can't help you as much - you'll have to indicate the type of TOwner and TProperty.

### Combining factories

Sometimes you have two factories you want to combine into one. So essentially you have `(p: Partial<T>) => T` and `(p: Partial<U>) => U` and you want `(p: Partial<T & U>) => T & U`. That's what `combine()` is for.

```typescript
const timeStamps = Sync.makeFactory({
  createdAt: Sync.each(() => new Date()),
  updatedAt: Sync.each(() => new Date())
});
const softDelete = Sync.makeFactory({
  isDeleted: false
});
interface Post {
  content: string;
  createdAt: Date;
  updatedAt: Date;
  isDeleted: boolean;
}
const postFactory: Sync.Factory<Post> = makeFactory({
  content: "lorem ipsum"
})
  .combine(timeStamps)
  .combine(softDelete);
```

This pattern allows you to create a factory for a common subset of different types and just re-apply it.

### Required Properties

Sometimes you may want to generate a type where some properties to be required every time you call `build()`. The most common example would be non-null foreign keys in a database. In this case, there's no meaningful value generator you can provide, at least not synchronously.

```typescript
import * as Factory from "factory.ts";

interface Person {
  id: number;
  firstName: string;
  lastName: string;
  fullName: string;
  age: number;
  parent_id: number;
}

const personFactory = Factory.Sync.makeFactoryWithRequired<Person, "parent_id">(
  {
    id: Factory.each(i => i),
    firstName: "Bob",
    lastName: "Smith",
    fullName: "Robert J. Smith, Jr.",
    age: Factory.each(i => 20 + (i % 10))
  }
);

const invalid = personFactory.build(); // compile error - need base item with { parent_id }
const invalid2 = personFactory.build({}); // compile error - need base item with { parent_id }
const invalid3 = personFactory.build({ firstName: "Sue" }); // compile error - need base item with { parent_id }
const valid2 = personFactory.build({ parent_id: 3 });
const valid = personFactory.build({ parent_id: 5, firstName: "Sue" });
```

Not the use of `makeFactoryWithRequired()` to specify required keys.

## Async Factories

Async factories support all the same methods as sync factories, but you can also provide generators that create Promise<T> instead of T. Consequently each property may or may not use asynchronicity for generation, but the final factory requires only one await.

### `transform()`

Async factories also have a `transform()` method which can take a function that goes from `T => U` or from `T => Promise<U>`. This creates an object with the factory interface for building only, and is meant to be a "last step" transform. The idea is that the output of the last step may be a different type. For example, you may have an Unsaved and a Saved type for database records, so you can pass in your `insert(u: Unsaved): Promise<Saved>` method and get a factory which will asynchronously build a persisted `Saved` object.

### Pipelines

Async factories can be put into pipeline, where at each step in the pipeline you add one or more top-level keys to an object meant to hold your test data.
This feature is designed to help with bootstrapping complex data structures for tests (e.g. several database records).

Each step in the pipeline can accept:

- a raw object with keys and values to merge into the pipeline data, OR
- a function (optionally asynchronous) returning the same, and which can depend on all data in the pipeline up to that point, OR
- an Async Factory (or TransformFactory or FactoryFunc), along with:
  - a partial for the factory, OR
  - a function (optionally synchronous) returning a partial for the factory

As noted above, each step can depend on the previous steps' data to make its contribution, and each step can be asynchronous. In the end you just await on the pipeline, and through the magic of Typescript you have a type-safe object whose keys are all the values you want to use in your test.

See [pipeline.spec.ts](./spec/pipeline.spec.ts) for an example.
