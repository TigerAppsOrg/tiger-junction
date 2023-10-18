import { SupabaseClient, createClient as createSupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.38.1";
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



  

  return new Response(

  )
})
