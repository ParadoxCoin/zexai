const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, 'frontend/src/i18n/locales');
const langs = ['en', 'tr', 'fr', 'de', 'es', 'zh', 'su'];

const newKeys = {
    en: {
        settings: {
            title: "Account Preferences",
            desc: "Manage your profile, billing, and notification settings",
            profileInfo: "Profile Information",
            accountType: "Account Type",
            emailNotif: "Email Notifications",
            taskComp: "Task completion notifications",
            creditAlerts: "Credit balance alerts",
            marketing: "Marketing emails",
            billingTitle: "Billing & Credits",
            autoRecharge: "Auto-recharge when balance is low",
            rechargeWhenUrl: "credits when balance drops below",
            credits: "credits",
            managePayment: "Manage Payment Methods",
            reset: "Reset to Defaults",
            saveChanges: "Save Changes",
            saving: "Saving..."
        },
        chat: {
            newChat: "New Chat",
            searchModel: "Search model...",
            free: "Free",
            premium: "Premium",
            pastChats: "Past Chats",
            noChats: "No chats yet",
            firstMsg: "Write your first message!",
            untitled: "Untitled Chat",
            msgCount: "messages",
            compare: "Compare Models",
            howCanIHelp: "How can I help you?",
            askAnything: "Ask anything you want",
            typing: "Typing...",
            typeMsg: "Type your message...",
            shortcut: "Shift+Enter for new line",
            copied: "Copied"
        }
    },
    tr: {
        settings: {
            title: "Hesap Tercihleri",
            desc: "Profil, faturalandırma ve bildirim ayarlarınızı yönetin",
            profileInfo: "Profil Bilgileri",
            accountType: "Hesap Türü",
            emailNotif: "E-posta Bildirimleri",
            taskComp: "Görev tamamlanma bildirimleri",
            creditAlerts: "Kredi bakiyesi uyarıları",
            marketing: "Pazarlama e-postaları",
            billingTitle: "Faturalandırma & Krediler",
            autoRecharge: "Bakiye azaldığında otomatik yükle",
            rechargeWhenUrl: "kredi, bakiye şunun altına düştüğünde:",
            credits: "kredi",
            managePayment: "Ödeme Yöntemlerini Yönet",
            reset: "Varsayılana Sıfırla",
            saveChanges: "Değişiklikleri Kaydet",
            saving: "Kaydediliyor..."
        },
        chat: {
            newChat: "Yeni Sohbet",
            searchModel: "Model ara...",
            free: "Ücretsiz",
            premium: "Premium",
            pastChats: "Geçmiş Sohbetler",
            noChats: "Henüz sohbet yok",
            firstMsg: "İlk mesajınızı yazın!",
            untitled: "Başlıksız Sohbet",
            msgCount: "mesaj",
            compare: "Model Karşılaştır",
            howCanIHelp: "Nasıl yardımcı olabilirim?",
            askAnything: "Sormak istediğiniz her şeyi yazabilirsiniz",
            typing: "Yazıyor...",
            typeMsg: "Mesajınızı yazın...",
            shortcut: "Shift+Enter ile yeni satır",
            copied: "Kopyalandı"
        }
    },
    fr: {
        settings: {
            title: "Préférences du Compte",
            desc: "Gérez votre profil, facturation et notifications",
            profileInfo: "Informations du Profil",
            accountType: "Type de Compte",
            emailNotif: "Notifications par Email",
            taskComp: "Tâche terminée",
            creditAlerts: "Alertes de solde",
            marketing: "Emails marketing",
            billingTitle: "Facturation & Crédits",
            autoRecharge: "Rechargement automatique",
            rechargeWhenUrl: "crédits si le solde descend sous",
            credits: "crédits",
            managePayment: "Gérer les Méthodes de Paiement",
            reset: "Réinitialiser",
            saveChanges: "Enregistrer",
            saving: "Enregistrement..."
        },
        chat: {
            newChat: "Nouveau Chat",
            searchModel: "Chercher modèle...",
            free: "Gratuit",
            premium: "Premium",
            pastChats: "Anciens Chats",
            noChats: "Aucun chat",
            firstMsg: "Écrivez votre premier message !",
            untitled: "Chat sans titre",
            msgCount: "messages",
            compare: "Comparer Modèles",
            howCanIHelp: "Comment puis-je aider ?",
            askAnything: "Demandez n'importe quoi",
            typing: "Écriture...",
            typeMsg: "Tapez votre message...",
            shortcut: "Shift+Enter pour ligne",
            copied: "Copié"
        }
    },
    de: {
        settings: {
            title: "Kontoeinstellungen",
            desc: "Profil, Abrechnung und Benachrichtigungen verwalten",
            profileInfo: "Profilinformationen",
            accountType: "Kontotyp",
            emailNotif: "E-Mail-Benachrichtigungen",
            taskComp: "Aufgabe abgeschlossen",
            creditAlerts: "Guthabenwarnungen",
            marketing: "Marketing-Mails",
            billingTitle: "Abrechnung & Credits",
            autoRecharge: "Automatisches Aufladen",
            rechargeWhenUrl: "Credits wenn das Guthaben unter",
            credits: "Credits",
            managePayment: "Zahlungsmethoden verwalten",
            reset: "Zurücksetzen",
            saveChanges: "Speichern",
            saving: "Speichern..."
        },
        chat: {
            newChat: "Neuer Chat",
            searchModel: "Modell suchen...",
            free: "Kostenlos",
            premium: "Premium",
            pastChats: "Vorherige Chats",
            noChats: "Noch keine Chats",
            firstMsg: "Schreib deine erste Nachricht!",
            untitled: "Unbenannter Chat",
            msgCount: "Nachrichten",
            compare: "Modelle vergleichen",
            howCanIHelp: "Wie kann ich helfen?",
            askAnything: "Frag alles was du willst",
            typing: "Tippt...",
            typeMsg: "Schreibe eine Nachricht...",
            shortcut: "Shift+Enter für eine neue Zeile",
            copied: "Kopiert"
        }
    },
    es: {
        settings: {
            title: "Preferencias de Cuenta",
            desc: "Administre su perfil, facturación y notificaciones",
            profileInfo: "Información del Perfil",
            accountType: "Tipo de Cuenta",
            emailNotif: "Notificaciones de correo",
            taskComp: "Tarea completada",
            creditAlerts: "Alertas de saldo",
            marketing: "Correos de marketing",
            billingTitle: "Facturación y Créditos",
            autoRecharge: "Recarga automática",
            rechargeWhenUrl: "créditos cuando baje de",
            credits: "créditos",
            managePayment: "Métodos de pago",
            reset: "Restablecer",
            saveChanges: "Guardar",
            saving: "Guardando..."
        },
        chat: {
            newChat: "Nuevo Chat",
            searchModel: "Buscar modelo...",
            free: "Gratis",
            premium: "Premium",
            pastChats: "Chats Pasados",
            noChats: "Sin chats",
            firstMsg: "¡Escribe tu primer mensaje!",
            untitled: "Chat sin título",
            msgCount: "mensajes",
            compare: "Comparar Modelos",
            howCanIHelp: "Cómó puedo ayudar?",
            askAnything: "Pregunta cualquier cosa",
            typing: "Escribiendo...",
            typeMsg: "Escribe tu mensaje...",
            shortcut: "Shift+Enter para nueva línea",
            copied: "Copiado"
        }
    },
    zh: {
        settings: {
            title: "帐户首选项",
            desc: "管理您的个人资料、账单和通知",
            profileInfo: "个人资料信息",
            accountType: "帐户类型",
            emailNotif: "电子邮件通知",
            taskComp: "任务完成",
            creditAlerts: "积分余额",
            marketing: "营销邮件",
            billingTitle: "账单和积分",
            autoRecharge: "自动充值",
            rechargeWhenUrl: "积分当低于",
            credits: "积分",
            managePayment: "付款方式",
            reset: "重置",
            saveChanges: "保存更改",
            saving: "保存中..."
        },
        chat: {
            newChat: "新聊天",
            searchModel: "搜索模型...",
            free: "免费",
            premium: "高级",
            pastChats: "过去的聊天",
            noChats: "还没有聊天",
            firstMsg: "写下你的第一条信息！",
            untitled: "无标题聊天",
            msgCount: "信息",
            compare: "比较模型",
            howCanIHelp: "我能怎么帮你？",
            askAnything: "问任何你想问的",
            typing: "打字...",
            typeMsg: "输入你的信息...",
            shortcut: "Shift+Enter换行",
            copied: "已复制"
        }
    },
    su: {
        settings: {
            title: "Lu-gal Ki-en-gi",
            desc: "Dub-sar ki-ag-ga",
            profileInfo: "Lugal Mu-tu",
            accountType: "Lu-gal Nanna",
            emailNotif: "Kin-gi-a U-dug",
            taskComp: "Kin Til-la",
            creditAlerts: "Kug-sig Warn",
            marketing: "Kaskal Mail",
            billingTitle: "Kug-sig & Kù-babbar",
            autoRecharge: "Kug Auto-Add",
            rechargeWhenUrl: "Kug dir-ga en-nu",
            credits: "Kug-sig",
            managePayment: "Zuh-zuh Payment",
            reset: "Gibil-Bi",
            saveChanges: "Šid-Šid",
            saving: "Šid-da..."
        },
        chat: {
            newChat: "En-du Gibil",
            searchModel: "Kin En-ki...",
            free: "Ša-ga",
            premium: "Kug-Babbar",
            pastChats: "En-du U-bi-a",
            noChats: "Nu En-du",
            firstMsg: "Dub-sar e-dub-ba-a!",
            untitled: "Nu Mu En-du",
            msgCount: "dub-sar",
            compare: "Kin-ki Model",
            howCanIHelp: "Me-a An-na help?",
            askAnything: "En-ki dub-sar",
            typing: "Sar-sar...",
            typeMsg: "Šar a-na...",
            shortcut: "Shift+Enter na-ru-a",
            copied: "Kišib"
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
    data.settings = newKeys[lang].settings;
    data.chat = newKeys[lang].chat;
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
});
