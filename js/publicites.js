/* ============================================================

   MARKET BOUAKÉ

   PUBLICITÉS — ACCUEIL

   ============================================================ */

let publicites = [];

let publiciteIndex = 0;

let publiciteTimer = null;

/* ============================================================

   CHARGER LES PUBLICITÉS ACTIVES

   ============================================================ */

async function chargerPublicites() {

    const container = document.getElementById("advertisements-container");

    if (!container) return;

    const maintenant = new Date().toISOString();

    const { data, error } = await supabase

        .from("advertisements")

        .select("*")

        .eq("is_active", true)

        .eq("show_on_home", true)

        .or(`start_at.is.null,start_at.lte.${maintenant}`)

        .or(`end_at.is.null,end_at.gte.${maintenant}`)

        .order("created_at", { ascending: false });

    if (error) {

        console.error(

            "Erreur chargement publicités :",

            error

        );

        container.innerHTML = "";

        return;

    }

    publicites = data || [];

    if (publicites.length === 0) {

        container.innerHTML = `

            <div class="advertisement-empty">

                <p>Aucune publicité pour le moment.</p>

            </div>

        `;

        return;

    }

    publiciteIndex = 0;

    afficherPublicite();

    demarrerDefilementPublicites();

}

/* ============================================================

   AFFICHER UNE PUBLICITÉ

   ============================================================ */

function afficherPublicite() {

    const container =

        document.getElementById("advertisements-container");

    if (!container || publicites.length === 0) {

        return;

    }

    const publicite = publicites[publiciteIndex];

    if (!publicite) return;

    const image =

        publicite.image_url ||

        "https://placehold.co/1200x600/png?text=Market+Bouake";

    container.innerHTML = `

        <div

            class="advertisement-slide"

            data-advertisement-id="${publicite.id}"

        >

            <img

                src="${escapeHtmlPublicite(image)}"

                alt="${escapeHtmlPublicite(

                    publicite.title || "Publicité Market Bouaké"

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

                                <div class="advertisement-event-info">

                                    📅 ${formaterDatePublicite(

                                        publicite.event_date

                                    )}

                                    ${

                                        publicite.event_time

                                            ? `

                                                · ⏰ ${escapeHtmlPublicite(

                                                    publicite.event_time

                                                )}

                                            `

                                            : ""

                                    }

                                    ${

                                        publicite.location

                                            ? `

                                                · 📍 ${escapeHtmlPublicite(

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

                        onclick="ouvrirPublicite('${publicite.id}')"

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

                        <div class="advertisement-indicators">

                            ${publicites

                                .map(

                                    (_, index) => `

                                        <span

                                            class="advertisement-dot ${

                                                index === publiciteIndex

                                                    ? "active"

                                                    : ""

                                            }"

                                            onclick="allerPublicite(${index})"

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

    enregistrerVuePublicite(publicite.id);

}

/* ============================================================

   PUBLICITÉ SUIVANTE

   ============================================================ */

function publiciteSuivante() {

    if (publicites.length <= 1) return;

    publiciteIndex =

        (publiciteIndex + 1) % publicites.length;

    afficherPublicite();

}

/* ============================================================

   PUBLICITÉ PRÉCÉDENTE

   ============================================================ */

function publicitePrecedente() {

    if (publicites.length <= 1) return;

    publiciteIndex =

        (publiciteIndex - 1 + publicites.length) %

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

    publiciteTimer = setInterval(() => {

        publiciteIndex =

            (publiciteIndex + 1) %

            publicites.length;

        afficherPublicite();

    }, 4500);

}

function arreterDefilementPublicites() {

    if (publiciteTimer) {

        clearInterval(publiciteTimer);

        publiciteTimer = null;

    }

}

function redemarrerDefilementPublicites() {

    demarrerDefilementPublicites();

}

/* ============================================================

   OUVRIR UNE PUBLICITÉ

   ============================================================ */

async function ouvrirPublicite(publiciteId) {

    if (!publiciteId) return;

    await enregistrerClicPublicite(publiciteId);

    window.location.href =

        `publicite.html?id=${encodeURIComponent(publiciteId)}`;

}

/* ============================================================

   STATISTIQUE — VUE

   ============================================================ */

async function enregistrerVuePublicite(publiciteId) {

    if (!publiciteId) return;

    try {

        const publicite =

            publicites.find(

                item => item.id === publiciteId

            );

        if (!publicite) return;

        const nouveauNombre =

            Number(publicite.views_count || 0) + 1;

        publicite.views_count = nouveauNombre;

        await supabase

            .from("advertisements")

            .update({

                views_count: nouveauNombre

            })

            .eq("id", publiciteId);

    } catch (error) {

        console.error(

            "Erreur statistique vue publicité :",

            error

        );

    }

}

/* ============================================================

   STATISTIQUE — CLIC

   ============================================================ */

async function enregistrerClicPublicite(publiciteId) {

    if (!publiciteId) return;

    try {

        const publicite =

            publicites.find(

                item => item.id === publiciteId

            );

        if (!publicite) return;

        const nouveauNombre =

            Number(publicite.clicks_count || 0) + 1;

        publicite.clicks_count = nouveauNombre;

        await supabase

            .from("advertisements")

            .update({

                clicks_count: nouveauNombre

            })

            .eq("id", publiciteId);

    } catch (error) {

        console.error(

            "Erreur statistique clic publicité :",

            error

        );

    }

}

/* ============================================================

   FORMATAGE DATE

   ============================================================ */

function formaterDatePublicite(date) {

    if (!date) return "";

    try {

        return new Date(date).toLocaleDateString(

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

   PROTECTION HTML

   ============================================================ */

function escapeHtmlPublicite(value) {

    if (

        value === null ||

        value === undefined

    ) {

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

   PAUSE AU SURVOL / REPRISE

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
