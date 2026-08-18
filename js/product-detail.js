/* =========================================================

   MARKET BOUAKÉ

   product-detail.js

   JOUR 4 — FICHIER DESTINÉ À ÊTRE DÉFINITIF

   Rôle :

   - charger produit.html?id=...

   - récupérer les vraies données Supabase ;

   - afficher la fiche ;

   - gérer galerie ;

   - vendeur/boutique ;

   - avis ;

   - livraison ;

   - produits similaires ;

   - favoris préparés ;

   - panier local compatible avec le futur cart.js ;

   - partage ;

   - navigation.

   IMPORTANT :

   - aucune donnée fictive ;

   - aucune modification de index.html ;

   ========================================================= */

(function () {

  "use strict";

  const SUPABASE_URL = "https://qgdxxrnsiyzbacxxfdrg.supabase.co";

  const SUPABASE_KEY = "sb_publishable_QE2in_ocTQQDEt0HW9wSCg_PKSzqo7N";

  const CART_STORAGE_KEY = "market_bouake_cart";

  const FAVORITES_STORAGE_KEY = "market_bouake_favorites";

  let supabaseClient = null;

  let currentUser = null;

  let currentProduct = null;

  let currentCategory = null;

  let currentShop = null;

  let currentSeller = null;

  let galleryImages = [];

  let currentImageIndex = 0;

  let quantity = 1;

  let selectedOptions = {};

  const $ = selector => document.querySelector(selector);

  document.addEventListener("DOMContentLoaded", init);

  async function init() {

    setupStaticEvents();

    if (!window.supabase || !window.MarketBouakeProductTypes) {

      showError(

        "Impossible de charger la fiche",

        "Les modules nécessaires à Market Bouaké ne sont pas disponibles."

      );

      return;

    }

    supabaseClient = window.supabase.createClient(

      SUPABASE_URL,

      SUPABASE_KEY

    );

    try {

      const authResult = await supabaseClient.auth.getUser();

      currentUser = authResult?.data?.user || null;

    } catch (error) {

      console.warn("Auth non disponible :", error);

      currentUser = null;

    }

    updateMenuAuth();

    updateCartCount();

    const productId = getProductIdFromUrl();

    if (!productId) {

      showError(

        "Produit introuvable",

        "Aucun identifiant de produit n'a été fourni dans l'adresse."

      );

      return;

    }

    await loadProduct(productId);

  }

  /* =========================================================

     INITIALISATION / ÉVÉNEMENTS

     ========================================================= */

  function setupStaticEvents() {

    $("#backButton")?.addEventListener("click", () => {

      if (document.referrer && document.referrer.includes(location.origin)) {

        history.back();

      } else {

        window.location.href = "index.html";

      }

    });

    $("#cartButton")?.addEventListener("click", () => {

      window.location.href = "panier.html";

    });

    $("#accountButton")?.addEventListener("click", () => {

      window.location.href = "compte.html";

    });

    $("#messagesButton")?.addEventListener("click", () => {

      window.location.href = "discussions.html";

    });

    $("#menuOpenButton")?.addEventListener("click", openMenu);

    $("#menuCloseButton")?.addEventListener("click", closeMenu);

    $("#menuOverlay")?.addEventListener("click", event => {

      if (event.target === $("#menuOverlay")) {

        closeMenu();

      }

    });

    $("#headerSearchForm")?.addEventListener("submit", event => {

      event.preventDefault();

      const query = $("#headerSearchInput")?.value?.trim();

      if (!query) return;

      /*

        Le moteur complet de recherche appartient au Jour 6.

        Ici on transmet proprement la recherche à la page prévue.

      */

      window.location.href =

        `recherche.html?q=${encodeURIComponent(query)}`;

    });

    $("#favoriteButton")?.addEventListener("click", toggleFavorite);

    $("#galleryPrev")?.addEventListener("click", () => {

      if (!galleryImages.length) return;

      currentImageIndex =

        (currentImageIndex - 1 + galleryImages.length) %

        galleryImages.length;

      renderMainImage();

    });

    $("#galleryNext")?.addEventListener("click", () => {

      if (!galleryImages.length) return;

      currentImageIndex =

        (currentImageIndex + 1) % galleryImages.length;

      renderMainImage();

    });

    $("#quantityMinus")?.addEventListener("click", () => {

      if (quantity <= 1) return;

      quantity--;

      renderQuantity();

    });

    $("#quantityPlus")?.addEventListener("click", () => {

      const stock = Number(currentProduct?.stock || 0);

      if (quantity >= stock) {

        showToast("La quantité maximale disponible est atteinte.", "error");

        return;

      }

      quantity++;

      renderQuantity();

    });

    $("#shopButton")?.addEventListener("click", () => {

      if (!currentShop?.id) {

        showToast("Cette boutique n'est pas disponible.", "error");

        return;

      }

      window.location.href =

        `boutique.html?id=${encodeURIComponent(currentShop.id)}`;

    });

    $("#whatsappButton")?.addEventListener("click", openWhatsApp);

    $("#discussionButton")?.addEventListener("click", openDiscussion);

    $("#allReviewsButton")?.addEventListener("click", () => {

      if (!currentProduct?.id) return;

      window.location.href =

        `avis.html?product_id=${encodeURIComponent(currentProduct.id)}`;

    });

  }

  /* =========================================================

     PRODUIT

     ========================================================= */

  function getProductIdFromUrl() {

    const params = new URLSearchParams(window.location.search);

    return params.get("id");

  }

  async function loadProduct(productId) {

    setLoadingState();

    try {

      const { data: product, error } = await supabaseClient

        .from("products")

        .select("*")

        .eq("id", productId)

        .maybeSingle();

      if (error) throw error;

      if (!product) {

        showError(

          "Produit introuvable",

          "Ce produit n'existe pas ou n'est plus disponible."

        );

        return;

      }

      if (product.is_active === false) {

        showError(

          "Produit indisponible",

          "Ce produit n'est actuellement plus visible."

        );

        return;

      }

      currentProduct = product;

      await Promise.all([

        loadCategory(product.category_id),

        loadSeller(product.seller_id),

        loadShop(product.shop_id),

        loadReviews(product.id),

        loadDeliveryRates(product.seller_id),

        loadSimilarProducts(product)

      ]);

      renderProduct();

      /*

        Compteur de vues.

        On utilise une mise à jour simple et non bloquante.

      */

      incrementProductViews(product);

    } catch (error) {

      console.error("Erreur chargement produit :", error);

      showError(

        "Impossible de charger le produit",

        "Une erreur est survenue lors de la récupération des informations."

      );

    }

  }

  async function loadCategory(categoryId) {

    currentCategory = null;

    if (!categoryId) return;

    try {

      const { data, error } = await supabaseClient

        .from("categories")

        .select("*")

        .eq("id", categoryId)

        .maybeSingle();

      if (error) throw error;

      currentCategory = data || null;

    } catch (error) {

      console.warn("Catégorie non récupérée :", error);

    }

  }

  async function loadSeller(sellerId) {

    currentSeller = null;

    if (!sellerId) return;

    try {

      const { data, error } = await supabaseClient

        .from("profiles")

        .select("*")

        .eq("id", sellerId)

        .maybeSingle();

      if (error) throw error;

      currentSeller = data || null;

    } catch (error) {

      console.warn("Profil vendeur non récupéré :", error);

    }

  }

  async function loadShop(shopId) {

    currentShop = null;

    if (!shopId) return;

    try {

      const { data, error } = await supabaseClient

        .from("shops")

        .select("*")

        .eq("id", shopId)

        .maybeSingle();

      if (error) throw error;

      currentShop = data || null;

    } catch (error) {

      console.warn("Boutique non récupérée :", error);

    }

  }

  async function loadReviews(productId) {

    try {

      const { data, error } = await supabaseClient

        .from("reviews")

        .select("*")

        .eq("product_id", productId)

        .eq("is_visible", true)

        .order("created_at", { ascending: false });

      if (error) throw error;

      renderReviews(data || []);

    } catch (error) {

      console.warn("Avis non récupérés :", error);

      renderReviews([]);

    }

  }

  async function loadDeliveryRates(sellerId) {

    const section = $("#deliverySection");

    const content = $("#deliveryContent");

    if (!section || !content || !sellerId) return;

    try {

      const { data, error } = await supabaseClient

        .from("delivery_rates")

        .select("*")

        .eq("seller_id", sellerId)

        .order("created_at", { ascending: true });

      if (error) throw error;

      if (!data || !data.length) {

        section.hidden = true;

        return;

      }

      content.innerHTML = "";

      data.forEach(rate => {

        const line = document.createElement("div");

        line.className = "info-line";

        const neighborhood =

          rate.neighborhood ||

          rate.zone ||

          rate.area ||

          rate.name ||

          "Zone de livraison";

        const price =

          rate.price ??

          rate.delivery_price ??

          rate.amount ??

          null;

        const priceText =

          price !== null

            ? ` — ${formatCurrency(price)}`

            : "";

        line.innerHTML = `

          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">

            <path d="M3 6h11v10H3z"/>

            <path d="M14 10h4l3 3v3h-7z"/>

            <circle cx="7" cy="19" r="1.5"/>

            <circle cx="18" cy="19" r="1.5"/>

          </svg>

          <span>${escapeHtml(neighborhood)}${escapeHtml(priceText)}</span>

        `;

        content.appendChild(line);

      });

      section.hidden = false;

    } catch (error) {

      console.warn("Tarifs de livraison non récupérés :", error);

      section.hidden = true;

    }

  }

  async function loadSimilarProducts(product) {

    const container = $("#similarProducts");

    if (!container) return;

    container.innerHTML = "";

    try {

      let query = supabaseClient

        .from("products")

        .select("*")

        .eq("is_active", true)

        .neq("id", product.id)

        .limit(8);

      if (product.category_id) {

        query = query.eq("category_id", product.category_id);

      }

      const { data, error } = await query;

      if (error) throw error;

      const products = data || [];

      if (!products.length) {

        container.innerHTML = `

          <div class="state-card" style="grid-column:1/-1; padding:25px;">

            <p style="margin:0;">Aucun produit similaire disponible pour le moment.</p>

          </div>

        `;

        return;

      }

      products.forEach(item => {

        container.appendChild(createSimilarCard(item));

      });

    } catch (error) {

      console.warn("Produits similaires non récupérés :", error);

      container.innerHTML = "";

    }

  }

  async function incrementProductViews(product) {

    /*

      La colonne views_count existe dans la structure auditée.

      L'opération reste non bloquante.

    */

    try {

      const currentViews = Number(product.views_count || 0);

      await supabaseClient

        .from("products")

        .update({

          views_count: currentViews + 1

        })

        .eq("id", product.id);

    } catch (error) {

      console.warn("Impossible d'incrémenter les vues :", error);

    }

  }

  /* =========================================================

     RENDU DU PRODUIT

     ========================================================= */

  function renderProduct() {

    const types = window.MarketBouakeProductTypes;

    const type = types.getProductType(

      currentProduct,

      currentCategory

    );

    const transactionMode = types.getTransactionMode(

      currentProduct,

      currentCategory

    );

    document.title =

      `${currentProduct.name || "Produit"} | Market Bouaké`;

    $("#productState").hidden = true;

    $("#productPage").hidden = false;

    $("#productTitle").textContent =

      currentProduct.name || "Produit";

    $("#productCategory").textContent =

      currentCategory?.name || "Marketplace";

    $("#productCategoryMeta").textContent =

      currentCategory?.name || "Marketplace";

    renderPrice();

    renderGallery();

    renderAvailability();

    renderOptions();

    renderCharacteristics(type);

    renderDescription();

    renderConditions();

    renderSeller();

    renderActions(transactionMode, type);

    renderFavoriteState();

    /*

      Pour les biens immobiliers, certaines sections générales

      restent pertinentes, mais le panier classique n'est pas affiché.

    */

    if (type === "property" || type === "residence") {

      renderPropertyInformation();

    }

  }

  function renderPrice() {

    const types = window.MarketBouakeProductTypes;

    const price = types.getPrice(currentProduct);

    const oldPrice = types.getOldPrice(currentProduct);

    const discount = types.getDiscount(currentProduct);

    $("#productPrice").textContent = formatCurrency(price);

    if (oldPrice) {

      $("#productOldPrice").textContent = formatCurrency(oldPrice);

      $("#productOldPrice").hidden = false;

    } else {

      $("#productOldPrice").hidden = true;

    }

    if (discount) {

      $("#productDiscount").textContent = `-${discount}%`;

      $("#productDiscount").hidden = false;

    } else {

      $("#productDiscount").hidden = true;

    }

  }

  function renderGallery() {

    galleryImages =

      window.MarketBouakeProductTypes.getImages(currentProduct);

    currentImageIndex = 0;

    const row = $("#thumbnailRow");

    if (!row) return;

    row.innerHTML = "";

    if (!galleryImages.length) {

      $("#mainProductImage").hidden = true;

      $("#galleryPlaceholder").hidden = false;

      $("#galleryPrev").hidden = true;

      $("#galleryNext").hidden = true;

      return;

    }

    $("#galleryPlaceholder").hidden = true;

    $("#mainProductImage").hidden = false;

    galleryImages.forEach((src, index) => {

      const button = document.createElement("button");

      button.className =

        `thumbnail ${index === 0 ? "active" : ""}`;

      button.type = "button";

      button.setAttribute(

        "aria-label",

        `Afficher la photo ${index + 1}`

      );

      button.innerHTML = `

        <img src="${escapeAttribute(src)}"

             alt="${escapeAttribute(currentProduct.name || "Produit")}">

      `;

      button.addEventListener("click", () => {

        currentImageIndex = index;

        renderMainImage();

      });

      row.appendChild(button);

    });

    $("#galleryPrev").hidden = galleryImages.length <= 1;

    $("#galleryNext").hidden = galleryImages.length <= 1;

    renderMainImage();

  }

  function renderMainImage() {

    const image = $("#mainProductImage");

    if (!galleryImages.length) return;

    const src = galleryImages[currentImageIndex];

    image.src = src;

    image.alt = currentProduct.name || "Produit";

    image.onerror = () => {

      image.hidden = true;

      $("#galleryPlaceholder").hidden = false;

    };

    image.hidden = false;

    $("#galleryPlaceholder").hidden = true;

    document

      .querySelectorAll(".thumbnail")

      .forEach((thumbnail, index) => {

        thumbnail.classList.toggle(

          "active",

          index === currentImageIndex

        );

      });

  }

  function renderAvailability() {

    const availability =

      window.MarketBouakeProductTypes.getAvailability(

        currentProduct

      );

    const element = $("#availability");

    element.textContent = availability.label;

    element.classList.remove(

      "limited",

      "out"

    );

    if (availability.status === "limited") {

      element.classList.add("limited");

    }

    if (availability.status === "out") {

      element.classList.add("out");

    }

  }

  function renderOptions() {

    const container = $("#dynamicOptions");

    if (!container) return;

    container.innerHTML = "";

    selectedOptions = {};

    const options =

      window.MarketBouakeProductTypes.getProductOptions(

        currentProduct

      );

    options.forEach(option => {

      const section = document.createElement("div");

      section.className = "option-section";

      const title = document.createElement("div");

      title.className = "option-title";

      title.textContent = option.label;

      const list = document.createElement("div");

      list.className = "option-list";

      option.values.forEach((value, index) => {

        const button = document.createElement("button");

        button.type = "button";

        button.className = "option-button";

        button.textContent = value;

        if (index === 0) {

          button.classList.add("selected");

          selectedOptions[option.key] = value;

        }

        button.addEventListener("click", () => {

          list

            .querySelectorAll(".option-button")

            .forEach(item =>

              item.classList.remove("selected")

            );

          button.classList.add("selected");

          selectedOptions[option.key] = value;

        });

        list.appendChild(button);

      });

      section.appendChild(title);

      section.appendChild(list);

      container.appendChild(section);

    });

  }

  function renderCharacteristics(type) {

    const section = $("#characteristicsSection");

    const grid = $("#characteristicsGrid");

    if (!section || !grid) return;

    const characteristics =

      window.MarketBouakeProductTypes.getCharacteristics(

        currentProduct,

        currentCategory

      );

    grid.innerHTML = "";

    if (!characteristics.length) {

      section.hidden = true;

      return;

    }

    characteristics.forEach(item => {

      const row = document.createElement("div");

      row.className = "characteristic";

      row.innerHTML = `

        <span class="characteristic-name">

          ${escapeHtml(item.label)}

        </span>

        <span class="characteristic-value">

          ${escapeHtml(item.value)}

        </span>

      `;

      grid.appendChild(row);

    });

    section.hidden = false;

  }

  function renderDescription() {

    const section = $("#descriptionSection");

    const description = $("#productDescription");

    const value =

      currentProduct.description?.trim();

    if (!value) {

      section.hidden = true;

      return;

    }

    description.textContent = value;

    section.hidden = false;

  }

  function renderConditions() {

    const section = $("#conditionsSection");

    const content = $("#conditionsContent");

    const value =

      currentProduct.conditions?.trim();

    if (!value) {

      section.hidden = true;

      return;

    }

    content.textContent = value;

    section.hidden = false;

  }

  function renderPropertyInformation() {

    const location = currentProduct.location;

    if (location) {

      addPropertyInfoToDelivery(location);

    }

  }

  function addPropertyInfoToDelivery(location) {

    const section = $("#deliverySection");

    const content = $("#deliveryContent");

    if (!section || !content) return;

    if (!content.children.length) {

      const line = document.createElement("div");

      line.className = "info-line";

      line.innerHTML = `

        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">

          <path d="M12 21s7-6.2 7-12a7 7 0 0 0-14 0c0 5.8 7 12 7 12Z"/>

          <circle cx="12" cy="9" r="2.5"/>

        </svg>

        <span>${escapeHtml(location)}</span>

      `;

      content.appendChild(line);

      section.hidden = false;

    }

  }

  /* =========================================================

     ACTIONS

     ========================================================= */

  function renderActions(transactionMode, type) {

    const container = $("#actionStack");

    if (!container) return;

    container.innerHTML = "";

    const availability =

      window.MarketBouakeProductTypes.getAvailability(

        currentProduct

      );

    /*

      IMMOBILIER

    */

    if (transactionMode === "interest" || type === "property") {

      const interestButton =

        createActionButton(

          "Je suis intéressé",

          "primary",

          () => handleInterest()

        );

      container.appendChild(interestButton);

      const contactButton =

        createActionButton(

          "Contacter le vendeur",

          "secondary",

          openDiscussion

        );

      container.appendChild(contactButton);

      return;

    }

    /*

      RÉSIDENCE

    */

    if (transactionMode === "reservation" || type === "residence") {

      const reservationButton =

        createActionButton(

          "Réserver",

          "primary",

          () => handleReservation()

        );

      container.appendChild(reservationButton);

      const contactButton =

        createActionButton(

          "Contacter le vendeur",

          "secondary",

          openDiscussion

        );

      container.appendChild(contactButton);

      return;

    }

    /*

      PRODUIT CLASSIQUE

    */

    const addButton =

      createActionButton(

        "Ajouter au panier",

        "primary",

        handleCartToggle

      );

    if (!availability.canBuy) {

      addButton.disabled = true;

      addButton.textContent = "Produit indisponible";

    }

    container.appendChild(addButton);

    const cartButton =

      createActionButton(

        "Voir le panier",

        "secondary",

        () => {

          window.location.href = "panier.html";

        }

      );

    container.appendChild(cartButton);

    /*

      Partage disponible pour tous les contenus.

    */

    const shareButton =

      createActionButton(

        "Partager",

        "secondary",

        shareProduct

      );

    container.appendChild(shareButton);

  }

  function createActionButton(label, style, action) {

    const button = document.createElement("button");

    button.type = "button";

    button.className =

      `action-button ${style}`;

    button.textContent = label;

    button.addEventListener("click", action);

    return button;

  }

  /* =========================================================

     PANIER

     ========================================================= */

  function getCart() {

    try {

      const value =

        localStorage.getItem(CART_STORAGE_KEY);

      if (!value) return [];

      const parsed = JSON.parse(value);

      return Array.isArray(parsed) ? parsed : [];

    } catch {

      return [];

    }

  }

  function saveCart(cart) {

    localStorage.setItem(

      CART_STORAGE_KEY,

      JSON.stringify(cart)

    );

    updateCartCount();

    /*

      Permet aux futurs modules de panier de détecter

      la modification sans dépendance directe.

    */

    window.dispatchEvent(

      new CustomEvent("marketbouake:cart-changed", {

        detail: { cart }

      })

    );

  }

  function getCartProductKey() {

    if (!currentProduct?.id) return "";

    const optionsKey =

      Object.keys(selectedOptions)

        .sort()

        .map(key => `${key}:${selectedOptions[key]}`)

        .join("|");

    return `${currentProduct.id}::${optionsKey}`;

  }

  function isInCart() {

    const cart = getCart();

    const key = getCartProductKey();

    return cart.some(item => item.key === key);

  }

  function handleCartToggle() {

    if (!currentProduct) return;

    const availability =

      window.MarketBouakeProductTypes.getAvailability(

        currentProduct

      );

    if (!availability.canBuy) {

      showToast("Ce produit est en rupture de stock.", "error");

      return;

    }

    const cart = getCart();

    const key = getCartProductKey();

    const index =

      cart.findIndex(item => item.key === key);

    if (index !== -1) {

      cart.splice(index, 1);

      saveCart(cart);

      updateCartActionButton(

        "Ajouter au panier",

        false

      );

      showToast("Produit retiré du panier.");

      return;

    }

    const item = {

      key,

      product_id: currentProduct.id,

      seller_id: currentProduct.seller_id || null,

      shop_id: currentProduct.shop_id || null,

      name: currentProduct.name || "",

      price: Number(currentProduct.price || 0),

      quantity,

      image_url:

        currentProduct.image_url_1 ||

        currentProduct.image_url_2 ||

        currentProduct.image_url_3 ||

        null,

      size: selectedOptions.size || null,

      options: { ...selectedOptions },

      added_at: new Date().toISOString()

    };

    cart.push(item);

    saveCart(cart);

    updateCartActionButton(

      "✓ Retirer du panier",

      true

    );

    showToast("Produit ajouté au panier.", "success");

  }

  function updateCartActionButton(label, active) {

    const buttons =

      $("#actionStack")?.querySelectorAll(".action-button");

    if (!buttons?.length) return;

    const button =

      Array.from(buttons).find(

        item =>

          item.textContent.includes("panier") ||

          item.textContent.includes("Retirer")

      );

    if (!button) return;

    if (active) {

      button.textContent = label;

      button.classList.remove("primary");

      button.classList.add("success");

    } else {

      button.textContent = label;

      button.classList.remove("success");

      button.classList.add("primary");

    }

  }

  function updateCartCount() {

    const cart = getCart();

    /*

      Le compteur représente le nombre d'articles distincts

      du panier, et non un clic répété.

    */

    const count = cart.length;

    if ($("#headerCartCount")) {

      $("#headerCartCount").textContent = count;

      $("#headerCartCount").hidden = count === 0;

    }

    if ($("#mobileCartCount")) {

      $("#mobileCartCount").textContent = count;

      $("#mobileCartCount").hidden = count === 0;

    }

    if (currentProduct) {

      updateCartActionButton(

        isInCart()

          ? "✓ Retirer du panier"

          : "Ajouter au panier",

        isInCart()

      );

    }

  }

  /* =========================================================

     FAVORIS

     ========================================================= */

  function getFavorites() {

    try {

      const value =

        localStorage.getItem(FAVORITES_STORAGE_KEY);

      if (!value) return [];

      const parsed = JSON.parse(value);

      return Array.isArray(parsed) ? parsed : [];

    } catch {

      return [];

    }

  }

  function saveFavorites(favorites) {

    localStorage.setItem(

      FAVORITES_STORAGE_KEY,

      JSON.stringify(favorites)

    );

    window.dispatchEvent(

      new CustomEvent("marketbouake:favorites-changed", {

        detail: { favorites }

      })

    );

  }

  function isFavorite() {

    if (!currentProduct?.id) return false;

    const favorites = getFavorites();

    return favorites.some(

      item =>

        typeof item === "string"

          ? item === currentProduct.id

          : item.product_id === currentProduct.id

    );

  }

  function renderFavoriteState() {

    const button = $("#favoriteButton");

    const icon = $("#favoriteIcon");

    if (!button || !icon) return;

    const active = isFavorite();

    button.classList.toggle("active", active);

    button.setAttribute(

      "aria-label",

      active

        ? "Retirer des favoris"

        : "Ajouter aux favoris"

    );

    if (active) {

      icon.setAttribute("fill", "currentColor");

    } else {

      icon.setAttribute("fill", "none");

    }

  }

  async function toggleFavorite() {

    if (!currentProduct?.id) return;

    /*

      Le Jour 5 ajoutera la synchronisation complète

      Supabase du système favorites.

      Ici on conserve également un état local afin que

      la fiche soit immédiatement fonctionnelle.

    */

    const favorites = getFavorites();

    const index =

      favorites.findIndex(item =>

        typeof item === "string"

          ? item === currentProduct.id

          : item.product_id === currentProduct.id

      );

    if (index !== -1) {

      favorites.splice(index, 1);

      saveFavorites(favorites);

      renderFavoriteState();

      showToast("Retiré des favoris.");

      return;

    }

    favorites.push({

      product_id: currentProduct.id,

      added_at: new Date().toISOString()

    });

    saveFavorites(favorites);

    renderFavoriteState();

    showToast("Ajouté aux favoris.", "success");

  }

  /* =========================================================

     VENDEUR

     ========================================================= */

  function renderSeller() {

    const name =

      currentShop?.name ||

      currentSeller?.full_name ||

      currentSeller?.name ||

      currentSeller?.shop_name ||

      "Vendeur";

    const location =

      currentShop?.location ||

      currentShop?.address ||

      currentSeller?.city ||

      currentSeller?.location ||

      "Bouaké";

    $("#sellerName").textContent = name;

    $("#sellerLocation").textContent = location;

    const photo =

      currentShop?.logo_url ||

      currentShop?.image_url ||

      currentShop?.photo_url ||

      currentSeller?.avatar_url ||

      currentSeller?.profile_photo_url ||

      currentSeller?.photo_url ||

      null;

    const container = $("#sellerPhotoContainer");

    if (photo) {

      container.innerHTML = `

        <img

          class="seller-photo"

          src="${escapeAttribute(photo)}"

          alt="${escapeAttribute(name)}"

        >

      `;

    } else {

      const initial =

        String(name).trim().charAt(0).toUpperCase() || "V";

      container.innerHTML = `

        <div class="seller-avatar">${escapeHtml(initial)}</div>

      `;

    }

    if (currentShop?.id) {

      $("#shopButton").hidden = false;

    }

    const phone =

      currentProduct.whatsapp_phone ||

      currentSeller?.whatsapp_phone ||

      currentSeller?.phone ||

      currentSeller?.whatsapp ||

      null;

    if (phone) {

      $("#whatsappButton").hidden = false;

      $("#whatsappButton").dataset.phone = phone;

    }

  }

  function openWhatsApp() {

    const phone =

      $("#whatsappButton")?.dataset?.phone;

    if (!phone) {

      showToast(

        "Le vendeur n'a pas renseigné de numéro WhatsApp.",

        "error"

      );

      return;

    }

    const cleanPhone =

      String(phone).replace(/[^\d+]/g, "");

    const message =

      `Bonjour, je suis intéressé par "${currentProduct?.name || "ce produit"}" sur Market Bouaké.`;

    const url =

      `https://wa.me/${cleanPhone.replace("+", "")}?text=${encodeURIComponent(message)}`;

    window.open(url, "_blank", "noopener,noreferrer");

  }

  function openDiscussion() {

    if (!currentProduct?.seller_id) {

      showToast("Vendeur indisponible.", "error");

      return;

    }

    const params =

      new URLSearchParams({

        seller_id: currentProduct.seller_id,

        product_id: currentProduct.id

      });

    window.location.href =

      `discussions.html?${params.toString()}`;

  }

  /* =========================================================

     IMMOBILIER / RÉSERVATION

     ========================================================= */

  async function handleInterest() {

    if (!currentProduct?.id) return;

    if (!currentUser) {

      showToast(

        "Connectez-vous pour envoyer une demande d'intérêt.",

        "error"

      );

      setTimeout(() => {

        window.location.href =

          `connexion.html?redirect=${encodeURIComponent(location.href)}`;

      }, 700);

      return;

    }

    try {

      const payload = {

        buyer_id: currentUser.id,

        seller_id: currentProduct.seller_id,

        product_id: currentProduct.id,

        message:

          `Je suis intéressé par "${currentProduct.name}".`,

        request_type: "interest"

      };

      const { error } =

        await supabaseClient

          .from("property_interest_requests")

          .insert(payload);

      if (error) throw error;

      showToast(

        "Votre demande d'intérêt a été envoyée.",

        "success"

      );

    } catch (error) {

      console.error("Demande d'intérêt :", error);

      showToast(

        "Impossible d'envoyer la demande pour le moment.",

        "error"

      );

    }

  }

  async function handleReservation() {

    /*

      La structure de réservation complète sera finalisée

      au Jour 8 avec immobilier.js.

      On ne crée donc pas ici une fausse réservation

      incompatible avec le système définitif.

    */

    showToast(

      "La réservation détaillée sera disponible avec le module de réservation.",

      "error"

    );

  }

  /* =========================================================

     AVIS

     ========================================================= */

  function renderReviews(reviews) {

    const summary = $("#ratingSummary");

    const list = $("#reviewsList");

    if (!list) return;

    list.innerHTML = "";

    if (!reviews.length) {

      summary.hidden = true;

      list.innerHTML = `

        <p style="color:#64748B;font-size:13px;line-height:1.6;">

          Aucun avis n'est encore disponible pour ce produit.

        </p>

      `;

      $("#allReviewsButton").hidden = true;

      return;

    }

    const total =

      reviews.reduce(

        (sum, review) =>

          sum + Number(review.rating || 0),

        0

      );

    const average =

      total / reviews.length;

    $("#ratingNumber").textContent =

      average.toFixed(1);

    $("#ratingStars").textContent =

      createStars(average);

    $("#reviewCount").textContent =

      `${reviews.length} avis`;

    summary.hidden = false;

    reviews.slice(0, 5).forEach(review => {

      list.appendChild(createReview(review));

    });

    $("#allReviewsButton").hidden =

      reviews.length <= 5;

  }

  function createReview(review) {

    const article = document.createElement("article");

    article.className = "review";

    const author =

      review.buyer_name ||

      review.author_name ||

      "Acheteur";

    const date =

      review.created_at

        ? formatDate(review.created_at)

        : "";

    article.innerHTML = `

      <div class="review-top">

        <span class="review-author">

          ${escapeHtml(author)}

        </span>

        <span class="review-date">

          ${escapeHtml(date)}

        </span>

      </div>

      <div class="stars">

        ${createStars(Number(review.rating || 0))}

      </div>

      ${

        review.comment

          ? `<p class="review-comment">${escapeHtml(review.comment)}</p>`

          : ""

      }

    `;

    return article;

  }

  function createStars(rating) {

    const rounded =

      Math.round(Number(rating || 0));

    return "★".repeat(Math.max(0, Math.min(5, rounded))) +

      "☆".repeat(Math.max(0, 5 - rounded));

  }

  /* =========================================================

     PRODUITS SIMILAIRES

     ========================================================= */

  function createSimilarCard(product) {

    const card =

      document.createElement("article");

    card.className = "similar-card";

    const image =

      product.image_url_1 ||

      product.image_url_2 ||

      product.image_url_3 ||

      "";

    card.innerHTML = `

      ${

        image

          ? `<img class="similar-image"

                  src="${escapeAttribute(image)}"

                  alt="${escapeAttribute(product.name || "Produit")}">`

          : `<div class="similar-image"></div>`

      }

      <div class="similar-body">

        <div class="similar-name">

          ${escapeHtml(product.name || "Produit")}

        </div>

        <div class="similar-price">

          ${escapeHtml(formatCurrency(product.price))}

        </div>

        <a class="similar-link"

           href="produit.html?id=${encodeURIComponent(product.id)}">

          Voir le produit

        </a>

      </div>

    `;

    return card;

  }

  /* =========================================================

     PARTAGE

     ========================================================= */

  async function shareProduct() {

    const shareData = {

      title:

        `${currentProduct?.name || "Produit"} | Market Bouaké`,

      text:

        `Découvrez ${currentProduct?.name || "ce produit"} sur Market Bouaké.`,

      url: window.location.href

    };

    if (navigator.share) {

      try {

        await navigator.share(shareData);

        return;

      } catch (error) {

        if (error?.name === "AbortError") return;

      }

    }

    try {

      await navigator.clipboard.writeText(

        window.location.href

      );

      showToast(

        "Lien du produit copié.",

        "success"

      );

    } catch {

      showToast(

        "Impossible de copier le lien.",

        "error"

      );

    }

  }

  /* =========================================================

     MENU

     ========================================================= */

  function openMenu() {

    $("#menuOverlay")?.classList.add("open");

    $("#menuOverlay")?.setAttribute("aria-hidden", "false");

    document.body.style.overflow = "hidden";

  }

  function closeMenu() {

    $("#menuOverlay")?.classList.remove("open");

    $("#menuOverlay")?.setAttribute("aria-hidden", "true");

    document.body.style.overflow = "";

  }

  function updateMenuAuth() {

    const area = $("#menuAuthArea");

    if (!area) return;

    area.innerHTML = "";

    if (currentUser) {

      const logout =

        document.createElement("button");

      logout.className = "action-button secondary";

      logout.type = "button";

      logout.textContent = "Déconnexion";

      logout.addEventListener("click", async () => {

        try {

          await supabaseClient.auth.signOut();

          window.location.reload();

        } catch (error) {

          console.error(error);

          showToast(

            "Impossible de se déconnecter.",

            "error"

          );

        }

      });

      area.appendChild(logout);

      return;

    }

    const login =

      document.createElement("a");

    login.className = "action-button primary";

    login.href =

      `connexion.html?redirect=${encodeURIComponent(location.href)}`;

    login.textContent = "Se connecter";

    const signup =

      document.createElement("a");

    signup.className = "action-button secondary";

    signup.href =

      `inscription.html?redirect=${encodeURIComponent(location.href)}`;

    signup.textContent = "S'inscrire";

    area.appendChild(login);

    area.appendChild(signup);

  }

  /* =========================================================

     ÉTATS

     ========================================================= */

  function setLoadingState() {

    $("#productState").hidden = false;

    $("#productPage").hidden = true;

  }

  function showError(title, message) {

    $("#productState").hidden = false;

    $("#productPage").hidden = true;

    $("#productState").innerHTML = `

      <div class="state-card">

        <div class="state-icon">

          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">

            <circle cx="12" cy="12" r="9"/>

            <path d="M12 8v5"/>

            <path d="M12 16h.01"/>

          </svg>

        </div>

        <h2>${escapeHtml(title)}</h2>

        <p>${escapeHtml(message)}</p>

        <a href="index.html"

           class="primary-button">

          Retour à l'accueil

        </a>

      </div>

    `;

  }

  function showToast(message, type = "") {

    const container =

      $("#toastContainer");

    if (!container) return;

    const toast =

      document.createElement("div");

    toast.className =

      `toast ${type}`;

    toast.textContent = message;

    container.appendChild(toast);

    setTimeout(() => {

      toast.remove();

    }, 3200);

  }

  /* =========================================================

     UTILITAIRES

     ========================================================= */

  function formatCurrency(value) {

    return window.MarketBouakeProductTypes

      .formatCurrency(value);

  }

  function formatDate(value) {

    try {

      return new Intl.DateTimeFormat(

        "fr-FR",

        {

          day: "2-digit",

          month: "2-digit",

          year: "numeric"

        }

      ).format(new Date(value));

    } catch {

      return "";

    }

  }

  function escapeHtml(value) {

    return String(value ?? "")

      .replace(/&/g, "&amp;")

      .replace(/</g, "&lt;")

      .replace(/>/g, "&gt;")

      .replace(/"/g, "&quot;")

      .replace(/'/g, "&#039;");

  }

  function escapeAttribute(value) {

    return escapeHtml(value);

  }

})();
