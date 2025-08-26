import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://bioblhctkouzvppnwxvd.supabase.co";
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJpb2JsaGN0a291enZwcG53eHZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ1NTY1NTEsImV4cCI6MjA3MDEzMjU1MX0.B5ohpVpYxUNLaHMhMhOrHOpCVjXl_NNvR5YrYwzzF0I";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});