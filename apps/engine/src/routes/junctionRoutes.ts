import { Elysia } from "elysia";

export const junctionRoutes = new Elysia()
  .get("/junction/hello", () => "Hello Junction")
  .get("/junction/goodbye", () => "Goodbye Junction");
