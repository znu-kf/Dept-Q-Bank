/**
 * ============================================================
 * DEPT. Q. BANK — supabaseClient.js
 * ============================================================
 * Loaded as a classic script (no bundler, matches storage.js /
 * exam.js style). Requires the Supabase UMD build to be loaded
 * first (see the <script> tag in index.html <head>).
 *
 * The anon key is safe to ship in client code — it is designed
 * to be public. Actual access control is enforced entirely by
 * the Postgres RLS policies and triggers, not by keeping this
 * key secret.
 */

const SUPABASE_URL = 'https://zgtgchdacgedrfrqejcn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpndGdjaGRhY2dlZHJmcnFlamNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYyMDMyNTUsImV4cCI6MjEwMTc3OTI1NX0.8Uw1M5JiEf-E2LveKhTMhX-9LMG513GYFB8ImTafsJU';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true, // needed for custom-SMTP email verification links
  },
});
