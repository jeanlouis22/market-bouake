/* ============================================================

   MARKET BOUAKÉ

   PUBLICITÉS + PRODUITS MIS EN AVANT — ACCUEIL

   ============================================================ */

let publicites = [];

let produitsMisEnAvant = [];

let publiciteIndex = 0;

let publiciteTimer = null;

/* ============================================================

   CHARGER LES PUBLICITÉS ACTIVES

   ============================================================ */

async function chargerPublicites() {

    const container =

        document.getElementById("advertisements-container");

    if (!container) return;

    const maintenant =

        new Date().toISOString();

    try {

        const { data, error } = await supabase

            .from("advertisements")

            .select("*")

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

                "Erreur chargement publicités :",

                error

            );

            container.innerHTML = "";

            return;

        }

        publicites = data || [];

        publiciteIndex = 0;

        /*

         * On charge également les produits mis en avant.

         * Ils restent totalement séparés des publicités.

         */

        await chargerProduitsMisEnAvant();

        if (publicites.length === 0) {

            afficherEtatPubliciteVide();

            return;

        }

        afficherPublicite();

        demarrerDefilementPublicites();

    } catch (error) {

        console.error(

            "Erreur inattendue chargement publicités :",

            error

        );

        container.innerHTML = "";

    }

}

/* ============================================================

   CHARGER LES PRODUITS MIS EN AVANT

   ============================================================ */

async function chargerProduitsMisEnAvant() {

    try {

        const maintenant =

            new Date().toISOString();

        const { data, error } = await supabase

            .from("featured_products")

            .select(`

                *,

                products:product_id (

                    id,

                    name,

                    title,

                    price,

                    stock,

                    is_active

                )

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

            produitsMisEnAvant = [];

            return;

        }

        produitsMisEnAvant =

            (data || []).filter(item => {

                if (!item.product_id) {

                    return false;

                }

                if (!item.products) {

                    return false;

                }

                if (item.products.is_active === false) {

                    return false;

                }

                return true;

            });

    } catch (error) {

        console.error(

            "Erreur produits mis en avant :",

            error

        );

        produitsMisEnAvant = [];

    }

}

/* ============================================================

   AFFICHER UNE PUBLICITÉ

   ============================================================ */

function afficherPublicite() {

    const container =

        document.getElementById(

            "advertisements-container"

        );

    if (

        !container ||

        publicites.length === 0

    ) {

        return;

    }

    const publicite =

        publicites[publiciteIndex];

    if (!publicite) return;

    const image =

        publicite.image_url ||

        "https://placehold.co/1200x600/png?text=Market+Bouake";

    container.innerHTML = `

        <div

            class="advertisement-slide"

            data-advertisement-id="${escapeHtmlPublicite(

                publicite.id

            )}"

        >

            <img

                src="${escapeHtmlPublicite(image)}"

                alt="${escapeHtmlPublicite(

                    publicite.title ||

                    "Publicité Market Bouaké"

                )}"

                class="advertisement-image"

                loading="lazy"

            >

            <div class="advertisement-overlay">

                <div class="advertisement-content">

                    <h2>

                        ${escapeHtmlPublicite(

                            publicite.title || ""

                        )}

                    </h2>

                    ${

                        publicite.description

                            ? `

                                <p>

                                    ${escapeHtmlPublicite(

                                        publicite.description

                                    )}

                                </p>

                            `

                            : ""

                    }

                    ${

                        publicite.event_date

                            ? `

                                <div

                                    class="advertisement-event-info"

                                >

                                    📅

                                    ${formaterDatePublicite(

                                        publicite.event_date

                                    )}

                                    ${

                                        publicite.event_time

                                            ? `

                                                · ⏰

                                                ${escapeHtmlPublicite(

                                                    formaterHeurePublicite(

                                                        publicite.event_time

                                                    )

                                                )}

                                            `

                                            : ""

                                    }

                                    ${

                                        publicite.location

                                            ? `

                                                · 📍

                                                ${escapeHtmlPublicite(

                                                    publicite.location

                                                )}

                                            `

                                            : ""

                                    }

                                </div>

                            `

                            : ""

                    }

                    <button

                        type="button"

                        class="advertisement-button"

                        onclick="ouvrirPublicite('${escapeHtmlPublicite(

                            publicite.id

                        )}')"

                    >

                        ${escapeHtmlPublicite(

                            publicite.button_label ||

                            "En savoir plus"

                        )}

                    </button>

                </div>

            </div>

        </div>

        ${

            publicites.length > 1

                ? `

                    <div class="advertisement-controls">

                        <button

                            type="button"

                            onclick="publicitePrecedente()"

                            aria-label="Publicité précédente"

                        >

                            ❮

                        </button>

                        <div

                            class="advertisement-indicators"

                        >

                            ${publicites

                                .map(

                                    (_, index) => `

                                        <span

                                            class="advertisement-dot ${

                                                index ===

                                                publiciteIndex

                                                    ? "active"

                                                    : ""

                                            }"

                                            onclick="allerPublicite(${index})"

                                            role="button"

                                            tabindex="0"

                                        ></span>

                                    `

                                )

                                .join("")}

                        </div>

                        <button

                            type="button"

                            onclick="publiciteSuivante()"

                            aria-label="Publicité suivante"

                        >

                            ❯

                        </button>

                    </div>

                `

                : ""

        }

    `;

    enregistrerVuePublicite(

        publicite.id

    );

}

/* ============================================================

   AFFICHAGE VIDE

   ============================================================ */

function afficherEtatPubliciteVide() {

    const container =

        document.getElementById(

            "advertisements-container"

        );

    if (!container) return;

    container.innerHTML = `

        <div class="advertisement-empty">

            <p>

                Aucune publicité pour le moment.

            </p>

        </div>

    `;

}

/* ============================================================

   PUBLICITÉ SUIVANTE

   ============================================================ */

function publiciteSuivante() {

    if (publicites.length <= 1) {

        return;

    }

    publiciteIndex =

        (publiciteIndex + 1) %

        publicites.length;

    afficherPublicite();

}

/* ============================================================

   PUBLICITÉ PRÉCÉDENTE

   ============================================================ */

function publicitePrecedente() {

    if (publicites.length <= 1) {

        return;

    }

    publiciteIndex =

        (

            publiciteIndex -

            1 +

            publicites.length

        ) %

        publicites.length;

    afficherPublicite();

}

/* ============================================================

   ALLER À UNE PUBLICITÉ

   ============================================================ */

function allerPublicite(index) {

    if (

        index < 0 ||

        index >= publicites.length

    ) {

        return;

    }

    publiciteIndex = index;

    afficherPublicite();

    redemarrerDefilementPublicites();

}

/* ============================================================

   DÉFILEMENT AUTOMATIQUE

   ============================================================ */

function demarrerDefilementPublicites() {

    arreterDefilementPublicites();

    if (publicites.length <= 1) {

        return;

    }

    publiciteTimer =

        setInterval(

            () => {

                publiciteIndex =

                    (

                        publiciteIndex +

                        1

                    ) %

                    publicites.length;

                afficherPublicite();

            },

            4500

        );

}

function arreterDefilementPublicites() {

    if (publiciteTimer) {

        clearInterval(

            publiciteTimer

        );

        publiciteTimer = null;

    }

}

function redemarrerDefilementPublicites() {

    demarrerDefilementPublicites();

}

/* ============================================================

   OUVRIR UNE PUBLICITÉ

   ============================================================ */

async function ouvrirPublicite(

    publiciteId

) {

    if (!publiciteId) {

        return;

    }

    await enregistrerClicPublicite(

        publiciteId

    );

    window.location.href =

        `publicite.html?id=${encodeURIComponent(

            publiciteId

        )}`;

}

/* ============================================================

   OUVRIR UN PRODUIT MIS EN AVANT

   ============================================================ */

async function ouvrirProduitMisEnAvant(

    featuredId,

    productId

) {

    if (!productId) {

        return;

    }

    await enregistrerClicProduitMisEnAvant(

        featuredId

    );

    window.location.href =

        `produit.html?id=${encodeURIComponent(

            productId

        )}`;

}

/* ============================================================

   STATISTIQUE — VUE PUBLICITÉ

   ============================================================ */

async function enregistrerVuePublicite(

    publiciteId

) {

    if (!publiciteId) {

        return;

    }

    try {

        const publicite =

            publicites.find(

                item =>

                    item.id ===

                    publiciteId

            );

        if (!publicite) {

            return;

        }

        const nouveauNombre =

            Number(

                publicite.views_count || 0

            ) + 1;

        publicite.views_count =

            nouveauNombre;

        const { error } =

            await supabase

                .from("advertisements")

                .update({

                    views_count:

                        nouveauNombre

                })

                .eq(

                    "id",

                    publiciteId

                );

        if (error) {

            console.warn(

                "Vue publicité non enregistrée :",

                error.message

            );

        }

    } catch (error) {

        console.error(

            "Erreur statistique vue publicité :",

            error

        );

    }

}

/* ============================================================

   STATISTIQUE — CLIC PUBLICITÉ

   ============================================================ */

async function enregistrerClicPublicite(

    publiciteId

) {

    if (!publiciteId) {

        return;

    }

    try {

        const publicite =

            publicites.find(

                item =>

                    item.id ===

                    publiciteId

            );

        if (!publicite) {

            return;

        }

        const nouveauNombre =

            Number(

                publicite.clicks_count || 0

            ) + 1;

        publicite.clicks_count =

            nouveauNombre;

        const { error } =

            await supabase

                .from("advertisements")

                .update({

                    clicks_count:

                        nouveauNombre

                })

                .eq(

                    "id",

                    publiciteId

                );

        if (error) {

            console.warn(

                "Clic publicité non enregistré :",

                error.message

            );

        }

    } catch (error) {

        console.error(

            "Erreur statistique clic publicité :",

            error

        );

    }

}

/* ============================================================

   STATISTIQUE — VUE PRODUIT MIS EN AVANT

   ============================================================ */

async function enregistrerVueProduitMisEnAvant(

    featuredId

) {

    if (!featuredId) {

        return;

    }

    try {

        const produit =

            produitsMisEnAvant.find(

                item =>

                    item.id ===

                    featuredId

            );

        if (!produit) {

            return;

        }

        const nouveauNombre =

            Number(

                produit.views_count || 0

            ) + 1;

        produit.views_count =

            nouveauNombre;

        const { error } =

            await supabase

                .from("featured_products")

                .update({

                    views_count:

                        nouveauNombre

                })

                .eq(

                    "id",

                    featuredId

                );

        if (error) {

            console.warn(

                "Vue produit mis en avant non enregistrée :",

                error.message

            );

        }

    } catch (error) {

        console.error(

            "Erreur statistique produit mis en avant :",

            error

        );

    }

}

/* ============================================================

   STATISTIQUE — CLIC PRODUIT MIS EN AVANT

   ============================================================ */

async function enregistrerClicProduitMisEnAvant(

    featuredId

) {

    if (!featuredId) {

        return;

    }

    try {

        const produit =

            produitsMisEnAvant.find(

                item =>

                    item.id ===

                    featuredId

            );

        if (!produit) {

            return;

        }

        const nouveauNombre =

            Number(

                produit.clicks_count || 0

            ) + 1;

        produit.clicks_count =

            nouveauNombre;

        const { error } =

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

        if (error) {

            console.warn(

                "Clic produit mis en avant non enregistré :",

                error.message

            );

        }

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

    featuredId

) {

    if (!featuredId) {

        return;

    }

    try {

        const produit =

            produitsMisEnAvant.find(

                item =>

                    item.id ===

                    featuredId

            );

        if (!produit) {

            return;

        }

        const nouveauNombre =

            Number(

                produit.cart_additions_count ||

                0

            ) + 1;

        produit.cart_additions_count =

            nouveauNombre;

        const { error } =

            await supabase

                .from("featured_products")

                .update({

                    cart_additions_count:

                        nouveauNombre

                })

                .eq(

                    "id",

                    featuredId

                );

        if (error) {

            console.warn(

                "Ajout panier non enregistré :",

                error.message

            );

        }

    } catch (error) {

        console.error(

            "Erreur statistique ajout panier :",

            error

        );

    }

}

/* ============================================================

   STATISTIQUE — COMMANDE PRODUIT MIS EN AVANT

   ============================================================ */

async function enregistrerCommandeProduitMisEnAvant(

    featuredId

) {

    if (!featuredId) {

        return;

    }

    try {

        const produit =

            produitsMisEnAvant.find(

                item =>

                    item.id ===

                    featuredId

            );

        if (!produit) {

            return;

        }

        const nouveauNombre =

            Number(

                produit.orders_count ||

                0

            ) + 1;

        produit.orders_count =

            nouveauNombre;

        const { error } =

            await supabase

                .from("featured_products")

                .update({

                    orders_count:

                        nouveauNombre

                })

                .eq(

                    "id",

                    featuredId

                );

        if (error) {

            console.warn(

                "Commande produit mis en avant non enregistrée :",

                error.message

            );

        }

    } catch (error) {

        console.error(

            "Erreur statistique commande produit :",

            error

        );

    }

}

/* ============================================================

   FORMATAGE DATE

   ============================================================ */

function formaterDatePublicite(

    date

) {

    if (!date) {

        return "";

    }

    try {

        return new Date(

            date

        ).toLocaleDateString(

            "fr-FR",

            {

                day: "2-digit",

                month: "2-digit",

                year: "numeric"

            }

        );

    } catch {

        return date;

    }

}

/* ============================================================

   FORMATAGE HEURE

   ============================================================ */

function formaterHeurePublicite(

    heure

) {

    if (!heure) {

        return "";

    }

    const valeur =

        String(heure);

    const parties =

        valeur.split(":");

    if (parties.length < 2) {

        return valeur;

    }

    return (

        parties[0] +

        ":" +

        parties[1]

    );

}

/* ============================================================

   PROTECTION HTML

   ============================================================ */

function escapeHtmlPublicite(

    value

) {

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

   PAUSE AU SURVOL

   ============================================================ */

document.addEventListener(

    "mouseenter",

    function (event) {

        if (

            event.target.closest &&

            event.target.closest(

                "#advertisements-container"

            )

        ) {

            arreterDefilementPublicites();

        }

    },

    true

);

/* ============================================================

   REPRISE APRÈS SURVOL

   ============================================================ */

document.addEventListener(

    "mouseleave",

    function (event) {

        if (

            event.target.closest &&

            event.target.closest(

                "#advertisements-container"

            )

        ) {

            demarrerDefilementPublicites();

        }

    },

    true

);

/* ============================================================

   INITIALISATION

   ============================================================ */

document.addEventListener(

    "DOMContentLoaded",

    function () {

        chargerPublicites();

    }

);
