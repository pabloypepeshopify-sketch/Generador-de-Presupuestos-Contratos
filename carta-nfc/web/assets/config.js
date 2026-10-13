// Conexión con Supabase. La clave "publishable"/"anon" es pública por diseño:
// la seguridad está en las funciones SQL (claves de cocina/admin, validación de precios).
window.CARTA_CONFIG = {
  supabaseUrl: 'https://giazlntdbfhnnfizmfao.supabase.co',
  supabaseKey: 'sb_publishable_sdLnLlIQvJBPTcmNx9FFpw_UEIAwbDP',
};
