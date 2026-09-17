"use client";

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "Supabase não configurado. Copie .env.local.example para .env.local e preencha as chaves."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);