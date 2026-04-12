/** Client unique — évite double instance et crash si `VITE_SUPABASE_ANON_KEY` est absent alors que la clé publishable est définie. */
export { supabase } from "@/integrations/supabase/client";
