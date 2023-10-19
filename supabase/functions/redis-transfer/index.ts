import { createClient as createSupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.38.1";
import { createClient as createRedisClient } from "https://esm.sh/redis"

Deno.serve(async (req) => {
  // Check if user is admin
  const supabaseClient = createSupabaseClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    {global: { headers: { Authorization: req.headers.get('Authorization')! }}}
  );

  const { data: { user }} = await supabaseClient.auth.getUser();
  if (!user) {
    throw new Error("User not found");
  }

  const { data, error } = await supabaseClient.from('private_profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (error || !data) {
    throw new Error(error.message);
  }

  if (!data?.is_admin) {
    throw new Error("User not admin");
  }

  const { term } = await req.json();

  // Fetch term data from Supabase
  const FIELDS = "id, listing_id, term, code, title, status, basis, dists, rating, num_evals, grading_info";

  const { data: supaCourses, error: error2 } = await supabaseClient
    .from("courses")
    .select(FIELDS)
    .eq("term", term)
    .order("code", { ascending: true });

  if (error2) {
    throw new Error(error2.message);
  }

  // Push term data to Redis
  const redisClient = createRedisClient({
    password: Deno.env.get("REDIS_PASSWORD"),
    socket: {
      host: 'redis-10705.c12.us-east-1-4.ec2.cloud.redislabs.com',
      port: 10705
    }
  });

  redisClient.on("error", err => console.log("Redis Client Error", err));

  await redisClient.connect();
  await redisClient.json.set(`courses-${term}`, "$", JSON.stringify(supaCourses));
  await redisClient.disconnect();

  return new Response(
    JSON.stringify("Course data for term " + term + " pushed to Redis"),
    { headers: { "Content-Type": "application/json" } },
  )
})
