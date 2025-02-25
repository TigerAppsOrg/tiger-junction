import { Elysia } from "elysia";

export const pcRoutes = new Elysia()
  .get("/pc/hello", () => "Hello PC")
  .get("/pc/goodbye", () => "Goodbye PC");
