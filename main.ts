import { Application, Router, send } from "https://deno.land/x/oak@v12.4.0/mod.ts";

const app = new Application();
const router = new Router();
const wsConnections: Map<string, WebSocket> = new Map();

router
  .get("/ws", (ctx) => {
    if (!ctx.isUpgradable) {
      ctx.throw(501);
    }

    const clientName = ctx.request.url.searchParams.get('name');

    if (clientName) {
      const ws = ctx.upgrade();

      ws.onopen = (e) => {
        console.info(
          `Connected to "${clientName}" (${new Date(e.timeStamp).toLocaleTimeString()})`
        );
      };

      ws.onmessage = (e) => {
        const recipients: string[] = [];

        // Relay incoming messages to all websocket connections
        for (const [name, ws] of wsConnections) {
          if (ws.OPEN) {
            recipients.push(name);
            ws.send(e.data as string);
          }
        }

        console.info(`Sent message to ${recipients.map((r) => `"${r}"`).join(', ')}.`);
      };

      ws.onclose = () => console.info(`Disconncted from "${clientName}".`);

      wsConnections.set(clientName, ws);
    }
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
