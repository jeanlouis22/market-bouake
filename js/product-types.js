/* ============================================================

   MARKET BOUAKÉ

   product-types.js

   JOUR 4 — TYPES ET MODES DE TRANSACTION DES PRODUITS

   FICHIER DÉFINITIF

   ------------------------------------------------------------

   RESPONSABILITÉS

   ------------------------------------------------------------

   - déterminer le type réel d'une offre

   - déterminer son mode de transaction

   - gérer les produits classiques

   - gérer les produits sur réservation

   - gérer les offres nécessitant un contact

   - gérer les offres "Je suis intéressé"

   - gérer les offres avec plusieurs modes

   - déterminer les options disponibles

   - déterminer si la quantité est applicable

   - déterminer si les tailles sont applicables

   - préparer les informations nécessaires à produit.html

   ------------------------------------------------------------

   NE GÈRE PAS

   ------------------------------------------------------------

   - panier complet → Jour 5

   - favoris complet → Jour 5

   - recherche → Jour 6

   - catégories interactives → Jour 6

   - thèmes → Jour 7

   - immobilier complet → Jour 8

   - authentification → Jour 9

   IMPORTANT

   Aucun texte, prix, option ou caractéristique fictive

   n'est créé par ce module.

   ============================================================ */

(() => {

    "use strict";

    /* ========================================================

       1. CONFIGURATION

       ======================================================== */

    const CONFIG = {

        defaultType: "product",

        defaultTransaction: "cart",

        transactionModes: [

            "cart",

            "reservation",

            "interest",

            "contact",

            "cart_reservation",

            "reservation_interest",

            "cart_contact",

            "interest_contact"

        ]

    };

    /* ========================================================

       2. OUTILS

       ======================================================== */

    function normalize(value) {

        return String(value || "")

            .normalize("NFD")

            .replace(/[\u0300-\u036f]/g, "")

            .toLowerCase()

            .trim();

    }

    function hasValue(value) {

        return (

            value !== undefined &&

            value !== null &&

            String(value).trim() !== ""

        );

    }

    function toBoolean(value) {

        if (typeof value === "boolean") {

            return value;

        }

        if (typeof value === "number") {

            return value !== 0;

        }

        const valueNormalized = normalize(value);

        return (

            valueNormalized === "true" ||

            valueNormalized === "1" ||

            valueNormalized === "yes" ||

            valueNormalized === "oui"

        );

    }

    function arrayValue(value) {

        if (Array.isArray(value)) {

            return value.filter(item =>

                hasValue(item)

            );

        }

        return [];

    }

    /* ========================================================

       3. DÉTECTION IMMOBILIER / RÉSIDENCE

       ======================================================== */

    function isRealEstate(product) {

        if (!product) {

            return false;

        }

        const type = normalize(

            product.product_type ||

            product.type ||

            product.offer_type ||

            product.property_type

        );

        const category = normalize(

            product.category_name ||

            product.category?.name ||

            product.category

        );

        const realEstateWords = [

            "immobilier",

            "immobilier & residence",

            "immobilier et residence",

            "maison",

            "appartement",

            "studio",

            "terrain",

            "villa",

            "residence",

            "résidence",

            "logement",

            "location"

        ];

        if (

            realEstateWords.some(word =>

                type.includes(normalize(word))

            )

        ) {

            return true;

        }

        if (

            realEstateWords.some(word =>

                category.includes(normalize(word))

            )

        ) {

            return true;

        }

        const propertyFields = [

            "property_type",

            "monthly_price",

            "deposit_amount",

            "rooms_count",

            "bedrooms_count",

            "check_in_time",

            "check_out_time",

            "capacity"

        ];

        return propertyFields.some(field =>

            product[field] !== undefined &&

            product[field] !== null

        );

    }

    /* ========================================================

       4. DÉTECTION RÉSIDENCE

       ======================================================== */

    function isResidence(product) {

        if (!product) {

            return false;

        }

        const values = [

            product.product_type,

            product.type,

            product.offer_type,

            product.property_type,

            product.category_name,

            product.category?.name

        ]

            .filter(hasValue)

            .map(normalize);

        return values.some(value =>

            value.includes("residence") ||

            value.includes("résidence")

        );

    }

    /* ========================================================

       5. DÉTECTION PRODUIT CLASSIQUE

       ======================================================== */

    function isStandardProduct(product) {

        if (!product) {

            return false;

        }

        return !isRealEstate(product);

    }

    /* ========================================================

       6. DÉTECTION MODE DE TRANSACTION

       ======================================================== */

    function getExplicitTransactionMode(product) {

        if (!product) {

            return null;

        }

        const possibleFields = [

            "transaction_mode",

            "transaction_type",

            "purchase_mode",

            "order_mode",

            "sales_mode",

            "selling_mode",

            "action_type"

        ];

        for (const field of possibleFields) {

            if (!hasValue(product[field])) {

                continue;

            }

            const value = normalize(

                product[field]

            );

            if (

                value === "cart" ||

                value === "panier" ||

                value === "achat"

            ) {

                return "cart";

            }

            if (

                value === "reservation" ||

                value === "reserve" ||

                value === "reserver"

            ) {

                return "reservation";

            }

            if (

                value === "interest" ||

                value === "interested" ||

                value === "interesse" ||

                value === "interesse"

            ) {

                return "interest";

            }

            if (

                value === "contact" ||

                value === "contact_seller" ||

                value === "contact_vendeur"

            ) {

                return "contact";

            }

            if (

                value === "cart_reservation" ||

                value === "panier_reservation"

            ) {

                return "cart_reservation";

            }

            if (

                value === "reservation_interest"

            ) {

                return "reservation_interest";

            }

            if (

                value === "cart_contact"

            ) {

                return "cart_contact";

            }

            if (

                value === "interest_contact"

            ) {

                return "interest_contact";

            }

        }

        return null;

    }

    /* ========================================================

       7. DÉTECTION DES DRAPEAUX DE TRANSACTION

       ======================================================== */

    function getTransactionFlags(product) {

        if (!product) {

            return {

                cart: false,

                reservation: false,

                interest: false,

                contact: false

            };

        }

        return {

            cart:

                toBoolean(product.allow_cart) ||

                toBoolean(product.can_add_to_cart) ||

                toBoolean(product.is_cart_enabled),

            reservation:

                toBoolean(product.allow_reservation) ||

                toBoolean(product.reservable) ||

                toBoolean(product.is_reservable) ||

                toBoolean(product.requires_reservation),

            interest:

                toBoolean(product.allow_interest) ||

                toBoolean(product.is_interest_enabled) ||

                toBoolean(product.interest_enabled),

            contact:

                toBoolean(product.allow_contact) ||

                toBoolean(product.contact_required) ||

                toBoolean(product.contact_to_order)

        };

    }

    /* ========================================================

       8. MODE PAR DÉFAUT

       ======================================================== */

    function getDefaultTransactionMode(product) {

        if (isResidence(product)) {

            return "reservation";

        }

        if (isRealEstate(product)) {

            return "interest";

        }

        return CONFIG.defaultTransaction;

    }

    /* ========================================================

       9. MODE FINAL

       ======================================================== */

    function getTransactionMode(product) {

        if (!product) {

            return CONFIG.defaultTransaction;

        }

        const explicit =

            getExplicitTransactionMode(product);

        if (explicit) {

            return explicit;

        }

        const flags =

            getTransactionFlags(product);

        const activeModes = [];

        if (flags.cart) {

            activeModes.push("cart");

        }

        if (flags.reservation) {

            activeModes.push("reservation");

        }

        if (flags.interest) {

            activeModes.push("interest");

        }

        if (flags.contact) {

            activeModes.push("contact");

        }

        if (activeModes.length === 1) {

            return activeModes[0];

        }

        if (

            flags.cart &&

            flags.reservation

        ) {

            return "cart_reservation";

        }

        if (

            flags.reservation &&

            flags.interest

        ) {

            return "reservation_interest";

        }

        if (

            flags.cart &&

            flags.contact

        ) {

            return "cart_contact";

        }

        if (

            flags.interest &&

            flags.contact

        ) {

            return "interest_contact";

        }

        return getDefaultTransactionMode(

            product

        );

    }

    /* ========================================================

       10. ACTIONS DISPONIBLES

       ======================================================== */

    function getActions(product) {

        const mode =

            getTransactionMode(product);

        const actions = {

            cart: false,

            reservation: false,

            interest: false,

            contact: false

        };

        switch (mode) {

            case "cart":

                actions.cart = true;

                break;

            case "reservation":

                actions.reservation = true;

                break;

            case "interest":

                actions.interest = true;

                break;

            case "contact":

                actions.contact = true;

                break;

            case "cart_reservation":

                actions.cart = true;

                actions.reservation = true;

                break;

            case "reservation_interest":

                actions.reservation = true;

                actions.interest = true;

                break;

            case "cart_contact":

                actions.cart = true;

                actions.contact = true;

                break;

            case "interest_contact":

                actions.interest = true;

                actions.contact = true;

                break;

        }

        return actions;

    }

    /* ========================================================

       11. QUANTITÉ

       ======================================================== */

    function canUseQuantity(product) {

        if (!product) {

            return false;

        }

        const actions =

            getActions(product);

        return (

            actions.cart === true &&

            !isRealEstate(product)

        );

    }

    /* ========================================================

       12. STOCK

       ======================================================== */

    function getStock(product) {

        if (!product) {

            return {

                known: false,

                quantity: null,

                available: false

            };

        }

        if (

            product.stock === undefined ||

            product.stock === null ||

            product.stock === ""

        ) {

            return {

                known: false,

                quantity: null,

                available: true

            };

        }

        const quantity = Number(

            product.stock

        );

        if (!Number.isFinite(quantity)) {

            return {

                known: false,

                quantity: null,

                available: true

            };

        }

        return {

            known: true,

            quantity,

            available: quantity > 0

        };

    }

    /* ========================================================

       13. OPTIONS DYNAMIQUES

       ======================================================== */

    function getOptions(product) {

        if (!product) {

            return [];

        }

        const options = [];

        /* ----------------------------------------------------

           SIZES / TAILLES

           ---------------------------------------------------- */

        const sizes =

            arrayValue(product.sizes);

        if (sizes.length) {

            options.push({

                key: "size",

                label: "Taille",

                type: "select",

                values: sizes

            });

        }

        /* ----------------------------------------------------

           AUTRES OPTIONS

           ---------------------------------------------------- */

        const possibleOptionFields = [

            "options",

            "product_options",

            "variants",

            "attributes"

        ];

        for (const field of possibleOptionFields) {

            const value = product[field];

            if (!value) {

                continue;

            }

            if (Array.isArray(value)) {

                value.forEach(option => {

                    if (!option) {

                        return;

                    }

                    if (

                        typeof option === "object" &&

                        hasValue(option.name)

                    ) {

                        options.push({

                            key:

                                option.key ||

                                normalize(option.name)

                                    .replace(/\s+/g, "_"),

                            label: option.name,

                            type:

                                option.type ||

                                "select",

                            values:

                                arrayValue(

                                    option.values

                                )

                        });

                    }

                });

            }

            else if (

                typeof value === "object"

            ) {

                Object.entries(value)

                    .forEach(

                        ([key, optionValue]) => {

                            if (

                                Array.isArray(

                                    optionValue

                                )

                            ) {

                                options.push({

                                    key,

                                    label: key,

                                    type: "select",

                                    values:

                                        optionValue

                                });

                            }

                        }

                    );

            }

        }

        return options;

    }

    /* ========================================================

       14. CARACTÉRISTIQUES

       ======================================================== */

    function getCharacteristics(product) {

        if (!product) {

            return [];

        }

        const result = [];

        const ignoredKeys = new Set([

            "id",

            "name",

            "description",

            "price",

            "old_price",

            "stock",

            "seller_id",

            "shop_id",

            "category_id",

            "category",

            "category_name",

            "image_url_1",

            "image_url_2",

            "image_url_3",

            "created_at",

            "updated_at",

            "is_active",

            "sizes",

            "options",

            "product_options",

            "variants",

            "attributes"

        ]);

        if (

            product.characteristics &&

            typeof product.characteristics ===

                "object"

        ) {

            Object.entries(

                product.characteristics

            ).forEach(([key, value]) => {

                if (!hasValue(value)) {

                    return;

                }

                result.push({

                    key,

                    label: key,

                    value

                });

            });

        }

        return result;

    }

    /* ========================================================

       15. GALERIE

       ======================================================== */

    function getImages(product) {

        if (!product) {

            return [];

        }

        const images = [

            product.image_url_1,

            product.image_url_2,

            product.image_url_3,

            product.image_url_4,

            product.image_url_5

        ]

            .filter(image =>

                typeof image === "string" &&

                image.trim()

            )

            .map(image => image.trim());

        return [

            ...new Set(images)

        ];

    }

    /* ========================================================

       16. PRIX

       ======================================================== */

    function getPricing(product) {

        if (!product) {

            return {

                price: null,

                oldPrice: null,

                hasPromotion: false

            };

        }

        const price =

            product.price !== undefined &&

            product.price !== null

                ? Number(product.price)

                : null;

        const oldPrice =

            product.old_price !== undefined &&

            product.old_price !== null

                ? Number(product.old_price)

                : null;

        const hasPromotion =

            Number.isFinite(price) &&

            Number.isFinite(oldPrice) &&

            oldPrice > price;

        let discount = null;

        if (hasPromotion) {

            discount = Math.round(

                ((oldPrice - price) /

                    oldPrice) *

                    100

            );

        }

        return {

            price,

            oldPrice:

                hasPromotion

                    ? oldPrice

                    : null,

            hasPromotion,

            discount

        };

    }

    /* ========================================================

       17. DISPONIBILITÉ

       ======================================================== */

    function getAvailability(product) {

        const stock =

            getStock(product);

        const actions =

            getActions(product);

        if (

            actions.cart &&

            stock.known &&

            stock.quantity <= 0

        ) {

            return {

                available: false,

                label: "Rupture de stock",

                stock

            };

        }

        return {

            available: true,

            label: "Disponible",

            stock

        };

    }

    /* ========================================================

       18. TYPE D'OFFRE

       ======================================================== */

    function getType(product) {

        if (isResidence(product)) {

            return "residence";

        }

        if (isRealEstate(product)) {

            return "real_estate";

        }

        return CONFIG.defaultType;

    }

    /* ========================================================

       19. LIBELLÉ DU TYPE

       ======================================================== */

    function getTypeLabel(product) {

        const type =

            getType(product);

        switch (type) {

            case "residence":

                return "Résidence";

            case "real_estate":

                return "Immobilier";

            default:

                return "Produit";

        }

    }

    /* ========================================================

       20. RÉSUMÉ COMPLET

       ======================================================== */

    function analyze(product) {

        if (!product) {

            return null;

        }

        return {

            id: product.id || null,

            type: getType(product),

            typeLabel:

                getTypeLabel(product),

            isStandardProduct:

                isStandardProduct(product),

            isRealEstate:

                isRealEstate(product),

            isResidence:

                isResidence(product),

            transactionMode:

                getTransactionMode(product),

            actions:

                getActions(product),

            quantityEnabled:

                canUseQuantity(product),

            stock:

                getStock(product),

            availability:

                getAvailability(product),

            options:

                getOptions(product),

            characteristics:

                getCharacteristics(product),

            images:

                getImages(product),

            pricing:

                getPricing(product)

        };

    }

    /* ========================================================

       21. VALIDATION DU PRODUIT

       ======================================================== */

    function validate(product) {

        const errors = [];

        const warnings = [];

        if (!product) {

            errors.push(

                "Produit inexistant."

            );

            return {

                valid: false,

                errors,

                warnings

            };

        }

        if (!hasValue(product.id)) {

            errors.push(

                "Identifiant du produit absent."

            );

        }

        if (!hasValue(product.name)) {

            errors.push(

                "Nom du produit absent."

            );

        }

        const actions =

            getActions(product);

        const stock =

            getStock(product);

        if (

            actions.cart &&

            stock.known &&

            stock.quantity <= 0

        ) {

            warnings.push(

                "Le produit est en rupture de stock."

            );

        }

        if (

            getImages(product).length === 0

        ) {

            warnings.push(

                "Aucune image du produit n'est disponible."

            );

        }

        return {

            valid: errors.length === 0,

            errors,

            warnings

        };

    }

    /* ========================================================

       22. API PUBLIQUE

       ======================================================== */

    window.MarketBouakeProductTypes = {

        CONFIG,

        normalize,

        isRealEstate,

        isResidence,

        isStandardProduct,

        getType,

        getTypeLabel,

        getTransactionMode,

        getActions,

        getStock,

        canUseQuantity,

        getOptions,

        getCharacteristics,

        getImages,

        getPricing,

        getAvailability,

        analyze,

        validate

    };

    /* ========================================================

       23. ÉVÉNEMENT DE DISPONIBILITÉ

       ======================================================== */

    document.dispatchEvent(

        new CustomEvent(

            "marketbouake:product-types-ready"

        )

    );

    console.info(

        "Market Bouaké — product-types.js chargé."

    );

})();
