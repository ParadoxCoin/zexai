const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, 'src', 'i18n', 'locales');

const newSdkTranslations = {
  en: {
    "campaign": { "tabSdk": "SDK & Robot Market 🌐" },
    "sdk": {
      "badge": "FOR DEVELOPERS & CREATORS",
      "title": "ZexAI Developer SDK & Robot Marketplace",
      "desc": "Build the future of robotic intelligence. Using our SDK, developers can seamlessly integrate ZexAI's autonomous agents into Web3 applications, Metaverse games, or physical robots.",
      "marketTitle": "Robot Model & AI Marketplace",
      "marketDesc": "Don't just buy hardware; buy brains. In the ZexAI Robot Marketplace, you can purchase humanoid robots, drones, and specialized AI behavior modules directly using $ZEX.",
      "docsBtn": "Read Documentation"
    }
  },
  tr: {
    "campaign": { "tabSdk": "SDK & Robot Market 🌐" },
    "sdk": {
      "badge": "GELİŞTİRİCİLER VE YARATICILAR İÇİN",
      "title": "ZexAI Developer SDK ve Robot Pazaryeri",
      "desc": "Robotik zekanın geleceğini inşa edin. SDK'mızı kullanarak geliştiriciler, ZexAI'nin otonom ajanlarını Web3 uygulamalarına, Metaverse oyunlarına veya fiziksel robotlara entegre edebilir.",
      "marketTitle": "Robot Modeli ve Yapay Zeka Pazaryeri",
      "marketDesc": "Sadece donanım değil, beyin satın alın. ZexAI Robot Market'te doğrudan $ZEX token kullanarak insansı robotlar, dronlar ve özelleştirilmiş AI davranış modülleri satın alabilirsiniz.",
      "docsBtn": "Dokümantasyonu Oku"
    }
  },
  de: {
    "campaign": { "tabSdk": "SDK & Robotermarkt 🌐" },
    "sdk": {
      "badge": "FÜR ENTWICKLER & KREATOREN",
      "title": "ZexAI Entwickler-SDK & Roboter-Marktplatz",
      "desc": "Bauen Sie die Zukunft der Roboterintelligenz auf. ZexAI-Akteure in Web3-Anwendungen, Metaverse-Spiele oder physische Roboter integrieren.",
      "marketTitle": "Robotermodell & KI-Marktplatz",
      "marketDesc": "Kaufen Sie nicht nur Hardware, kaufen Sie Gehirne. Im ZexAI-Robotermarkt können Sie mit $ZEX humanoide Roboter und KI-Module kaufen.",
      "docsBtn": "Dokumentation lesen"
    }
  },
  es: {
    "campaign": { "tabSdk": "SDK y Mercado 🌐" },
    "sdk": {
      "badge": "PARA DESARROLLADORES",
      "title": "ZexAI SDK y Mercado de Robots",
      "desc": "Construya el futuro de la inteligencia robótica. Use nuestro SDK para integrar agentes autónomos de ZexAI en aplicaciones Web3 o robots físicos.",
      "marketTitle": "Mercado de Modelos y Nódulos de IA",
      "marketDesc": "No solo compre hardware, compre cerebros. Puede comprar robots humanoides, drones y módulos de comportamiento de IA usando $ZEX.",
      "docsBtn": "Leer Documentación"
    }
  },
  fr: {
    "campaign": { "tabSdk": "SDK & Marché 🌐" },
    "sdk": {
      "badge": "POUR LES DÉVELOPPEURS",
      "title": "ZexAI SDK et Marché des Robots",
      "desc": "Construisez l'avenir de l'intelligence robotique. Les développeurs peuvent intégrer de manière transparente les agents autonomes ZexAI dans les robots physiques et Web3.",
      "marketTitle": "Modèle de Robot et Marché IA",
      "marketDesc": "Achetez plus que du matériel, achetez des cerveaux. Achetez des robots humanoïdes et des modules d'IA spécialisés avec $ZEX.",
      "docsBtn": "Lire la documentation"
    }
  },
  zh: {
    "campaign": { "tabSdk": "SDK 与机器人市场 🌐" },
    "sdk": {
      "badge": "专为开发者打造",
      "title": "ZexAI 开发者 SDK 与机器人市场",
      "desc": "构建机器人智能的未来。开发者可以使用我们的 SDK 将 ZexAI 代理无缝集成到 Web3 应用程序或物理机器人中。",
      "marketTitle": "机器人模型与 AI 市场",
      "marketDesc": "不仅购买硬件，更购买大脑。在 ZexAI 机器人市场中，您可以直接使用 $ZEX 购买人形机器人和专门的 AI 核心。",
      "docsBtn": "阅读文档"
    }
  },
  su: {
    "campaign": { "tabSdk": "SDK ù Ki-lam 🌐" },
    "sdk": {
      "badge": "DUB-SAR GAL",
      "title": "ZexAI SDK ù Ki-lam Alan",
      "desc": "Alam ù AI dub-sar. ZexAI Synapse ku4 Web3 Metaverse physical alan dù.",
      "marketTitle": "Alan ù An-na Ki-lam",
      "marketDesc": "Ki-lam $ZEX alan drone an-na sa10. Nu gas-nu hardware, alam sa10.",
      "docsBtn": "Dub-sar Šid"
    }
  }
};

fs.readdirSync(localesDir).forEach(file => {
  if (file.endsWith('.json')) {
    const lang = file.split('.')[0];
    const filePath = path.join(localesDir, file);
    try {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      const newSdkData = newSdkTranslations[lang] || newSdkTranslations.en;
      
      // Merge campaign tab title if campaign object exists
      if (data.campaign) {
        data.campaign.tabSdk = newSdkData.campaign.tabSdk;
      }
      
      data.sdk = newSdkData.sdk;
      
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
      console.log(`Updated SDK strings in ${file}`);
    } catch (e) {
      console.error(`Error updating ${file}:`, e);
    }
  }
});
