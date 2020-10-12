import * as Sync from "../src/sync";

interface ParentType {
  name: string | null;
  birthday: Date;
  children: ChildType[];
  spouse: ParentType | null;
}

interface ChildType {
  name: string | null;
  grade: number;
}

interface WidgetType {
  name: string;
  id: number;
}

describe("factories build stuff", () => {
  const childFactory = Sync.makeFactory<ChildType>({
    name: "Kid",
    grade: 1
  });
  const parentFactory = Sync.makeFactory<ParentType>({
    name: "Parent",
    birthday: Sync.each(i => new Date(`2017/05/${i + 1}`)),
    children: Sync.each(() => []),
    spouse: null
  });
  it("makes an object from a factory", () => {
    const jimmy = childFactory.build({ name: "Jimmy" });
    expect(jimmy.name).toEqual("Jimmy");
    expect(jimmy.grade).toEqual(1);
  });
  it("makes an object with default field from a factory", () => {
    const jimmy = childFactory.build();
    expect(jimmy.name).toEqual("Kid");
    expect(jimmy.grade).toEqual(1);
  });
  it("makes an object with default field explicitly set to null", () => {
    const anon = childFactory.build({ name: null });
    expect(anon.name).toBeNull();
    expect(anon.grade).toEqual(1);
  });
  it("can make use of sequence #", () => {
    const susan = parentFactory.build({ name: "Susan" });
    const edward = parentFactory.build({ name: "Edward" });
    expect(susan.birthday.getTime()).toEqual(new Date("2017/05/01").getTime());
    expect(edward.birthday.getTime()).toEqual(new Date("2017/05/02").getTime());
  });
  it("can handle has many", () => {
    const jimmy = childFactory.build({ name: "Jimmy" });
    const alice = childFactory.build({ name: "Alice", grade: 3 });
    const susan = parentFactory.build({
      name: "Susan",
      children: [jimmy, alice]
    });
    expect(susan.children.map(c => c.name)).toEqual(["Jimmy", "Alice"]);
  });
  it("can refer to other factories", () => {
    const parentWithKidsFactory = Sync.makeFactory<ParentType>({
      name: "Timothy",
      birthday: Sync.each(i => new Date(`2017/05/${i}`)),
      children: Sync.each(() => [
        childFactory.build({ name: "Bobby" }),
        childFactory.build({ name: "Jane" })
      ]),
      spouse: null
    });
    const tim = parentWithKidsFactory.build({
      birthday: new Date("2017-02-01")
    });
    expect(tim.children.map(c => c.name)).toEqual(["Bobby", "Jane"]);
  });
  it("can extend existing factories", () => {
    const geniusFactory = childFactory.extend({
      grade: Sync.each(i => (i + 1) * 2)
    });
    const colin = geniusFactory.build({ name: "Colin" });
    expect(colin.grade).toEqual(2);
    const albert = geniusFactory.build({ name: "Albert" });
    expect(albert.grade).toEqual(4);
  });
  it("can derive one value based on another value", () => {
    interface Person {
      readonly firstName: string;
      readonly lastName: string;
      readonly fullName: string;
    }
    const personFactory = Sync.makeFactory<Person>({
      firstName: "Double-O",
      lastName: Sync.each(() => "Bond"),
      fullName: ""
    }).withDerivation("fullName", p => `${p.firstName} ${p.lastName}`);
    //.withDerivation2(['firstName','lastName'],'fullName', (fn, ln) => `${fn} ${ln}`);
    const bond = personFactory.build({ firstName: "James" });
    expect(bond.fullName).toEqual("James Bond");
    const doubleO = personFactory.build();
    expect(doubleO.fullName).toEqual("Double-O Bond");
  });
  it("can build a list of items", () => {
    const children = childFactory.buildList(3, { name: "Bruce" });
    expect(children.length).toEqual(3);
    for (let child of children) {
      expect(child.name).toEqual("Bruce");
      expect(child.grade).toEqual(1);
    }
  });
  it("can combine factories", () => {
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
    interface User {
      email: string;
      createdAt: Date;
      updatedAt: Date;
      isDeleted: boolean;
    }
    const postFactory: Sync.Factory<Post> = Sync.makeFactory({
      content: "lorem ipsum"
    })
      .combine(timeStamps)
      .combine(softDelete);
    const userFactory: Sync.Factory<User> = Sync.makeFactory({
      email: "test@user.com"
    })
      .combine(timeStamps)
      .combine(softDelete);
    const post = postFactory.build({
      content: "yadda yadda yadda",
      isDeleted: true
    });
    expect(post.createdAt.getTime() - new Date().getTime()).toBeLessThan(100);
    expect(post.isDeleted).toEqual(true);
    const user = userFactory.build({
      email: "foo@bar.com",
      createdAt: new Date("2018/01/02")
    });
    expect(user.createdAt.getTime()).toEqual(new Date("2018/01/02").getTime());
    expect(post.updatedAt.getTime() - new Date().getTime()).toBeLessThan(100);
    expect(user.email).toEqual("foo@bar.com");
  });
  it("supports nested factories", () => {
    interface IGroceryStore {
      aisle: {
        name: string;
        typeOfFood: string;
        budget?: number;
        tags: string[];
      };
    }

    const groceryStoreFactory = Sync.makeFactory<IGroceryStore>({
      aisle: {
        name: "Junk Food Aisle",
        typeOfFood: "Junk Food",
        tags: ["a", "b", "c"]
      }
    });

    // Error: Property 'name' is missing in type '{ budget: number; }
    const aStore = groceryStoreFactory.build({
      aisle: {
        budget: 9999,
        tags: ["a", "b"]
      }
    });
    expect(aStore.aisle.budget).toEqual(9999);
    expect(aStore.aisle.typeOfFood).toEqual("Junk Food");
    expect(aStore.aisle.tags).toEqual(["a", "b"]);
  });
  it("can transform type", async () => {
    const makeAdult = childFactory.transform<ParentType>(t => {
      const birthday = `${2018 - t.grade - 25}/05/10`;
      return {
        name: t.name,
        birthday: new Date(birthday),
        spouse: null,
        children: []
      };
    });
    const susan = makeAdult.build({ name: "Susan", grade: 5 });
    expect(susan.birthday.getTime()).toEqual(new Date("1988/05/10").getTime());
    expect(susan.name).toEqual("Susan");
    expect(susan.spouse).toEqual(null);
    expect(susan.children.length).toEqual(0);
  });
  it("supports recursive factories", () => {
    interface TypeA {
      foo: number;
      bar: string;
      recur: null | TypeA;
    }
    const factoryA = Sync.makeFactory<TypeA>({
      foo: Sync.each(n => n),
      bar: "hello",
      recur: null
    });
    const factoryAPrime = factoryA
      .withDerivation("foo", (_v, n) => {
        // inner: factoryA.build().foo should be 0, n should be 1
        // outer: factoryA.build().foo should be 1, n should be 2
        const foo = factoryA.build().foo;
        return foo * 100 + n; // 001 : 102
      })
      .withDerivation("bar", (v, n) => {
        // inner: n should be 2, v.foo should be 001 -> "001:1"
        // outer: n should be 3, v.foo should be 102 -> "102:2"
        return v.foo + ":" + n;
      });
    const justA = factoryAPrime.build({ foo: 99 }); // seq 1
    expect(justA.foo).toEqual(99);
    const aWithA = factoryAPrime.build({
      // outer: starts on seq 3
      recur: factoryAPrime.build() // inner: starts on seq 2
    });
    expect(aWithA.foo).toEqual(102);
    expect(aWithA.bar).toEqual("102:2");
    expect(aWithA.recur!.foo).toEqual(1);
    expect(aWithA.recur!.bar).toEqual("1:1");
  });
  it("allows custom seq num start", () => {
    interface TypeA {
      foo: number;
      bar: string;
    }
    const factoryA = Sync.makeFactory<TypeA>(
      {
        foo: Sync.each(n => n + 1),
        bar: "hello"
      },
      { startingSequenceNumber: 3 }
    );
    const a = factoryA.build();
    expect(a.foo).toEqual(4);
  });
  it("Can reset sequence number back to non-config default i.e. 0", () => {
    const widgetFactory = Sync.makeFactory<WidgetType>({
      name: "Widget",
      id: Sync.each(i => i)
    });

    const widgets = widgetFactory.buildList(3);
    expect(widgets[2].id).toBe(2);

    widgetFactory.resetSequenceNumber();

    const moreWidgets = widgetFactory.buildList(3);
    expect(moreWidgets[2].id).toBe(2);
  });
  it("Can reset sequence number back to config default", () => {
    const widgetFactory = Sync.makeFactory<WidgetType>(
      {
        name: "Widget",
        id: Sync.each(i => i)
      },
      {
        startingSequenceNumber: 100
      }
    );

    const widgets = widgetFactory.buildList(3);
    expect(widgets[2].id).toBe(102);

    widgetFactory.resetSequenceNumber();

    const moreWidgets = widgetFactory.buildList(3);
    expect(moreWidgets[2].id).toBe(102);
  });
  it("clones deeply nested values", () => {
    interface TypeA {
      bar: {
        baz: string;
      };
    }
    const factoryA = Sync.makeFactory<TypeA>({
      bar: {
        baz: "should-be-immutable"
      }
    });
    const a = factoryA.build();
    const b = factoryA.build();
    a.bar.baz = "is-not-immutable";
    expect(b.bar.baz).toEqual("should-be-immutable");
  });
  it("supports required fields", () => {
    interface DbRecord {
      foreignId: string;
      name: string;
    }
    const factoryA = Sync.makeFactoryWithRequired<DbRecord, "foreignId">({
      name: "hello"
    });
    // compile failures
    //const z = factoryA.build();
    //const z = factoryA.build({ });
    //const z = factoryA.build({ name: "uhoh" });

    // data checks
    const a = factoryA.build({ foreignId: "fk1" });
    expect(a).toEqual({ name: "hello", foreignId: "fk1" });
    const b = factoryA.build({ foreignId: "fk2", name: "goodbye" });
    expect(b).toEqual({ name: "goodbye", foreignId: "fk2" });

    // more compile failures
    //const [y,z] = factoryA.buildList(5);
    //const [y,z] = factoryA.buildList(5, {});
    //const [y,z] = factoryA.buildList(5, { name: 'hello' });

    // data checks
    const [c, d] = factoryA.buildList(2, { foreignId: "fk3" });
    expect(c).toEqual({ name: "hello", foreignId: "fk3" });
    expect(d).toEqual({ name: "hello", foreignId: "fk3" });
  });
});
