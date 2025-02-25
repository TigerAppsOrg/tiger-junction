import { Elysia } from "elysia";

export const authRoutes = new Elysia()
  .get("/auth/hello", () => "Hello World")
  .get("/auth/goodbye", () => "Goodbye World");
