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

// Vérification de la connexion

async function testSupabaseConnection() {

    const status = document.getElementById("connection-status");

    try {

        const { error } = await supabaseClient

            .from("profiles")

            .select("id")

            .limit(1);

        if (error) {

            console.error("Erreur Supabase :", error);

            status.textContent = "Supabase connecté, mais vérification de la base à contrôler.";

            return;

        }

        status.textContent = "Market Bouaké est connecté à Supabase.";

        console.log("Connexion Supabase réussie.");

    } catch (error) {

        console.error("Erreur de connexion :", error);

        status.textContent = "Erreur de connexion à Supabase.";

    }

}

testSupabaseConnection();
