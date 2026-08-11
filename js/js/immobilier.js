/* ============================================================

   MARKET BOUAKÉ

   IMMOBILIER — JE SUIS INTÉRESSÉ

   ============================================================ */

async function envoyerDemandeInteret(productId, sellerId) {

    if (!productId || !sellerId) {

        alert("Impossible d'envoyer la demande.");

        return;

    }

    // Vérifier la connexion

    const {

        data: { user },

        error: authError

    } = await supabase.auth.getUser();

    if (authError || !user) {

        alert("Connectez-vous pour envoyer une demande.");

        window.location.href = "connexion.html";

        return;

    }

    // Éviter de créer plusieurs demandes identiques

    const { data: demandeExistante, error: rechercheError } =

        await supabase

            .from("property_interest_requests")

            .select("id,status")

            .eq("buyer_id", user.id)

            .eq("product_id", productId)

            .in("status", ["pending", "contacted"])

            .maybeSingle();

    if (rechercheError) {

        console.error(rechercheError);

        alert("Une erreur est survenue.");

        return;

    }

    if (demandeExistante) {

        alert("Vous avez déjà envoyé une demande pour ce bien.");

        return;

    }

    // Message facultatif

    const message = prompt(

        "Message pour le vendeur (facultatif) :",

        "Bonjour, je suis intéressé par ce bien. Je souhaite avoir plus d'informations."

    );

    // Si l'utilisateur annule

    if (message === null) {

        return;

    }

    // Création de la demande

    const { data, error } = await supabase

        .from("property_interest_requests")

        .insert({

            buyer_id: user.id,

            seller_id: sellerId,

            product_id: productId,

            message: message.trim() || null,

            status: "pending"

        })

        .select()

        .single();

    if (error) {

        console.error("Erreur création demande :", error);

        alert("Impossible d'envoyer votre demande.");

        return;

    }

    alert(

        "Votre demande a été envoyée au vendeur avec succès."

    );

    // Notification visuelle éventuelle

    if (typeof afficherMessage === "function") {

        afficherMessage("Demande envoyée au vendeur.");

    }

    return data;

}

/* ============================================================

   BOUTON JE SUIS INTÉRESSÉ

   ============================================================ */

function configurerBoutonInteret(productId, sellerId) {

    const bouton = document.getElementById("btn-je-suis-interesse");

    if (!bouton) return;

    bouton.addEventListener("click", async function () {

        bouton.disabled = true;

        bouton.textContent = "Envoi...";

        try {

            await envoyerDemandeInteret(

                productId,

                sellerId

            );

        } catch (error) {

            console.error(error);

        } finally {

            bouton.disabled = false;

            bouton.textContent = "Je suis intéressé";

        }

    });

}
