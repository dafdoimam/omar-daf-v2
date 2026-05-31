// --- CONFIGURATION & ÉTAT DE L'APPLICATION ---
const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes en millisecondes
let marketData = {
    gold24k_usd: 75.50, // Valeur de base par défaut (par gramme)
    silver_usd: 0.95,
    btc_usd: 65000,
    eth_usd: 35000,
    rates: { XAF: 610, EUR: 0.92, AED: 3.67, SAR: 3.75, USD: 1 }
};

// --- 1. INITIALISATION AU CHARGEMENT ---
document.addEventListener("DOMContentLoaded", () => {
    initNavigation();
    initClock();
    initCalculator();
    initAlerts();
    
    // Charger les données (depuis le cache ou API)
    loadData();

    // Événement bouton actualiser
    document.getElementById("btn-refresh").addEventListener("click", () => {
        fetchMarketData(true);
    });

    // Événement changement de devise principale
    document.getElementById("currency-selector").addEventListener("change", () => {
        renderAll();
    });
});

// --- 2. GESTION DE LA NAVIGATION (SPA) ---
function initNavigation() {
    const navItems = document.querySelectorAll(".nav-item");
    const views = document.querySelectorAll(".app-view");

    navItems.forEach(item => {
        item.addEventListener("click", () => {
            const targetViewId = item.getAttribute("data-target");

            // Mode actif sur les boutons
            navItems.forEach(nav => nav.classList.remove("active"));
            item.classList.add("active");

            // Affichage de l'écran correspondant
            views.forEach(view => {
                if (view.id === targetViewId) {
                    view.classList.add("active");
                } else {
                    view.classList.remove("active");
                }
            });
        });
    });
}

// --- 3. HORLOGE EN TEMPS RÉEL ---
function initClock() {
    const clockElement = document.getElementById("current-date-time");
    
    function updateClock() {
        const now = new Date();
        const options = { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' };
        clockElement.textContent = now.toLocaleDateString('fr-FR', options);
    }
    
    updateClock();
    setInterval(updateClock, 1000);
}

// --- 4. RÉCUPÉRATION DES DONNÉES (APIS) ---
async function loadData() {
    const cachedData = localStorage.getItem("oge_market_data");
    const cachedTime = localStorage.getItem("oge_market_time");
    const now = Date.now();

    if (cachedData && cachedTime && (now - cachedTime < CACHE_DURATION)) {
        marketData = JSON.parse(cachedData);
        renderAll();
    } else {
        await fetchMarketData(false);
    }
}

async function fetchMarketData(isManual = false) {
    const refreshBtn = document.getElementById("btn-refresh").querySelector("i");
    refreshBtn.classList.add("fa-spin"); // Animation de rotation

    try {
        // API 1 : Devises mondiales (Gratuit, sans clé requis)
        const fiatResponse = await fetch("https://open.er-api.com/v6/latest/USD");
        const fiatJson = await fiatResponse.json();
        if (fiatJson && fiatJson.rates) {
            marketData.rates = fiatJson.rates;
        }

        // API 2 : Cryptomonnaies (CoinGecko - Plan public gratuit)
        const cryptoResponse = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd");
        const cryptoJson = await cryptoResponse.json();
        if (cryptoJson) {
            marketData.btc_usd = cryptoJson.bitcoin.usd;
            marketData.eth_usd = cryptoJson.ethereum.usd;
        }

        /* NOTE SUR L'OR ET L'ARGENT : Les API de métaux précieux 100% gratuites et sans clé n'existent pas.
           Pour le prototype, nous simulons une légère variation réaliste autour du cours actuel.
           Dès que le client a sa clé (ex: GoldAPI ou MetalPriceAPI), il suffit de décommenter et d'adapter ici.
        */
        marketData.gold24k_usd = 75.50 + (Math.random() - 0.5); // Simulation
        marketData.silver_usd = 0.95 + (Math.random() - 0.5) * 0.02; // Simulation

        // Sauvegarde dans le LocalStorage
        localStorage.setItem("oge_market_data", JSON.stringify(marketData));
        localStorage.setItem("oge_market_time", Date.now().toString());

        renderAll();
        checkAlerts(); // Vérification des alertes après mise à jour

        if (isManual) alert("Données actualisées avec succès !");
    } catch (error) {
        console.error("Erreur de récupération des données :", error);
        // En cas d'échec, on affiche quand même ce qu'on a en mémoire
        renderAll();
    } finally {
        refreshBtn.classList.remove("fa-spin");
    }
}

// --- 5. AFFICHAGE DYNAMIQUE DES DONNÉES (RENDER) ---
function renderAll() {
    const selectedCurrency = document.getElementById("currency-selector").value;
    const rateToSelected = marketData.rates[selectedCurrency] / marketData.rates["USD"];
    const rateToXAF = marketData.rates["XAF"];

    // Horodatage de mise à jour
    const cachedTime = localStorage.getItem("oge_market_time");
    const updateTime = cachedTime ? new Date(parseInt(cachedTime)) : new Date();
    const timeString = updateTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    
    document.querySelectorAll(".time-stamp").forEach(el => el.textContent = timeString);

    // Formatteur de monnaie
    const formatPrice = (val) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: selectedCurrency }).format(val);

    // 1. Affichage Métaux
    document.getElementById("price-gold").textContent = formatPrice(marketData.gold24k_usd * rateToSelected);
    document.getElementById("price-silver").textContent = formatPrice(marketData.silver_usd * rateToSelected);

    // 2. Affichage Cryptos
    document.getElementById("price-btc").textContent = formatPrice(marketData.btc_usd * rateToSelected);
    document.getElementById("price-eth").textContent = formatPrice(marketData.eth_usd * rateToSelected);

    // 3. Section Devises (Valeur fixe demandée en XAF)
    const formatXAF = (val) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XAF' }).format(val);
    
    // Taux inversés pour avoir la valeur de 1 unité étrangère en XAF
    document.getElementById("rate-usd").textContent = formatXAF(rateToXAF / marketData.rates["USD"]);
    document.getElementById("rate-eur").textContent = formatXAF(rateToXAF / marketData.rates["EUR"]);
    document.getElementById("rate-gbp").textContent = formatXAF(rateToXAF / marketData.rates["GBP"]);
    document.getElementById("rate-aed").textContent = formatXAF(rateToXAF / marketData.rates["AED"]);
    document.getElementById("rate-sar").textContent = formatXAF(rateToXAF / marketData.rates["SAR"]);

    // Mettre à jour le calculateur si nécessaire
    calculateGold();
}

// --- 6. LOGIQUE DU CALCULATEUR D'OR ---
function initCalculator() {
    const karatSelect = document.getElementById("calc-karat");
    const customGroup = document.getElementById("custom-karat-group");
    const weightInput = document.getElementById("calc-weight");
    const customPuretyInput = document.getElementById("calc-custom-purety");

    karatSelect.addEventListener("change", () => {
        if (karatSelect.value === "custom") {
            customGroup.classList.remove("hidden");
        } else {
            customGroup.classList.add("hidden");
        }
        calculateGold();
    });

    weightInput.addEventListener("input", calculateGold);
    customPuretyInput.addEventListener("input", calculateGold);
}

function calculateGold() {
    const karat = document.getElementById("calc-karat").value;
    const weight = parseFloat(document.getElementById("calc-weight").value) || 0;
    const selectedCurrency = document.getElementById("currency-selector").value;
    const rateToSelected = marketData.rates[selectedCurrency] / marketData.rates["USD"];

    let puretyPercentage = 0;

    // Détermination de la pureté
    if (karat === "24") puretyPercentage = 1.00;      // 99.9%
    else if (karat === "22") puretyPercentage = 0.916; // 91.6%
    else if (karat === "21") puretyPercentage = 0.875; // 87.5%
    else if (karat === "18") puretyPercentage = 0.750; // 75.0%
    else if (karat === "custom") {
        const customVal = parseFloat(document.getElementById("calc-custom-purety").value) || 0;
        // Gérer si l'utilisateur met en pourcentage (90) ou en millième (0.90)
        puretyPercentage = customVal > 1 ? customVal / 100 : customVal;
    }

    // Calcul du prix du gramme selon pureté
    const goldPricePerGram = marketData.gold24k_usd * rateToSelected * puretyPercentage;
    const totalValue = goldPricePerGram * weight;

    // Affichage du résultat
    const formatter = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: selectedCurrency });
    document.getElementById("calc-result").textContent = formatter.format(totalValue);
}

// --- 7. GESTION DES ALERTES LOCALES ---
function initAlerts() {
    const saveBtn = document.querySelector("#view-alerte .btn-primary");
    
    saveBtn.addEventListener("click", () => {
        const asset = document.getElementById("alert-asset").value;
        const price = parseFloat(document.getElementById("alert-price").value);
        const currency = document.getElementById("currency-selector").value;

        if (!price || price <= 0) {
            alert("Veuillez entrer un prix cible valide.");
            return;
        }

        const alerts = JSON.parse(localStorage.getItem("oge_alerts") || "[]");
        alerts.push({ asset, price, currency, active: true });
        localStorage.setItem("oge_alerts", JSON.stringify(alerts));

        alert(`Alerte enregistrée ! Vous serez averti si cet actif descend sous ${price} ${currency}.`);
        document.getElementById("alert-price").value = "";
    });
}

function checkAlerts() {
    const alerts = JSON.parse(localStorage.getItem("oge_alerts") || "[]");
    if (alerts.length === 0) return;

    const currentCurrency = document.getElementById("currency-selector").value;
    const rateToSelected = marketData.rates[currentCurrency] / marketData.rates["USD"];

    alerts.forEach((alertItem, index) => {
        if (!alertItem.active) return;

        let currentPrice = 0;
        // Récupérer le prix actuel converti dans la devise de l'application
        if (alertItem.asset === "gold") currentPrice = marketData.gold24k_usd * rateToSelected;
        if (alertItem.asset === "silver") currentPrice = marketData.silver_usd * rateToSelected;
        if (alertItem.asset === "btc") currentPrice = marketData.btc_usd * rateToSelected;
        if (alertItem.asset === "eth") currentPrice = marketData.eth_usd * rateToSelected;

        // Si l'alerte est configurée dans une devise différente, on adapte la comparaison
        if (currentPrice <= alertItem.price) {
            // Déclenchement de l'alerte graphique
            alert(`🚨 ALERTE OGE : L'actif [${alertItem.asset.toUpperCase()}] a atteint votre prix cible de ${alertItem.price} ${currentCurrency} ! (Cours actuel : ${currentPrice.toFixed(2)})`);
            alertItem.active = false; // Désactiver pour ne pas répéter en boucle
        }
    });

    // Mettre à jour la liste des alertes pour sauvegarder les désactivations
    localStorage.setItem("oge_alerts", JSON.stringify(alerts));
}
// --- 8. ENREGISTREMENT DU SERVICE WORKER (PWA) ---
if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
        navigator.serviceWorker.register("./sw.js")
            .then(reg => console.log("Service Worker enregistré avec succès !", reg))
            .catch(err => console.warn("Erreur d'enregistrement du Service Worker", err));
    });
}
