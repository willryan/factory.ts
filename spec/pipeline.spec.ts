import * as Pipe from "../src/pipeline";
import * as Factory from "../src/async";
import { expect } from "chai";

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

describe("pipelines", () => {
  const childFactory = Factory.makeFactory<ChildType>({
    name: "Kid",
    grade: 1
  });
  const parentFactory = Factory.makeFactory<ParentType>({
    name: "Parent",
    birthday: Factory.each(i => Promise.resolve(new Date(`2017/05/${i}`))),
    children: Factory.each(() => []),
    spouse: null
  });
  const grandpaFactory = parentFactory.transform(parent => {
    return {
      ...parent,
      spoils: true
    };
  });
  it("builds data in steps", async () => {
    const p = Pipe.Pipeline.start()
      .addValues({ hello: "kitty", hola: "espanol" })
      .addValues(() => Promise.resolve({ byebye: "birdie" }))
      .addValues(v => ({
        corner: `${v.hello} corner`,
        golf: v.byebye
      }))
      .addFactory(childFactory, "kiddo", { grade: 2 })
      .addFactory(parentFactory, "dad", v =>
        Promise.resolve({
          name: "Dad",
          children: [v.kiddo]
        })
      )
      .addTxFactory(grandpaFactory, "gramps", v => ({
        name: "Gramps",
        children: [v.dad]
      }));
    const data = await p;
    expect(data.hello).to.eq("kitty");
    expect(data.hola).to.eq("espanol");
    expect(data.byebye).to.eq("birdie");
    expect(data.corner).to.eq("kitty corner");
    expect(data.golf).to.eq("birdie");
    expect(data.kiddo.grade).to.eq(2);
    expect(data.kiddo.name).to.eq("Kid");
    expect(data.dad.name).to.eq("Dad");
    expect(data.dad.birthday.getTime()).to.eq(new Date("2017/05/01").getTime());
    expect(data.dad.children.length).to.eq(1);
    expect(data.dad.children[0]).to.eq(data.kiddo);
    expect(data.gramps.name).to.eq("Gramps");
    expect(data.gramps.spoils).to.eq(true);
    expect(data.gramps.children.length).to.eq(1);
    expect(data.gramps.children[0]).to.eq(data.dad);
  });
});
