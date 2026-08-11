/* ============================================================

   MARKET BOUAKÉ

   js/cart.js

   Gestion complète du panier :

   - localStorage

   - plusieurs vendeurs

   - quantités

   - suppression

   - tailles

   - frais de livraison par vendeur

   - création orders

   - création order_items

   - WhatsApp

   ============================================================ */

(function () {

    "use strict";

    /* ========================================================

       CONFIGURATION SUPABASE

       ======================================================== */

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

    /* ========================================================

       CONFIGURATION

       ======================================================== */

    const CART_STORAGE_KEY =

        "market_bouake_cart";

    let cart = [];

    let deliveryRates = {};

    let currentUser = null;

    let buyerProfile = null;

    /* ========================================================

       UTILITAIRES

       ======================================================== */

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

        const number =

            Number(price || 0);

        return new Intl.NumberFormat(

            "fr-FR"

        ).format(number) + " FCFA";

    }

    function getImage(product) {

        if (!product) {

            return "";

        }

        return (

            product.image_url ||

            product.image_url_1 ||

            product.main_image_url ||

            "https://placehold.co/600x600/png?text=Market+Bouake"

        );

    }

    function getSellerName(item) {

        return (

            item.seller_name ||

            item.shop_name ||

            "Vendeur"

        );

    }

    function showMessage(message, type = "error") {

        const container =

            document.getElementById(

                "cart-message"

            );

        if (!container) {

            return;

        }

        const className =

            type === "success"

                ? "success-message"

                : "error-message";

        container.innerHTML = `

            <div class="${className}"

                style="

                    padding:12px;

                    border-radius:9px;

                    margin-bottom:15px;

                    background:${

                        type === "success"

                            ? "#edf8f1"

                            : "#fff0f0"

                    };

                    color:${

                        type === "success"

                            ? "#0b6b43"

                            : "#b3261e"

                    };

                "

            >

                ${escapeHtml(message)}

            </div>

        `;

        setTimeout(function () {

            container.innerHTML = "";

        }, 5000);

    }

    /* ========================================================

       LOCAL STORAGE

       ======================================================== */

    function loadCartFromStorage() {

        try {

            const saved =

                localStorage.getItem(

                    CART_STORAGE_KEY

                );

            if (!saved) {

                cart = [];

                return;

            }

            const parsed =

                JSON.parse(saved);

            cart =

                Array.isArray(parsed)

                    ? parsed

                    : [];

        } catch (error) {

            console.error(

                "Erreur lecture panier :",

                error

            );

            cart = [];

        }

    }

    function saveCart() {

        try {

            localStorage.setItem(

                CART_STORAGE_KEY,

                JSON.stringify(cart)

            );

        } catch (error) {

            console.error(

                "Erreur sauvegarde panier :",

                error

            );

        }

    }

    /* ========================================================

       IDENTIFIANT D'UN ARTICLE DU PANIER

       ======================================================== */

    function getCartItemKey(

        productId,

        size

    ) {

        return (

            String(productId) +

            "::" +

            String(size || "")

        );

    }

    /* ========================================================

       NORMALISER UN ARTICLE

       ======================================================== */

    function normalizeCartItem(item) {

        return {

            key:

                item.key ||

                getCartItemKey(

                    item.product_id ||

                    item.id,

                    item.size

                ),

            product_id:

                item.product_id ||

                item.id,

            seller_id:

                item.seller_id,

            seller_name:

                item.seller_name ||

                item.shop_name ||

                "Vendeur",

            shop_id:

                item.shop_id ||

                null,

            product_name:

                item.product_name ||

                item.name ||

                "Produit",

            price:

                Number(

                    item.price || 0

                ),

            quantity:

                Math.max(

                    1,

                    Number(

                        item.quantity || 1

                    )

                ),

            size:

                item.size ||

                null,

            image_url:

                item.image_url ||

                item.image_url_1 ||

                "",

            stock:

                item.stock === undefined ||

                item.stock === null

                    ? null

                    : Number(item.stock)

        };

    }

    /* ========================================================

       NETTOYER LE PANIER

       ======================================================== */

    function normalizeCart() {

        cart =

            cart

                .filter(function (item) {

                    return (

                        item &&

                        item.product_id &&

                        item.seller_id

                    );

                })

                .map(normalizeCartItem);

        saveCart();

    }

    /* ========================================================

       GROUPER PAR VENDEUR

       ======================================================== */

    function groupCartBySeller() {

        const groups = {};

        cart.forEach(function (item) {

            const sellerId =

                item.seller_id;

            if (!groups[sellerId]) {

                groups[sellerId] = {

                    seller_id:

                        sellerId,

                    seller_name:

                        getSellerName(item),

                    items: []

                };

            }

            groups[sellerId]

                .items

                .push(item);

        });

        return Object.values(groups);

    }

    /* ========================================================

       SOUS-TOTAL

       ======================================================== */

    function calculateSubtotal() {

        return cart.reduce(

            function (total, item) {

                return total +

                    (

                        Number(item.price) *

                        Number(item.quantity)

                    );

            },

            0

        );

    }

    /* ========================================================

       CHARGER UTILISATEUR

       ======================================================== */

    async function loadCurrentUser() {

        try {

            const {

                data,

                error

            } =

                await supabaseClient

                    .auth

                    .getUser();

            if (error) {

                console.warn(

                    "Utilisateur :",

                    error

                );

                currentUser = null;

                return null;

            }

            currentUser =

                data.user || null;

            return currentUser;

        } catch (error) {

            console.error(

                "Erreur utilisateur :",

                error

            );

            currentUser = null;

            return null;

        }

    }

    /* ========================================================

       CHARGER PROFIL ACHETEUR

       ======================================================== */

    async function loadBuyerProfile() {

        if (!currentUser) {

            buyerProfile = null;

            return null;

        }

        try {

            const {

                data,

                error

            } =

                await supabaseClient

                    .from("profiles")

                    .select(`

                        id,

                        first_name,

                        last_name,

                        email,

                        phone,

                        city,

                        district,

                        address,

                        role,

                        seller_status

                    `)

                    .eq(

                        "id",

                        currentUser.id

                    )

                    .maybeSingle();

            if (error) {

                console.error(

                    "Erreur profil :",

                    error

                );

                return null;

            }

            buyerProfile =

                data || null;

            return buyerProfile;

        } catch (error) {

            console.error(

                "Erreur profil inattendue :",

                error

            );

            return null;

        }

    }

    /* ========================================================

       CHARGER LES TARIFS DE LIVRAISON

       ======================================================== */

    async function loadDeliveryRates() {

        deliveryRates = {};

        if (

            cart.length === 0

        ) {

            return;

        }

        const sellerIds = [

            ...new Set(

                cart.map(function (item) {

                    return item.seller_id;

                })

            )

        ];

        try {

            const {

                data,

                error

            } =

                await supabaseClient

                    .from("delivery_rates")

                    .select(`

                        seller_id,

                        district,

                        price,

                        is_active

                    `)

                    .in(

                        "seller_id",

                        sellerIds

                    )

                    .eq(

                        "is_active",

                        true

                    );

            if (error) {

                console.error(

                    "Erreur tarifs livraison :",

                    error

                );

                return;

            }

            (data || []).forEach(function (rate) {

                if (

                    !deliveryRates[

                        rate.seller_id

                    ]

                ) {

                    deliveryRates[

                        rate.seller_id

                    ] = {};

                }

                deliveryRates[

                    rate.seller_id

                ][

                    String(

                        rate.district

                    ).trim().toLowerCase()

                ] =

                    Number(

                        rate.price || 0

                    );

            });

        } catch (error) {

            console.error(

                "Erreur livraison inattendue :",

                error

            );

        }

    }

    /* ========================================================

       QUARTIERS DISPONIBLES

       ======================================================== */

    function populateDistricts() {

        const select =

            document.getElementById(

                "delivery-district"

            );

        if (!select) {

            return;

        }

        const districts = new Set();

        Object.values(

            deliveryRates

        ).forEach(function (sellerRates) {

            Object.keys(

                sellerRates

            ).forEach(function (district) {

                districts.add(district);

            });

        });

        const currentValue =

            select.value;

        select.innerHTML = `

            <option value="">

                Sélectionner votre quartier

            </option>

        `;

        Array.from(districts)

            .sort()

            .forEach(function (district) {

                const option =

                    document.createElement(

                        "option"

                    );

                option.value =

                    district;

                option.textContent =

                    district

                        .split(" ")

                        .map(function (word) {

                            return (

                                word

                                    .charAt(0)

                                    .toUpperCase() +

                                word.slice(1)

                            );

                        })

                        .join(" ");

                select.appendChild(

                    option

                );

            });

        if (currentValue) {

            select.value =

                currentValue;

        }

        if (

            buyerProfile &&

            buyerProfile.district

        ) {

            const profileDistrict =

                String(

                    buyerProfile.district

                )

                    .trim()

                    .toLowerCase();

            const exists =

                Array.from(

                    select.options

                ).some(function (option) {

                    return (

                        option.value ===

                        profileDistrict

                    );

                });

            if (exists) {

                select.value =

                    profileDistrict;

            }

        }

    }

    /* ========================================================

       CALCUL FRAIS DE LIVRAISON

       ======================================================== */

    function calculateDelivery() {

        const select =

            document.getElementById(

                "delivery-district"

            );

        const district =

            select

                ? String(

                    select.value || ""

                  )

                    .trim()

                    .toLowerCase()

                : "";

        let total = 0;

        const bySeller = [];

        groupCartBySeller()

            .forEach(function (group) {

                let price = 0;

                if (

                    district &&

                    deliveryRates[

                        group.seller_id

                    ] &&

                    deliveryRates[

                        group.seller_id

                    ][district] !== undefined

                ) {

                    price =

                        Number(

                            deliveryRates[

                                group.seller_id

                            ][district]

                        );

                }

                total += price;

                bySeller.push({

                    seller_id:

                        group.seller_id,

                    seller_name:

                        group.seller_name,

                    price:

                        price

                });

            });

        return {

            total:

                total,

            bySeller:

                bySeller,

            district:

                district

        };

    }

    /* ========================================================

       AFFICHER LIVRAISON PAR VENDEUR

       ======================================================== */

    function renderDeliveryDetails() {

        const container =

            document.getElementById(

                "delivery-by-seller"

            );

        if (!container) {

            return;

        }

        const delivery =

            calculateDelivery();

        if (

            delivery.bySeller.length === 0

        ) {

            container.innerHTML = "";

            return;

        }

        container.innerHTML =

            delivery.bySeller

                .map(function (seller) {

                    return `

                        <div class="delivery-seller">

                            <strong>

                                ${escapeHtml(

                                    seller.seller_name

                                )}

                            </strong>

                            <span>

                                ${

                                    delivery.district

                                        ? formatPrice(

                                            seller.price

                                          )

                                        : "Sélectionnez un quartier"

                                }

                            </span>

                        </div>

                    `;

                })

                .join("");

    }

    /* ========================================================

       METTRE À JOUR LE RÉSUMÉ

       ======================================================== */

    function updateSummary() {

        const subtotal =

            calculateSubtotal();

        const delivery =

            calculateDelivery();

        const total =

            subtotal +

            delivery.total;

        const subtotalElement =

            document.getElementById(

                "cart-subtotal"

            );

        const deliveryElement =

            document.getElementById(

                "cart-delivery"

            );

        const totalElement =

            document.getElementById(

                "cart-total"

            );

        if (subtotalElement) {

            subtotalElement.textContent =

                formatPrice(subtotal);

        }

        if (deliveryElement) {

            deliveryElement.textContent =

                formatPrice(

                    delivery.total

                );

        }

        if (totalElement) {

            totalElement.textContent =

                formatPrice(total);

        }

        renderDeliveryDetails();

    }

    /* ========================================================

       RENDRE UN ARTICLE

       ======================================================== */

    function renderCartItem(item) {

        const subtotal =

            Number(item.price) *

            Number(item.quantity);

        return `

            <div

                class="cart-item"

                data-cart-key="${escapeHtml(

                    item.key

                )}"

            >

                <img

                    class="cart-item-image"

                    src="${escapeHtml(

                        getImage(item)

                    )}"

                    alt="${escapeHtml(

                        item.product_name

                    )}"

                >

                <div>

                    <div class="cart-item-name">

                        ${escapeHtml(

                            item.product_name

                        )}

                    </div>

                    <div class="cart-item-price">

                        ${formatPrice(

                            item.price

                        )}

                    </div>

                    ${

                        item.size

                            ? `

                                <div class="cart-item-size">

                                    Taille :

                                    ${escapeHtml(

                                        item.size

                                    )}

                                </div>

                              `

                            : ""

                    }

                    <div class="quantity-controls">

                        <button

                            type="button"

                            data-action="decrease"

                            data-key="${escapeHtml(

                                item.key

                            )}"

                        >

                            −

                        </button>

                        <span class="quantity-value">

                            ${item.quantity}

                        </span>

                        <button

                            type="button"

                            data-action="increase"

                            data-key="${escapeHtml(

                                item.key

                            )}"

                        >

                            +

                        </button>

                    </div>

                    <button

                        type="button"

                        class="remove-button"

                        data-action="remove"

                        data-key="${escapeHtml(

                            item.key

                        )}"

                    >

                        Supprimer

                    </button>

                </div>

                <div class="item-total">

                    ${formatPrice(

                        subtotal

                    )}

                </div>

            </div>

        `;

    }

    /* ========================================================

       RENDRE LE PANIER

       ======================================================== */

    function renderCart() {

        const loading =

            document.getElementById(

                "cart-loading"

            );

        const empty =

            document.getElementById(

                "empty-cart"

            );

        const layout =

            document.getElementById(

                "cart-layout"

            );

        const container =

            document.getElementById(

                "cart-products-container"

            );

        if (loading) {

            loading.style.display =

                "none";

        }

        if (

            !cart ||

            cart.length === 0

        ) {

            if (empty) {

                empty.style.display =

                    "block";

            }

            if (layout) {

                layout.style.display =

                    "none";

            }

            return;

        }

        if (empty) {

            empty.style.display =

                "none";

        }

        if (layout) {

            layout.style.display =

                "grid";

        }

        if (!container) {

            return;

        }

        const groups =

            groupCartBySeller();

        container.innerHTML =

            groups

                .map(function (group) {

                    return `

                        <div class="seller-group">

                            <div class="seller-header">

                                Vendeur :

                                ${escapeHtml(

                                    group.seller_name

                                )}

                            </div>

                            ${

                                group.items

                                    .map(

                                        renderCartItem

                                    )

                                    .join("")

                            }

                        </div>

                    `;

                })

                .join("");

        updateSummary();

    }

    /* ========================================================

       MODIFIER QUANTITÉ

       ======================================================== */

    function changeQuantity(

        key,

        amount

    ) {

        const item =

            cart.find(function (item) {

                return (

                    item.key === key

                );

            });

        if (!item) {

            return;

        }

        const newQuantity =

            item.quantity + amount;

        if (

            newQuantity < 1

        ) {

            return;

        }

        if (

            item.stock !== null &&

            item.stock !== undefined &&

            newQuantity > item.stock

        ) {

            showMessage(

                "La quantité demandée dépasse le stock disponible."

            );

            return;

        }

        item.quantity =

            newQuantity;

        saveCart();

        renderCart();

    }

    /* ========================================================

       SUPPRIMER ARTICLE

       ======================================================== */

    function removeCartItem(key) {

        cart =

            cart.filter(function (item) {

                return (

                    item.key !== key

                );

            });

        saveCart();

        renderCart();

        loadDeliveryRates()

            .then(function () {

                populateDistricts();

                updateSummary();

            });

    }

    /* ========================================================

       CLICS DU PANIER

       ======================================================== */

    function setupCartEvents() {

        const container =

            document.getElementById(

                "cart-products-container"

            );

        if (container) {

            container.addEventListener(

                "click",

                function (event) {

                    const button =

                        event.target.closest(

                            "button[data-action]"

                        );

                    if (!button) {

                        return;

                    }

                    const action =

                        button.dataset.action;

                    const key =

                        button.dataset.key;

                    if (

                        action ===

                        "increase"

                    ) {

                        changeQuantity(

                            key,

                            1

                        );

                    }

                    if (

                        action ===

                        "decrease"

                    ) {

                        changeQuantity(

                            key,

                            -1

                        );

                    }

                    if (

                        action ===

                        "remove"

                    ) {

                        removeCartItem(

                            key

                        );

                    }

                }

            );

        }

        const districtSelect =

            document.getElementById(

                "delivery-district"

            );

        if (districtSelect) {

            districtSelect.addEventListener(

                "change",

                function () {

                    updateSummary();

                }

            );

        }

        const checkoutButton =

            document.getElementById(

                "checkout-button"

            );

        if (checkoutButton) {

            checkoutButton.addEventListener(

                "click",

                launchOrder

            );

        }

    }

    /* ========================================================

       VÉRIFICATION STOCK

       ======================================================== */

    async function verifyStock() {

        if (

            cart.length === 0

        ) {

            return {

                valid: false,

                message:

                    "Votre panier est vide."

            };

        }

        const productIds = [

            ...new Set(

                cart.map(function (item) {

                    return item.product_id;

                })

            )

        ];

        try {

            const {

                data,

                error

            } =

                await supabaseClient

                    .from("products")

                    .select(`

                        id,

                        name,

                        price,

                        stock,

                        seller_id,

                        is_active,

                        whatsapp_phone,

                        image_url_1

                    `)

                    .in(

                        "id",

                        productIds

                    );

            if (error) {

                console.error(

                    "Erreur vérification stock :",

                    error

                );

                return {

                    valid: false,

                    message:

                        "Impossible de vérifier les produits."

                };

            }

            const productsById = {};

            (data || []).forEach(function (product) {

                productsById[

                    product.id

                ] = product;

            });

            for (

                const item of cart

            ) {

                const product =

                    productsById[

                        item.product_id

                    ];

                if (!product) {

                    return {

                        valid: false,

                        message:

                            "Un produit du panier n'existe plus."

                    };

                }

                if (

                    !product.is_active

                ) {

                    return {

                        valid: false,

                        message:

                            `Le produit "${product.name}" n'est plus disponible.`

                    };

                }

                if (

                    Number(product.stock) <

                    Number(item.quantity)

                ) {

                    return {

                        valid: false,

                        message:

                            `Stock insuffisant pour "${product.name}".`

                    };

                }

                if (

                    product.seller_id !==

                    item.seller_id

                ) {

                    return {

                        valid: false,

                        message:

                            `Le vendeur du produit "${product.name}" a changé.`

                    };

                }

            }

            return {

                valid: true,

                products: productsById

            };

        } catch (error) {

            console.error(

                "Erreur stock inattendue :",

                error

            );

            return {

                valid: false,

                message:

                    "Une erreur est survenue pendant la vérification du stock."

            };

        }

    }

    /* ========================================================

       CRÉER UNE COMMANDE

       ======================================================== */

    async function createOrderForSeller(

        sellerGroup,

        deliveryFee,

        deliveryDistrict,

        productsById

    ) {

        const subtotal =

            sellerGroup.items.reduce(

                function (total, item) {

                    return total +

                        Number(item.price) *

                        Number(item.quantity);

                },

                0

            );

        const totalAmount =

            subtotal +

            Number(deliveryFee || 0);

        const firstName =

            buyerProfile

                ? buyerProfile.first_name

                : null;

        const lastName =

            buyerProfile

                ? buyerProfile.last_name

                : null;

        const phone =

            buyerProfile

                ? buyerProfile.phone

                : null;

        const city =

            buyerProfile

                ? buyerProfile.city

                : "Bouaké";

        const district =

            deliveryDistrict ||

            (

                buyerProfile

                    ? buyerProfile.district

                    : null

            );

        const address =

            buyerProfile

                ? buyerProfile.address

                : null;

        const whatsappMessage =

            buildWhatsappMessage(

                sellerGroup,

                deliveryFee,

                deliveryDistrict,

                totalAmount

            );

        /* ----------------------------------------------------

           Création de orders

           ---------------------------------------------------- */

        const {

            data: order,

            error: orderError

        } =

            await supabaseClient

                .from("orders")

                .insert({

                    buyer_id:

                        currentUser.id,

                    seller_id:

                        sellerGroup.seller_id,

                    total_amount:

                        totalAmount,

                    delivery_fee:

                        Number(

                            deliveryFee || 0

                        ),

                    buyer_first_name:

                        firstName,

                    buyer_last_name:

                        lastName,

                    buyer_phone:

                        phone,

                    buyer_city:

                        city,

                    buyer_district:

                        district,

                    buyer_address:

                        address,

                    status:

                        "pending",

                    whatsapp_message:

                        whatsappMessage

                })

                .select("id")

                .single();

        if (orderError) {

            console.error(

                "Erreur création commande :",

                orderError

            );

            throw orderError;

        }

        /* ----------------------------------------------------

           Création order_items

           ---------------------------------------------------- */

        const orderItems =

            sellerGroup.items.map(

                function (item) {

                    const product =

                        productsById[

                            item.product_id

                        ];

                    return {

                        order_id:

                            order.id,

                        product_id:

                            item.product_id,

                        seller_id:

                            sellerGroup.seller_id,

                        product_name:

                            product

                                ? product.name

                                : item.product_name,

                        price:

                            Number(

                                item.price

                            ),

                        quantity:

                            Number(

                                item.quantity

                            ),

                        size:

                            item.size,

                        subtotal:

                            Number(

                                item.price

                            ) *

                            Number(

                                item.quantity

                            )

                    };

                }

            );

        const {

            error: itemsError

        } =

            await supabaseClient

                .from("order_items")

                .insert(

                    orderItems

                );

        if (itemsError) {

            console.error(

                "Erreur création articles commande :",

                itemsError

            );

            /*

             * On tente de supprimer la commande

             * créée si ses articles n'ont pas pu

             * être créés.

             */

            await supabaseClient

                .from("orders")

                .delete()

                .eq(

                    "id",

                    order.id

                );

            throw itemsError;

        }

        return {

            orderId:

                order.id,

            sellerId:

                sellerGroup.seller_id,

            sellerName:

                sellerGroup.seller_name,

            total:

                totalAmount,

            whatsappMessage:

                whatsappMessage

        };

    }

    /* ========================================================

       MESSAGE WHATSAPP

       ======================================================== */

    function buildWhatsappMessage(

        sellerGroup,

        deliveryFee,

        district,

        total

    ) {

        let message =

            "Bonjour, je viens de passer une commande sur Market Bouaké.\n\n";

        message +=

            "Commande Market Bouaké\n";

        message +=

            "Vendeur : " +

            sellerGroup.seller_name +

            "\n\n";

        sellerGroup.items.forEach(

            function (item) {

                message +=

                    "- " +

                    item.product_name +

                    " x" +

                    item.quantity;

                if (item.size) {

                    message +=

                        " (Taille : " +

                        item.size +

                        ")";

                }

                message +=

                    " = " +

                    formatPrice(

                        Number(item.price) *

                        Number(item.quantity)

                    ) +

                    "\n";

            }

        );

        message +=

            "\nLivraison : " +

            formatPrice(

                deliveryFee

            );

        if (district) {

            message +=

                "\nQuartier : " +

                district;

        }

        message +=

            "\nTotal : " +

            formatPrice(

                total

            );

        message +=

            "\n\nMerci.";

        return message;

    }

    /* ========================================================

       RÉCUPÉRER NUMÉRO WHATSAPP

       ======================================================== */

    async function getSellerWhatsapp(

        sellerId,

        productsById

    ) {

        const product =

            Object.values(

                productsById

            ).find(function (product) {

                return (

                    product.seller_id ===

                    sellerId &&

                    product.whatsapp_phone

                );

            });

        if (

            product &&

            product.whatsapp_phone

        ) {

            return product.whatsapp_phone;

        }

        try {

            const {

                data,

                error

            } =

                await supabaseClient

                    .from("products")

                    .select(

                        "whatsapp_phone"

                    )

                    .eq(

                        "seller_id",

                        sellerId

                    )

                    .not(

                        "whatsapp_phone",

                        "is",

                        null

                    )

                    .limit(1)

                    .maybeSingle();

            if (

                error ||

                !data

            ) {

                return null;

            }

            return data.whatsapp_phone;

        } catch (error) {

            console.error(

                "Erreur numéro vendeur :",

                error

            );

            return null;

        }

    }

    /* ========================================================

       NORMALISER NUMÉRO WHATSAPP

       ======================================================== */

    function normalizeWhatsappPhone(

        phone

    ) {

        if (!phone) {

            return null;

        }

        let value =

            String(phone)

                .trim()

                .replace(/[^\d+]/g, "");

        if (

            value.startsWith("0") &&

            !value.startsWith("+")

        ) {

            value =

                "+225" +

                value.substring(1);

        }

        return value

            .replace("+", "");

    }

    /* ========================================================

       LANCER LA COMMANDE

       ======================================================== */

    async function launchOrder() {

        if (

            cart.length === 0

        ) {

            showMessage(

                "Votre panier est vide."

            );

            return;

        }

        const button =

            document.getElementById(

                "checkout-button"

            );

        if (button) {

            button.disabled = true;

            button.textContent =

                "Création de la commande...";

        }

        try {

            /* ------------------------------------------------

               Vérifier connexion

               ------------------------------------------------ */

            const user =

                await loadCurrentUser();

            if (!user) {

                const redirect =

                    window.location.href;

                window.location.href =

                    "connexion.html?redirect=" +

                    encodeURIComponent(

                        redirect

                    );

                return;

            }

            await loadBuyerProfile();

            /* ------------------------------------------------

               Vérifier profil

               ------------------------------------------------ */

            if (!buyerProfile) {

                showMessage(

                    "Impossible de récupérer votre profil."

                );

                return;

            }

            /* ------------------------------------------------

               Vérifier quartier

               ------------------------------------------------ */

            const select =

                document.getElementById(

                    "delivery-district"

                );

            const district =

                select

                    ? String(

                        select.value || ""

                      )

                        .trim()

                        .toLowerCase()

                    : "";

            if (!district) {

                showMessage(

                    "Veuillez sélectionner votre quartier de livraison."

                );

                return;

            }

            /* ------------------------------------------------

               Vérifier stock

               ------------------------------------------------ */

            const stockResult =

                await verifyStock();

            if (!stockResult.valid) {

                showMessage(

                    stockResult.message

                );

                return;

            }

            /* ------------------------------------------------

               Recharger tarifs

               ------------------------------------------------ */

            await loadDeliveryRates();

            const delivery =

                calculateDelivery();

            const sellerGroups =

                groupCartBySeller();

            const createdOrders = [];

            /* ------------------------------------------------

               Créer une commande par vendeur

               ------------------------------------------------ */

            for (

                const group of sellerGroups

            ) {

                const sellerDelivery =

                    delivery.bySeller.find(

                        function (item) {

                            return (

                                item.seller_id ===

                                group.seller_id

                            );

                        }

                    );

                const deliveryFee =

                    sellerDelivery

                        ? sellerDelivery.price

                        : 0;

                const order =

                    await createOrderForSeller(

                        group,

                        deliveryFee,

                        district,

                        stockResult.products

                    );

                createdOrders.push(

                    order

                );

            }

            /* ------------------------------------------------

               Supprimer les articles commandés

               ------------------------------------------------ */

            cart = [];

            saveCart();

            /* ------------------------------------------------

               WhatsApp vendeurs

               ------------------------------------------------ */

            for (

                const order of createdOrders

            ) {

                const phone =

                    await getSellerWhatsapp(

                        order.sellerId,

                        stockResult.products

                    );

                const normalizedPhone =

                    normalizeWhatsappPhone(

                        phone

                    );

                if (

                    normalizedPhone

                ) {

                    const whatsappUrl =

                        "https://wa.me/" +

                        normalizedPhone +

                        "?text=" +

                        encodeURIComponent(

                            order.whatsappMessage

                        );

                    window.open(

                        whatsappUrl,

                        "_blank"

                    );

                }

            }

            showMessage(

                "Votre commande a été enregistrée avec succès.",

                "success"

            );

            setTimeout(function () {

                window.location.href =

                    "commandes.html";

            }, 1500);

        } catch (error) {

            console.error(

                "Erreur lancement commande :",

                error

            );

            showMessage(

                error.message ||

                "Impossible de créer la commande."

            );

        } finally {

            if (button) {

                button.disabled = false;

                button.textContent =

                    "Je lance la commande";

            }

        }

    }

    /* ========================================================

       API PUBLIQUE

       ======================================================== */

    window.MarketBouakeCart = {

        getCart:

            function () {

                return cart;

            },

        add:

            function (product, quantity = 1, size = null) {

                if (

                    !product ||

                    !product.id

                ) {

                    return false;

                }

                const key =

                    getCartItemKey(

                        product.id,

                        size

                    );

                const existing =

                    cart.find(

                        function (item) {

                            return (

                                item.key ===

                                key

                            );

                        }

                    );

                if (existing) {

                    existing.quantity +=

                        Number(quantity || 1);

                } else {

                    cart.push({

                        key:

                            key,

                        product_id:

                            product.id,

                        seller_id:

                            product.seller_id,

                        seller_name:

                            product.seller_name ||

                            product.shop_name ||

                            "Vendeur",

                        shop_id:

                            product.shop_id ||

                            null,

                        product_name:

                            product.name,

                        price:

                            Number(

                                product.price || 0

                            ),

                        quantity:

                            Number(

                                quantity || 1

                            ),

                        size:

                            size,

                        image_url:

                            getImage(product),

                        stock:

                            product.stock !== undefined

                                ? Number(

                                    product.stock

                                  )

                                : null

                    });

                }

                saveCart();

                return true;

            },

        remove:

            removeCartItem,

        clear:

            function () {

                cart = [];

                saveCart();

                renderCart();

            },

        render:

            renderCart

    };

    /* ========================================================

       INITIALISATION

       ======================================================== */

    async function initializeCart() {

        loadCartFromStorage();

        normalizeCart();

        setupCartEvents();

        await loadCurrentUser();

        await loadBuyerProfile();

        await loadDeliveryRates();

        populateDistricts();

        renderCart();

    }

    document.addEventListener(

        "DOMContentLoaded",

        initializeCart

    );

})();
