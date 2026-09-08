import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const adminEmail = "francdenisbr@gmail.com";
    const adminPassword = "franc2015";

    // List users to check if admin exists
    const { data: usersData } = await adminClient.auth.admin.listUsers();
    const existingUser = usersData?.users?.find(u => u.email === adminEmail);
    
    if (existingUser) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Admin já existe",
          userId: existingUser.id 
        }),
        { 
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200 
        }
      );
    }

    // Create the admin user
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
      user_metadata: {
        full_name: "Franc Denis",
        is_admin: true,
      },
    });

    if (createError) {
      throw createError;
    }

    // Add admin role to user_roles table
    if (newUser?.user) {
      const { error: roleError } = await adminClient
        .from("user_roles")
        .insert({
          user_id: newUser.user.id,
          role: "admin",
        });

      if (roleError) {
        console.error("Error adding admin role:", roleError);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Admin criado com sucesso",
        userId: newUser?.user?.id 
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200 
      }
    );

  } catch (error: any) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500 
      }
    );
  }
});
