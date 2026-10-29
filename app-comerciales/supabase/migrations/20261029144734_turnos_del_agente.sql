-- Cada mensaje recibe su número de orden cuando el agente lo atiende, y solo un proceso
-- responde a la vez en cada conversación (procesando_hasta hace de cerrojo con caducidad).
alter table public.mensajes add column orden int;
create unique index mensajes_orden_idx on public.mensajes (conversacion_id, orden);
alter table public.conversaciones add column procesando_hasta timestamptz;
