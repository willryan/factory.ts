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
  it("builds data in steps", async () => {
    const p = Pipe.Pipeline.start()
      .addValue({ hello: "kitty" })
      .addValue({ byebye: "birdie" })
      .addValue(v => ({ corner: `${v.hello} corner` }))
      .addFactory(childFactory, "kiddo", { grade: 2 })
      .addFactory(parentFactory, "dad", v => ({
        name: "Dad",
        children: [v.kiddo]
      }));
    const data = await p;
    expect(data.hello).to.eq("kitty");
    expect(data.byebye).to.eq("birdie");
    expect(data.corner).to.eq("kitty corner");
    expect(data.kiddo.grade).to.eq(2);
    expect(data.kiddo.name).to.eq("Kid");
    expect(data.dad.name).to.eq("Dad");
    expect(data.dad.birthday.getTime()).to.eq(new Date("2017/05/01").getTime());
  });
});
