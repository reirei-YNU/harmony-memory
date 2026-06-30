import { router } from "./_core/trpc.js";
import { wakaRouter } from "./routers/waka.js";

export const appRouter = router({
  waka: wakaRouter,
});

export type AppRouter = typeof appRouter;
