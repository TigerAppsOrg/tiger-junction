import { Elysia } from "elysia";

export const apiRoutes = new Elysia()
  .get("/api/hello", () => "Hello World")
  .get("/api/goodbye", () => "Goodbye World");
