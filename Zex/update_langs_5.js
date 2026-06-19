const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, 'frontend/src/i18n/locales');
const langs = ['en', 'tr', 'fr', 'de', 'es', 'zh', 'su'];

const newKeys = {
    en: {
        promptEnhancer: {
            btnTitle: "\ud83e\ude84 AI Prompt Enhancer",
            modalTitle: "AI Prompt Assistant",
            modalDesc: "Turn your simple idea into a professional prompt",
            inputLabel: "Type your idea",
            inputPlaceholder: "e.g., A sunset beach, palm trees...",
            enhanceBtn: "Enhance",
            generating: "Generating prompts...",
            suggestedPrompts: "Suggested Prompts",
            copyTitle: "Copy",
            tipsTitle: "\ud83d\udca1 Tips",
            tip1: "\u2022 Write simple and short ideas (e.g., \"cat\", \"spaceship\")",
            tip2: "\u2022 AI will automatically generate detailed prompts",
            tip3: "\u2022 You will get suggestions in different styles",
            tip4: "\u2022 Click on the prompt you like to use it"
        }
    },
    tr: {
        promptEnhancer: {
            btnTitle: "\ud83e\ude84 AI Prompt Geliştirici",
            modalTitle: "AI Prompt Asistanı",
            modalDesc: "Basit fikrinizi profesyonel prompt'a dönüştürün",
            inputLabel: "Fikrinizi yazın",
            inputPlaceholder: "Örn: Güneş batan bir sahil, palmiye ağaçları...",
            enhanceBtn: "Geliştir",
            generating: "Prompt'lar oluşturuluyor...",
            suggestedPrompts: "Önerilen Promptlar",
            copyTitle: "Kopyala",
            tipsTitle: "\ud83d\udca1 İpuçları",
            tip1: "\u2022 Basit ve kısa fikirler yazın (örn: \"kedi\", \"uzay gemisi\")",
            tip2: "\u2022 AI otomatik olarak detaylı prompt'lar üretecek",
            tip3: "\u2022 Farklı stillerde öneriler alacaksınız",
            tip4: "\u2022 Beğendiğiniz prompt'a tıklayarak kullanın"
        }
    },
    fr: {
        promptEnhancer: {
            btnTitle: "\ud83e\ude84 Am\u00e9liorateur de Prompt IA",
            modalTitle: "Assistant Prompt IA",
            modalDesc: "Transformez votre id\u00e9e simple en prompt professionnel",
            inputLabel: "Tapez votre id\u00e9e",
            inputPlaceholder: "Ex: Une plage au coucher du soleil, des palmiers...",
            enhanceBtn: "Am\u00e9liorer",
            generating: "G\u00e9n\u00e9ration en cours...",
            suggestedPrompts: "Prompts Sugg\u00e9r\u00e9s",
            copyTitle: "Copier",
            tipsTitle: "\ud83d\udca1 Astuces",
            tip1: "\u2022 \u00c9crivez des id\u00e9es simples (ex: \"chat\", \"vaisseau spatial\")",
            tip2: "\u2022 L'IA g\u00e9n\u00e9rera automatiquement des prompts d\u00e9taill\u00e9s",
            tip3: "\u2022 Vous recevrez des suggestions de diff\u00e9rents styles",
            tip4: "\u2022 Cliquez sur le prompt que vous aimez pour l'utiliser"
        }
    },
    de: {
        promptEnhancer: {
            btnTitle: "\ud83e\ude84 KI Prompt-Verbesserer",
            modalTitle: "KI Prompt-Assistent",
            modalDesc: "Verwandeln Sie Ihre einfache Idee in einen professionellen Prompt",
            inputLabel: "Geben Sie Ihre Idee ein",
            inputPlaceholder: "z.B. Ein Sonnenuntergang am Strand, Palmen...",
            enhanceBtn: "Verbessern",
            generating: "Prompts werden generiert...",
            suggestedPrompts: "Vorgeschlagene Prompts",
            copyTitle: "Kopieren",
            tipsTitle: "\ud83d\udca1 Tipps",
            tip1: "\u2022 Schreiben Sie einfache und kurze Ideen (z.B. \"Katze\", \"Raumschiff\")",
            tip2: "\u2022 KI generiert automatisch detaillierte Prompts",
            tip3: "\u2022 Sie erhalten Vorschl\u00e4ge in verschiedenen Stilen",
            tip4: "\u2022 Klicken Sie auf den gew\u00fcnschten Prompt, um ihn zu verwenden"
        }
    },
    es: {
        promptEnhancer: {
            btnTitle: "\ud83e\ude84 Mejorador de Prompts IA",
            modalTitle: "Asistente de Prompts IA",
            modalDesc: "Convierte tu idea simple en un prompt profesional",
            inputLabel: "Escribe tu idea",
            inputPlaceholder: "Ej: Una playa al atardecer, palmeras...",
            enhanceBtn: "Mejorar",
            generating: "Generando prompts...",
            suggestedPrompts: "Prompts Sugeridos",
            copyTitle: "Copiar",
            tipsTitle: "\ud83d\udca1 Consejos",
            tip1: "\u2022 Escribe ideas simples y cortas (ej: \"gato\", \"nave espacial\")",
            tip2: "\u2022 La IA generar\u00e1 autom\u00e1ticamente prompts detallados",
            tip3: "\u2022 Recibir\u00e1s sugerencias en diferentes estilos",
            tip4: "\u2022 Haz clic en el prompt que te guste para usarlo"
        }
    },
    zh: {
        promptEnhancer: {
            btnTitle: "\ud83e\ude84 AI提示词优化器",
            modalTitle: "AI提示词助手",
            modalDesc: "将您简单的想法转化为专业的提示词",
            inputLabel: "输入您的想法",
            inputPlaceholder: "例如：日落的海滩，棕榈树...",
            enhanceBtn: "优化",
            generating: "正在生成提示词...",
            suggestedPrompts: "建议提示词",
            copyTitle: "复制",
            tipsTitle: "\ud83d\udca1 提示",
            tip1: "\u2022 写下简单短小的想法（例如：\"猫\"，\"宇宙飞船\"）",
            tip2: "\u2022 AI会自动生成详细的提示词",
            tip3: "\u2022 您将获得不同风格的建议",
            tip4: "\u2022 点击您喜欢的提示词即可使用"
        }
    },
    su: {
        promptEnhancer: {
            btnTitle: "\ud83e\ude84 An-na Dim-dim Mah",
            modalTitle: "An-na Dim-dim Sukkal",
            modalDesc: "Dim-dim tur-zu dim-dim kal-ga-šè ku4",
            inputLabel: "Dim-dim-zu sar",
            inputPlaceholder: "Múš: A-ab-ba u4-šú-uš, giš-šim...",
            enhanceBtn: "Mah Dù",
            generating: "Dim-dim dù-dù...",
            suggestedPrompts: "Dim-dim Pà",
            copyTitle: "Gibil Dù",
            tipsTitle: "\ud83d\udca1 Me",
            tip1: "\u2022 Dim-dim tur lugud sar (múš: \"mi-rí-za\", \"má-an-na\")",
            tip2: "\u2022 An-na dim-dim šu-du7 dù-àm",
            tip3: "\u2022 Dù-dù didli pà-dè-en",
            tip4: "\u2022 Dim-dim sù-ga tag zi-ga"
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
    data.promptEnhancer = newKeys[lang].promptEnhancer;
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
});
