import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// TuneIn station id for "Jovem Pan FM" (São Paulo, 100.9 FM).
const TUNEIN_STATION_ID = "s122944";

/**
 * Resolve o endpoint de áudio ao vivo da Jovem Pan via API pública da
 * TuneIn (o mesmo mecanismo usado pelos apps oficiais deles). Feito no
 * servidor porque o endpoint da TuneIn não envia cabeçalhos CORS — o
 * navegador não conseguiria chamá-lo diretamente. O token de sessão que a
 * TuneIn devolve é de curta duração, então esta função é chamada a cada
 * "play" em vez de cachear a URL no cliente.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const tuneInRes = await fetch(
      `https://opml.radiotime.com/Tune.ashx?id=${TUNEIN_STATION_ID}&render=json`,
    );
    if (!tuneInRes.ok) {
      return json({ success: false, error: "Falha ao consultar a TuneIn" }, 502);
    }
    const data = await tuneInRes.json();
    const streamUrl: string | undefined = data?.body?.[0]?.url;
    if (!streamUrl) {
      return json({ success: false, error: "Stream indisponível no momento" }, 502);
    }

    return json({
      success: true,
      streamUrl,
      station: "Jovem Pan FM — São Paulo",
      bitrate: data.body[0].bitrate ?? null,
    });
  } catch (err) {
    return json({ success: false, error: String(err) }, 500);
  }
});
