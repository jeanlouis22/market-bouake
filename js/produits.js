/* ============================================================

   MARKET BOUAKÉ

   PRODUITS — LOGIQUE PRODUITS / IMMOBILIER + PANIER

   ============================================================ */

/* ============================================================

   CHARGER LES PRODUITS DE L'ACCUEIL

   ============================================================ */

async function chargerProduitsAccueil() {

    const container =

        document.getElementById("products-container");

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

        .order("created_at", {

            ascending: false

        });

    if (error) {

        console.error(

            "Erreur chargement produits :",

            error

        );

        container.innerHTML = `

            <p class="empty-products">

                Impossible de charger les produits.

            </p>

        `;

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

        container.appendChild(

            creerCarteProduit(produit)

        );

    });

}

/* ============================================================

   DÉTERMINER SI LE PRODUIT EST IMMOBILIER

   ============================================================ */

function estImmobilier(produit) {

    const categorie =

        produit.categories;

    if (!categorie) return false;

    const nomCategorie =

        (

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

   RÉCUPÉRER LE PANIER

   ============================================================ */

function recupererPanier() {

    try {

        const sauvegarde =

            localStorage.getItem(

                "market_bouake_cart"

            );

        if (!sauvegarde) {

            return [];

        }

        const donnees =

            JSON.parse(sauvegarde);

        return Array.isArray(donnees)

            ? donnees

            : [];

    } catch (error) {

        console.warn(

            "Panier local invalide :",

            error

        );

        return [];

    }

}

/* ============================================================

   SAUVEGARDER LE PANIER

   ============================================================ */

function sauvegarderPanier(panier) {

    localStorage.setItem(

        "market_bouake_cart",

        JSON.stringify(panier)

    );

    /*

       Synchronisation avec l'ancienne clé

       utilisée éventuellement par le projet.

    */

    localStorage.setItem(

        "cart",

        JSON.stringify(panier)

    );

    mettreAJourCompteurPanier();

}

/* ============================================================

   VÉRIFIER SI UN PRODUIT EST DANS LE PANIER

   ============================================================ */

function produitEstDansPanier(productId) {

    if (!productId) return false;

    const panier =

        recupererPanier();

    return panier.some(

        article =>

            String(article.id) ===

            String(productId)

    );

}

/* ============================================================

   CRÉER UNE CARTE PRODUIT

   ============================================================ */

function creerCarteProduit(produit) {

    const carte =

        document.createElement("article");

    carte.className =

        "product-card";

    const immobilier =

        estImmobilier(produit);

    const image =

        produit.image_url ||

        produit.main_image_url ||

        produit.image_url_1 ||

        "https://placehold.co/600x600/png?text=Market+Bouake";

    const prix =

        produit.price !== null &&

        produit.price !== undefined

            ? `${Number(produit.price).toLocaleString("fr-FR")} FCFA`

            : "Prix sur demande";

    const stock =

        Number(produit.stock || 0);

    const disponible =

        immobilier || stock > 0;

    const dejaDansPanier =

        produitEstDansPanier(produit.id);

    carte.innerHTML = `

        <div class="product-image-wrapper">

            <img

                src="${escapeHtml(image)}"

                alt="${escapeHtml(

                    produit.name || "Produit"

                )}"

                class="product-image"

                loading="lazy"

            >

        </div>

        <div class="product-card-content">

            <h3>

                ${escapeHtml(

                    produit.name || "Produit"

                )}

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

                        ${

                            stock > 0

                                ? `

                                    <div class="product-stock">

                                        ${stock} disponible(s)

                                    </div>

                                `

                                : `

                                    <div class="product-stock out-of-stock">

                                        Rupture de stock

                                    </div>

                                `

                        }

                    `

            }

            <div class="product-card-actions">

                <button

                    type="button"

                    class="product-view-button"

                    onclick="ouvrirProduit('${produit.id}')"

                >

                    ${

                        immobilier

                            ? "Voir les détails"

                            : "Voir le produit"

                    }

                </button>

                ${

                    immobilier

                        ? ""

                        : `

                            <button

                                type="button"

                                class="product-cart-button ${

                                    dejaDansPanier

                                        ? "in-cart"

                                        : ""

                                }"

                                data-product-id="${produit.id}"

                                ${

                                    disponible

                                        ? ""

                                        : "disabled"

                                }

                                onclick="toggleProduitPanier('${produit.id}')"

                            >

                                ${

                                    disponible

                                        ? (

                                            dejaDansPanier

                                                ? "✓ Retirer du panier"

                                                : "🛒 Ajouter au panier"

                                        )

                                        : "Indisponible"

                                }

                            </button>

                        `

                }

            </div>

        </div>

    `;

    return carte;

}

/* ============================================================

   OUVRIR LE PRODUIT

   ============================================================ */

function ouvrirProduit(productId) {

    if (!productId) return;

    window.location.href =

        `produit.html?id=${encodeURIComponent(

            productId

        )}`;

}

/* ============================================================

   TOGGLE PANIER

   1er clic = ajouter

   2e clic = retirer

   3e clic = ajouter

   ============================================================ */

async function toggleProduitPanier(productId) {

    if (!productId) return;

    const panier =

        recupererPanier();

    const index =

        panier.findIndex(

            article =>

                String(article.id) ===

                String(productId)

        );

    /*

       SI LE PRODUIT EST DÉJÀ DANS LE PANIER

       → ON LE RETIRE COMPLÈTEMENT

    */

    if (index !== -1) {

        panier.splice(

            index,

            1

        );

        sauvegarderPanier(

            panier

        );

        mettreAJourBoutonsPanier();

        afficherMessagePanier(

            "Produit retiré du panier ✓"

        );

        return;

    }

    /*

       SINON → ON AJOUTE LE PRODUIT

    */

    await ajouterProduitDepuisSupabase(

        productId

    );

}

/* ============================================================

   ANCIENNE FONCTION CONSERVÉE

   ============================================================ */

function ajouterProduitAuPanier(productId) {

    if (!productId) return;

    toggleProduitPanier(

        productId

    );

}

/* ============================================================

   AJOUTER LE PRODUIT DEPUIS SUPABASE

   ============================================================ */

async function ajouterProduitDepuisSupabase(

    productId

) {

    try {

        const {

            data: produit,

            error

        } = await supabase

            .from("products")

            .select(`

                *,

                categories (

                    id,

                    name,

                    parent_id

                )

            `)

            .eq("id", productId)

            .eq("is_active", true)

            .single();

        if (error) {

            console.error(

                "Erreur récupération produit :",

                error

            );

            afficherMessagePanier(

                "Impossible d'ajouter ce produit."

            );

            return;

        }

        if (!produit) {

            afficherMessagePanier(

                "Produit introuvable."

            );

            return;

        }

        /*

           L'immobilier ne va pas dans le panier.

        */

        if (estImmobilier(produit)) {

            afficherMessagePanier(

                "Les biens immobiliers ne peuvent pas être ajoutés au panier."

            );

            return;

        }

        const stock =

            Number(produit.stock || 0);

        if (stock <= 0) {

            afficherMessagePanier(

                "Ce produit est en rupture de stock."

            );

            return;

        }

        const panier =

            recupererPanier();

        /*

           Sécurité supplémentaire :

           si le produit a déjà été ajouté entre-temps,

           on ne crée pas de doublon.

        */

        const existe =

            panier.some(

                article =>

                    String(article.id) ===

                    String(produit.id)

            );

        if (existe) {

            mettreAJourBoutonsPanier();

            return;

        }

        /*

           Ajout avec quantité = 1.

           Un clic supplémentaire sur le bouton

           retirera le produit au lieu d'augmenter

           la quantité.

        */

        panier.push({

            id:

                produit.id,

            product_id:

                produit.id,

            name:

                produit.name,

            product_name:

                produit.name,

            price:

                Number(

                    produit.price || 0

                ),

            quantity:

                1,

            stock:

                stock,

            seller_id:

                produit.seller_id,

            shop_id:

                produit.shop_id || null,

            image_url:

                produit.image_url ||

                produit.main_image_url ||

                produit.image_url_1 ||

                null,

            category_id:

                produit.category_id ||

                null,

            size:

                null

        });

        sauvegarderPanier(

            panier

        );

        mettreAJourBoutonsPanier();

        afficherMessagePanier(

            "Produit ajouté au panier ✓"

        );

    } catch (error) {

        console.error(

            "Erreur ajout panier :",

            error

        );

        afficherMessagePanier(

            "Une erreur est survenue."

        );

    }

}

/* ============================================================

   METTRE À JOUR LES BOUTONS PANIER

   ============================================================ */

function mettreAJourBoutonsPanier() {

    const boutons =

        document.querySelectorAll(

            ".product-cart-button[data-product-id]"

        );

    boutons.forEach(

        bouton => {

            const productId =

                bouton.dataset.productId;

            if (!productId) return;

            const dansPanier =

                produitEstDansPanier(

                    productId

                );

            if (dansPanier) {

                bouton.textContent =

                    "✓ Retirer du panier";

                bouton.classList.add(

                    "in-cart"

                );

            } else {

                bouton.textContent =

                    "🛒 Ajouter au panier";

                bouton.classList.remove(

                    "in-cart"

                );

            }

        }

    );

}

/* ============================================================

   COMPTEUR DU PANIER

   ============================================================ */

function mettreAJourCompteurPanier() {

    const panier =

        recupererPanier();

    const quantiteTotale =

        panier.reduce(

            (

                total,

                article

            ) => {

                return total +

                    Number(

                        article.quantity || 1

                    );

            },

            0

        );

    const compteurs =

        document.querySelectorAll(

            ".cart-count, #cart-count, [data-cart-count]"

        );

    compteurs.forEach(

        compteur => {

            compteur.textContent =

                quantiteTotale;

            compteur.style.display =

                quantiteTotale > 0

                    ? "inline-flex"

                    : "none";

        }

    );

}

/* ============================================================

   MESSAGE PANIER

   ============================================================ */

function afficherMessagePanier(

    message

) {

    let notification =

        document.getElementById(

            "market-cart-notification"

        );

    if (!notification) {

        notification =

            document.createElement(

                "div"

            );

        notification.id =

            "market-cart-notification";

        notification.style.position =

            "fixed";

        notification.style.bottom =

            "20px";

        notification.style.left =

            "50%";

        notification.style.transform =

            "translateX(-50%)";

        notification.style.zIndex =

            "99999";

        notification.style.padding =

            "13px 20px";

        notification.style.borderRadius =

            "8px";

        notification.style.background =

            "#075c3a";

        notification.style.color =

            "#ffffff";

        notification.style.fontWeight =

            "600";

        notification.style.boxShadow =

            "0 4px 15px rgba(0,0,0,.2)";

        document.body.appendChild(

            notification

        );

    }

    notification.textContent =

        message;

    notification.style.display =

        "block";

    clearTimeout(

        notification._timer

    );

    notification._timer =

        setTimeout(

            () => {

                notification.style.display =

                    "none";

            },

            2500

        );

}

/* ============================================================

   ÉCHAPPEMENT HTML

   ============================================================ */

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

/* ============================================================

   INITIALISATION

   ============================================================ */

document.addEventListener(

    "DOMContentLoaded",

    () => {

        if (

            document.getElementById(

                "products-container"

            )

        ) {

            chargerProduitsAccueil();

        }

        mettreAJourCompteurPanier();

        mettreAJourBoutonsPanier();

    }

);
