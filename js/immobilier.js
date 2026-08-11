/* =========================================================

   MARKET BOUAKÉ

   js/immobilier.js

   Gestion des biens immobiliers :

   - Maison à louer

   - Appartement à louer

   - Résidence meublée

   - Studio

   - Autres biens immobiliers

   Ce fichier est indépendant de index.html autant que possible.

   ========================================================= */

(function () {

    "use strict";

    /* =====================================================

       CONFIGURATION SUPABASE

       ===================================================== */

    const SUPABASE_URL =

        "https://qgdxxrnsiyzbacxxfdrg.supabase.co";

    const SUPABASE_PUBLISHABLE_KEY =

        "sb_publishable_QE2in_ocTQQDEt0HW9wSCg_PKSzqo7N";

    if (!window.supabase) {

        console.error(

            "Market Bouaké : Supabase n'est pas chargé."

        );

        return;

    }

    const supabaseClient =

        window.supabase.createClient(

            SUPABASE_URL,

            SUPABASE_PUBLISHABLE_KEY

        );

    /* =====================================================

       CATÉGORIE IMMOBILIER & RÉSIDENCE

       ===================================================== */

    const IMMOBILIER_CATEGORY_NAME =

        "Immobilier & Résidence";

    const IMMOBILIER_SUBCATEGORIES = [

        "Appartement à louer",

        "Autres biens immobiliers",

        "Maison à louer",

        "Résidence meublée",

        "Studio"

    ];

    /* =====================================================

       UTILITAIRES

       ===================================================== */

    function escapeHtml(value) {

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

    function formatPrice(price) {

        if (

            price === null ||

            price === undefined ||

            price === ""

        ) {

            return "Prix sur demande";

        }

        const number =

            Number(price);

        if (Number.isNaN(number)) {

            return escapeHtml(price);

        }

        return new Intl.NumberFormat(

            "fr-FR"

        ).format(number) + " FCFA";

    }

    function normalizeText(value) {

        return String(value || "")

            .trim()

            .toLowerCase()

            .normalize("NFD")

            .replace(/[\u0300-\u036f]/g, "");

    }

    function isImmobilierProduct(product) {

        if (!product) {

            return false;

        }

        const category =

            normalizeText(

                product.categorie_principale ||

                product.category_name ||

                product.category ||

                ""

            );

        const subcategory =

            normalizeText(

                product.subcategory_name ||

                product.sous_categorie ||

                product.subcategory ||

                ""

            );

        const immobilierCategory =

            normalizeText(

                IMMOBILIER_CATEGORY_NAME

            );

        if (

            category === immobilierCategory ||

            category.includes("immobilier")

        ) {

            return true;

        }

        return IMMOBILIER_SUBCATEGORIES.some(

            function (name) {

                return (

                    subcategory ===

                    normalizeText(name)

                );

            }

        );

    }

    function getProductId(product) {

        return (

            product.id ||

            product.product_id ||

            product.productId ||

            null

        );

    }

    function getProductImage(product) {

        return (

            product.image_url ||

            product.main_image_url ||

            product.photo_url ||

            product.image ||

            (

                Array.isArray(product.images) &&

                product.images.length

                    ? product.images[0]

                    : ""

            )

        );

    }

    function getProductName(product) {

        return (

            product.name ||

            product.product_name ||

            product.title ||

            "Bien immobilier"

        );

    }

    function getSellerId(product) {

        return (

            product.seller_id ||

            product.sellerId ||

            product.vendor_id ||

            null

        );

    }

    /* =====================================================

       URL DE LA PAGE DÉTAIL IMMOBILIER

       ===================================================== */

    function getImmobilierDetailUrl(product) {

        const id =

            getProductId(product);

        if (!id) {

            return "#";

        }

        return (

            "immobilier.html?id=" +

            encodeURIComponent(id)

        );

    }

    /* =====================================================

       OUVRIR UNE PAGE IMMOBILIÈRE

       ===================================================== */

    function openImmobilier(product) {

        const id =

            getProductId(product);

        if (!id) {

            console.warn(

                "Aucun identifiant immobilier trouvé.",

                product

            );

            return;

        }

        window.location.href =

            getImmobilierDetailUrl(product);

    }

    /* =====================================================

       BOUTON "JE SUIS INTÉRESSÉ"

       ===================================================== */

    async function createInterestRequest(product) {

        const productId =

            getProductId(product);

        const sellerId =

            getSellerId(product);

        if (!productId) {

            alert(

                "Impossible de contacter le vendeur : bien immobilier introuvable."

            );

            return;

        }

        if (!sellerId) {

            alert(

                "Le vendeur de ce bien n'est pas encore disponible."

            );

            return;

        }

        let buyerId = null;

        try {

            const {

                data: {

                    user

                } = {}

            } =

                await supabaseClient.auth.getUser();

            if (user) {

                buyerId = user.id;

            }

        } catch (error) {

            console.warn(

                "Impossible de récupérer l'utilisateur connecté.",

                error

            );

        }

        /*

         * Si l'utilisateur n'est pas connecté,

         * on lui demande de se connecter.

         */

        if (!buyerId) {

            const continueUrl =

                window.location.href;

            const loginUrl =

                "connexion.html?redirect=" +

                encodeURIComponent(

                    continueUrl

                );

            window.location.href =

                loginUrl;

            return;

        }

        try {

            const {

                data,

                error

            } =

                await supabaseClient

                    .from("property_interest_requests")

                    .insert({

                        buyer_id:

                            buyerId,

                        seller_id:

                            sellerId,

                        product_id:

                            productId,

                        message:

                            "Bonjour, je suis intéressé par ce bien immobilier.",

                        status:

                            "pending"

                    })

                    .select()

                    .single();

            if (error) {

                console.error(

                    "Erreur création demande immobilier :",

                    error

                );

                alert(

                    "Impossible d'envoyer votre demande pour le moment."

                );

                return;

            }

            /*

             * Tentative de contact WhatsApp du vendeur.

             * Si aucun numéro n'est disponible,

             * la demande reste quand même enregistrée

             * dans l'espace vendeur.

             */

            const sellerPhone =

                product.seller_phone ||

                product.whatsapp_phone ||

                product.contact_phone ||

                null;

            if (sellerPhone) {

                let phone =

                    String(sellerPhone)

                        .replace(/[^\d+]/g, "");

                if (

                    phone.startsWith("0") &&

                    !phone.startsWith("+")

                ) {

                    phone =

                        "+225" +

                        phone.substring(1);

                }

                const message =

                    "Bonjour, je viens de voir votre bien immobilier sur Market Bouaké. Je suis intéressé par : " +

                    getProductName(product) +

                    ". Je souhaite avoir plus d'informations.";

                const whatsappUrl =

                    "https://wa.me/" +

                    phone.replace("+", "") +

                    "?text=" +

                    encodeURIComponent(

                        message

                    );

                window.open(

                    whatsappUrl,

                    "_blank",

                    "noopener,noreferrer"

                );

            }

            alert(

                "Votre demande a été envoyée au vendeur."

            );

            return data;

        } catch (error) {

            console.error(

                "Erreur inattendue :",

                error

            );

            alert(

                "Une erreur est survenue."

            );

        }

    }

    /* =====================================================

       CRÉATION D'UNE CARTE IMMOBILIÈRE

       ===================================================== */

    function createImmobilierCard(product) {

        const card =

            document.createElement("article");

        card.className =

            "immobilier-card";

        const id =

            getProductId(product);

        const image =

            getProductImage(product);

        const name =

            getProductName(product);

        const category =

            product.subcategory_name ||

            product.sous_categorie ||

            product.category_name ||

            "Immobilier & Résidence";

        const price =

            formatPrice(

                product.price

            );

        const location =

            product.district ||

            product.location ||

            product.city ||

            "Bouaké";

        card.dataset.productId =

            id || "";

        card.innerHTML = `

            <div class="immobilier-image-wrapper">

                ${

                    image

                        ? `

                            <img

                                class="immobilier-image"

                                src="${escapeHtml(image)}"

                                alt="${escapeHtml(name)}"

                                loading="lazy"

                            >

                          `

                        : `

                            <div class="immobilier-image-placeholder">

                                🏠

                            </div>

                          `

                }

                <span class="immobilier-badge">

                    🏠 Immobilier

                </span>

            </div>

            <div class="immobilier-card-content">

                <div class="immobilier-category">

                    ${escapeHtml(category)}

                </div>

                <h3 class="immobilier-title">

                    ${escapeHtml(name)}

                </h3>

                <div class="immobilier-location">

                    📍 ${escapeHtml(location)}

                </div>

                <div class="immobilier-price">

                    ${price}

                </div>

                <div class="immobilier-actions">

                    <button

                        type="button"

                        class="immobilier-view-button"

                    >

                        Voir les détails

                    </button>

                    <button

                        type="button"

                        class="immobilier-interest-button"

                    >

                        Je suis intéressé

                    </button>

                </div>

            </div>

        `;

        const viewButton =

            card.querySelector(

                ".immobilier-view-button"

            );

        const interestButton =

            card.querySelector(

                ".immobilier-interest-button"

            );

        if (viewButton) {

            viewButton.addEventListener(

                "click",

                function () {

                    openImmobilier(product);

                }

            );

        }

        if (interestButton) {

            interestButton.addEventListener(

                "click",

                function () {

                    createInterestRequest(

                        product

                    );

                }

            );

        }

        return card;

    }

    /* =====================================================

       AFFICHER LES BIENS IMMOBILIERS

       ===================================================== */

    function renderImmobilierProducts(

        products,

        container

    ) {

        if (!container) {

            console.warn(

                "Conteneur immobilier introuvable."

            );

            return;

        }

        container.innerHTML = "";

        const immobilierProducts =

            (products || []).filter(

                isImmobilierProduct

            );

        if (

            immobilierProducts.length === 0

        ) {

            container.innerHTML = `

                <div class="immobilier-empty">

                    <div class="immobilier-empty-icon">

                        🏠

                    </div>

                    <h3>

                        Aucun bien immobilier disponible

                    </h3>

                    <p>

                        Les maisons, appartements,

                        studios et résidences

                        apparaîtront ici.

                    </p>

                </div>

            `;

            return;

        }

        immobilierProducts.forEach(

            function (product) {

                container.appendChild(

                    createImmobilierCard(

                        product

                    )

                );

            }

        );

    }

    /* =====================================================

       CHARGER LES PRODUITS IMMOBILIERS

       ===================================================== */

    async function loadImmobilierProducts() {

        try {

            /*

             * On récupère les produits actifs.

             * Les catégories permettent ensuite

             * de distinguer l'immobilier.

             */

            const {

                data,

                error

            } =

                await supabaseClient

                    .from("products")

                    .select("*")

                    .eq("is_active", true);

            if (error) {

                console.error(

                    "Erreur chargement produits immobiliers :",

                    error

                );

                return [];

            }

            return (

                data || []

            ).filter(

                isImmobilierProduct

            );

        } catch (error) {

            console.error(

                "Erreur inattendue immobilier :",

                error

            );

            return [];

        }

    }

    /* =====================================================

       AJOUTER LES STYLES NÉCESSAIRES

       ===================================================== */

    function injectStyles() {

        if (

            document.getElementById(

                "market-bouake-immobilier-styles"

            )

        ) {

            return;

        }

        const style =

            document.createElement("style");

        style.id =

            "market-bouake-immobilier-styles";

        style.textContent = `

            .immobilier-grid {

                display: grid;

                grid-template-columns:

                    repeat(

                        auto-fit,

                        minmax(220px, 1fr)

                    );

                gap: 18px;

            }

            .immobilier-card {

                background: #ffffff;

                border-radius: 16px;

                overflow: hidden;

                box-shadow:

                    0 4px 18px

                    rgba(0,0,0,0.07);

                transition:

                    transform 0.2s ease,

                    box-shadow 0.2s ease;

            }

            .immobilier-card:hover {

                transform: translateY(-3px);

                box-shadow:

                    0 8px 25px

                    rgba(0,0,0,0.10);

            }

            .immobilier-image-wrapper {

                position: relative;

                width: 100%;

                aspect-ratio: 16 / 10;

                background: #eef3f0;

                overflow: hidden;

            }

            .immobilier-image {

                width: 100%;

                height: 100%;

                object-fit: cover;

                display: block;

            }

            .immobilier-image-placeholder {

                width: 100%;

                height: 100%;

                display: flex;

                align-items: center;

                justify-content: center;

                font-size: 45px;

            }

            .immobilier-badge {

                position: absolute;

                top: 10px;

                left: 10px;

                background: #0b6b43;

                color: #ffffff;

                padding: 6px 9px;

                border-radius: 20px;

                font-size: 12px;

                font-weight: bold;

            }

            .immobilier-card-content {

                padding: 15px;

            }

            .immobilier-category {

                color: #0b6b43;

                font-size: 12px;

                font-weight: bold;

                margin-bottom: 6px;

            }

            .immobilier-title {

                margin: 0 0 8px;

                color: #17211b;

                font-size: 17px;

                line-height: 1.3;

            }

            .immobilier-location {

                color: #68756f;

                font-size: 13px;

                margin-bottom: 10px;

            }

            .immobilier-price {

                color: #17211b;

                font-size: 17px;

                font-weight: bold;

                margin-bottom: 13px;

            }

            .immobilier-actions {

                display: grid;

                gap: 8px;

            }

            .immobilier-view-button,

            .immobilier-interest-button {

                border: none;

                border-radius: 9px;

                padding: 11px;

                cursor: pointer;

                font-weight: bold;

                font-size: 14px;

            }

            .immobilier-view-button {

                background: #0b6b43;

                color: #ffffff;

            }

            .immobilier-interest-button {

                background: #f0a500;

                color: #ffffff;

            }

            .immobilier-view-button:hover,

            .immobilier-interest-button:hover {

                opacity: 0.9;

            }

            .immobilier-empty {

                background: #ffffff;

                border-radius: 16px;

                padding: 35px 20px;

                text-align: center;

                color: #68756f;

            }

            .immobilier-empty-icon {

                font-size: 45px;

                margin-bottom: 10px;

            }

            .immobilier-empty h3 {

                color: #17211b;

                margin: 0 0 8px;

            }

            .immobilier-empty p {

                margin: 0;

                line-height: 1.5;

            }

            @media (max-width: 600px) {

                .immobilier-grid {

                    grid-template-columns:

                        repeat(2, minmax(0, 1fr));

                    gap: 10px;

                }

                .immobilier-card-content {

                    padding: 11px;

                }

                .immobilier-title {

                    font-size: 14px;

                }

                .immobilier-price {

                    font-size: 15px;

                }

                .immobilier-location {

                    font-size: 12px;

                }

                .immobilier-view-button,

                .immobilier-interest-button {

                    padding: 9px 6px;

                    font-size: 12px;

                }

            }

        `;

        document.head.appendChild(style);

    }

    /* =====================================================

       INITIALISATION D'UN CONTENEUR

       ===================================================== */

    async function initializeImmobilier(

        container

    ) {

        if (!container) {

            return;

        }

        injectStyles();

        container.classList.add(

            "immobilier-grid"

        );

        container.innerHTML = `

            <div class="immobilier-empty">

                Chargement des biens immobiliers...

            </div>

        `;

        const products =

            await loadImmobilierProducts();

        renderImmobilierProducts(

            products,

            container

        );

    }

    /* =====================================================

       API PUBLIQUE

       ===================================================== */

    window.MarketBouakeImmobilier = {

        supabase:

            supabaseClient,

        isImmobilierProduct:

            isImmobilierProduct,

        load:

            loadImmobilierProducts,

        render:

            renderImmobilierProducts,

        initialize:

            initializeImmobilier,

        open:

            openImmobilier,

        interest:

            createInterestRequest

    };

    /* =====================================================

       INITIALISATION AUTOMATIQUE

       Si une page contient :

       <div id="immobilier-container"></div>

       le système démarre automatiquement.

       ===================================================== */

    document.addEventListener(

        "DOMContentLoaded",

        function () {

            const container =

                document.getElementById(

                    "immobilier-container"

                );

            if (container) {

                initializeImmobilier(

                    container

                );

            }

        }

    );

})();
