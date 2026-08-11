/* ============================================================

   MARKET BOUAKÉ

   CATÉGORIES — ACCUEIL

   ============================================================ */

async function chargerCategoriesAccueil() {

    const container =

        document.getElementById("categories-container");

    if (!container) return;

    try {

        const { data, error } = await supabase

            .from("categories")

            .select(`

                id,

                name,

                parent_id,

                categorie_principale

            `)

            .is("parent_id", null)

            .order("name", {

                ascending: true

            });

        if (error) {

            console.error(

                "Erreur chargement catégories :",

                error

            );

            container.innerHTML = "";

            return;

        }

        if (!data || data.length === 0) {

            container.innerHTML = `

                <div class="categories-empty">

                    Aucune catégorie disponible.

                </div>

            `;

            return;

        }

        container.innerHTML = "";

        data.forEach(categorie => {

            const bouton =

                document.createElement("button");

            bouton.type = "button";

            bouton.className =

                "category-item";

            bouton.textContent =

                categorie.name;

            bouton.addEventListener(

                "click",

                () => {

                    ouvrirCategorie(

                        categorie.id

                    );

                }

            );

            container.appendChild(bouton);

        });

    } catch (error) {

        console.error(

            "Erreur inattendue catégories :",

            error

        );

        container.innerHTML = "";

    }

}

/* ============================================================

   OUVRIR UNE CATÉGORIE

   ============================================================ */

function ouvrirCategorie(categoryId) {

    if (!categoryId) return;

    window.location.href =

        `categorie.html?id=${encodeURIComponent(categoryId)}`;

}

/* ============================================================

   INITIALISATION

   ============================================================ */

document.addEventListener(

    "DOMContentLoaded",

    function () {

        chargerCategoriesAccueil();

    }

);
