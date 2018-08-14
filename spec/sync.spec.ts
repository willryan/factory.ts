import * as Factory from "../src/sync";
import { expect } from "chai";
import { makeFactory } from "../src/sync";

interface ParentType {
  name: string;
  birthday: Date;
  children: ChildType[];
  spouse: ParentType | null;
}

interface ChildType {
  name: string;
  grade: number;
}

describe("factories build stuff", () => {
  const childFactory = Factory.makeFactory<ChildType>({
    name: "Kid",
    grade: 1
  });
  const parentFactory = Factory.makeFactory<ParentType>({
    name: "Parent",
    birthday: Factory.each(i => new Date(`2017/05/${i}`)),
    children: Factory.each(() => []),
    spouse: null
  });
  it("makes an object from a factory", () => {
    const jimmy = childFactory.build({ name: "Jimmy" });
    expect(jimmy.name).to.eq("Jimmy");
    expect(jimmy.grade).to.eq(1);
  });
  it("makes an object with default field from a factory", () => {
    const jimmy = childFactory.build();
    expect(jimmy.name).to.eq("Kid");
    expect(jimmy.grade).to.eq(1);
  });
  it("can make use of sequence #", () => {
    const susan = parentFactory.build({ name: "Susan" });
    const edward = parentFactory.build({ name: "Edward" });
    expect(susan.birthday.getTime()).to.eq(new Date("2017/05/01").getTime());
    expect(edward.birthday.getTime()).to.eq(new Date("2017/05/02").getTime());
  });
  it("can handle has many", () => {
    const jimmy = childFactory.build({ name: "Jimmy" });
    const alice = childFactory.build({ name: "Alice", grade: 3 });
    const susan = parentFactory.build({
      name: "Susan",
      children: [jimmy, alice]
    });
    expect(susan.children.map(c => c.name)).to.deep.eq(["Jimmy", "Alice"]);
  });
  it("can refer to other factories", () => {
    const parentWithKidsFactory = Factory.makeFactory<ParentType>({
      name: "Timothy",
      birthday: Factory.each(i => new Date(`2017/05/${i}`)),
      children: Factory.each(() => [
        childFactory.build({ name: "Bobby" }),
        childFactory.build({ name: "Jane" })
      ]),
      spouse: null
    });
    const tim = parentWithKidsFactory.build({
      birthday: new Date("2017-02-01")
    });
    expect(tim.children.map(c => c.name)).to.deep.eq(["Bobby", "Jane"]);
  });
  it("can extend existing factories", () => {
    const geniusFactory = childFactory.extend({
      grade: Factory.each(i => i * 2)
    });
    const colin = geniusFactory.build({ name: "Colin" });
    expect(colin.grade).to.eq(2);
    const albert = geniusFactory.build({ name: "Albert" });
    expect(albert.grade).to.eq(4);
  });
  it("can derive one value based on another value", () => {
    interface Person {
      readonly firstName: string;
      readonly lastName: string;
      readonly fullName: string;
    }
    const personFactory = Factory.makeFactory<Person>({
      firstName: "",
      lastName: "Bond",
      fullName: ""
    }).withDerivation("fullName", p => `${p.firstName} ${p.lastName}`);
    //.withDerivation2(['firstName','lastName'],'fullName', (fn, ln) => `${fn} ${ln}`);
    const bond = personFactory.build({ firstName: "James" });
    expect(bond.fullName).to.eq("James Bond");
  });
  it("can build a list of items", () => {
    const children = childFactory.buildList(3, { name: "Bruce" });
    expect(children.length).to.eq(3);
    for (let child of children) {
      expect(child.name).to.eq("Bruce");
      expect(child.grade).to.eq(1);
    }
  });
  it("can combine factories", () => {
    const timeStamps = makeFactory({
      createdAt: Factory.each(() => new Date()),
      updatedAt: Factory.each(() => new Date())
    });
    const softDelete = makeFactory({
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
    const postFactory: Factory.Factory<Post> = makeFactory({
      content: "lorem ipsum"
    })
      .combine(timeStamps)
      .combine(softDelete);
    const userFactory: Factory.Factory<User> = makeFactory({
      email: "test@user.com"
    })
      .combine(timeStamps)
      .combine(softDelete);
    const post = postFactory.build({
      content: "yadda yadda yadda",
      isDeleted: true
    });
    expect(post.createdAt.getTime() - new Date().getTime()).to.be.lessThan(100);
    expect(post.isDeleted).to.be.true;
    const user = userFactory.build({
      email: "foo@bar.com",
      createdAt: new Date("2018/01/02")
    });
    expect(user.createdAt.getTime()).to.eq(new Date("2018/01/02").getTime());
    expect(post.updatedAt.getTime() - new Date().getTime()).to.be.lessThan(100);
    expect(user.email).to.eq("foo@bar.com");
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

    const groceryStoreFactory = Factory.makeFactory<IGroceryStore>({
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
    expect(aStore.aisle.budget).to.eq(9999);
    expect(aStore.aisle.typeOfFood).to.eq("Junk Food");
    expect(aStore.aisle.tags).to.deep.eq(["a", "b"]);
  });
});
