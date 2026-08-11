/* ============================================================

   MARKET BOUAKÉ

   PRODUITS — LOGIQUE PRODUITS / IMMOBILIER

   ============================================================ */

async function chargerProduitsAccueil() {

    const container = document.getElementById("products-container");

    if (!container) return;

    const { data: produits, error } = await supabase

        .from("products")

        .select(`

            *,

            categories (

                id,

                name,

                parent_id

            )

        `)

        .eq("is_active", true)

        .order("created_at", { ascending: false });

    if (error) {

        console.error("Erreur chargement produits :", error);

        return;

    }

    container.innerHTML = "";

    if (!produits || produits.length === 0) {

        container.innerHTML = `

            <p class="empty-products">

                Aucun produit disponible pour le moment.

            </p>

        `;

        return;

    }

    produits.forEach(produit => {

        container.appendChild(creerCarteProduit(produit));

    });

}

/* ============================================================

   DÉTERMINER SI LE PRODUIT EST IMMOBILIER

   ============================================================ */

function estImmobilier(produit) {

    const categorie = produit.categories;

    if (!categorie) return false;

    const nomCategorie = (

        categorie.name || ""

    ).toLowerCase();

    return (

        nomCategorie.includes("immobilier") ||

        nomCategorie.includes("résidence") ||

        nomCategorie.includes("residence") ||

        nomCategorie.includes("maison") ||

        nomCategorie.includes("appartement") ||

        nomCategorie.includes("studio")

    );

}

/* ============================================================

   CRÉER UNE CARTE PRODUIT

   ============================================================ */

function creerCarteProduit(produit) {

    const carte = document.createElement("article");

    carte.className = "product-card";

    const immobilier = estImmobilier(produit);

    const image =

        produit.image_url ||

        produit.main_image_url ||

        "https://placehold.co/600x600/png?text=Market+Bouake";

    const prix = produit.price

        ? `${Number(produit.price).toLocaleString("fr-FR")} FCFA`

        : "Prix sur demande";

    carte.innerHTML = `

        <div class="product-image-wrapper">

            <img

                src="${image}"

                alt="${escapeHtml(produit.name || "Produit")}"

                class="product-image"

                loading="lazy"

            >

        </div>

        <div class="product-card-content">

            <h3>

                ${escapeHtml(produit.name || "Produit")}

            </h3>

            ${

                immobilier

                    ? `

                        <div class="product-location">

                            🏠 Immobilier / Résidence

                        </div>

                    `

                    : `

                        <div class="product-price">

                            ${prix}

                        </div>

                    `

            }

            <button

                type="button"

                class="product-view-button"

                onclick="ouvrirProduit('${produit.id}')"

            >

                ${immobilier ? "Voir les détails" : "Voir le produit"}

            </button>

        </div>

    `;

    return carte;

}

/* ============================================================

   OUVRIR LE BON TYPE DE PRODUIT

   ============================================================ */

function ouvrirProduit(productId) {

    if (!productId) return;

    window.location.href =

        `produit.html?id=${encodeURIComponent(productId)}`;

}

/* ============================================================

   ÉCHAPPEMENT HTML

   ============================================================ */

function escapeHtml(value) {

    if (value === null || value === undefined) {

        return "";

    }

    return String(value)

        .replace(/&/g, "&amp;")

        .replace(/</g, "&lt;")

        .replace(/>/g, "&gt;")

        .replace(/"/g, "&quot;")

        .replace(/'/g, "&#039;");

}

/* ============================================================

   INITIALISATION

   ============================================================ */

document.addEventListener("DOMContentLoaded", () => {

    if (

        document.getElementById("products-container")

    ) {

        chargerProduitsAccueil();

    }

});
