// src/main.ts
// Author(s): Joshua Lau '26, Sai Nallani '29

import { build } from "./app.ts";

const app = await build();

app.listen({ port: 3000 }).catch((err) => {
  app.log.error(err);
  process.exit(1);
});
