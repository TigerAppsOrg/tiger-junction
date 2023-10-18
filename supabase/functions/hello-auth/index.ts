// ! This file is purely for reference and practice

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.1";

Deno.serve(async (req) => {
  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    {global: { headers: { Authorization: req.headers.get('Authorization')! }}}
  );

  const { key } = await req.json();
  if (key === Deno.env.get("DB_INTERACT_KEY")) {
      const { data, error } = await supabaseClient.from('courses')
        .select('term')
        .limit(1);

      if (error || !data) {
        throw new Error(error.message);
      }

      console.log(data);

      return new Response(
        JSON.stringify("WEPFJWEOFJWEOIF"),
        { headers: { "Content-Type": "application/json" } },
      )
  } else {
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
  }

  return new Response(
    JSON.stringify("WEPFJWEOFJWEOIF"),
    { headers: { "Content-Type": "application/json" } },
  )
})