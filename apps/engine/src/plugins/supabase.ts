import fp from "fastify-plugin";
import type { FastifyPluginAsync } from "fastify";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

declare module "fastify" {
  interface FastifyInstance {
    supabase: SupabaseClient;
  }
}

const supabasePlugin: FastifyPluginAsync = async (app) => {
  const url = process.env.SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url || !serviceRoleKey) {
    app.log.warn("SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set — Supabase plugin disabled. /junction/mcp schedule tools will not work.");
    // Decorate with a dummy so Fastify doesn't throw on access
    app.decorate("supabase", null as unknown as SupabaseClient);
    return;
  }

  const supabase = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  app.decorate("supabase", supabase);
  app.log.info("Supabase client initialized");
};

export default fp(supabasePlugin, {
  name: "supabase-plugin",
});
