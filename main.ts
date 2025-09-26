import {
  Application,
  Router,
  send,
} from "https://deno.land/x/oak@v12.4.0/mod.ts";

const app = new Application();
const router = new Router();
const kv = await Deno.openKv();
const MESSAGE_COUNT_LIMIT = 1000;

router
  .get("/messages", async (ctx) => {
    const messages = [];
    for await (const entry of kv.list({ prefix: ["message"] })) {
      messages.push(entry.value);
    }
    ctx.response.headers.set("Content-Type", "application/json");
    ctx.response.body = messages;
    ctx.response.status = 200;
  })
  .post("/buzz", async (ctx) => {
    // Limit message count
    let messageCount = 0;
    for await (const _ of kv.list({ prefix: ["message"] })) {
      messageCount++;
      if (messageCount > MESSAGE_COUNT_LIMIT) {
        ctx.response.status = 429;
        return;
      }
    }

    const { name, timeStamp } = await ctx.request.body().value;

    if (name && timeStamp) {
      await kv.set(["message", timeStamp], { name, timeStamp });
      console.info(`Saved message from "${name}" (${timeStamp})`);
      ctx.response.status = 204;
    } else {
      ctx.response.status = 400;
    }
  })
  .delete("/clear", async (ctx) => {
    for await (const entry of kv.list({ prefix: ["message"] })) {
      await kv.delete(entry.key);
    }
    ctx.response.status = 204;
  });

app.use(router.routes());
app.use(router.allowedMethods());

// Serve static content
app.use(async (ctx) => {
  await send(ctx, ctx.request.url.pathname, {
    root: `${Deno.cwd()}/public`,
    index: "index.html",
  });
});

app.listen({ port: 80 });
