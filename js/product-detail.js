/* ============================================================

   MARKET BOUAKÉ

   product-detail.js

   JOUR 4 — FICHIER DÉFINITIF

   Rôle :

   - récupérer le produit demandé par ?id=

   - récupérer les données liées

   - gérer les erreurs de récupération

   - préparer les données pour produit.html

   - ne jamais afficher de faux produit

   - ne jamais rester bloqué sur un chargement permanent

   - utiliser product-types.js

   - préparer les futures intégrations panier/favoris

   IMPORTANT :

   Ce fichier ne remplace PAS :

   - cart.js

   - favorites.js

   - immobilier.js

   - messages.js

   - notifications.js

   Ces modules seront intégrés à leurs étapes respectives.

============================================================ */

(function () {

    "use strict";

    /* ==========================================================

       CONFIGURATION SUPABASE

    ========================================================== */

    const SUPABASE_URL =

        "https://qgdxxrnsiyzbacxxfdrg.supabase.co";

    const SUPABASE_PUBLISHABLE_KEY =

        "sb_publishable_QE2in_ocTQQDEt0HW9wSCg_PKSzqo7N";

    const PRODUCTS_ENDPOINT =

        `${SUPABASE_URL}/rest/v1/products`;

    const CATEGORIES_ENDPOINT =

        `${SUPABASE_URL}/rest/v1/categories`;

    const PROFILES_ENDPOINT =

        `${SUPABASE_URL}/rest/v1/profiles`;

    const SHOPS_ENDPOINT =

        `${SUPABASE_URL}/rest/v1/shops`;

    const REVIEWS_ENDPOINT =

        `${SUPABASE_URL}/rest/v1/reviews`;

    const DELIVERY_ENDPOINT =

        `${SUPABASE_URL}/rest/v1/delivery_rates`;

    /* ==========================================================

       ÉTAT DU MODULE

    ========================================================== */

    const state = {

        product: null,

        category: null,

        seller: null,

        shop: null,

        reviews: [],

        deliveryRates: [],

        analysis: null,

        loading: false,

        loaded: false,

        error: null

    };

    /* ==========================================================

       UTILITAIRES

    ========================================================== */

    function getHeaders() {

        return {

            "apikey": SUPABASE_PUBLISHABLE_KEY,

            "Content-Type": "application/json"

        };

    }

    function getProductId() {

        const params = new URLSearchParams(window.location.search);

        const id = params.get("id");

        if (!id) {

            return null;

        }

        return id.trim();

    }

    function isValidUUID(value) {

        if (!value) {

            return false;

        }

        return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

    }

    function escapeText(value) {

        if (value === null || value === undefined) {

            return "";

        }

        return String(value);

    }

    function safeNumber(value, fallback = 0) {

        const number = Number(value);

        return Number.isFinite(number)

            ? number

            : fallback;

    }

    /* ==========================================================

       REQUÊTE SUPABASE GÉNÉRIQUE

    ========================================================== */

    async function fetchJSON(url) {

        const response = await fetch(url, {

            method: "GET",

            headers: getHeaders()

        });

        let data = null;

        try {

            data = await response.json();

        } catch (error) {

            data = null;

        }

        if (!response.ok) {

            const message =

                data?.message ||

                data?.error_description ||

                data?.hint ||

                `Erreur Supabase (${response.status})`;

            throw new Error(message);

        }

        return data;

    }

    /* ==========================================================

       RÉCUPÉRATION DU PRODUIT

    ========================================================== */

    async function fetchProduct(productId) {

        const url =

            `${PRODUCTS_ENDPOINT}` +

            `?select=*` +

            `&id=eq.${encodeURIComponent(productId)}` +

            `&limit=1`;

        const products = await fetchJSON(url);

        if (!Array.isArray(products) || products.length === 0) {

            return null;

        }

        return products[0];

    }

    /* ==========================================================

       CATÉGORIE

    ========================================================== */

    async function fetchCategory(categoryId) {

        if (!categoryId) {

            return null;

        }

        const url =

            `${CATEGORIES_ENDPOINT}` +

            `?select=*` +

            `&id=eq.${encodeURIComponent(categoryId)}` +

            `&limit=1`;

        const categories = await fetchJSON(url);

        if (!Array.isArray(categories) || categories.length === 0) {

            return null;

        }

        return categories[0];

    }

    /* ==========================================================

       VENDEUR

    ========================================================== */

    async function fetchSeller(sellerId) {

        if (!sellerId) {

            return null;

        }

        const url =

            `${PROFILES_ENDPOINT}` +

            `?select=*` +

            `&id=eq.${encodeURIComponent(sellerId)}` +

            `&limit=1`;

        const profiles = await fetchJSON(url);

        if (!Array.isArray(profiles) || profiles.length === 0) {

            return null;

        }

        return profiles[0];

    }

    /* ==========================================================

       BOUTIQUE

    ========================================================== */

    async function fetchShop(shopId, sellerId) {

        let url = null;

        if (shopId) {

            url =

                `${SHOPS_ENDPOINT}` +

                `?select=*` +

                `&id=eq.${encodeURIComponent(shopId)}` +

                `&limit=1`;

        } else if (sellerId) {

            /*

             * La structure exacte de shops peut évoluer.

             * On essaie seller_id si cette colonne existe.

             */

            url =

                `${SHOPS_ENDPOINT}` +

                `?select=*` +

                `&seller_id=eq.${encodeURIComponent(sellerId)}` +

                `&limit=1`;

        }

        if (!url) {

            return null;

        }

        try {

            const shops = await fetchJSON(url);

            if (!Array.isArray(shops) || shops.length === 0) {

                return null;

            }

            return shops[0];

        } catch (error) {

            /*

             * Une erreur de boutique ne doit pas empêcher

             * l'affichage du produit.

             */

            console.warn(

                "Market Bouaké : boutique non récupérée.",

                error

            );

            return null;

        }

    }

    /* ==========================================================

       AVIS

    ========================================================== */

    async function fetchReviews(productId) {

        if (!productId) {

            return [];

        }

        const url =

            `${REVIEWS_ENDPOINT}` +

            `?select=*` +

            `&product_id=eq.${encodeURIComponent(productId)}` +

            `&is_visible=eq.true` +

            `&order=created_at.desc`;

        try {

            const reviews = await fetchJSON(url);

            if (!Array.isArray(reviews)) {

                return [];

            }

            return reviews;

        } catch (error) {

            /*

             * Les avis ne doivent pas empêcher la fiche

             * principale de fonctionner.

             */

            console.warn(

                "Market Bouaké : avis non récupérés.",

                error

            );

            return [];

        }

    }

    /* ==========================================================

       LIVRAISON

    ========================================================== */

    async function fetchDeliveryRates(sellerId) {

        if (!sellerId) {

            return [];

        }

        const url =

            `${DELIVERY_ENDPOINT}` +

            `?select=*` +

            `&seller_id=eq.${encodeURIComponent(sellerId)}`;

        try {

            const rates = await fetchJSON(url);

            if (!Array.isArray(rates)) {

                return [];

            }

            return rates;

        } catch (error) {

            console.warn(

                "Market Bouaké : tarifs de livraison non récupérés.",

                error

            );

            return [];

        }

    }

    /* ==========================================================

       IMAGES

    ========================================================== */

    function getProductImages(product) {

        if (!product) {

            return [];

        }

        const possibleImages = [

            product.image_url_1,

            product.image_url_2,

            product.image_url_3

        ];

        return possibleImages

            .filter(image => {

                return image !== null &&

                       image !== undefined &&

                       String(image).trim() !== "";

            })

            .map(image => String(image).trim());

    }

    /* ==========================================================

       NOTE MOYENNE

    ========================================================== */

    function calculateRating(reviews) {

        if (!Array.isArray(reviews) || reviews.length === 0) {

            return {

                average: null,

                count: 0

            };

        }

        const validRatings = reviews

            .map(review => Number(review.rating))

            .filter(rating => {

                return Number.isFinite(rating) &&

                       rating >= 1 &&

                       rating <= 5;

            });

        if (validRatings.length === 0) {

            return {

                average: null,

                count: 0

            };

        }

        const total = validRatings.reduce(

            (sum, rating) => sum + rating,

            0

        );

        return {

            average:

                Math.round((total / validRatings.length) * 10) / 10,

            count: validRatings.length

        };

    }

    /* ==========================================================

       NORMALISATION DES DONNÉES

    ========================================================== */

    function prepareProductData() {

        if (!state.product) {

            return null;

        }

        const product = state.product;

        const images =

            getProductImages(product);

        const rating =

            calculateRating(state.reviews);

        const price =

            safeNumber(product.price, 0);

        const stock =

            safeNumber(product.stock, 0);

        const analysis =

            window.MarketBouakeProductTypes

                ? window.MarketBouakeProductTypes.analyze(product)

                : null;

        state.analysis = analysis;

        return {

            id: product.id,

            name:

                escapeText(product.name),

            description:

                escapeText(product.description),

            price,

            stock,

            sizes:

                Array.isArray(product.sizes)

                    ? product.sizes

                    : [],

            images,

            whatsappPhone:

                escapeText(product.whatsapp_phone),

            isActive:

                product.is_active === true,

            categoryId:

                product.category_id || null,

            sellerId:

                product.seller_id || null,

            shopId:

                product.shop_id || null,

            category:

                state.category,

            seller:

                state.seller,

            shop:

                state.shop,

            reviews:

                state.reviews,

            rating,

            deliveryRates:

                state.deliveryRates,

            analysis,

            property: {

                propertyType:

                    product.property_type || null,

                monthlyPrice:

                    product.monthly_price !== null

                        ? safeNumber(product.monthly_price)

                        : null,

                depositAmount:

                    product.deposit_amount !== null

                        ? safeNumber(product.deposit_amount)

                        : null,

                location:

                    product.location || null,

                roomsCount:

                    product.rooms_count !== null

                        ? safeNumber(product.rooms_count)

                        : null,

                bedroomsCount:

                    product.bedrooms_count !== null

                        ? safeNumber(product.bedrooms_count)

                        : null,

                availability:

                    product.availability || null,

                conditions:

                    product.conditions || null,

                checkInTime:

                    product.check_in_time || null,

                checkOutTime:

                    product.check_out_time || null,

                capacity:

                    product.capacity !== null

                        ? safeNumber(product.capacity)

                        : null,

                amenities:

                    product.amenities || null,

                pricingType:

                    product.pricing_type || null

            },

            createdAt:

                product.created_at || null,

            updatedAt:

                product.updated_at || null

        };

    }

    /* ==========================================================

       CHARGEMENT PRINCIPAL

    ========================================================== */

    async function loadProduct() {

        const productId = getProductId();

        /*

         * Pas d'ID :

         * inutile de lancer une requête.

         */

        if (!productId) {

            state.error = {

                code: "MISSING_ID",

                message: "Aucun produit n'a été demandé."

            };

            state.loaded = false;

            notifyPage();

            return;

        }

        /*

         * ID présent mais format invalide.

         */

        if (!isValidUUID(productId)) {

            state.error = {

                code: "INVALID_ID",

                message: "L'identifiant du produit est invalide."

            };

            state.loaded = false;

            notifyPage();

            return;

        }

        state.loading = true;

        state.error = null;

        /*

         * On informe produit.html que la récupération commence.

         * Le HTML pourra afficher son squelette professionnel.

         */

        notifyPage("product-loading");

        try {

            /*

             * 1. Produit

             */

            const product =

                await fetchProduct(productId);

            if (!product) {

                state.product = null;

                state.error = {

                    code: "NOT_FOUND",

                    message: "Produit introuvable."

                };

                state.loading = false;

                state.loaded = false;

                notifyPage("product-not-found");

                return;

            }

            /*

             * Produit inactif.

             *

             * On ne fabrique pas de fiche publique

             * à partir d'un produit masqué.

             */

            if (product.is_active !== true) {

                state.product = null;

                state.error = {

                    code: "INACTIVE",

                    message: "Ce produit n'est actuellement pas disponible."

                };

                state.loading = false;

                state.loaded = false;

                notifyPage("product-unavailable");

                return;

            }

            state.product = product;

            /*

             * 2. Données liées

             *

             * Elles sont récupérées en parallèle afin

             * d'éviter de ralentir inutilement la fiche.

             */

            const [

                category,

                seller,

                shop,

                reviews,

                deliveryRates

            ] = await Promise.all([

                fetchCategory(product.category_id),

                fetchSeller(product.seller_id),

                fetchShop(

                    product.shop_id,

                    product.seller_id

                ),

                fetchReviews(product.id),

                fetchDeliveryRates(product.seller_id)

            ]);

            state.category = category;

            state.seller = seller;

            state.shop = shop;

            state.reviews = reviews;

            state.deliveryRates = deliveryRates;

            /*

             * 3. Préparation finale

             */

            const prepared =

                prepareProductData();

            state.loading = false;

            state.loaded = true;

            state.error = null;

            /*

             * Données disponibles pour produit.html

             */

            window.MarketBouakeProductDetail = {

                state,

                product: prepared,

                getProduct: () => prepared,

                reload: loadProduct

            };

            /*

             * Événement destiné au futur produit.html.

             */

            notifyPage(

                "product-ready",

                prepared

            );

        } catch (error) {

            console.error(

                "Market Bouaké — erreur récupération produit :",

                error

            );

            state.loading = false;

            state.loaded = false;

            state.error = {

                code: "FETCH_ERROR",

                message:

                    "Impossible de récupérer les informations du produit."

            };

            notifyPage(

                "product-error",

                state.error

            );

        }

    }

    /* ==========================================================

       COMMUNICATION AVEC produit.html

    ========================================================== */

    function notifyPage(type = "product-loading", data = null) {

        window.dispatchEvent(

            new CustomEvent(

                "marketbouake:product",

                {

                    detail: {

                        type,

                        data

                    }

                }

            )

        );

    }

    /* ==========================================================

       API PUBLIQUE

    ========================================================== */

    window.MarketBouakeProductDetail = {

        state,

        loadProduct,

        getProduct: function () {

            return state.product

                ? prepareProductData()

                : null;

        },

        getAnalysis: function () {

            return state.analysis;

        },

        getImages: function () {

            return getProductImages(state.product);

        },

        getReviews: function () {

            return state.reviews;

        },

        getDeliveryRates: function () {

            return state.deliveryRates;

        }

    };

    /* ==========================================================

       DÉMARRAGE

       Le script attend que le DOM soit disponible.

       Le rendu visuel sera effectué par produit.html.

    ========================================================== */

    if (document.readyState === "loading") {

        document.addEventListener(

            "DOMContentLoaded",

            loadProduct,

            {

                once: true

            }

        );

    } else {

        loadProduct();

    }

})();
