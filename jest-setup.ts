(function () {
  let lastTime = 0;
  const vendors = ["ms", "moz", "webkit", "o"];
  const w: any = window;
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

if (process.env.DEBUGGING) {
  jasmine.DEFAULT_TIMEOUT_INTERVAL = 1000 * 60 * 5; // five minutes
} else {
  jasmine.DEFAULT_TIMEOUT_INTERVAL = 1000 * 60; // 60 seconds
}

