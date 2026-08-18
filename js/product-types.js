/* =========================================================

   MARKET BOUAKÉ

   product-types.js

   JOUR 4 — FICHIER DESTINÉ À ÊTRE DÉFINITIF

   Rôle :

   - déterminer le type de contenu ;

   - déterminer si le panier est pertinent ;

   - préparer les caractéristiques dynamiques ;

   - gérer les données immobilières ;

   - ne rien inventer lorsqu'une donnée n'existe pas.

   ========================================================= */

(function () {

  "use strict";

  const PROPERTY_WORDS = [

    "immobilier",

    "immobilière",

    "immobiliere",

    "maison",

    "appartement",

    "studio",

    "terrain",

    "résidence",

    "residence",

    "villa",

    "logement",

    "location",

    "terrain"

  ];

  function normalize(value) {

    return String(value || "")

      .normalize("NFD")

      .replace(/[\u0300-\u036f]/g, "")

      .toLowerCase()

      .trim();

  }

  function containsPropertyWord(value) {

    const text = normalize(value);

    return PROPERTY_WORDS.some(word => text.includes(normalize(word)));

  }

  function isPropertyProduct(product, category) {

    if (!product) return false;

    /*

      La présence de données immobilières est un indicateur

      plus fiable qu'une simple catégorie.

    */

    if (

      product.property_type ||

      product.monthly_price !== null && product.monthly_price !== undefined ||

      product.deposit_amount !== null && product.deposit_amount !== undefined ||

      product.rooms_count !== null && product.rooms_count !== undefined ||

      product.bedrooms_count !== null && product.bedrooms_count !== undefined ||

      product.check_in_time ||

      product.check_out_time ||

      product.capacity ||

      product.amenities

    ) {

      return true;

    }

    if (containsPropertyWord(category?.name)) return true;

    if (containsPropertyWord(product.name)) return true;

    return false;

  }

  function getProductType(product, category) {

    if (isPropertyProduct(product, category)) {

      const text = normalize(

        [

          product.property_type,

          category?.name,

          product.name

        ].join(" ")

      );

      if (

        text.includes("residence") ||

        text.includes("studio") ||

        text.includes("villa") ||

        product.check_in_time ||

        product.check_out_time ||

        product.capacity

      ) {

        return "residence";

      }

      return "property";

    }

    return "product";

  }

  function getTransactionMode(product, category) {

    const type = getProductType(product, category);

    /*

      La colonne transaction_mode n'existe pas encore

      dans la structure products auditée.

      Si elle est ajoutée ultérieurement, ce module pourra

      immédiatement l'utiliser sans refaire la fiche.

    */

    if (product?.transaction_mode) {

      return String(product.transaction_mode).toLowerCase();

    }

    if (type === "property") {

      return "interest";

    }

    if (type === "residence") {

      return "reservation";

    }

    return "cart";

  }

  function getImages(product) {

    if (!product) return [];

    return [

      product.image_url_1,

      product.image_url_2,

      product.image_url_3

    ].filter(Boolean);

  }

  function getPrice(product) {

    if (!product) return 0;

    const price = Number(product.price || 0);

    if (Number.isFinite(price)) {

      return price;

    }

    return 0;

  }

  function getOldPrice(product) {

    /*

      La structure actuelle de products ne contient pas encore

      explicitement old_price.

      Si une colonne old_price ou original_price est ajoutée,

      elle sera automatiquement reconnue.

    */

    const possible = [

      product?.old_price,

      product?.original_price,

      product?.previous_price

    ];

    for (const value of possible) {

      if (value !== null && value !== undefined && Number(value) > 0) {

        return Number(value);

      }

    }

    return null;

  }

  function getDiscount(product) {

    const oldPrice = getOldPrice(product);

    const currentPrice = getPrice(product);

    if (!oldPrice || !currentPrice || oldPrice <= currentPrice) {

      return null;

    }

    return Math.round(((oldPrice - currentPrice) / oldPrice) * 100);

  }

  function getAvailability(product) {

    if (!product) {

      return {

        status: "unknown",

        label: "Disponibilité inconnue",

        canBuy: false

      };

    }

    const stock = Number(product.stock ?? 0);

    if (stock <= 0) {

      return {

        status: "out",

        label: "Rupture de stock",

        canBuy: false,

        stock: 0

      };

    }

    if (stock <= 5) {

      return {

        status: "limited",

        label: `Plus que ${stock} disponible${stock > 1 ? "s" : ""}`,

        canBuy: true,

        stock

      };

    }

    return {

      status: "available",

      label: "Disponible",

      canBuy: true,

      stock

    };

  }

  function getProductOptions(product) {

    const options = [];

    /*

      La colonne sizes existe actuellement dans products.

    */

    if (Array.isArray(product?.sizes) && product.sizes.length) {

      options.push({

        key: "size",

        label: "Taille",

        values: product.sizes.filter(Boolean)

      });

    }

    /*

      Préparation pour de futures colonnes d'options.

      Rien n'est affiché si elles n'existent pas.

    */

    const futureOptionColumns = [

      ["color", "Couleur"],

      ["colors", "Couleurs"],

      ["storage", "Stockage"],

      ["ram", "RAM"],

      ["capacity_option", "Capacité"],

      ["flavor", "Parfum"],

      ["portion", "Portions"],

      ["material", "Matière"],

      ["shoe_size", "Pointure"]

    ];

    futureOptionColumns.forEach(([key, label]) => {

      const value = product?.[key];

      if (Array.isArray(value) && value.length) {

        options.push({

          key,

          label,

          values: value.filter(Boolean)

        });

      } else if (value !== null && value !== undefined && String(value).trim()) {

        options.push({

          key,

          label,

          values: [String(value)]

        });

      }

    });

    return options;

  }

  function getCharacteristics(product, category) {

    if (!product) return [];

    const characteristics = [];

    function add(label, value, formatter = value => value) {

      if (

        value !== null &&

        value !== undefined &&

        String(value).trim() !== ""

      ) {

        characteristics.push({

          label,

          value: formatter(value)

        });

      }

    }

    const type = getProductType(product, category);

    if (type === "property" || type === "residence") {

      add("Type", product.property_type);

      add("Localisation", product.location);

      add("Pièces", product.rooms_count);

      add("Chambres", product.bedrooms_count);

      add("Disponibilité", product.availability);

      add("Capacité", product.capacity);

      add("Tarification", product.pricing_type);

      add("Heure d'arrivée", product.check_in_time);

      add("Heure de départ", product.check_out_time);

      add("Équipements", product.amenities);

      add("Conditions", product.conditions);

      if (product.monthly_price !== null && product.monthly_price !== undefined) {

        add(

          "Prix mensuel",

          product.monthly_price,

          value => formatCurrency(value)

        );

      }

      if (product.deposit_amount !== null && product.deposit_amount !== undefined) {

        add(

          "Caution",

          product.deposit_amount,

          value => formatCurrency(value)

        );

      }

    }

    /*

      Caractéristiques supplémentaires éventuellement ajoutées

      par le système vendeur.

    */

    const futureFields = [

      ["brand", "Marque"],

      ["model", "Modèle"],

      ["storage", "Stockage"],

      ["ram", "RAM"],

      ["processor", "Processeur"],

      ["material", "Matière"],

      ["condition", "État"],

      ["quantity_info", "Quantité"],

      ["ingredients", "Ingrédients"]

    ];

    futureFields.forEach(([key, label]) => {

      if (product[key] !== undefined && product[key] !== null) {

        add(label, product[key]);

      }

    });

    return characteristics;

  }

  function formatCurrency(value) {

    const number = Number(value);

    if (!Number.isFinite(number)) {

      return String(value);

    }

    return `${new Intl.NumberFormat("fr-FR", {

      maximumFractionDigits: 0

    }).format(number)} FCFA`;

  }

  window.MarketBouakeProductTypes = {

    normalize,

    isPropertyProduct,

    getProductType,

    getTransactionMode,

    getImages,

    getPrice,

    getOldPrice,

    getDiscount,

    getAvailability,

    getProductOptions,

    getCharacteristics,

    formatCurrency

  };

})();
