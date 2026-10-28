-- Las funciones de las políticas RLS salen del esquema público para que no se puedan llamar por la API.
create schema if not exists privado;
revoke all on schema privado from public, anon;
grant usage on schema privado to authenticated;
alter function public.es_miembro() set schema privado;
alter function public.es_socio() set schema privado;
