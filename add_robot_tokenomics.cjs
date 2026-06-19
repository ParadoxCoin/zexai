const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, 'src', 'i18n', 'locales');
const newTokens = {
  en: {
    robotTitle: "Robot Ecosystem",
    robotDesc: ": Use $ZEX to purchase limited edition humanoid robots and deploy customized autonomous AI behavior modules."
  },
  tr: {
    robotTitle: "Robot Ekosistemi",
    robotDesc: ": $ZEX token kullanarak fiziksel robotlar satın alabilir ve donanımlara özel otonom AI davranış modülleri yükleyebilirsiniz."
  },
  de: {
    robotTitle: "Roboter-Ökosystem",
    robotDesc: ": Verwenden Sie $ZEX, um humanoide Roboter zu kaufen und maßgeschneiderte KI-Verhaltensmodule bereitzustellen."
  },
  es: {
    robotTitle: "Ecosistema de Robots",
    robotDesc: ": Use $ZEX para comprar robots humanoides y módulos personalizados de comportamiento de IA."
  },
  fr: {
    robotTitle: "Écosystème de Robots",
    robotDesc: ": Utilisez $ZEX pour acheter des robots humanoïdes et des modules de comportement IA personnalisés."
  },
  zh: {
    robotTitle: "机器人生态系统",
    robotDesc: ": 使用 $ZEX 购买人形机器人，并部署量身定制的 AI 自主行为模块。"
  },
  su: {
    robotTitle: "Alan Ki-lam",
    robotDesc: ": $ZEX kù-babbar physical alan sa10 ù AI dub didli ku4."
  }
};

fs.readdirSync(localesDir).forEach(file => {
  if (file.endsWith('.json')) {
    const lang = file.split('.')[0];
    const filePath = path.join(localesDir, file);
    try {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      if (data.tokenomics) {
        const newData = newTokens[lang] || newTokens.en;
        Object.assign(data.tokenomics, newData);
      }
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
      console.log(`Updated tokenomics for ${file}`);
    } catch (e) {
      console.error(`Error updating ${file}:`, e);
    }
  }
});
