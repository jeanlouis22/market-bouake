/* ============================================================

   MARKET BOUAKÉ

   products.js

   JOUR 4 — PRODUITS DE L'ACCUEIL

   ------------------------------------------------------------

   Responsabilités :

   - récupération des vrais produits Supabase

   - produits actifs uniquement

   - nouveautés

   - produits populaires

   - produits mis en avant

   - cartes produits

   - stock / rupture de stock

   - catégories

   - tailles

   - images

   - vendeur / boutique lorsque disponible

   - bouton "Voir le produit"

   - préparation des sections de l'accueil

   ------------------------------------------------------------

   NE GÈRE PAS :

   - panier complet → Jour 5

   - favoris complet → Jour 5

   - recherche complète → Jour 6

   - catégories interactives → Jour 6

   - thèmes → Jour 7

   - immobilier fonctionnel → Jour 8

   ============================================================ */

(() => {

    "use strict";

    /* ========================================================

       1. CONFIGURATION SUPABASE

       ======================================================== */

    const SUPABASE_URL = "https://qgdxxrnsiyzbacxxfdrg.supabase.co";

    const SUPABASE_KEY = "sb_publishable_QE2in_ocTQQDEt0HW9wSCg_PKSzqo7N";

    const API_URL = `${SUPABASE_URL}/rest/v1`;

    const SUPABASE_HEADERS = {

        "apikey": SUPABASE_KEY,

        "Content-Type": "application/json"

    };

    /* ========================================================

       2. CONFIGURATION GÉNÉRALE

       ======================================================== */

    const CONFIG = {

        productsLimit: 20,

        featuredLimit: 12,

        newestLimit: 12,

        popularLimit: 12,

        imageFallback:

            "data:image/svg+xml;charset=UTF-8," +

            encodeURIComponent(`

                <svg xmlns="http://www.w3.org/2000/svg"

                     width="600"

                     height="450"

                     viewBox="0 0 600 450">

                    <rect width="600" height="450" fill="#f8fafc"/>

                    <path d="M150 350l95-105 75 80 60-70 100 95H150z"

                          fill="#e2e8f0"/>

                    <circle cx="245" cy="165" r="35"

                            fill="#cbd5e1"/>

                    <text x="300"

                          y="400"

                          text-anchor="middle"

                          font-family="Arial"

                          font-size="22"

                          fill="#64748b">

                        Market Bouaké

                    </text>

                </svg>

            `)

    };

    /* ========================================================

       3. ÉTAT DU MODULE

       ======================================================== */

    const state = {

        allProducts: [],

        featuredProducts: [],

        newestProducts: [],

        popularProducts: [],

        promotionProducts: [],

        categories: [],

        shops: [],

        profiles: [],

        initialized: false

    };

    /* ========================================================

       4. OUTILS

       ======================================================== */

    function escapeHTML(value) {

        if (value === null || value === undefined) return "";

        return String(value)

            .replace(/&/g, "&amp;")

            .replace(/</g, "&lt;")

            .replace(/>/g, "&gt;")

            .replace(/"/g, "&quot;")

            .replace(/'/g, "&#039;");

    }

    function normalizeText(value) {

        return String(value || "")

            .normalize("NFD")

            .replace(/[\u0300-\u036f]/g, "")

            .toLowerCase()

            .trim();

    }

    function formatPrice(value) {

        const number = Number(value);

        if (!Number.isFinite(number)) {

            return "Prix non renseigné";

        }

        return new Intl.NumberFormat("fr-FR", {

            maximumFractionDigits: 0

        }).format(number) + " FCFA";

    }

    function formatDate(value) {

        if (!value) return "";

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {

            return "";

        }

        return new Intl.DateTimeFormat("fr-FR", {

            day: "2-digit",

            month: "long",

            year: "numeric"

        }).format(date);

    }

    function isValidUUID(value) {

        return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

            .test(String(value || ""));

    }

    function isPropertyProduct(product) {

        if (!product) return false;

        const propertyType = normalizeText(product.property_type);

        return Boolean(

            propertyType ||

            product.monthly_price !== null ||

            product.deposit_amount !== null ||

            product.rooms_count !== null ||

            product.bedrooms_count !== null ||

            product.check_in_time !== null ||

            product.check_out_time !== null ||

            product.capacity !== null

        );

    }

    function getProductImage(product) {

        if (!product) {

            return CONFIG.imageFallback;

        }

        const possibleImages = [

            product.image_url_1,

            product.image_url_2,

            product.image_url_3

        ];

        for (const image of possibleImages) {

            if (typeof image === "string" && image.trim()) {

                return image.trim();

            }

        }

        return CONFIG.imageFallback;

    }

    function getProductTypeLabel(product) {

        if (isPropertyProduct(product)) {

            return "Immobilier";

        }

        return "Produit";

    }

    function getProductAvailability(product) {

        if (!product) {

            return {

                available: false,

                label: "Indisponible"

            };

        }

        const stock = Number(product.stock);

        if (!Number.isFinite(stock)) {

            return {

                available: true,

                label: "Disponible"

            };

        }

        if (stock <= 0) {

            return {

                available: false,

                label: "Rupture de stock"

            };

        }

        return {

            available: true,

            label: "Disponible"

        };

    }

    function getCategoryName(product) {

        if (!product) return "";

        if (product.category && product.category.name) {

            return product.category.name;

        }

        if (product.category_name) {

            return product.category_name;

        }

        return "";

    }

    /* ========================================================

       5. API SUPABASE

       ======================================================== */

    async function supabaseGet(table, params = {}) {

        const searchParams = new URLSearchParams();

        Object.entries(params).forEach(([key, value]) => {

            if (

                value !== undefined &&

                value !== null &&

                value !== ""

            ) {

                searchParams.set(key, value);

            }

        });

        const url = `${API_URL}/${table}?${searchParams.toString()}`;

        const response = await fetch(url, {

            method: "GET",

            headers: SUPABASE_HEADERS

        });

        if (!response.ok) {

            const errorText = await response.text();

            throw new Error(

                `Supabase ${response.status} — ${errorText}`

            );

        }

        return response.json();

    }

    /* ========================================================

       6. RÉCUPÉRATION DES PRODUITS

       ======================================================== */

    async function fetchProducts() {

        const params = {

            select: "*",

            is_active: "eq.true",

            order: "created_at.desc",

            limit: String(CONFIG.productsLimit)

        };

        return await supabaseGet("products", params);

    }

    /* ========================================================

       7. RÉCUPÉRATION DES CATÉGORIES

       ======================================================== */

    async function fetchCategories() {

        try {

            return await supabaseGet("categories", {

                select: "id,name,is_active,parent_id",

                is_active: "eq.true",

                order: "name.asc"

            });

        } catch (error) {

            console.warn(

                "Market Bouaké — catégories non récupérées :",

                error

            );

            return [];

        }

    }

    /* ========================================================

       8. RÉCUPÉRATION DES BOUTIQUES

       ======================================================== */

    async function fetchShops() {

        try {

            return await supabaseGet("shops", {

                select: "*",

                status: "eq.active"

            });

        } catch (error) {

            console.warn(

                "Market Bouaké — boutiques non récupérées :",

                error

            );

            return [];

        }

    }

    /* ========================================================

       9. RÉCUPÉRATION DES PROFILS

       ======================================================== */

    async function fetchProfilesForProducts(products) {

        const sellerIds = [

            ...new Set(

                products

                    .map(product => product.seller_id)

                    .filter(Boolean)

            )

        ];

        if (!sellerIds.length) {

            return [];

        }

        const uuidList = sellerIds

            .filter(isValidUUID)

            .join(",");

        if (!uuidList) {

            return [];

        }

        try {

            return await supabaseGet("profiles", {

                select: "id,first_name,last_name,full_name,avatar_url,photo_url,seller_status",

                id: `in.(${uuidList})`

            });

        } catch (error) {

            console.warn(

                "Market Bouaké — profils vendeurs non récupérés :",

                error

            );

            return [];

        }

    }

    /* ========================================================

       10. RÉCUPÉRATION DES PRODUITS MIS EN AVANT

       ======================================================== */

    async function fetchFeaturedProducts(allProducts) {

        try {

            const featuredRows = await supabaseGet(

                "featured_products",

                {

                    select: "product_id,is_active,show_on_home,start_at,end_at,created_at",

                    is_active: "eq.true",

                    show_on_home: "eq.true",

                    order: "created_at.desc",

                    limit: String(CONFIG.featuredLimit)

                }

            );

            const now = new Date();

            const validRows = featuredRows.filter(row => {

                const startValid =

                    !row.start_at ||

                    new Date(row.start_at) <= now;

                const endValid =

                    !row.end_at ||

                    new Date(row.end_at) >= now;

                return startValid && endValid;

            });

            const ids = validRows

                .map(row => row.product_id)

                .filter(Boolean);

            return ids

                .map(id =>

                    allProducts.find(

                        product => product.id === id

                    )

                )

                .filter(Boolean)

                .slice(0, CONFIG.featuredLimit);

        } catch (error) {

            console.warn(

                "Market Bouaké — produits mis en avant non récupérés :",

                error

            );

            return [];

        }

    }

    /* ========================================================

       11. NOUVEAUTÉS

       ======================================================== */

    function buildNewestProducts(products) {

        return [...products]

            .filter(product => !isPropertyProduct(product))

            .sort((a, b) => {

                return (

                    new Date(b.created_at || 0) -

                    new Date(a.created_at || 0)

                );

            })

            .slice(0, CONFIG.newestLimit);

    }

    /* ========================================================

       12. PRODUITS POPULAIRES

       ======================================================== */

    function buildPopularProducts(products) {

        return [...products]

            .filter(product => !isPropertyProduct(product))

            .sort((a, b) => {

                const viewsA = Number(a.views_count || 0);

                const viewsB = Number(b.views_count || 0);

                return viewsB - viewsA;

            })

            .slice(0, CONFIG.popularLimit);

    }

    /* ========================================================

       13. PROMOTIONS

       ========================================================

       La table products fournie ne possède actuellement pas

       de colonne de prix avant/après promotion.

       Nous ne fabriquons donc aucune fausse promotion.

       ======================================================== */

    function buildPromotionProducts(products) {

        return products.filter(product => {

            return (

                product.old_price !== undefined &&

                product.old_price !== null &&

                Number(product.old_price) > Number(product.price)

            );

        });

    }

    /* ========================================================

       14. CONTEXTE VENDEUR / BOUTIQUE

       ======================================================== */

    function enrichProduct(product) {

        const seller = state.profiles.find(

            profile => profile.id === product.seller_id

        );

        const shop = state.shops.find(

            currentShop =>

                currentShop.id === product.shop_id

        );

        return {

            ...product,

            seller: seller || null,

            shop: shop || null

        };

    }

    /* ========================================================

       15. URL DE LA FICHE PRODUIT

       ======================================================== */

    function getProductUrl(product) {

        if (!product || !product.id) {

            return "#";

        }

        return `produit.html?id=${encodeURIComponent(product.id)}`;

    }

    /* ========================================================

       16. CARTE PRODUIT

       ======================================================== */

    function createProductCard(product) {

        const enriched = enrichProduct(product);

        const image = getProductImage(enriched);

        const availability =

            getProductAvailability(enriched);

        const categoryName =

            getCategoryName(enriched);

        const property =

            isPropertyProduct(enriched);

        const productUrl =

            getProductUrl(enriched);

        const sellerName =

            enriched.seller?.full_name ||

            [

                enriched.seller?.first_name,

                enriched.seller?.last_name

            ]

                .filter(Boolean)

                .join(" ") ||

            "";

        const shopName =

            enriched.shop?.name ||

            "";

        const sizes =

            Array.isArray(enriched.sizes)

                ? enriched.sizes.filter(Boolean)

                : [];

        const sizesHTML =

            sizes.length

                ? `

                    <div class="mb-product-sizes">

                        ${sizes

                            .slice(0, 4)

                            .map(size =>

                                `<span>${escapeHTML(size)}</span>`

                            )

                            .join("")}

                    </div>

                `

                : "";

        const stockHTML =

            property

                ? ""

                : `

                    <span class="

                        mb-product-stock

                        ${availability.available

                            ? "is-available"

                            : "is-out-of-stock"}

                    ">

                        ${escapeHTML(

                            availability.label

                        )}

                    </span>

                `;

        const propertyBadge =

            property

                ? `

                    <span class="mb-product-type">

                        Immobilier

                    </span>

                `

                : "";

        const sellerHTML =

            sellerName || shopName

                ? `

                    <div class="mb-product-seller">

                        ${escapeHTML(

                            shopName || sellerName

                        )}

                    </div>

                `

                : "";

        const cartButton =

            property

                ? ""

                : `

                    <button

                        type="button"

                        class="mb-product-cart-btn"

                        data-product-action="cart"

                        data-product-id="${escapeHTML(

                            enriched.id

                        )}"

                        ${availability.available

                            ? ""

                            : "disabled"}

                    >

                        <span

                            class="mb-product-cart-icon"

                            aria-hidden="true"

                        >

                            <svg

                                viewBox="0 0 24 24"

                                width="18"

                                height="18"

                                fill="none"

                                stroke="currentColor"

                                stroke-width="2"

                                stroke-linecap="round"

                                stroke-linejoin="round"

                            >

                                <circle cx="9" cy="20" r="1"/>

                                <circle cx="20" cy="20" r="1"/>

                                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h7.72a2 2 0 0 0 2-1.61L21 6H6"/>

                            </svg>

                        </span>

                        <span>

                            ${

                                availability.available

                                    ? "Ajouter au panier"

                                    : "Rupture de stock"

                            }

                        </span>

                    </button>

                `;

        const article = document.createElement("article");

        article.className =

            "mb-product-card" +

            (property

                ? " mb-product-card-property"

                : "");

        article.dataset.productId =

            enriched.id || "";

        article.dataset.productType =

            property

                ? "property"

                : "product";

        article.innerHTML = `

            <div class="mb-product-image-wrap">

                <a

                    href="${productUrl}"

                    class="mb-product-image-link"

                    aria-label="Voir ${escapeHTML(

                        enriched.name

                    )}"

                >

                    <img

                        class="mb-product-image"

                        src="${escapeHTML(image)}"

                        alt="${escapeHTML(

                            enriched.name

                        )}"

                        loading="lazy"

                        decoding="async"

                    >

                </a>

                ${propertyBadge}

                <button

                    type="button"

                    class="mb-product-favorite-btn"

                    data-product-action="favorite"

                    data-product-id="${escapeHTML(

                        enriched.id

                    )}"

                    aria-label="Ajouter aux favoris"

                    title="Ajouter aux favoris"

                >

                    <svg

                        viewBox="0 0 24 24"

                        width="20"

                        height="20"

                        fill="none"

                        stroke="currentColor"

                        stroke-width="2"

                        stroke-linecap="round"

                        stroke-linejoin="round"

                        aria-hidden="true"

                    >

                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z"/>

                    </svg>

                </button>

            </div>

            <div class="mb-product-body">

                ${

                    categoryName

                        ? `

                            <div class="mb-product-category">

                                ${escapeHTML(

                                    categoryName

                                )}

                            </div>

                        `

                        : ""

                }

                <a

                    href="${productUrl}"

                    class="mb-product-name"

                >

                    ${escapeHTML(

                        enriched.name

                    )}

                </a>

                <div class="mb-product-price">

                    ${

                        property

                            ? formatPrice(

                                enriched.monthly_price ??

                                enriched.price

                            )

                            : formatPrice(

                                enriched.price

                            )

                    }

                </div>

                ${

                    property &&

                    enriched.location

                        ? `

                            <div class="mb-product-location">

                                <svg

                                    viewBox="0 0 24 24"

                                    width="15"

                                    height="15"

                                    fill="none"

                                    stroke="currentColor"

                                    stroke-width="2"

                                    stroke-linecap="round"

                                    stroke-linejoin="round"

                                    aria-hidden="true"

                                >

                                    <path d="M21 10c0 7-9 12-9 12S3 17 3 10a9 9 0 0 1 18 0z"/>

                                    <circle cx="12" cy="10" r="3"/>

                                </svg>

                                <span>

                                    ${escapeHTML(

                                        enriched.location

                                    )}

                                </span>

                            </div>

                        `

                        : ""

                }

                ${sizesHTML}

                ${sellerHTML}

                <div class="mb-product-meta">

                    ${stockHTML}

                </div>

                <div class="mb-product-actions">

                    <a

                        href="${productUrl}"

                        class="mb-product-view-btn"

                        data-product-action="view"

                        data-product-id="${escapeHTML(

                            enriched.id

                        )}"

                    >

                        <span>Voir le produit</span>

                        <svg

                            viewBox="0 0 24 24"

                            width="17"

                            height="17"

                            fill="none"

                            stroke="currentColor"

                            stroke-width="2"

                            stroke-linecap="round"

                            stroke-linejoin="round"

                            aria-hidden="true"

                        >

                            <path d="M5 12h14"/>

                            <path d="m12 5 7 7-7 7"/>

                        </svg>

                    </a>

                    ${cartButton}

                </div>

            </div>

        `;

        return article;

    }

    /* ========================================================

       17. RECHERCHE D'UNE SECTION PAR ID

       ======================================================== */

    function findElementByIds(ids) {

        for (const id of ids) {

            const element = document.getElementById(id);

            if (element) {

                return element;

            }

        }

        return null;

    }

    /* ========================================================

       18. RECHERCHE D'UNE SECTION PAR ATTRIBUT

       ======================================================== */

    function findSectionByDataName(names) {

        const elements =

            document.querySelectorAll(

                "[data-products-section], [data-section]"

            );

        for (const element of elements) {

            const value =

                normalizeText(

                    element.dataset.productsSection ||

                    element.dataset.section ||

                    ""

                );

            if (

                names.some(

                    name =>

                        value === normalizeText(name)

                )

            ) {

                return element;

            }

        }

        return null;

    }

    /* ========================================================

       19. RECHERCHE D'UNE SECTION PAR TITRE

       ======================================================== */

    function findSectionByTitle(names) {

        const headings =

            document.querySelectorAll(

                "h1, h2, h3, h4"

            );

        for (const heading of headings) {

            const headingText =

                normalizeText(

                    heading.textContent

                );

            const match =

                names.some(name => {

                    const normalized =

                        normalizeText(name);

                    return (

                        headingText === normalized ||

                        headingText.includes(normalized)

                    );

                });

            if (!match) continue;

            let parent =

                heading.closest(

                    "section, article, div"

                );

            for (let i = 0; i < 5 && parent; i++) {

                const productContainer =

                    parent.querySelector(

                        "[data-product-list], " +

                        ".products-grid, " +

                        ".product-grid, " +

                        ".products-container, " +

                        ".product-list, " +

                        ".products"

                    );

                if (productContainer) {

                    return parent;

                }

                parent = parent.parentElement;

            }

        }

        return null;

    }

    /* ========================================================

       20. OBTENIR LE CONTENEUR PRODUITS

       ======================================================== */

    function getProductContainer(section) {

        if (!section) return null;

        const explicit =

            section.querySelector(

                "[data-product-list]"

            );

        if (explicit) {

            return explicit;

        }

        const known =

            section.querySelector(

                ".products-grid, " +

                ".product-grid, " +

                ".products-container, " +

                ".product-list, " +

                ".products"

            );

        if (known) {

            return known;

        }

        /*

         * Si aucune classe connue n'est présente,

         * on crée un conteneur dédié à la section.

         */

        const container =

            document.createElement("div");

        container.className =

            "mb-products-grid";

        container.dataset.productList =

            "true";

        section.appendChild(container);

        return container;

    }

    /* ========================================================

       21. AFFICHAGE D'UNE LISTE

       ======================================================== */

    function renderProductsToSection(

        products,

        section

    ) {

        if (!section) {

            return false;

        }

        const container =

            getProductContainer(section);

        if (!container) {

            return false;

        }

        container.innerHTML = "";

        if (!products.length) {

            container.innerHTML = `

                <div class="mb-products-empty">

                    <div class="mb-products-empty-icon">

                        <svg

                            viewBox="0 0 24 24"

                            width="34"

                            height="34"

                            fill="none"

                            stroke="currentColor"

                            stroke-width="1.7"

                            stroke-linecap="round"

                            stroke-linejoin="round"

                        >

                            <circle cx="11" cy="11" r="8"/>

                            <path d="m21 21-4.35-4.35"/>

                        </svg>

                    </div>

                    <strong>

                        Aucun produit disponible

                    </strong>

                    <span>

                        Les produits apparaîtront ici

                        lorsqu'ils seront publiés.

                    </span>

                </div>

            `;

            return true;

        }

        const fragment =

            document.createDocumentFragment();

        products.forEach(product => {

            fragment.appendChild(

                createProductCard(product)

            );

        });

        container.appendChild(fragment);

        return true;

    }

    /* ========================================================

       22. LOCALISATION DES SECTIONS DE L'INDEX

       ======================================================== */

    function getSections() {

        return {

            featured:

                findElementByIds([

                    "featured-products",

                    "featuredProducts",

                    "products-featured"

                ]) ||

                findSectionByDataName([

                    "featured",

                    "featured-products",

                    "produits-mis-en-avant"

                ]) ||

                findSectionByTitle([

                    "Produits mis en avant"

                ]),

            newest:

                findElementByIds([

                    "new-products",

                    "newProducts",

                    "products-new",

                    "nouveautes"

                ]) ||

                findSectionByDataName([

                    "new",

                    "newest",

                    "nouveautes"

                ]) ||

                findSectionByTitle([

                    "Nouveautés"

                ]),

            popular:

                findElementByIds([

                    "popular-products",

                    "popularProducts",

                    "products-popular",

                    "populaires"

                ]) ||

                findSectionByDataName([

                    "popular",

                    "populaires",

                    "products-popular"

                ]) ||

                findSectionByTitle([

                    "Produits populaires",

                    "Populaires"

                ]),

            promotions:

                findElementByIds([

                    "promotion-products",

                    "promotionProducts",

                    "products-promotions",

                    "promotions"

                ]) ||

                findSectionByDataName([

                    "promotion",

                    "promotions"

                ]) ||

                findSectionByTitle([

                    "Promotions"

                ])

        };

    }

    /* ========================================================

       23. MASQUER UNE SECTION VIDE

       ======================================================== */

    function handleEmptySection(

        section,

        products,

        options = {}

    ) {

        if (!section) return;

        const {

            hideWhenEmpty = false

        } = options;

        if (

            hideWhenEmpty &&

            products.length === 0

        ) {

            section.hidden = true;

            section.classList.add(

                "mb-section-empty-hidden"

            );

            return;

        }

        section.hidden = false;

        section.classList.remove(

            "mb-section-empty-hidden"

        );

    }

    /* ========================================================

       24. AJOUTER LES STYLES NÉCESSAIRES

       ======================================================== */

    function injectStyles() {

        if (

            document.getElementById(

                "market-bouake-products-js-styles"

            )

        ) {

            return;

        }

        const style =

            document.createElement("style");

        style.id =

            "market-bouake-products-js-styles";

        style.textContent = `

            .mb-products-grid {

                display: grid;

                grid-template-columns:

                    repeat(2, minmax(0, 1fr));

                gap: 14px;

                width: 100%;

            }

            .mb-product-card {

                position: relative;

                min-width: 0;

                background: #ffffff;

                border: 1px solid #e2e8f0;

                border-radius: 18px;

                overflow: hidden;

                box-shadow:

                    0 4px 14px rgba(15, 23, 42, .05);

                transition:

                    transform .2s ease,

                    box-shadow .2s ease;

            }

            .mb-product-card:hover {

                transform: translateY(-2px);

                box-shadow:

                    0 10px 25px rgba(15, 23, 42, .09);

            }

            .mb-product-image-wrap {

                position: relative;

                aspect-ratio: 1 / 1;

                background: #f8fafc;

                overflow: hidden;

            }

            .mb-product-image-link {

                display: block;

                width: 100%;

                height: 100%;

            }

            .mb-product-image {

                width: 100%;

                height: 100%;

                display: block;

                object-fit: cover;

                transition: transform .25s ease;

            }

            .mb-product-card:hover

            .mb-product-image {

                transform: scale(1.025);

            }

            .mb-product-favorite-btn {

                position: absolute;

                top: 10px;

                right: 10px;

                width: 38px;

                height: 38px;

                display: grid;

                place-items: center;

                border: 1px solid #e2e8f0;

                border-radius: 50%;

                background: rgba(255,255,255,.95);

                color: #64748b;

                cursor: pointer;

                z-index: 3;

            }

            .mb-product-favorite-btn:hover {

                color: #ef4444;

            }

            .mb-product-type {

                position: absolute;

                left: 10px;

                top: 10px;

                padding: 5px 9px;

                border-radius: 999px;

                background: #2563eb;

                color: #ffffff;

                font-size: 11px;

                font-weight: 700;

                z-index: 2;

            }

            .mb-product-body {

                padding: 13px;

            }

            .mb-product-category {

                margin-bottom: 5px;

                color: #64748b;

                font-size: 11px;

                font-weight: 600;

                text-transform: uppercase;

                letter-spacing: .02em;

            }

            .mb-product-name {

                display: -webkit-box;

                color: #0f172a;

                font-size: 14px;

                line-height: 1.4;

                font-weight: 700;

                text-decoration: none;

                overflow: hidden;

                -webkit-line-clamp: 2;

                -webkit-box-orient: vertical;

                min-height: 39px;

            }

            .mb-product-name:hover {

                color: #2563eb;

            }

            .mb-product-price {

                margin-top: 8px;

                color: #0f172a;

                font-size: 17px;

                font-weight: 800;

            }

            .mb-product-location {

                display: flex;

                align-items: center;

                gap: 5px;

                margin-top: 6px;

                color: #64748b;

                font-size: 12px;

            }

            .mb-product-sizes {

                display: flex;

                flex-wrap: wrap;

                gap: 5px;

                margin-top: 8px;

            }

            .mb-product-sizes span {

                padding: 4px 7px;

                border: 1px solid #e2e8f0;

                border-radius: 6px;

                color: #475569;

                background: #f8fafc;

                font-size: 11px;

            }

            .mb-product-seller {

                margin-top: 8px;

                color: #64748b;

                font-size: 12px;

                overflow: hidden;

                white-space: nowrap;

                text-overflow: ellipsis;

            }

            .mb-product-meta {

                min-height: 22px;

                margin-top: 7px;

            }

            .mb-product-stock {

                display: inline-flex;

                align-items: center;

                padding: 4px 7px;

                border-radius: 999px;

                font-size: 10px;

                font-weight: 700;

            }

            .mb-product-stock.is-available {

                color: #166534;

                background: #f0fdf4;

            }

            .mb-product-stock.is-out-of-stock {

                color: #b91c1c;

                background: #fef2f2;

            }

            .mb-product-actions {

                display: flex;

                flex-direction: column;

                gap: 8px;

                margin-top: 10px;

            }

            .mb-product-view-btn,

            .mb-product-cart-btn {

                width: 100%;

                min-height: 40px;

                display: inline-flex;

                align-items: center;

                justify-content: center;

                gap: 7px;

                padding: 9px 10px;

                border-radius: 10px;

                font-size: 12px;

                font-weight: 700;

                cursor: pointer;

                text-decoration: none;

                box-sizing: border-box;

            }

            .mb-product-view-btn {

                border: 1px solid #2563eb;

                background: #ffffff;

                color: #2563eb;

            }

            .mb-product-view-btn:hover {

                background: #eff6ff;

            }

            .mb-product-cart-btn {

                border: 1px solid #2563eb;

                background: #2563eb;

                color: #ffffff;

            }

            .mb-product-cart-btn:hover:not(:disabled) {

                background: #1d4ed8;

            }

            .mb-product-cart-btn:disabled {

                border-color: #e2e8f0;

                background: #f1f5f9;

                color: #94a3b8;

                cursor: not-allowed;

            }

            .mb-products-empty {

                width: 100%;

                min-height: 180px;

                display: flex;

                flex-direction: column;

                align-items: center;

                justify-content: center;

                gap: 7px;

                padding: 25px;

                border: 1px dashed #cbd5e1;

                border-radius: 16px;

                background: #f8fafc;

                color: #64748b;

                text-align: center;

                box-sizing: border-box;

            }

            .mb-products-empty strong {

                color: #0f172a;

                font-size: 14px;

            }

            .mb-products-empty span {

                max-width: 380px;

                font-size: 12px;

                line-height: 1.5;

            }

            .mb-products-empty-icon {

                width: 56px;

                height: 56px;

                display: grid;

                place-items: center;

                border-radius: 50%;

                background: #ffffff;

                color: #94a3b8;

                border: 1px solid #e2e8f0;

            }

            .mb-section-empty-hidden {

                display: none !important;

            }

            @media (min-width: 640px) {

                .mb-products-grid {

                    grid-template-columns:

                        repeat(3, minmax(0, 1fr));

                    gap: 16px;

                }

            }

            @media (min-width: 900px) {

                .mb-products-grid {

                    grid-template-columns:

                        repeat(4, minmax(0, 1fr));

                    gap: 18px;

                }

                .mb-product-body {

                    padding: 15px;

                }

            }

            @media (min-width: 1200px) {

                .mb-products-grid {

                    grid-template-columns:

                        repeat(5, minmax(0, 1fr));

                }

            }

        `;

        document.head.appendChild(style);

    }

    /* ========================================================

       25. ERREUR D'AFFICHAGE

       ======================================================== */

    function renderProductsError(section) {

        if (!section) return;

        const container =

            getProductContainer(section);

        if (!container) return;

        container.innerHTML = `

            <div class="mb-products-empty">

                <div class="mb-products-empty-icon">

                    <svg

                        viewBox="0 0 24 24"

                        width="34"

                        height="34"

                        fill="none"

                        stroke="currentColor"

                        stroke-width="1.7"

                        stroke-linecap="round"

                        stroke-linejoin="round"

                    >

                        <circle cx="12" cy="12" r="9"/>

                        <path d="M12 8v4"/>

                        <path d="M12 16h.01"/>

                    </svg>

                </div>

                <strong>

                    Impossible de charger les produits

                </strong>

                <span>

                    Vérifiez la connexion à Market Bouaké

                    puis réessayez.

                </span>

            </div>

        `;

    }

    /* ========================================================

       26. GESTION DU BOUTON "VOIR LE PRODUIT"

       ======================================================== */

    function setupProductNavigation() {

        document.addEventListener(

            "click",

            event => {

                const viewButton =

                    event.target.closest(

                        "[data-product-action='view']"

                    );

                if (!viewButton) {

                    return;

                }

                const productId =

                    viewButton.dataset.productId;

                if (!isValidUUID(productId)) {

                    event.preventDefault();

                    console.error(

                        "Market Bouaké : ID produit invalide.",

                        productId

                    );

                    return;

                }

                /*

                 * Le href de la carte est déjà :

                 * produit.html?id=UUID

                 *

                 * On laisse donc le navigateur

                 * effectuer la navigation normalement.

                 */

            }

        );

    }

    /* ========================================================

       27. GESTION IMAGE DE SECOURS

       ======================================================== */

    function setupImageFallback() {

        document.addEventListener(

            "error",

            event => {

                const image = event.target;

                if (

                    image instanceof HTMLImageElement &&

                    image.classList.contains(

                        "mb-product-image"

                    )

                ) {

                    if (

                        image.src !==

                        CONFIG.imageFallback

                    ) {

                        image.src =

                            CONFIG.imageFallback;

                    }

                }

            },

            true

        );

    }

    /* ========================================================

       28. ÉVÉNEMENT POUR LES AUTRES MODULES

       ======================================================== */

    function dispatchProductsReady() {

        document.dispatchEvent(

            new CustomEvent(

                "marketbouake:products-ready",

                {

                    detail: {

                        products:

                            state.allProducts,

                        featured:

                            state.featuredProducts,

                        newest:

                            state.newestProducts,

                        popular:

                            state.popularProducts,

                        promotions:

                            state.promotionProducts

                    }

                }

            )

        );

    }

    /* ========================================================

       29. RENDU PRINCIPAL

       ======================================================== */

    function renderHomeProducts() {

        const sections =

            getSections();

        /*

         * Produits mis en avant

         */

        if (sections.featured) {

            renderProductsToSection(

                state.featuredProducts,

                sections.featured

            );

            handleEmptySection(

                sections.featured,

                state.featuredProducts

            );

        }

        /*

         * Nouveautés

         */

        if (sections.newest) {

            renderProductsToSection(

                state.newestProducts,

                sections.newest

            );

            handleEmptySection(

                sections.newest,

                state.newestProducts

            );

        }

        /*

         * Populaires

         */

        if (sections.popular) {

            renderProductsToSection(

                state.popularProducts,

                sections.popular

            );

            handleEmptySection(

                sections.popular,

                state.popularProducts

            );

        }

        /*

         * Promotions

         *

         * Pour l'instant aucun système de promotion

         * réel n'existe dans les colonnes fournies.

         *

         * On garde donc la section propre sans inventer

         * de réduction.

         */

        if (sections.promotions) {

            if (

                state.promotionProducts.length

            ) {

                renderProductsToSection(

                    state.promotionProducts,

                    sections.promotions

                );

                sections.promotions.hidden =

                    false;

            } else {

                sections.promotions.hidden =

                    true;

            }

        }

    }

    /* ========================================================

       30. INITIALISATION

       ======================================================== */

    async function initProducts() {

        if (state.initialized) {

            return;

        }

        state.initialized = true;

        injectStyles();

        setupProductNavigation();

        setupImageFallback();

        const sections =

            getSections();

        try {

            /*

             * Chargement des produits

             */

            const products =

                await fetchProducts();

            state.allProducts =

                Array.isArray(products)

                    ? products

                    : [];

            /*

             * Chargement parallèle des informations

             * complémentaires.

             */

            const [

                categories,

                shops

            ] = await Promise.all([

                fetchCategories(),

                fetchShops()

            ]);

            state.categories =

                Array.isArray(categories)

                    ? categories

                    : [];

            state.shops =

                Array.isArray(shops)

                    ? shops

                    : [];

            /*

             * Profils vendeurs

             */

            state.profiles =

                await fetchProfilesForProducts(

                    state.allProducts

                );

            /*

             * Produits mis en avant

             */

            state.featuredProducts =

                await fetchFeaturedProducts(

                    state.allProducts

                );

            /*

             * Nouveautés

             */

            state.newestProducts =

                buildNewestProducts(

                    state.allProducts

                );

            /*

             * Populaires

             */

            state.popularProducts =

                buildPopularProducts(

                    state.allProducts

                );

            /*

             * Promotions

             */

            state.promotionProducts =

                buildPromotionProducts(

                    state.allProducts

                );

            /*

             * Rendu

             */

            renderHomeProducts();

            /*

             * Notification aux autres modules.

             */

            dispatchProductsReady();

            /*

             * Informations de diagnostic.

             */

            console.info(

                "Market Bouaké — produits chargés :",

                state.allProducts.length

            );

            console.info(

                "Market Bouaké — produits mis en avant :",

                state.featuredProducts.length

            );

            console.info(

                "Market Bouaké — nouveautés :",

                state.newestProducts.length

            );

            console.info(

                "Market Bouaké — populaires :",

                state.popularProducts.length

            );

        } catch (error) {

            console.error(

                "Market Bouaké — erreur de chargement des produits :",

                error

            );

            /*

             * Affichage propre d'une erreur dans les sections

             * au lieu de laisser une page vide.

             */

            Object.values(sections).forEach(

                section => {

                    if (section) {

                        renderProductsError(

                            section

                        );

                    }

                }

            );

            document.dispatchEvent(

                new CustomEvent(

                    "marketbouake:products-error",

                    {

                        detail: {

                            error

                        }

                    }

                )

            );

        }

    }

    /* ========================================================

       31. API PUBLIQUE DU MODULE

       ======================================================== */

    window.MarketBouakeProducts = {

        init: initProducts,

        getAll() {

            return [...state.allProducts];

        },

        getFeatured() {

            return [

                ...state.featuredProducts

            ];

        },

        getNewest() {

            return [

                ...state.newestProducts

            ];

        },

        getPopular() {

            return [

                ...state.popularProducts

            ];

        },

        getPromotions() {

            return [

                ...state.promotionProducts

            ];

        },

        getById(id) {

            return state.allProducts.find(

                product =>

                    product.id === id

            ) || null;

        },

        getCategories() {

            return [...state.categories];

        }

    };

    /* ========================================================

       32. LANCEMENT

       ======================================================== */

    if (

        document.readyState ===

        "loading"

    ) {

        document.addEventListener(

            "DOMContentLoaded",

            initProducts,

            { once: true }

        );

    } else {

        initProducts();

    }

})();
