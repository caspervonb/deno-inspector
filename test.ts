import { delay } from "https://deno.land/std/async/delay.ts";
import { assert, assertEquals } from "https://deno.land/std/testing/asserts.ts";
import { connect } from "./mod.ts";

Deno.test("connect", async function () {
  const script = await Deno.makeTempFile({
    suffix: ".ts",
  });

  await Deno.writeTextFile(script, "setInterval(function() {}, 1000)");

  const host = "0.0.0.0:9222";
  const process = Deno.run({
    cmd: [
      Deno.execPath(),
      "run",
      `--inspect=${host}`,
      script,
    ],
    stdout: "null",
    stderr: "null",
  });

  await delay(1000);

  const target = await fetch(`http://${host}/json/list`).then(
    async (response) => {
      const targets = await response.json();
      return targets.find((target: unknown) => true);
    },
  );

  assert(target.webSocketDebuggerUrl);

  const session = await connect({
    url: target.webSocketDebuggerUrl,
  });

  await session.send("Runtime.enable");
  await session.send("Debugger.enable");

  session.close();
  process.close();
});
