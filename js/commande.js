/* ============================================================

   MARKET BOUAKÉ

   COMMANDE — LOGIQUE DE FINALISATION

   ============================================================ */

let utilisateur = null;

let profilAcheteur = null;

let panier = [];

let groupesVendeurs = [];

/* ============================================================

   INITIALISATION

   ============================================================ */

document.addEventListener("DOMContentLoaded", async () => {

    await initialiserCommande();

});

/* ============================================================

   INITIALISER LA PAGE

   ============================================================ */

async function initialiserCommande() {

    afficherChargement(true);

    try {

        if (typeof supabase === "undefined") {

            throw new Error(

                "Supabase n'est pas initialisé. Vérifie js/supabase.js."

            );

        }

        const {

            data: {

                user

            },

            error: authError

        } = await supabase.auth.getUser();

        if (authError) {

            throw authError;

        }

        utilisateur = user;

        if (!utilisateur) {

            afficherChargement(false);

            document.getElementById("login-required").style.display = "block";

            return;

        }

        await chargerProfil();

        chargerPanier();

        if (!panier.length) {

            afficherErreur(

                "Votre panier est vide. Ajoutez des produits avant de commander."

            );

            afficherChargement(false);

            return;

        }

        await preparerGroupesVendeurs();

        remplirInformationsProfil();

        afficherProduits();

        await calculerLivraison();

        afficherResume();

        document.getElementById("order-form").style.display = "block";

        afficherChargement(false);

    } catch (error) {

        console.error(

            "Erreur initialisation commande :",

            error

        );

        afficherErreur(

            "Impossible de charger la commande. " +

            (error.message || "")

        );

        afficherChargement(false);

    }

}

/* ============================================================

   CHARGER LE PROFIL

   ============================================================ */

async function chargerProfil() {

    const {

        data,

        error

    } = await supabase

        .from("profiles")

        .select(`

            id,

            first_name,

            last_name,

            email,

            phone,

            city,

            district,

            address

        `)

        .eq("id", utilisateur.id)

        .single();

    if (error) {

        throw error;

    }

    profilAcheteur = data;

}

/* ============================================================

   RÉCUPÉRER LE PANIER

   ============================================================ */

function chargerPanier() {

    const sources = [

        "market_bouake_cart",

        "cart",

        "panier"

    ];

    let panierTrouve = null;

    for (const cle of sources) {

        try {

            const valeur = localStorage.getItem(cle);

            if (!valeur) continue;

            const donnees = JSON.parse(valeur);

            if (Array.isArray(donnees)) {

                panierTrouve = donnees;

                break;

            }

        } catch (error) {

            console.warn(

                "Impossible de lire le panier :",

                cle,

                error

            );

        }

    }

    panier = Array.isArray(panierTrouve)

        ? panierTrouve

        : [];

    console.log(

        "Panier chargé :",

        panier

    );

}

/* ============================================================

   PRÉPARER LES GROUPES PAR VENDEUR

   ============================================================ */

async function preparerGroupesVendeurs() {

    const vendeurs = {};

    panier.forEach(article => {

        const sellerId =

            article.seller_id ||

            article.sellerId ||

            article.seller?.id;

        if (!sellerId) {

            console.warn(

                "Article sans seller_id :",

                article

            );

            return;

        }

        if (!vendeurs[sellerId]) {

            vendeurs[sellerId] = {

                seller_id: sellerId,

                produits: [],

                sous_total: 0,

                delivery_fee: 0

            };

        }

        const quantite =

            Number(

                article.quantity ||

                article.qty ||

                1

            );

        const prix =

            Number(

                article.price ||

                0

            );

        const subtotal =

            prix * quantite;

        vendeurs[sellerId].produits.push({

            ...article,

            quantity: quantite,

            price: prix,

            subtotal: subtotal

        });

        vendeurs[sellerId].sous_total += subtotal;

    });

    groupesVendeurs =

        Object.values(vendeurs);

    if (!groupesVendeurs.length) {

        throw new Error(

            "Aucun vendeur valide trouvé dans le panier."

        );

    }

}

/* ============================================================

   REMPLIR LE PROFIL DANS LE FORMULAIRE

   ============================================================ */

function remplirInformationsProfil() {

    if (!profilAcheteur) return;

    document.getElementById("first-name").value =

        profilAcheteur.first_name || "";

    document.getElementById("last-name").value =

        profilAcheteur.last_name || "";

    document.getElementById("phone").value =

        profilAcheteur.phone || "";

    document.getElementById("city").value =

        profilAcheteur.city || "Bouaké";

    document.getElementById("district").value =

        profilAcheteur.district || "";

    document.getElementById("address").value =

        profilAcheteur.address || "";

}

/* ============================================================

   AFFICHER LES PRODUITS

   ============================================================ */

function afficherProduits() {

    const container =

        document.getElementById("order-products");

    if (!container) return;

    container.innerHTML = "";

    groupesVendeurs.forEach((groupe, index) => {

        const bloc =

            document.createElement("div");

        bloc.className = "seller-block";

        const titre =

            document.createElement("div");

        titre.className = "seller-title";

        titre.textContent =

            `Vendeur ${index + 1}`;

        bloc.appendChild(titre);

        groupe.produits.forEach(article => {

            const ligne =

                document.createElement("div");

            ligne.className = "product-line";

            const gauche =

                document.createElement("div");

            const nom =

                document.createElement("div");

            nom.className = "product-name";

            nom.textContent =

                article.name ||

                article.product_name ||

                "Produit";

            const details =

                document.createElement("div");

            details.className =

                "product-details";

            let detailText =

                `${article.quantity} × ` +

                `${formaterPrix(article.price)}`;

            if (article.size) {

                detailText +=

                    ` • Taille : ${article.size}`;

            }

            details.textContent =

                detailText;

            gauche.appendChild(nom);

            gauche.appendChild(details);

            const droite =

                document.createElement("strong");

            droite.textContent =

                formaterPrix(article.subtotal);

            ligne.appendChild(gauche);

            ligne.appendChild(droite);

            bloc.appendChild(ligne);

        });

        const total =

            document.createElement("div");

        total.className =

            "seller-total";

        total.innerHTML = `

            <div class="delivery-row">

                <span>Sous-total vendeur</span>

                <strong>

                    ${formaterPrix(groupe.sous_total)}

                </strong>

            </div>

            <div class="delivery-row">

                <span>Livraison</span>

                <strong id="delivery-${index}">

                    Calcul...

                </strong>

            </div>

        `;

        bloc.appendChild(total);

        container.appendChild(bloc);

    });

}

/* ============================================================

   CALCULER LES FRAIS DE LIVRAISON

   ============================================================ */

async function calculerLivraison() {

    const quartier =

        document

            .getElementById("district")

            .value

            .trim();

    for (const groupe of groupesVendeurs) {

        groupe.delivery_fee = 0;

        if (!quartier) continue;

        const {

            data,

            error

        } = await supabase

            .from("delivery_rates")

            .select(`

                id,

                seller_id,

                district,

                price,

                is_active

            `)

            .eq("seller_id", groupe.seller_id)

            .eq("is_active", true)

            .ilike("district", quartier)

            .maybeSingle();

        if (error) {

            console.error(

                "Erreur tarif livraison :",

                error

            );

            continue;

        }

        if (data) {

            groupe.delivery_fee =

                Number(data.price) || 0;

        }

    }

    mettreAJourLivraisonsAffichees();

}

/* ============================================================

   METTRE À JOUR L'AFFICHAGE DES LIVRAISONS

   ============================================================ */

function mettreAJourLivraisonsAffichees() {

    groupesVendeurs.forEach((groupe, index) => {

        const element =

            document.getElementById(

                `delivery-${index}`

            );

        if (!element) return;

        element.textContent =

            formaterPrix(

                groupe.delivery_fee

            );

    });

}

/* ============================================================

   CALCUL TOTAL PRODUITS

   ============================================================ */

function calculerSousTotalGeneral() {

    return groupesVendeurs.reduce(

        (total, groupe) =>

            total + groupe.sous_total,

        0

    );

}

/* ============================================================

   CALCUL TOTAL LIVRAISON

   ============================================================ */

function calculerLivraisonGenerale() {

    return groupesVendeurs.reduce(

        (total, groupe) =>

            total + groupe.delivery_fee,

        0

    );

}

/* ============================================================

   CALCUL TOTAL FINAL

   ============================================================ */

function calculerTotalGeneral() {

    return (

        calculerSousTotalGeneral() +

        calculerLivraisonGenerale()

    );

}

/* ============================================================

   AFFICHER LE RÉSUMÉ

   ============================================================ */

function afficherResume() {

    const container =

        document.getElementById(

            "order-summary"

        );

    if (!container) return;

    const sousTotal =

        calculerSousTotalGeneral();

    const livraison =

        calculerLivraisonGenerale();

    const total =

        calculerTotalGeneral();

    container.innerHTML = `

        <div class="delivery-row">

            <span>

                Produits

            </span>

            <strong>

                ${formaterPrix(sousTotal)}

            </strong>

        </div>

        <div class="delivery-row">

            <span>

                Livraison

            </span>

            <strong>

                ${formaterPrix(livraison)}

            </strong>

        </div>

        <div class="total-row">

            <span>

                Total

            </span>

            <strong>

                ${formaterPrix(total)}

            </strong>

        </div>

    `;

}

/* ============================================================

   RECHERCHER À NOUVEAU LES TARIFS

   LORSQUE LE QUARTIER CHANGE

   ============================================================ */

document.addEventListener(

    "change",

    async event => {

        if (

            event.target &&

            event.target.id === "district"

        ) {

            await recalculerLivraisonApresQuartier();

        }

    }

);

document.addEventListener(

    "blur",

    async event => {

        if (

            event.target &&

            event.target.id === "district"

        ) {

            await recalculerLivraisonApresQuartier();

        }

    },

    true

);

async function recalculerLivraisonApresQuartier() {

    try {

        await calculerLivraison();

        afficherResume();

    } catch (error) {

        console.error(

            "Erreur recalcul livraison :",

            error

        );

    }

}

/* ============================================================

   SOUMISSION DE LA COMMANDE

   ============================================================ */

document.addEventListener(

    "submit",

    async event => {

        if (

            event.target &&

            event.target.id === "order-form"

        ) {

            event.preventDefault();

            await lancerCommande();

        }

    }

);

/* ============================================================

   LANCER LA COMMANDE

   ============================================================ */

async function lancerCommande() {

    const bouton =

        document.getElementById(

            "submit-order"

        );

    if (!bouton) return;

    bouton.disabled = true;

    bouton.textContent =

        "Création de la commande...";

    cacherNotice();

    try {

        const informations =

            recupererInformationsFormulaire();

        if (!informations) {

            throw new Error(

                "Veuillez remplir toutes les informations obligatoires."

            );

        }

        await recalculerLivraisonApresQuartier();

        const commandesCreees = [];

        for (const groupe of groupesVendeurs) {

            const whatsappMessage =

                construireMessageWhatsApp(

                    groupe,

                    informations

                );

            /*

             * Création de la commande avec

             * la fonction PostgreSQL sécurisée.

             */

            const {

                data: orderId,

                error: orderError

            } = await supabase.rpc(

                "create_market_order",

                {

                    p_seller_id:

                        groupe.seller_id,

                    p_total_amount:

                        groupe.sous_total,

                    p_delivery_fee:

                        groupe.delivery_fee,

                    p_buyer_first_name:

                        informations.first_name,

                    p_buyer_last_name:

                        informations.last_name,

                    p_buyer_phone:

                        informations.phone,

                    p_buyer_city:

                        informations.city,

                    p_buyer_district:

                        informations.district,

                    p_buyer_address:

                        informations.address,

                    p_whatsapp_message:

                        whatsappMessage

                }

            );

            if (orderError) {

                throw orderError;

            }

            if (!orderId) {

                throw new Error(

                    "La commande n'a pas retourné d'identifiant."

                );

            }

            /*

             * Création des lignes de commande.

             */

            const lignes =

                groupe.produits.map(article => ({

                    order_id:

                        orderId,

                    product_id:

                        article.id ||

                        article.product_id,

                    seller_id:

                        groupe.seller_id,

                    product_name:

                        article.name ||

                        article.product_name ||

                        "Produit",

                    price:

                        Number(article.price) || 0,

                    quantity:

                        Number(article.quantity) || 1,

                    size:

                        article.size || null,

                    subtotal:

                        Number(article.subtotal) || 0

                }));

            const {

                error: itemsError

            } = await supabase

                .from("order_items")

                .insert(lignes);

            if (itemsError) {

                throw itemsError;

            }

            commandesCreees.push({

                order_id: orderId,

                seller_id: groupe.seller_id,

                whatsapp_message: whatsappMessage

            });

        }

        /*

         * Toutes les commandes ont été créées.

         */

        viderPanier();

        afficherSucces(

            "Votre commande a été enregistrée avec succès."

        );

        bouton.textContent =

            "Commande enregistrée ✓";

        /*

         * Petite redirection après confirmation.

         */

        setTimeout(() => {

            window.location.href =

                "mon-compte.html";

        }, 1800);

    } catch (error) {

        console.error(

            "Erreur création commande :",

            error

        );

        afficherErreur(

            "Impossible de finaliser la commande. " +

            (error.message || "")

        );

        bouton.disabled = false;

        bouton.textContent =

            "Je lance la commande";

    }

}

/* ============================================================

   RÉCUPÉRER LES INFORMATIONS DU FORMULAIRE

   ============================================================ */

function recupererInformationsFormulaire() {

    const firstName =

        document

            .getElementById("first-name")

            .value

            .trim();

    const lastName =

        document

            .getElementById("last-name")

            .value

            .trim();

    const phone =

        document

            .getElementById("phone")

            .value

            .trim();

    const city =

        document

            .getElementById("city")

            .value

            .trim();

    const district =

        document

            .getElementById("district")

            .value

            .trim();

    const address =

        document

            .getElementById("address")

            .value

            .trim();

    if (

        !firstName ||

        !lastName ||

        !phone ||

        !city ||

        !district ||

        !address

    ) {

        return null;

    }

    return {

        first_name: firstName,

        last_name: lastName,

        phone: phone,

        city: city,

        district: district,

        address: address

    };

}

/* ============================================================

   MESSAGE WHATSAPP

   ============================================================ */

function construireMessageWhatsApp(

    groupe,

    informations

) {

    let message =

        "Bonjour, je souhaite passer une commande " +

        "sur Market Bouaké.%0A%0A";

    message +=

        `Client : ${informations.first_name} ` +

        `${informations.last_name}%0A`;

    message +=

        `Téléphone : ${informations.phone}%0A`;

    message +=

        `Ville : ${informations.city}%0A`;

    message +=

        `Quartier : ${informations.district}%0A`;

    message +=

        `Adresse : ${informations.address}%0A%0A`;

    message +=

        "Produits :%0A";

    groupe.produits.forEach(article => {

        message +=

            `- ${article.name || article.product_name}` +

            ` × ${article.quantity}` +

            ` = ${formaterPrix(article.subtotal)}%0A`;

        if (article.size) {

            message +=

                `  Taille : ${article.size}%0A`;

        }

    });

    message +=

        `%0ASous-total : ` +

        `${formaterPrix(groupe.sous_total)}%0A`;

    message +=

        `Livraison : ` +

        `${formaterPrix(groupe.delivery_fee)}%0A`;

    message +=

        `Total : ` +

        `${formaterPrix(

            groupe.sous_total +

            groupe.delivery_fee

        )}%0A%0A`;

    message +=

        "Commande effectuée via Market Bouaké.";

    return message;

}

/* ============================================================

   VIDER LE PANIER

   ============================================================ */

function viderPanier() {

    const sources = [

        "market_bouake_cart",

        "cart",

        "panier"

    ];

    sources.forEach(cle => {

        try {

            localStorage.removeItem(cle);

        } catch (error) {

            console.warn(

                "Impossible de supprimer :",

                cle

            );

        }

    });

    panier = [];

}

/* ============================================================

   FORMATAGE PRIX

   ============================================================ */

function formaterPrix(montant) {

    const valeur =

        Number(montant) || 0;

    return (

        valeur.toLocaleString(

            "fr-FR"

        ) +

        " FCFA"

    );

}

/* ============================================================

   AFFICHAGE CHARGEMENT

   ============================================================ */

function afficherChargement(

    actif

) {

    const loading =

        document.getElementById(

            "page-loading"

        );

    if (!loading) return;

    loading.style.display =

        actif

            ? "block"

            : "none";

}

/* ============================================================

   NOTICES

   ============================================================ */

function afficherErreur(message) {

    const notice =

        document.getElementById(

            "notice"

        );

    if (!notice) return;

    notice.className =

        "notice error";

    notice.textContent =

        message;

    notice.style.display =

        "block";

    window.scrollTo({

        top: 0,

        behavior: "smooth"

    });

}

function afficherSucces(message) {

    const notice =

        document.getElementById(

            "notice"

        );

    if (!notice) return;

    notice.className =

        "notice success";

    notice.textContent =

        message;

    notice.style.display =

        "block";

    window.scrollTo({

        top: 0,

        behavior: "smooth"

    });

}

function cacherNotice() {

    const notice =

        document.getElementById(

            "notice"

        );

    if (!notice) return;

    notice.style.display =

        "none";

}
