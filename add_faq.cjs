const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, 'src', 'i18n', 'locales');
const newFaqs = {
  en: {
    q5: "Which blockchain network does ZexAI use?",
    a5: "ZexAI operates on the Polygon (POL) network for low fees and high speed. You can buy $ZEX directly through our presale portal by connecting your Web3 wallet and swapping POL for $ZEX.",
    q6: "Does ZexAI provide revenue sharing (Real Yield)?",
    a6: "Yes! A portion of ZexAI's real-world revenues (subscriptions, NFT sales, etc.) is distributed to loyal $ZEX investors and stakers. By staking $ZEX, you become a direct partner in the ecosystem's success.",
    q7: "How does the NFT minting feature work?",
    a7: "ZexAI allows you to instantly mint your AI-generated images, videos, and audio as NFTs. With our seamless Web3 integration, you can directly list your creations on major marketplaces like OpenSea and Zora with just one click.",
    q8: "Can I get a refund if I change my mind during the Presale?",
    a8: "Yes, ZexAI offers a secure Refund (Buyback) mechanism. If you choose to refund your purchased $ZEX, a 15% network penalty is incurred (which is permanently burned to protect the ecosystem), and the remaining value in POL is instantly returned to your wallet."
  },
  tr: {
    q5: "ZexAI hangi blokzincir ağını kullanıyor?",
    a5: "ZexAI, düşük işlem ücretleri ve yüksek hız için Polygon (POL) ağında çalışır. Ön satış portalımız üzerinden Web3 cüzdanınızı bağlayarak doğrudan POL ile $ZEX satın alabilirsiniz.",
    q6: "ZexAI gelir paylaşımı (Real Yield) sunuyor mu?",
    a6: "Evet! ZexAI'nin ürettiği gerçek dünya gelirlerinin (abonelikler, NFT satışları vb.) bir bölümü sadık $ZEX yatırımcılarına ve Staking yapanlara dağıtılır. $ZEX stake ederek ekosistemin doğrudan ortağı olursunuz.",
    q7: "NFT üretme özelliği nasıl çalışıyor?",
    a7: "ZexAI ile ürettiğiniz görsel, video ve sesleri anında NFT olarak mint'leyebilirsiniz (basabilirsiniz). Kusursuz Web3 entegrasyonumuz sayesinde, ürettiğiniz eserleri tek tıkla OpenSea ve Zora gibi büyük pazarlarda satışa sunabilirsiniz.",
    q8: "Ön satış sürecinde fikrimi değiştirirsem iade alabilir miyim?",
    a8: "Evet, ZexAI güvenli bir İade (Buyback) mekanizması sunar. Satın aldığınız $ZEX'i iade etmek isterseniz, ağ üzerinden %15'lik bir kesinti uygulanır (bu miktar ekosistemi korumak için kalıcı olarak yakılır) ve kalan değer doğrudan POL olarak cüzdanınıza anında aktarılır."
  },
  de: {
    q5: "Welches Blockchain-Netzwerk nutzt ZexAI?",
    a5: "ZexAI arbeitet auf dem Polygon (POL)-Netzwerk für niedrige Gebühren und hohe Geschwindigkeit. Sie können $ZEX direkt über unser Presale-Portal kaufen, indem Sie Ihre Web3-Wallet verbinden.",
    q6: "Bietet ZexAI Umsatzbeteiligung (Real Yield)?",
    a6: "Ja! Ein Teil der realen Einnahmen von ZexAI wird an treue $ZEX-Investoren und Staker ausgeschüttet. Durch das Staken von $ZEX werden Sie ein direkter Partner des Ökosystems.",
    q7: "Wie funktioniert die NFT-Erstellungsfunktion?",
    a7: "Mit ZexAI können Sie Ihre generierten Bilder, Videos und Audios sofort als NFTs prägen und mit einem Klick auf OpenSea und Zora listen.",
    q8: "Kann ich während des Presales eine Rückerstattung erhalten?",
    a8: "Ja, ZexAI bietet einen sicheren Rückerstattungsmechanismus (Buyback). Wenn Sie sich für eine Rückerstattung entscheiden, fällt eine Netzwerkstrafe von 15% an (die verbrannt wird), und der restliche Wert wird sofort in POL auf Ihre Wallet zurückerstattet."
  },
  es: {
    q5: "¿Qué red blockchain utiliza ZexAI?",
    a5: "ZexAI opera en la red Polygon (POL) para bajas comisiones y alta velocidad. Puede comprar $ZEX directamente a través de nuestro portal conectando su billetera Web3.",
    q6: "¿Ofrece ZexAI participación en los ingresos (Real Yield)?",
    a6: "¡Sí! Una parte de los ingresos reales de ZexAI se distribuye a los inversores leales y stakers de $ZEX. Al hacer staking de $ZEX, se convierte en un socio directo.",
    q7: "¿Cómo funciona la función de acuñación de NFTs?",
    a7: "ZexAI le permite acuñar instantáneamente sus imágenes, videos y audios generados por IA como NFTs y listarlos directamente en OpenSea y Zora con un solo clic.",
    q8: "¿Puedo obtener un reembolso si cambio de opinión durante la preventa?",
    a8: "Sí, ZexAI ofrece un mecanismo seguro de Reembolso (Buyback). Si decide reembolsar su $ZEX, se aplica una penalización del 15% (que se quema permanentemente), y el valor restante se devuelve instantáneamente a su billetera en POL."
  },
  fr: {
    q5: "Quel réseau blockchain utilise ZexAI?",
    a5: "ZexAI fonctionne sur le réseau Polygon (POL) pour des frais réduits et une grande vitesse. Vous pouvez acheter $ZEX directement via notre portail en connectant votre portefeuille Web3.",
    q6: "ZexAI propose-t-il un partage des revenus (Real Yield)?",
    a6: "Oui ! Une partie des revenus réels de ZexAI est distribuée aux investisseurs fidèles et aux stakers de $ZEX. En misant vos $ZEX, vous devenez un partenaire direct.",
    q7: "Comment fonctionne la fonction de création de NFT?",
    a7: "ZexAI vous permet de frapper (mint) instantanément vos images, vidéos et audios générés par l'IA sous forme de NFT et de les lister directement sur OpenSea et Zora en un clic.",
    q8: "Puis-je obtenir un remboursement si je change d'avis pendant la prévente?",
    a8: "Oui, ZexAI offre un mécanisme de remboursement sécurisé. Si vous choisissez de rembourser vos $ZEX, une pénalité de réseau de 15% est encourue (et brûlée de façon permanente), et la valeur restante en POL est instantanément retournée dans votre portefeuille."
  },
  zh: {
    q5: "ZexAI 使用哪个区块链网络？",
    a5: "ZexAI 在 Polygon (POL) 网络上运行，具有低费用和高速度的优势。您可以通过连接您的 Web3 钱包并用 POL 兑换 $ZEX，直接通过我们的预售门户进行购买。",
    q6: "ZexAI 是否提供收益共享 (Real Yield)？",
    a6: "是的！ZexAI 的部分实际收入（订阅、NFT 销售等）将分配给忠实的 $ZEX 投资者和质押者。通过质押 $ZEX，您将成为该生态系统的直接合作伙伴。",
    q7: "NFT 铸造功能如何运作？",
    a7: "ZexAI 允许您立即将人工智能生成的图像、视频和音频铸造为 NFT。通过我们无缝的 Web3 集成，您只需一键即可直接在 OpenSea 和 Zora 等主要市场上列出您的创作。",
    q8: "如果在预售期间我改变主意了，可以退款吗？",
    a8: "是的，ZexAI 提供了安全的退款（回购）机制。如果您选择退还购买的 $ZEX，将产生 15% 的网络罚款（永久销毁以保护生态系统），剩余的 POL 价值将立即退还到您的钱包中。"
  },
  su: {
    q5: "Ki-lam blockchain ZexAI a-na?",
    a5: "ZexAI Polygon (POL) ki-lam dù. Nig-gal-la sa10 Web3 é-kìshib ku4 ù POL gu-la.",
    q6: "ZexAI kù-babbar ki-ag gál?",
    a6: "Gal! ZexAI kù-babbar $ZEX lugal ù staking gál. Staking $ZEX ki-sur-ra lugal dù.",
    q7: "NFT dim-dim a-na gál?",
    a7: "ZexAI AI alam NFT dù. OpenSea ù Zora diš tag ku4 ki-lam.",
    q8: "ICO sa10 kù-babbar gur a-na?",
    a8: "Gal, ZexAI Buyback gur gál. $ZEX gur 15% izi izi (burn), kù POL é-kìshib gur gál."
  }
};

fs.readdirSync(localesDir).forEach(file => {
  if (file.endsWith('.json')) {
    const lang = file.split('.')[0];
    const filePath = path.join(localesDir, file);
    try {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      if (!data.faq) data.faq = {};
      
      const newFaqData = newFaqs[lang] || newFaqs.en;
      Object.assign(data.faq, newFaqData);
      
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
      console.log(`Updated ${file}`);
    } catch (e) {
      console.error(`Error updating ${file}:`, e);
    }
  }
});
