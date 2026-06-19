const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, 'src', 'i18n', 'locales');
const newFaqs = {
  en: {
    q9: "Can I actually purchase a physical humanoid robot with $ZEX?",
    a9: "Yes! The ZexAI ecosystem seamlessly bridges software and hardware. During our initial release, a strictly limited batch of 80 humanoid robots is available for direct purchase using $ZEX tokens through our Web3 portal.",
    q10: "What is the long-term vision for the Robot Marketplace?",
    a10: "Our vision extends beyond simply selling hardware. The ZexAI Marketplace will become an ecosystem where developers can sell custom AI behavior modules (e.g., Security, Assistant, Entertainment). You can purchase these 'digital brains' with $ZEX and instantly deploy them to your physical robot via our secure cloud SDK."
  },
  tr: {
    q9: "Gerçekten $ZEX token ile fiziksel bir insansı robot satın alabilir miyim?",
    a9: "Evet! ZexAI ekosistemi yazılım ve donanımı kusursuzca birbirine bağlar. İlk sürümümüzde, Web3 portalımız üzerinden doğrudan $ZEX token ile satın alınabilen 80 adetlik sınırlı bir insansı robot (Humanoid) serisi satışa sunulmuştur.",
    q10: "Robot Pazaryeri'nin uzun vadeli vizyonu nedir?",
    a10: "Vizyonumuz sadece donanım satmanın ötesine geçiyor. ZexAI Robot Market, geliştiricilerin özelleştirilmiş AI davranış modüllerini (örneğin; Güvenlik, Karşılama, Eğlence Asistanı) satabileceği bir altyapı olacak. Bu 'dijital beyinleri' $ZEX ile satın alıp saniyeler içinde fiziksel robotunuza yükleyebileceksiniz."
  },
  de: {
    q9: "Kann ich wirklich einen physischen humanoiden Roboter mit $ZEX kaufen?",
    a9: "Ja! Das ZexAI-Ökosystem verbindet Software und Hardware nahtlos. In unserer ersten Phase steht eine streng limitierte Charge von 80 humanoiden Robotern zum direkten Kauf mit $ZEX-Tokens über unser Web3-Portal zur Verfügung.",
    q10: "Was ist die langfristige Vision für den Roboter-Marktplatz?",
    a10: "Unsere Vision geht über den reinen Hardwareverkauf hinaus. Der ZexAI-Marktplatz wird ein Ökosystem, in dem Entwickler maßgeschneiderte KI-Verhaltensmodule verkaufen können. Sie können diese 'digitalen Gehirne' mit $ZEX kaufen und sie sofort auf Ihren Roboter anwenden."
  },
  es: {
    q9: "¿Puedo comprar un robot humanoide físico con $ZEX?",
    a9: "¡Sí! El ecosistema ZexAI conecta software y hardware. En nuestra fase inicial, hay un lote limitado de 80 robots humanoides disponibles para su compra directa usando tokens $ZEX en nuestro portal Web3.",
    q10: "¿Cuál es la visión a largo plazo para el Mercado de Robots?",
    a10: "Nuestra visión va más allá del hardware. El Mercado ZexAI será un lugar donde los desarrolladores venderán módulos de inteligencia artificial personalizados. Puede comprar estos 'cerebros digitales' con $ZEX e instalarlos instantáneamente en su robot físico mediante nuestro SDK."
  },
  fr: {
    q9: "Puis-je réellement acheter un robot humanoïde physique avec des $ZEX?",
    a9: "Oui ! L'écosystème ZexAI relie parfaitement les logiciels et le matériel. Lors de notre sortie initiale, un lot strictement limité de 80 robots humanoïdes est disponible à l'achat direct avec des $ZEX via notre portail Web3.",
    q10: "Quelle est la vision à long terme du marché des robots?",
    a10: "Notre vision va bien au-delà de la vente de matériel. Le ZexAI Marketplace deviendra un écosystème où les développeurs pourront vendre des modules de comportement d'IA (ex: Sécurité, Assistant). Vous pourrez acheter ces 'cerveaux numériques' en $ZEX et les déployer instantanément sur votre robot."
  },
  zh: {
    q9: "我真的可以用 $ZEX 购买物理人形机器人吗？",
    a9: "是的！ZexAI 生态系统无缝连接软件和硬件。在我们的初始发布期间，您可以通过 Web3 门户使用 $ZEX 代币直接购买限量 80 台的人形机器人。",
    q10: "机器人市场的长期愿景是什么？",
    a10: "我们的愿景不仅仅是销售硬件。ZexAI 市场将成为一个生态系统，开发人员可以在其中销售自定义 AI 行为模块（例如安全、助手、娱乐）。您可以使用 $ZEX 购买这些“数字大脑”，并通过我们安全的云 SDK 即时部署到您的物理机器人上。"
  },
  su: {
    q9: "$ZEX kù-babbar alan sa10 gál?",
    a9: "Gal! ZexAI digital physical dù. ICO Web3 ki-sur-ra 80 alan $ZEX sa10. Alan gas-nu ki-lam.",
    q10: "Alan Ki-lam u4-gid a-na?",
    a10: "Nu hardware sa10. ZexAI Ki-lam AI gál dub-sar. 'An-na sag' $ZEX sa10, physical alan ku4 SDK cloud mah dù."
  }
};

fs.readdirSync(localesDir).forEach(file => {
  if (file.endsWith('.json')) {
    const lang = file.split('.')[0];
    const filePath = path.join(localesDir, file);
    try {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      if (!data.faq) data.faq = {};
      const addFaq = newFaqs[lang] || newFaqs.en;
      Object.assign(data.faq, addFaq);
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
      console.log(`Updated faqs 9 & 10 in ${file}`);
    } catch (e) {
      console.error(`Error updating ${file}:`, e);
    }
  }
});
