// ============================================

// MARKET BOUAKÉ

// APP.JS — ACCUEIL

// ============================================

const SUPABASE_URL =

    "https://qgdxxrnsiyzbacxxfdrg.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =

    "sb_publishable_QE2in_ocTQQDEt0HW9wSCg_PKSzqo7N";

const supabaseClient =

    window.supabase.createClient(

        SUPABASE_URL,

        SUPABASE_PUBLISHABLE_KEY

    );

// ============================================

// GESTION DU COMPTE

// ============================================

async function updateAccountInterface() {

    const accountButton =

        document.querySelector(".account-button");

    if (!accountButton) {

        return;

    }

    try {

        const {

            data: {

                session

            }

        } = await supabaseClient.auth.getSession();

        // UTILISATEUR NON CONNECTÉ

        if (!session) {

            accountButton.textContent =

                "Se connecter";

            accountButton.href =

                "connexion.html";

            return;

        }

        // UTILISATEUR CONNECTÉ

        accountButton.textContent =

            "👤 Mon compte";

        accountButton.href =

            "compte.html";

    } catch (error) {

        console.error(

            "Erreur récupération session :",

            error

        );

        accountButton.textContent =

            "Se connecter";

        accountButton.href =

            "connexion.html";

    }

}

// ============================================

// CHARGEMENT DES CATÉGORIES

// ============================================

async function loadCategories() {

    const container =

        document.querySelector(".categories");

    if (!container) {

        return;

    }

    try {

        const {

            data,

            error

        } = await supabaseClient

            .from("categories")

            .select(

                "id, name, is_active"

            )

            .eq(

                "is_active",

                true

            )

            .order(

                "name",

                {

                    ascending: true

                }

            );

        if (error) {

            console.error(

                "Erreur chargement catégories :",

                error

            );

            container.innerHTML =

                "<p>Impossible de charger les catégories.</p>";

            return;

        }

        if (!data || data.length === 0) {

            container.innerHTML =

                "<p>Aucune catégorie disponible.</p>";

            return;

        }

        container.innerHTML = "";

        data.forEach(

            function(category) {

                const element =

                    document.createElement("a");

                element.className =

                    "category";

                element.href =

                    "produits.html?category=" +

                    encodeURIComponent(

                        category.id

                    );

                element.innerHTML = `

                    <div class="category-icon">

                        ${getCategoryIcon(category.name)}

                    </div>

                    <div>

                        ${escapeHtml(category.name)}

                    </div>

                `;

                container.appendChild(

                    element

                );

            }

        );

    } catch (error) {

        console.error(

            "Erreur catégories :",

            error

        );

        container.innerHTML =

            "<p>Impossible de charger les catégories.</p>";

    }

}

// ============================================

// ICÔNES DES CATÉGORIES

// ============================================

function getCategoryIcon(name) {

    const icons = {

        "Mode": "👕",

        "Téléphones": "📱",

        "Électronique": "💻",

        "Électroménager": "🏠",

        "Maison": "🏠",

        "Beauté": "💄",

        "Chaussures": "👟",

        "Alimentation": "🍎",

        "Enfants": "🧸",

        "Sports": "⚽",

        "Services": "🔧",

        "Autres": "📦"

    };

    return icons[name] || "🛍️";

}

// ============================================

// PROTECTION CONTRE L'INJECTION HTML

// ============================================

function escapeHtml(value) {

    if (

        value === null ||

        value === undefined

    ) {

        return "";

    }

    return String(value)

        .replace(

            /&/g,

            "&amp;"

        )

        .replace(

            /</g,

            "&lt;"

        )

        .replace(

            />/g,

            "&gt;"

        )

        .replace(

            /"/g,

            "&quot;"

        )

        .replace(

            /'/g,

            "&#039;"

        );

}

// ============================================

// CHANGEMENT DE SESSION

// ============================================

supabaseClient.auth.onAuthStateChange(

    function() {

        updateAccountInterface();

    }

);

// ============================================

// INITIALISATION

// ============================================

async function initializeHomePage() {

    await updateAccountInterface();

    await loadCategories();

}

initializeHomePage();

// ============================================

// DISPONIBLE POUR LES AUTRES SCRIPTS

// ============================================

window.supabaseClient =

    supabaseClient;
