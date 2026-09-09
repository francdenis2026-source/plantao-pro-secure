-- Habilita realtime em system_settings — o toggle de "novos cadastros"
-- (e outros flags futuros dessa tabela) precisa refletir em outras abas/
-- dispositivos assim que o administrador muda, sem esperar reload.
ALTER PUBLICATION supabase_realtime ADD TABLE public.system_settings;
