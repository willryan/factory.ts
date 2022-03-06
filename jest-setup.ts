(function () {
  let lastTime = 0;
  const vendors = ["ms", "moz", "webkit", "o"];
  const w: any = globalThis;
  for (let x = 0; x < vendors.length && !w.requestAnimationFrame; ++x) {
    w.requestAnimationFrame = w[vendors[x] + "RequestAnimationFrame"];
    w.cancelAnimationFrame =
      w[vendors[x] + "CancelAnimationFrame"] ||
      w[vendors[x] + "CancelRequestAnimationFrame"];
  }

  if (!w.requestAnimationFrame) {
    w.requestAnimationFrame = function (callback: any, _element: any) {
      const currTime = new Date().getTime();
      const timeToCall = Math.max(0, 16 - (currTime - lastTime));
      const id = w.setTimeout(function () {
        callback(currTime + timeToCall);
      }, timeToCall);
      lastTime = currTime + timeToCall;
      return id;
    };
  }

  if (!w.cancelAnimationFrame) {
    w.cancelAnimationFrame = function (id: any) {
      clearTimeout(id);
    };
  }
})();
