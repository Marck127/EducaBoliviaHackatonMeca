// Configuración de la web. Se lee al abrir la página: puedes editar este archivo
// dentro de dist/ sin volver a compilar.
//
//   MODO 'demo'      Sin servidor: usa los datos de demo.json (el Excel de prueba).
//   MODO 'supabase'  Base y login en Supabase. Para importar y exportar hace falta API_URL.
//   MODO 'api'       FastAPI + PostgreSQL (SQLAlchemy). Todo pasa por API_URL.
//                    Si la API sirve esta misma web, deja API_URL vacío.
window.CONFIG = {
  MODO: 'demo',
  SUPABASE_URL: '',          // https://xxxx.supabase.co
  SUPABASE_KEY: '',          // la publishable key (sb_publishable_...), nunca la secret
  API_URL: '',               // https://tu-api.onrender.com
  ORGANIZACION: '',          // nombre que aparece en el menú
}
