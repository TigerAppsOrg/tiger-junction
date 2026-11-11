// HTTP entrypoint for the Stellic gateway.

import "dotenv/config";
import { build } from "./app.ts";

const app = await build();
const port = Number(process.env.PORT ?? 3100);

app.listen({ port }).catch((err) => {
  app.log.error(err);
  process.exit(1);
});
