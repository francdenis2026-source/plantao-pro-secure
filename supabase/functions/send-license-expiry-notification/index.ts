import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.90.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  agentId?: string;
  daysBeforeExpiry?: number;
  notificationType?: 'email' | 'whatsapp' | 'all';
}

interface Agent {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  license_expires_at: string | null;
  team: string | null;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const { agentId, daysBeforeExpiry = 7, notificationType = 'email' }: NotificationRequest = await req.json();

    // Calculate the date threshold
    const now = new Date();
    const thresholdDate = new Date(now);
    thresholdDate.setDate(thresholdDate.getDate() + daysBeforeExpiry);

    // Query agents with expiring licenses
    let query = supabase
      .from('agents')
      .select('id, name, email, phone, license_expires_at, team')
      .not('license_expires_at', 'is', null)
      .lte('license_expires_at', thresholdDate.toISOString())
      .gt('license_expires_at', now.toISOString());

    if (agentId) {
      query = query.eq('id', agentId);
    }

    const { data: agents, error: fetchError } = await query;

    if (fetchError) {
      throw new Error(`Failed to fetch agents: ${fetchError.message}`);
    }

    if (!agents || agents.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No agents with expiring licenses found',
          notificationsSent: 0 
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const notifications: { agentId: string; type: string; success: boolean; error?: string }[] = [];

    for (const agent of agents as Agent[]) {
      const daysLeft = Math.ceil(
        (new Date(agent.license_expires_at!).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Send email notification
      if ((notificationType === 'email' || notificationType === 'all') && agent.email && resendApiKey) {
        try {
          const emailResponse = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${resendApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: 'PlantãoPro <notificacoes@plantaopro.com.br>',
              to: [agent.email],
              subject: `⚠️ Sua licença expira em ${daysLeft} dia${daysLeft > 1 ? 's' : ''}!`,
              html: `
                <!DOCTYPE html>
                <html>
                <head>
                  <meta charset="utf-8">
                  <style>
                    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #0f172a; color: #e2e8f0; padding: 20px; }
                    .container { max-width: 600px; margin: 0 auto; background: #1e293b; border-radius: 16px; overflow: hidden; }
                    .header { background: linear-gradient(135deg, #f59e0b, #d97706); padding: 24px; text-align: center; }
                    .header h1 { color: #0f172a; margin: 0; font-size: 24px; }
                    .content { padding: 32px; }
                    .alert { background: #7f1d1d; border-left: 4px solid #ef4444; padding: 16px; border-radius: 8px; margin-bottom: 24px; }
                    .info { background: #1e3a5f; padding: 16px; border-radius: 8px; margin-bottom: 24px; }
                    .cta { text-align: center; padding: 24px 0; }
                    .btn { display: inline-block; background: linear-gradient(135deg, #f59e0b, #d97706); color: #0f172a; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; }
                    .footer { text-align: center; padding: 16px; background: #0f172a; font-size: 12px; color: #64748b; }
                  </style>
                </head>
                <body>
                  <div class="container">
                    <div class="header">
                      <h1>🛡️ PlantãoPro</h1>
                    </div>
                    <div class="content">
                      <p>Olá, <strong>${agent.name}</strong>!</p>
                      
                      <div class="alert">
                        <strong>⚠️ Atenção:</strong> Sua licença do PlantãoPro expira em <strong>${daysLeft} dia${daysLeft > 1 ? 's' : ''}</strong>!
                      </div>
                      
                      <div class="info">
                        <p><strong>📅 Data de expiração:</strong> ${new Date(agent.license_expires_at!).toLocaleDateString('pt-BR')}</p>
                        <p><strong>👥 Equipe:</strong> ${agent.team || 'Não definida'}</p>
                      </div>
                      
                      <p>Para continuar usando o sistema sem interrupções, entre em contato com seu administrador para renovar sua licença.</p>
                      
                      <div class="cta">
                        <a href="https://plantaopro.com.br" class="btn">Acessar Sistema</a>
                      </div>
                    </div>
                    <div class="footer">
                      <p>© ${new Date().getFullYear()} PlantãoPro - Sistema de Escalas Operacionais</p>
                      <p>Desenvolvido por FRANC D'NIS</p>
                    </div>
                  </div>
                </body>
                </html>
              `,
            }),
          });

          const emailResult = await emailResponse.json();
          
          notifications.push({
            agentId: agent.id,
            type: 'email',
            success: emailResponse.ok,
            error: emailResponse.ok ? undefined : emailResult.message,
          });
        } catch (emailError: any) {
          notifications.push({
            agentId: agent.id,
            type: 'email',
            success: false,
            error: emailError.message,
          });
        }
      }

      // Create in-app notification
      try {
        await supabase.from('notifications').insert({
          agent_id: agent.id,
          title: `⚠️ Licença expirando em ${daysLeft} dia${daysLeft > 1 ? 's' : ''}`,
          content: `Sua licença do PlantãoPro expira em ${new Date(agent.license_expires_at!).toLocaleDateString('pt-BR')}. Entre em contato com o administrador para renovação.`,
          type: 'license_expiry',
          is_read: false,
        });

        notifications.push({
          agentId: agent.id,
          type: 'in-app',
          success: true,
        });
      } catch (notifError: any) {
        notifications.push({
          agentId: agent.id,
          type: 'in-app',
          success: false,
          error: notifError.message,
        });
      }

      // Log the notification attempt
      console.log(`[LICENSE NOTIFICATION] Agent: ${agent.name}, Days Left: ${daysLeft}, Email: ${agent.email ? 'sent' : 'no email'}`);
    }

    const successCount = notifications.filter(n => n.success).length;
    const failCount = notifications.filter(n => !n.success).length;

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${agents.length} agents`,
        notificationsSent: successCount,
        notificationsFailed: failCount,
        details: notifications,
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: any) {
    console.error("Error in send-license-expiry-notification:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
