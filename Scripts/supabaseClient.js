import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const supabaseUrl  ="https://vbnnzmhopcjlkvtuubcj.supabase.co";
const supabaseAnonKey  ="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZibm56bWhvcGNqbGt2dHV1YmNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQyNTAyODQsImV4cCI6MjA2OTgyNjI4NH0.GmnvUTPeDKNtc2LEEK-9N47LgE3gJ7PbPiWI1l2X_R8";
export const supabase  = createClient( supabaseUrl ,supabaseAnonKey );

