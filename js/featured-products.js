/* ============================================================

   MARKET BOUAKÉ

   PRODUITS MIS EN AVANT — ACCUEIL

   ============================================================ */

let produitsMisEnAvant = [];

let produitMisEnAvantIndex = 0;

let produitMisEnAvantTimer = null;

/* ============================================================

   CHARGER LES PRODUITS MIS EN AVANT

   ============================================================ */

async function chargerProduitsMisEnAvant() {

    const container = document.getElementById(

        "featured-products-container"

    );

    if (!container) return;

    const maintenant = new Date().toISOString();

    const { data, error } = await supabase

        .from("featured_products")

        .select(`

            *,

            products (

                id,

                name,

                description,

                price,

                stock,

                image_url,

                main_image_url,

                is_active

            )

        `)

        .eq("is_active", true)

        .eq("show_on_home", true)

        .or(`start_at.is.null,start_at.lte.${maintenant}`)

        .or(`end_at.is.null,end_at.gte.${maintenant}`)

        .order("created_at", { ascending: false });

    if (error) {

        console.error(

            "Erreur chargement produits mis en avant :",

            error

        );

        container.innerHTML = "";

        return;

    }

    produitsMisEnAvant = (data || []).filter(

        item =>

            item.products &&

            item.products.is_active !== false

    );

    if (produitsMisEnAvant.length === 0) {

        container.innerHTML = "";

        return;

    }

    produitMisEnAvantIndex = 0;

    afficherProduitMisEnAvant();

    demarrerDefilementProduitsMisEnAvant();

}

/* ============================================================

   AFFICHER UN PRODUIT MIS EN AVANT

   ============================================================ */

function afficherProduitMisEnAvant() {

    const container = document.getElementById(

        "featured-products-container"

    );

    if (

        !container ||

        produitsMisEnAvant.length === 0

    ) {

        return;

    }

    const element =

        produitsMisEnAvant[

            produitMisEnAvantIndex

        ];

    if (!element || !element.products) return;

    const produit = element.products;

    const image =

        element.image_url ||

        produit.image_url ||

        produit.main_image_url ||

        "https://placehold.co/1200x600/png?text=Produit+Market+Bouake";

    const prix =

        produit.price !== null &&

        produit.price !== undefined

            ? `${Number(

                produit.price

            ).toLocaleString("fr-FR")} FCFA`

            : "Prix sur demande";

    container.innerHTML = `

        <div

            class="featured-product-slide"

            data-featured-id="${element.id}"

            data-product-id="${produit.id}"

        >

            <img

                src="${escapeHtmlFeatured(image)}"

                alt="${escapeHtmlFeatured(

                    produit.name || "Produit"

                )}"

                class="featured-product-image"

                loading="lazy"

            >

            <div class="featured-product-overlay">

                <div class="featured-product-content">

                    <span class="featured-product-label">

                        ⭐ PRODUIT À LA UNE

                    </span>

                    <h2>

                        ${escapeHtmlFeatured(

                            produit.name || "Produit"

                        )}

                    </h2>

                    <div class="featured-product-price">

                        ${prix}

                    </div>

                    <button

                        type="button"

                        class="featured-product-button"

                        onclick="ouvrirProduitMisEnAvant(

                            '${produit.id}',

                            '${element.id}'

                        )"

                    >

                        Voir le produit

                    </button>

                </div>

            </div>

        </div>

        ${

            produitsMisEnAvant.length > 1

                ? `

                    <div class="featured-product-controls">

                        <button

                            type="button"

                            onclick="produitMisEnAvantPrecedent()"

                            aria-label="Produit précédent"

                        >

                            ❮

                        </button>

                        <div class="featured-product-indicators">

                            ${produitsMisEnAvant

                                .map(

                                    (_, index) => `

                                        <span

                                            class="featured-product-dot ${

                                                index ===

                                                produitMisEnAvantIndex

                                                    ? "active"

                                                    : ""

                                            }"

                                            onclick="allerProduitMisEnAvant(

                                                ${index}

                                            )"

                                        ></span>

                                    `

                                )

                                .join("")}

                        </div>

                        <button

                            type="button"

                            onclick="produitMisEnAvantSuivant()"

                            aria-label="Produit suivant"

                        >

                            ❯

                        </button>

                    </div>

                `

                : ""

        }

    `;

    enregistrerVueProduitMisEnAvant(

        element.id

    );

}

/* ============================================================

   PRODUIT SUIVANT

   ============================================================ */

function produitMisEnAvantSuivant() {

    if (produitsMisEnAvant.length <= 1) {

        return;

    }

    produitMisEnAvantIndex =

        (

            produitMisEnAvantIndex + 1

        ) %

        produitsMisEnAvant.length;

    afficherProduitMisEnAvant();

}

/* ============================================================

   PRODUIT PRÉCÉDENT

   ============================================================ */

function produitMisEnAvantPrecedent() {

    if (produitsMisEnAvant.length <= 1) {

        return;

    }

    produitMisEnAvantIndex =

        (

            produitMisEnAvantIndex -

            1 +

            produitsMisEnAvant.length

        ) %

        produitsMisEnAvant.length;

    afficherProduitMisEnAvant();

}

/* ============================================================

   ALLER À UN PRODUIT

   ============================================================ */

function allerProduitMisEnAvant(index) {

    if (

        index < 0 ||

        index >= produitsMisEnAvant.length

    ) {

        return;

    }

    produitMisEnAvantIndex = index;

    afficherProduitMisEnAvant();

    redemarrerDefilementProduitsMisEnAvant();

}

/* ============================================================

   DÉFILEMENT AUTOMATIQUE

   ============================================================ */

function demarrerDefilementProduitsMisEnAvant() {

    arreterDefilementProduitsMisEnAvant();

    if (produitsMisEnAvant.length <= 1) {

        return;

    }

    produitMisEnAvantTimer =

        setInterval(() => {

            produitMisEnAvantIndex =

                (

                    produitMisEnAvantIndex + 1

                ) %

                produitsMisEnAvant.length;

            afficherProduitMisEnAvant();

        }, 4500);

}

function arreterDefilementProduitsMisEnAvant() {

    if (produitMisEnAvantTimer) {

        clearInterval(

            produitMisEnAvantTimer

        );

        produitMisEnAvantTimer = null;

    }

}

function redemarrerDefilementProduitsMisEnAvant() {

    demarrerDefilementProduitsMisEnAvant();

}

/* ============================================================

   OUVRIR LE PRODUIT

   ============================================================ */

async function ouvrirProduitMisEnAvant(

    productId,

    featuredId

) {

    if (!productId) return;

    if (featuredId) {

        await enregistrerClicProduitMisEnAvant(

            featuredId

        );

    }

    window.location.href =

        `produit.html?id=${encodeURIComponent(

            productId

        )}`;

}

/* ============================================================

   STATISTIQUE — VUE

   ============================================================ */

async function enregistrerVueProduitMisEnAvant(

    featuredId

) {

    if (!featuredId) return;

    try {

        const element =

            produitsMisEnAvant.find(

                item =>

                    item.id === featuredId

            );

        if (!element) return;

        const nouveauNombre =

            Number(

                element.views_count || 0

            ) + 1;

        element.views_count =

            nouveauNombre;

        await supabase

            .from("featured_products")

            .update({

                views_count: nouveauNombre

            })

            .eq(

                "id",

                featuredId

            );

    } catch (error) {

        console.error(

            "Erreur statistique vue produit :",

            error

        );

    }

}

/* ============================================================

   STATISTIQUE — CLIC

   ============================================================ */

async function enregistrerClicProduitMisEnAvant(

    featuredId

) {

    if (!featuredId) return;

    try {

        const element =

            produitsMisEnAvant.find(

                item =>

                    item.id === featuredId

            );

        if (!element) return;

        const nouveauNombre =

            Number(

                element.clicks_count || 0

            ) + 1;

        element.clicks_count =

            nouveauNombre;

        await supabase

            .from("featured_products")

            .update({

                clicks_count:

                    nouveauNombre

            })

            .eq(

                "id",

                featuredId

            );

    } catch (error) {

        console.error(

            "Erreur statistique clic produit :",

            error

        );

    }

}

/* ============================================================

   STATISTIQUE — AJOUT AU PANIER

   ============================================================ */

async function enregistrerAjoutPanierProduitMisEnAvant(

    productId

) {

    if (!productId) return;

    try {

        const element =

            produitsMisEnAvant.find(

                item =>

                    item.product_id ===

                    productId

            );

        if (!element) return;

        const nouveauNombre =

            Number(

                element.cart_additions_count ||

                0

            ) + 1;

        element.cart_additions_count =

            nouveauNombre;

        await supabase

            .from("featured_products")

            .update({

                cart_additions_count:

                    nouveauNombre

            })

            .eq(

                "id",

                element.id

            );

    } catch (error) {

        console.error(

            "Erreur statistique panier :",

            error

        );

    }

}

/* ============================================================

   STATISTIQUE — COMMANDE

   ============================================================ */

async function enregistrerCommandeProduitMisEnAvant(

    productId

) {

    if (!productId) return;

    try {

        const element =

            produitsMisEnAvant.find(

                item =>

                    item.product_id ===

                    productId

            );

        if (!element) return;

        const nouveauNombre =

            Number(

                element.orders_count || 0

            ) + 1;

        element.orders_count =

            nouveauNombre;

        await supabase

            .from("featured_products")

            .update({

                orders_count:

                    nouveauNombre

            })

            .eq(

                "id",

                element.id

            );

    } catch (error) {

        console.error(

            "Erreur statistique commande :",

            error

        );

    }

}

/* ============================================================

   PAUSE AU SURVOL

   ============================================================ */

document.addEventListener(

    "mouseenter",

    function (event) {

        if (

            event.target.closest &&

            event.target.closest(

                "#featured-products-container"

            )

        ) {

            arreterDefilementProduitsMisEnAvant();

        }

    },

    true

);

document.addEventListener(

    "mouseleave",

    function (event) {

        if (

            event.target.closest &&

            event.target.closest(

                "#featured-products-container"

            )

        ) {

            demarrerDefilementProduitsMisEnAvant();

        }

    },

    true

);

/* ============================================================

   PROTECTION HTML

   ============================================================ */

function escapeHtmlFeatured(value) {

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

/* ============================================================

   INITIALISATION

   ============================================================ */

document.addEventListener(

    "DOMContentLoaded",

    function () {

        chargerProduitsMisEnAvant();

    }

);
