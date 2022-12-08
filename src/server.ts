import { Application, Router, logger, oakCors, dotenvConfig } from "./deps.ts";
import type { RouterContext } from "./deps.ts";
import appRouter from "./routes/index.ts";
dotenvConfig({ export: true, path: ".env" });

const app = new Application();
const router = new Router();

// Middleware Logger
app.use(logger.default.logger);
app.use(logger.default.responseTime);

// Health checker
router.get<string>("/api/healthchecker", (ctx: RouterContext<string>) => {
  ctx.response.status = 200;
  ctx.response.body = {
    status: "success",
    message:
      "Welcome to JWT Authentication in Deno with Asymmetric Cryptography",
  };
});

app.use(
  oakCors({
    origin: /^.+localhost:(3000|3001)$/,
    optionsSuccessStatus: 200,
    credentials: true,
  })
);

appRouter.init(app);
app.use(router.routes());
app.use(router.allowedMethods());

app.addEventListener("listen", ({ port, secure }) => {
  console.info(
    `🚀 Server started on ${secure ? "https://" : "http://"}localhost:${port}`
  );
});

const port = 8000;
app.listen({ port });
