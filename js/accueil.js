/* ============================================================

   MARKET BOUAKÉ

   ACCUEIL — PRODUITS / NOUVEAUTÉS / POPULAIRES / MIS EN AVANT

   ============================================================ */

let produitsAccueil = [];

let produitsMisEnAvant = [];

/* ============================================================

   UTILITAIRES

   ============================================================ */

function escapeHtmlAccueil(value) {

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

function formatPrixAccueil(prix) {

    const nombre = Number(prix);

    if (Number.isNaN(nombre)) {

        return "";

    }

    return nombre.toLocaleString("fr-FR") + " FCFA";

}

function estImmobilierAccueil(produit) {

    if (!produit) {

        return false;

    }

    const valeurs = [

        produit.categorie_principale,

        produit.category_name,

        produit.category,

        produit.type,

        produit.product_type,

        produit.categorie,

        produit.category_type

    ];

    return valeurs.some(value =>

        String(value || "")

            .toLowerCase()

            .includes("immobilier")

    );

}

function obtenirIdProduit(produit) {

    return produit?.id || "";

}

function obtenirNomProduit(produit) {

    return (

        produit?.name ||

        produit?.product_name ||

        produit?.title ||

        "Produit"

    );

}

function obtenirImageProduit(produit) {

    return (

        produit?.image_url ||

        produit?.main_image_url ||

        produit?.photo_url ||

        produit?.image ||

        "https://placehold.co/600x600/png?text=Market+Bouake"

    );

}

/* ============================================================

   OUVRIR UN PRODUIT

   ============================================================ */

function ouvrirProduitAccueil(productId) {

    if (!productId) {

        return;

    }

    window.location.href =

        "produit.html?id=" +

        encodeURIComponent(productId);

}

/* ============================================================

   OUVRIR UN BIEN IMMOBILIER

   ============================================================ */

function ouvrirImmobilierAccueil(productId) {

    if (!productId) {

        return;

    }

    window.location.href =

        "residence.html?id=" +

        encodeURIComponent(productId);

}

/* ============================================================

   AFFICHER UN PRODUIT

   ============================================================ */

function creerCarteProduitAccueil(produit) {

    const id = obtenirIdProduit(produit);

    if (!id) {

        return "";

    }

    const nom = obtenirNomProduit(produit);

    const image = obtenirImageProduit(produit);

    const immobilier = estImmobilierAccueil(produit);

    const prix = produit?.price !== undefined

        ? formatPrixAccueil(produit.price)

        : "";

    const stock = Number(produit?.stock);

    let stockHtml = "";

    if (!immobilier && !Number.isNaN(stock)) {

        if (stock <= 0) {

            stockHtml = `

                <span class="product-stock out">

                    Rupture de stock

                </span>

            `;

        } else {

            stockHtml = `

                <span class="product-stock">

                    ${stock} disponible(s)

                </span>

            `;

        }

    }

    const bouton = immobilier

        ? `

            <button

                type="button"

                class="product-button"

                onclick="ouvrirImmobilierAccueil('${escapeHtmlAccueil(id)}')"

            >

                Voir le bien

            </button>

        `

        : `

            <button

                type="button"

                class="product-button"

                onclick="ouvrirProduitAccueil('${escapeHtmlAccueil(id)}')"

            >

                Voir le produit

            </button>

        `;

    return `

        <article

            class="product-card"

            data-product-id="${escapeHtmlAccueil(id)}"

        >

            <button

                type="button"

                class="product-card-image-button"

                onclick="${

                    immobilier

                        ? `ouvrirImmobilierAccueil('${escapeHtmlAccueil(id)}')`

                        : `ouvrirProduitAccueil('${escapeHtmlAccueil(id)}')`

                }"

                aria-label="${escapeHtmlAccueil(nom)}"

            >

                <img

                    src="${escapeHtmlAccueil(image)}"

                    alt="${escapeHtmlAccueil(nom)}"

                    class="product-card-image"

                    loading="lazy"

                    onerror="this.src='https://placehold.co/600x600/png?text=Market+Bouake'"

                >

            </button>

            <div class="product-card-content">

                <h3 class="product-card-title">

                    ${escapeHtmlAccueil(nom)}

                </h3>

                ${

                    prix

                        ? `

                            <div class="product-card-price">

                                ${escapeHtmlAccueil(prix)}

                                ${

                                    immobilier

                                        ? `<small>/ mois</small>`

                                        : ""

                                }

                            </div>

                        `

                        : ""

                }

                ${stockHtml}

                ${bouton}

            </div>

        </article>

    `;

}

/* ============================================================

   AFFICHER UNE LISTE DE PRODUITS

   ============================================================ */

function afficherProduitsAccueil(

    containerId,

    produits

) {

    const container =

        document.getElementById(containerId);

    if (!container) {

        return;

    }

    if (!produits || produits.length === 0) {

        container.innerHTML = `

            <div class="products-empty">

                Aucun produit disponible pour le moment.

            </div>

        `;

        return;

    }

    container.innerHTML =

        produits

            .map(creerCarteProduitAccueil)

            .join("");

}

/* ============================================================

   CHARGER LES NOUVEAUTÉS

   ============================================================ */

async function chargerNouveautesAccueil() {

    const container =

        document.getElementById(

            "new-products-container"

        );

    if (!container) {

        return;

    }

    try {

        const { data, error } =

            await supabase

                .from("products")

                .select("*")

                .eq("is_active", true)

                .order("created_at", {

                    ascending: false

                })

                .limit(12);

        if (error) {

            console.error(

                "Erreur chargement nouveautés :",

                error

            );

            container.innerHTML = `

                <div class="products-empty">

                    Impossible de charger les nouveautés.

                </div>

            `;

            return;

        }

        const produits =

            (data || []).filter(

                produit =>

                    !estImmobilierAccueil(produit)

            );

        produitsAccueil = produits;

        afficherProduitsAccueil(

            "new-products-container",

            produits

        );

    } catch (error) {

        console.error(

            "Erreur nouveautés :",

            error

        );

    }

}

/* ============================================================

   CHARGER LES PRODUITS POPULAIRES

   ============================================================ */

async function chargerProduitsPopulairesAccueil() {

    const container =

        document.getElementById(

            "popular-products-container"

        );

    if (!container) {

        return;

    }

    try {

        const { data, error } =

            await supabase

                .from("products")

                .select("*")

                .eq("is_active", true)

                .order("views_count", {

                    ascending: false

                })

                .limit(12);

        if (error) {

            console.error(

                "Erreur chargement produits populaires :",

                error

            );

            container.innerHTML = `

                <div class="products-empty">

                    Impossible de charger les produits populaires.

                </div>

            `;

            return;

        }

        const produits =

            (data || []).filter(

                produit =>

                    !estImmobilierAccueil(produit)

            );

        afficherProduitsAccueil(

            "popular-products-container",

            produits

        );

    } catch (error) {

        console.error(

            "Erreur produits populaires :",

            error

        );

    }

}

/* ============================================================

   CHARGER LES PRODUITS MIS EN AVANT

   ============================================================ */

async function chargerProduitsMisEnAvantAccueil() {

    const container =

        document.getElementById(

            "featured-products-container"

        );

    if (!container) {

        return;

    }

    const maintenant =

        new Date().toISOString();

    try {

        const { data, error } =

            await supabase

                .from("featured_products")

                .select(`

                    *,

                    products (*)

                `)

                .eq("is_active", true)

                .eq("show_on_home", true)

                .or(

                    `start_at.is.null,start_at.lte.${maintenant}`

                )

                .or(

                    `end_at.is.null,end_at.gte.${maintenant}`

                )

                .order("created_at", {

                    ascending: false

                });

        if (error) {

            console.error(

                "Erreur chargement produits mis en avant :",

                error

            );

            container.innerHTML = `

                <div class="products-empty">

                    Impossible de charger les produits mis en avant.

                </div>

            `;

            return;

        }

        produitsMisEnAvant =

            (data || [])

                .map(item => {

                    const produit =

                        item.products;

                    if (!produit) {

                        return null;

                    }

                    if (

                        produit.is_active === false

                    ) {

                        return null;

                    }

                    if (

                        estImmobilierAccueil(produit)

                    ) {

                        return null;

                    }

                    return {

                        ...produit,

                        featured_id: item.id,

                        featured_image_url:

                            item.image_url

                    };

                })

                .filter(Boolean);

        afficherProduitsMisEnAvant();

    } catch (error) {

        console.error(

            "Erreur produits mis en avant :",

            error

        );

    }

}

/* ============================================================

   AFFICHER LES PRODUITS MIS EN AVANT

   ============================================================ */

function afficherProduitsMisEnAvant() {

    const container =

        document.getElementById(

            "featured-products-container"

        );

    if (!container) {

        return;

    }

    if (

        produitsMisEnAvant.length === 0

    ) {

        container.innerHTML = `

            <div class="products-empty">

                Aucun produit mis en avant pour le moment.

            </div>

        `;

        return;

    }

    container.innerHTML =

        produitsMisEnAvant

            .map(produit => {

                const image =

                    produit.featured_image_url ||

                    obtenirImageProduit(produit);

                const copie = {

                    ...produit,

                    image_url: image

                };

                return creerCarteProduitAccueil(

                    copie

                );

            })

            .join("");

}

/* ============================================================

   CHARGER LES BOUTIQUES

   ============================================================ */

async function chargerBoutiquesAccueil() {

    const container =

        document.getElementById(

            "shops-container"

        );

    if (!container) {

        return;

    }

    try {

        const { data, error } =

            await supabase

                .from("sellers")

                .select("*")

                .eq("status", "active")

                .order("created_at", {

                    ascending: false

                })

                .limit(8);

        if (error) {

            console.error(

                "Erreur chargement boutiques :",

                error

            );

            container.innerHTML = `

                <div class="products-empty">

                    Impossible de charger les boutiques.

                </div>

            `;

            return;

        }

        if (!data || data.length === 0) {

            container.innerHTML = `

                <div class="products-empty">

                    Aucune boutique disponible pour le moment.

                </div>

            `;

            return;

        }

        container.innerHTML =

            data.map(vendeur => {

                const nom =

                    vendeur.shop_name ||

                    "Boutique";

                const image =

                    vendeur.profile_photo_url ||

                    "https://placehold.co/300x300/png?text=Boutique";

                return `

                    <article class="shop-card">

                        <img

                            src="${escapeHtmlAccueil(image)}"

                            alt="${escapeHtmlAccueil(nom)}"

                            class="shop-card-image"

                            loading="lazy"

                            onerror="this.src='https://placehold.co/300x300/png?text=Boutique'"

                        >

                        <div class="shop-card-content">

                            <h3>

                                ${escapeHtmlAccueil(nom)}

                            </h3>

                            ${

                                vendeur.city

                                    ? `

                                        <p>

                                            📍 ${escapeHtmlAccueil(

                                                vendeur.city

                                            )}

                                        </p>

                                    `

                                    : ""

                            }

                            <button

                                type="button"

                                class="product-button"

                                onclick="ouvrirBoutiqueAccueil('${escapeHtmlAccueil(vendeur.id)}')"

                            >

                                Voir la boutique

                            </button>

                        </div>

                    </article>

                `;

            }).join("");

    } catch (error) {

        console.error(

            "Erreur boutiques :",

            error

        );

    }

}

/* ============================================================

   OUVRIR UNE BOUTIQUE

   ============================================================ */

function ouvrirBoutiqueAccueil(vendeurId) {

    if (!vendeurId) {

        return;

    }

    window.location.href =

        "boutique.html?id=" +

        encodeURIComponent(vendeurId);

}

/* ============================================================

   COMPTEUR — CLIC PRODUIT MIS EN AVANT

   ============================================================ */

async function enregistrerClicProduitMisEnAvant(

    featuredId

) {

    if (!featuredId) {

        return;

    }

    try {

        const element =

            produitsMisEnAvant.find(

                item =>

                    item.featured_id === featuredId

            );

        if (!element) {

            return;

        }

        const nouveauNombre =

            Number(

                element.clicks_count || 0

            ) + 1;

        await supabase

            .from("featured_products")

            .update({

                clicks_count:

                    nouveauNombre

            })

            .eq("id", featuredId);

    } catch (error) {

        console.warn(

            "Statistique clic produit mis en avant :",

            error

        );

    }

}

/* ============================================================

   COMPTEUR — VUE PRODUIT MIS EN AVANT

   ============================================================ */

async function enregistrerVueProduitMisEnAvant(

    featuredId

) {

    if (!featuredId) {

        return;

    }

    try {

        const element =

            produitsMisEnAvant.find(

                item =>

                    item.featured_id === featuredId

            );

        if (!element) {

            return;

        }

        const nouveauNombre =

            Number(

                element.views_count || 0

            ) + 1;

        await supabase

            .from("featured_products")

            .update({

                views_count:

                    nouveauNombre

            })

            .eq("id", featuredId);

    } catch (error) {

        console.warn(

            "Statistique vue produit mis en avant :",

            error

        );

    }

}

/* ============================================================

   INITIALISATION DE L'ACCUEIL

   ============================================================ */

async function initialiserAccueil() {

    if (

        typeof supabase ===

        "undefined"

    ) {

        console.error(

            "Supabase n'est pas disponible."

        );

        return;

    }

    await Promise.allSettled([

        chargerNouveautesAccueil(),

        chargerProduitsPopulairesAccueil(),

        chargerProduitsMisEnAvantAccueil(),

        chargerBoutiquesAccueil()

    ]);

}

/* ============================================================

   DOM READY

   ============================================================ */

document.addEventListener(

    "DOMContentLoaded",

    function () {

        initialiserAccueil();

    }

);
