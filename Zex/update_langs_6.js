const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, 'frontend/src/i18n/locales');
const langs = ['en', 'tr', 'fr', 'de', 'es', 'zh', 'su'];

const newKeys = {
    en: {
        layout: {
            profile: "Profile",
            apiKeys: "API Keys",
            settings: "Settings",
            exploreSection: "Explore",
            creditsSub: "Credits & Subscription",
            proBadge: "Pro",
            marketplace: "Marketplace",
            invite: "Invite",
            preferencesSection: "Preferences",
            theme: "Theme",
            themeLight: "\u2600\ufe0f Light",
            themeDark: "\ud83c\udf19 Dark",
            logout: "Log Out"
        }
    },
    tr: {
        layout: {
            profile: "Profil",
            apiKeys: "API Anahtarlar\u0131",
            settings: "Ayarlar",
            exploreSection: "Ke\u015ffet",
            creditsSub: "Kredi & Abonelik",
            proBadge: "Pro",
            marketplace: "Marketplace",
            invite: "Davet Et",
            preferencesSection: "Tercihler",
            theme: "Tema",
            themeLight: "\u2600\ufe0f A\u00e7\u0131k",
            themeDark: "\ud83c\udf19 Koyu",
            logout: "\u00c7\u0131k\u0131\u015f Yap"
        }
    },
    fr: {
        layout: {
            profile: "Profil",
            apiKeys: "Cl\u00e9s API",
            settings: "Param\u00e8tres",
            exploreSection: "Explorer",
            creditsSub: "Cr\u00e9dits & Abonnement",
            proBadge: "Pro",
            marketplace: "Boutique",
            invite: "Inviter",
            preferencesSection: "Pr\u00e9f\u00e9rences",
            theme: "Th\u00e8me",
            themeLight: "\u2600\ufe0f Clair",
            themeDark: "\ud83c\udf19 Sombre",
            logout: "D\u00e9connexion"
        }
    },
    de: {
        layout: {
            profile: "Profil",
            apiKeys: "API-Schl\u00fcssel",
            settings: "Einstellungen",
            exploreSection: "Entdecken",
            creditsSub: "Guthaben & Abo",
            proBadge: "Pro",
            marketplace: "Marktplatz",
            invite: "Einladen",
            preferencesSection: "Pr\u00e4ferenzen",
            theme: "Thema",
            themeLight: "\u2600\ufe0f Hell",
            themeDark: "\ud83c\udf19 Dunkel",
            logout: "Abmelden"
        }
    },
    es: {
        layout: {
            profile: "Perfil",
            apiKeys: "Claves API",
            settings: "Ajustes",
            exploreSection: "Explorar",
            creditsSub: "Cr\u00e9ditos y Suscripci\u00f3n",
            proBadge: "Pro",
            marketplace: "Mercado",
            invite: "Invitar",
            preferencesSection: "Preferencias",
            theme: "Tema",
            themeLight: "\u2600\ufe0f Claro",
            themeDark: "\ud83c\udf19 Oscuro",
            logout: "Cerrar Sesi\u00f3n"
        }
    },
    zh: {
        layout: {
            profile: "\u4e2a\u4eba\u8d44\u6599",
            apiKeys: "API\u5bc6\u94a5",
            settings: "\u8bbe\u7f6e",
            exploreSection: "\u63a2\u7d22",
            creditsSub: "\u79ef\u5206\u4e0e\u8ba2\u9605",
            proBadge: "Pro",
            marketplace: "\u5e02\u573a",
            invite: "\u9080\u8bf7",
            preferencesSection: "\u504f\u597d\u8bbe\u7f6e",
            theme: "\u4e3b\u9898",
            themeLight: "\u2600\ufe0f \u6d45\u8272",
            themeDark: "\ud83c\udf19 \u6df1\u8272",
            logout: "\u9000\u51fa\u767b\u5f55"
        }
    },
    su: {
        layout: {
            profile: "Alam-zu",
            apiKeys: "Ki",
            settings: "Gub-ba",
            exploreSection: "Igi-bar",
            creditsSub: "Kú & Ku4",
            proBadge: "Gal",
            marketplace: "Ki-lam",
            invite: "Gù-dé",
            preferencesSection: "Me",
            theme: "U4",
            themeLight: "\u2600\ufe0f U4-zal",
            themeDark: "\ud83c\udf19 Gi6",
            logout: "È-a"
        }
    }
};

langs.forEach(lang => {
    const filePath = path.join(localesDir, `${lang}.json`);
    let data = {};
    if (fs.existsSync(filePath)) {
        try {
            data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        } catch (e) {
            console.error(`Error parsing ${filePath}`);
        }
    }
    data.layout = newKeys[lang].layout;
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
});
