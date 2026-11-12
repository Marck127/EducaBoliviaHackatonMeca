// Configuración de la web. Se lee al abrir la página: puedes editar este archivo
// dentro de dist/ sin volver a compilar.
//
//   MODO 'demo'      Sin servidor: usa los datos de demo.json (el Excel de prueba).
//   MODO 'supabase'  Base y login en Supabase. Para importar y exportar hace falta API_URL.
//   MODO 'api'       FastAPI + PostgreSQL (SQLAlchemy). Todo pasa por API_URL.
//                    Si la API sirve esta misma web, deja API_URL vacío.
window.CONFIG = {
  MODO: 'supabase',
  SUPABASE_URL: 'https://rvcnxlqvurrzbhrxqlnl.supabase.co',          // https://rvcnxlqvurrzbhrxqlnl.supabase.co
  SUPABASE_KEY: 'sb_publishable_hY7YWe2jgEmdAa0cFpnFvQ_5JJGJzvC',          // sb_publishable_hY7YWe2jgEmdAa0cFpnFvQ_5JJGJzvC
  API_URL: '',               // https://tu-api.onrender.com
  ORGANIZACION: 'Enseña por Bolivia',          // Ense
  
}
