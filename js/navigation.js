/* ============================================================

   MARKET BOUAKÉ

   NAVIGATION COMMUNE

   ============================================================ */

document.addEventListener("DOMContentLoaded", () => {

    initialiserNavigation();

});

/* ============================================================

   INITIALISATION

   ============================================================ */

function initialiserNavigation() {

    document.addEventListener(

        "click",

        gererNavigation

    );

}

/* ============================================================

   GESTION DES LIENS

   ============================================================ */

function gererNavigation(event) {

    const element =

        event.target.closest("[data-navigation]");

    if (!element) return;

    const destination =

        element.dataset.navigation;

    if (!destination) return;

    event.preventDefault();

    naviguerVers(destination);

}

/* ============================================================

   NAVIGATION

   ============================================================ */

function naviguerVers(destination) {

    const destinations = {

        accueil:

            "index.html",

        compte:

            "compte.html",

        connexion:

            "connexion.html",

        inscription:

            "inscription.html",

        vendeur:

            "vendeur.html",

        devenirVendeur:

            "inscription-vendeur.html",

        panier:

            "panier.html",

        commandes:

            "commandes.html",

        favoris:

            "favoris.html",

        avis:

            "avis.html",

        notifications:

            "notifications.html",

        livraison:

            "livraison.html",

        categories:

            "categorie.html",

        publicites:

            "publicite.html",

        residences:

            "residences.html",

        maisons:

            "categorie.html?type=maison",

        appartements:

            "categorie.html?type=appartement",

        studios:

            "categorie.html?type=studio",

        residencesMeublees:

            "categorie.html?type=residence-meublee",

        boutiques:

            "boutique.html",

        aide:

            "aide.html",

        contact:

            "contact.html"

    };

    const page =

        destinations[destination];

    if (!page) {

        console.warn(

            "Destination inconnue :",

            destination

        );

        return;

    }

    window.location.href = page;

}

/* ============================================================

   OUVRIR LE MENU

   ============================================================ */

function ouvrirMenu() {

    const menu =

        document.getElementById("mobile-menu");

    if (!menu) return;

    menu.classList.add("active");

    document.body.classList.add(

        "menu-ouvert"

    );

}

/* ============================================================

   FERMER LE MENU

   ============================================================ */

function fermerMenu() {

    const menu =

        document.getElementById("mobile-menu");

    if (!menu) return;

    menu.classList.remove("active");

    document.body.classList.remove(

        "menu-ouvert"

    );

}

/* ============================================================

   BASCULER LE MENU

   ============================================================ */

function basculerMenu() {

    const menu =

        document.getElementById("mobile-menu");

    if (!menu) return;

    if (

        menu.classList.contains("active")

    ) {

        fermerMenu();

    } else {

        ouvrirMenu();

    }

}

/* ============================================================

   FERMETURE AVEC ESC

   ============================================================ */

document.addEventListener(

    "keydown",

    event => {

        if (event.key === "Escape") {

            fermerMenu();

        }

    }

);

/* ============================================================

   CLIC SUR L'ARRIÈRE-PLAN DU MENU

   ============================================================ */

document.addEventListener(

    "click",

    event => {

        const menu =

            document.getElementById(

                "mobile-menu"

            );

        if (!menu) return;

        if (

            event.target === menu

        ) {

            fermerMenu();

        }

    }

);
