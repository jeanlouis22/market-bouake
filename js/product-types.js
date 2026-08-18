/* ============================================================

   MARKET BOUAKÉ

   product-types.js

   JOUR 4 — FICHIER DÉFINITIF

   ============================================================

   Rôle :

   - Identifier le type réel d'une annonce/produit

   - Déterminer les actions pertinentes

   - Déterminer les caractéristiques pertinentes

   - Ne jamais inventer de données

   - Préparer la fiche produit pour les futurs modules

   IMPORTANT :

   Ce fichier ne gère PAS :

   - le panier complet       → Jour 5

   - les favoris complets    → Jour 5

   - la recherche            → Jour 6

   - la réservation complète → Jour 8

   - l'espace vendeur        → Jour 11

   Il sert uniquement à déterminer le comportement d'affichage.

============================================================ */

(function () {

    "use strict";

    const MarketBouakeProductTypes = {

        /* ======================================================

           TYPES PRINCIPAUX

        ====================================================== */

        TYPES: Object.freeze({

            STANDARD: "standard",

            PROPERTY: "property",

            RESIDENCE: "residence",

            SERVICE: "service",

            RESERVATION: "reservation"

        }),

        /* ======================================================

           MODES D'ACTION

        ====================================================== */

        ACTIONS: Object.freeze({

            CART: "cart",

            INTEREST: "interest",

            RESERVATION: "reservation",

            CONTACT: "contact"

        }),

        /* ======================================================

           TYPES IMMOBILIERS RECONNUS

        ====================================================== */

        PROPERTY_KEYWORDS: Object.freeze([

            "immobilier",

            "maison",

            "appartement",

            "studio",

            "terrain",

            "villa",

            "résidence",

            "residence",

            "logement",

            "location",

            "propriété",

            "propriete"

        ]),

        /* ======================================================

           NORMALISATION

        ====================================================== */

        normalize(value) {

            if (value === null || value === undefined) {

                return "";

            }

            return String(value)

                .trim()

                .toLowerCase()

                .normalize("NFD")

                .replace(/[\u0300-\u036f]/g, "");

        },

        /* ======================================================

           TEST IMMOBILIER

        ====================================================== */

        isProperty(product) {

            if (!product || typeof product !== "object") {

                return false;

            }

            /*

             * Les produits immobiliers possèdent actuellement

             * plusieurs colonnes spécifiques dans Supabase :

             *

             * property_type

             * monthly_price

             * deposit_amount

             * location

             * rooms_count

             * bedrooms_count

             * availability

             * conditions

             * check_in_time

             * check_out_time

             * capacity

             * amenities

             * pricing_type

             */

            const propertyFields = [

                product.property_type,

                product.monthly_price,

                product.deposit_amount,

                product.rooms_count,

                product.bedrooms_count,

                product.check_in_time,

                product.check_out_time,

                product.capacity,

                product.amenities,

                product.pricing_type

            ];

            const hasPropertyData = propertyFields.some(value => {

                return value !== null &&

                       value !== undefined &&

                       value !== "";

            });

            if (hasPropertyData) {

                return true;

            }

            /*

             * Vérification complémentaire du nom.

             */

            const name = this.normalize(product.name);

            if (

                name &&

                this.PROPERTY_KEYWORDS.some(keyword => {

                    return name.includes(this.normalize(keyword));

                })

            ) {

                return true;

            }

            return false;

        },

        /* ======================================================

           TYPE IMMOBILIER

        ====================================================== */

        getPropertyType(product) {

            if (!product) {

                return null;

            }

            const type = this.normalize(product.property_type);

            if (type) {

                return type;

            }

            const name = this.normalize(product.name);

            if (name.includes("residence") ||

                name.includes("studio meubl") ||

                name.includes("appartement meubl")) {

                return this.TYPES.RESIDENCE;

            }

            return this.TYPES.PROPERTY;

        },

        /* ======================================================

           DÉTERMINATION DU TYPE

        ====================================================== */

        getType(product) {

            if (!product || typeof product !== "object") {

                return this.TYPES.STANDARD;

            }

            if (this.isProperty(product)) {

                const propertyType = this.getPropertyType(product);

                if (

                    propertyType === "residence" ||

                    propertyType === "residence meublee" ||

                    propertyType === "residence meuble"

                ) {

                    return this.TYPES.RESIDENCE;

                }

                return this.TYPES.PROPERTY;

            }

            return this.TYPES.STANDARD;

        },

        /* ======================================================

           MODE DE TRANSACTION

        ====================================================== */

        getTransactionMode(product) {

            const type = this.getType(product);

            /*

             * Immobilier :

             * pas de panier commercial classique.

             */

            if (type === this.TYPES.PROPERTY) {

                return this.ACTIONS.INTEREST;

            }

            /*

             * Résidence :

             * réservation préparée.

             *

             * La réservation complète sera développée

             * au JOUR 8.

             */

            if (type === this.TYPES.RESIDENCE) {

                return this.ACTIONS.RESERVATION;

            }

            /*

             * Pour les produits standards, le comportement

             * actuel est l'achat via panier.

             */

            return this.ACTIONS.CART;

        },

        /* ======================================================

           ACTIONS DISPONIBLES

        ====================================================== */

        getAvailableActions(product) {

            const mode = this.getTransactionMode(product);

            switch (mode) {

                case this.ACTIONS.INTEREST:

                    return Object.freeze([

                        this.ACTIONS.INTEREST,

                        this.ACTIONS.CONTACT

                    ]);

                case this.ACTIONS.RESERVATION:

                    return Object.freeze([

                        this.ACTIONS.RESERVATION,

                        this.ACTIONS.CONTACT

                    ]);

                case this.ACTIONS.CONTACT:

                    return Object.freeze([

                        this.ACTIONS.CONTACT

                    ]);

                case this.ACTIONS.CART:

                default:

                    return Object.freeze([

                        this.ACTIONS.CART,

                        this.ACTIONS.CONTACT

                    ]);

            }

        },

        /* ======================================================

           PANIER AUTORISÉ ?

        ====================================================== */

        canUseCart(product) {

            return this.getTransactionMode(product) === this.ACTIONS.CART;

        },

        /* ======================================================

           RÉSERVATION AUTORISÉE ?

        ====================================================== */

        canReserve(product) {

            return this.getTransactionMode(product) === this.ACTIONS.RESERVATION;

        },

        /* ======================================================

           INTÉRESSÉ AUTORISÉ ?

        ====================================================== */

        canShowInterest(product) {

            return this.getTransactionMode(product) === this.ACTIONS.INTEREST;

        },

        /* ======================================================

           OPTIONS DE TAILLE

        ====================================================== */

        hasSizes(product) {

            if (!product || !Array.isArray(product.sizes)) {

                return false;

            }

            return product.sizes.some(size => {

                return size !== null &&

                       size !== undefined &&

                       String(size).trim() !== "";

            });

        },

        getSizes(product) {

            if (!this.hasSizes(product)) {

                return [];

            }

            return product.sizes

                .map(size => String(size).trim())

                .filter(Boolean);

        },

        /* ======================================================

           STOCK

        ====================================================== */

        getStock(product) {

            if (!product) {

                return 0;

            }

            const stock = Number(product.stock);

            if (!Number.isFinite(stock) || stock < 0) {

                return 0;

            }

            return stock;

        },

        isOutOfStock(product) {

            /*

             * Le stock concerne principalement les produits

             * commerciaux.

             *

             * Pour l'immobilier/résidence, on ne considère

             * pas automatiquement stock = 0 comme une rupture

             * commerciale.

             */

            if (!this.canUseCart(product)) {

                return false;

            }

            return this.getStock(product) <= 0;

        },

        /* ======================================================

           PROMOTION

        ====================================================== */

        getPrice(product) {

            if (!product) {

                return 0;

            }

            const price = Number(product.price);

            return Number.isFinite(price) && price >= 0

                ? price

                : 0;

        },

        /*

         * La table products actuelle ne contient pas encore

         * de colonne "old_price".

         *

         * Nous ne fabriquons donc aucune promotion.

         *

         * Cette fonction est volontairement préparée pour

         * accepter plus tard les vraies données de promotion.

         */

        getPromotion(product) {

            if (!product || typeof product !== "object") {

                return null;

            }

            const oldPrice = Number(

                product.old_price ??

                product.original_price ??

                product.previous_price

            );

            const newPrice = Number(

                product.new_price ??

                product.sale_price

            );

            if (

                Number.isFinite(oldPrice) &&

                Number.isFinite(newPrice) &&

                oldPrice > 0 &&

                newPrice >= 0 &&

                newPrice < oldPrice

            ) {

                const percentage = Math.round(

                    ((oldPrice - newPrice) / oldPrice) * 100

                );

                return Object.freeze({

                    active: true,

                    oldPrice,

                    newPrice,

                    percentage

                });

            }

            return Object.freeze({

                active: false,

                oldPrice: null,

                newPrice: null,

                percentage: null

            });

        },

        /* ======================================================

           CARACTÉRISTIQUES

        ====================================================== */

        getCharacteristics(product) {

            if (!product) {

                return [];

            }

            const characteristics = [];

            /*

             * Immobilier

             */

            if (this.isProperty(product)) {

                this.addCharacteristic(

                    characteristics,

                    "Type",

                    product.property_type

                );

                this.addCharacteristic(

                    characteristics,

                    "Localisation",

                    product.location

                );

                this.addCharacteristic(

                    characteristics,

                    "Pièces",

                    product.rooms_count

                );

                this.addCharacteristic(

                    characteristics,

                    "Chambres",

                    product.bedrooms_count

                );

                this.addCharacteristic(

                    characteristics,

                    "Disponibilité",

                    product.availability

                );

                this.addCharacteristic(

                    characteristics,

                    "Capacité",

                    product.capacity

                );

                this.addCharacteristic(

                    characteristics,

                    "Équipements",

                    product.amenities

                );

                this.addCharacteristic(

                    characteristics,

                    "Conditions",

                    product.conditions

                );

                this.addCharacteristic(

                    characteristics,

                    "Type de tarification",

                    product.pricing_type

                );

                this.addCharacteristic(

                    characteristics,

                    "Heure d'arrivée",

                    product.check_in_time

                );

                this.addCharacteristic(

                    characteristics,

                    "Heure de départ",

                    product.check_out_time

                );

                return characteristics;

            }

            /*

             * Produit standard

             *

             * On n'invente aucune caractéristique.

             * Les tailles existantes sont simplement récupérées.

             */

            if (this.hasSizes(product)) {

                characteristics.push({

                    key: "sizes",

                    label: "Tailles disponibles",

                    value: this.getSizes(product).join(", ")

                });

            }

            return characteristics;

        },

        addCharacteristic(list, label, value) {

            if (

                value === null ||

                value === undefined ||

                String(value).trim() === ""

            ) {

                return;

            }

            list.push({

                key: this.normalize(label).replace(/\s+/g, "_"),

                label,

                value

            });

        },

        /* ======================================================

           INFORMATIONS DE DISPONIBILITÉ

        ====================================================== */

        getAvailability(product) {

            if (!product) {

                return {

                    available: false,

                    label: "Indisponible"

                };

            }

            if (this.isOutOfStock(product)) {

                return {

                    available: false,

                    label: "Rupture de stock"

                };

            }

            /*

             * Pour les produits immobiliers, on utilise la

             * disponibilité renseignée par le vendeur.

             */

            if (this.isProperty(product)) {

                if (product.availability) {

                    return {

                        available: true,

                        label: String(product.availability)

                    };

                }

                return {

                    available: true,

                    label: "Disponible"

                };

            }

            return {

                available: true,

                label: "Disponible"

            };

        },

        /* ======================================================

           RÉSUMÉ COMPLET POUR PRODUCT-DETAIL.JS

        ====================================================== */

        analyze(product) {

            const type = this.getType(product);

            const transactionMode = this.getTransactionMode(product);

            return Object.freeze({

                type,

                transactionMode,

                isProperty:

                    type === this.TYPES.PROPERTY ||

                    type === this.TYPES.RESIDENCE,

                isResidence:

                    type === this.TYPES.RESIDENCE,

                canUseCart:

                    this.canUseCart(product),

                canReserve:

                    this.canReserve(product),

                canShowInterest:

                    this.canShowInterest(product),

                canContact: true,

                hasSizes:

                    this.hasSizes(product),

                sizes:

                    this.getSizes(product),

                stock:

                    this.getStock(product),

                outOfStock:

                    this.isOutOfStock(product),

                availability:

                    this.getAvailability(product),

                promotion:

                    this.getPromotion(product),

                characteristics:

                    this.getCharacteristics(product),

                actions:

                    this.getAvailableActions(product)

            });

        }

    };

    /* ==========================================================

       EXPOSITION GLOBALE

    ========================================================== */

    window.MarketBouakeProductTypes =

        Object.freeze(MarketBouakeProductTypes);

})();
