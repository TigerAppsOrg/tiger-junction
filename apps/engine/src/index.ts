import { Elysia } from "elysia";
import { swagger } from "@elysiajs/swagger";
import { apiRoutes, authRoutes, junctionRoutes, pcRoutes } from "./routes";

const app = new Elysia()
  .use(
    swagger({
      documentation: {
        info: {
          title: "TigerJunction Engine API",
          version: "1.0.0",
          description: "Documentation for the TigerJunction Engine API",
          contact: {
            name: "TigerApps",
            email: "it.admin@tigerapps.org",
          },
          license: {
            name: "BSD 3-Clause",
            url: "https://opensource.org/licenses/BSD-3-Clause",
          },
        },
      },
      path: "/docs",
    })
  )
  .use(apiRoutes)
  .use(junctionRoutes)
  .use(pcRoutes)
  .use(authRoutes)
  .listen(3000);

console.log(
  `🚂 Junction Engine API now running at http://localhost:3000 - All aboard!`
);
