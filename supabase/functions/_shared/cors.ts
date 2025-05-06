// CORS headers for all edge functions
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // Allow all origins, including localhost
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, cache-control, pragma, expires',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Max-Age': '86400', // Cache preflight request for 24 hours
}; 