// ============================================

// MARKET BOUAKÉ

// Connexion Supabase

// ============================================

const SUPABASE_URL = "https://qgdxxrnsiyzbacxxfdrg.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =

    "sb_publishable_QE2in_ocTQQDEt0HW9wSCg_PKSzqo7N";

const supabaseClient = window.supabase.createClient(

    SUPABASE_URL,

    SUPABASE_PUBLISHABLE_KEY

);

// Test de connexion à Supabase

async function testSupabaseConnection() {

    const status = document.getElementById("connection-status");

    try {

        const { data, error } = await supabaseClient.auth.getSession();

        if (error) {

            console.error("Erreur Supabase :", error);

            status.textContent = "Erreur de connexion à Supabase.";

            return;

        }

        status.textContent = "Market Bouaké est connecté à Supabase.";

        console.log("Connexion Supabase réussie.");

        console.log("Session actuelle :", data.session);

    } catch (error) {

        console.error("Erreur :", error);

        status.textContent = "Erreur de connexion à Supabase.";

    }

}

testSupabaseConnection();
