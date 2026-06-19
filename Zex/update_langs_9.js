const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, 'frontend', 'src', 'i18n', 'locales');

const translations = {
    tr: {
        prompt1: "Neon ışıklarla aydınlatılmış yağmurlu bir cyberpunk sokak",
        prompt2: "Gökyüzünde süzülen büyülü bir kale",
        prompt3: "Yalnız bir astronot uzak bir gezegenin yüzeyinde",
        prompt4: "Gün batımında sakin bir Japon bahçesi",
        prompt5: "Fütüristik uçan arabaların olduğu bir şehir"
    },
    en: {
        prompt1: "A rainy cyberpunk street illuminated by neon lights",
        prompt2: "A magical castle floating in the sky",
        prompt3: "A lonely astronaut on the surface of a distant planet",
        prompt4: "A peaceful Japanese garden at sunset",
        prompt5: "A city with futuristic flying cars"
    },
    fr: {
        prompt1: "Une rue cyberpunk pluvieuse illuminée par des néons",
        prompt2: "Un château magique flottant dans le ciel",
        prompt3: "Un astronaute solitaire sur la surface d'une planète lointaine",
        prompt4: "Un paisible jardin japonais au coucher du soleil",
        prompt5: "Une ville avec des voitures volantes futuristes"
    },
    de: {
        prompt1: "Eine regnerische Cyberpunk-Straße beleuchtet von Neonlichtern",
        prompt2: "Ein magisches Schloss, das am Himmel schwebt",
        prompt3: "Ein einsamer Astronaut auf der Oberfläche eines fernen Planeten",
        prompt4: "Ein friedlicher japanischer Garten bei Sonnenuntergang",
        prompt5: "Eine Stadt mit futuristischen fliegenden Autos"
    },
    es: {
        prompt1: "Una calle cyberpunk lluviosa iluminada por luces de neón",
        prompt2: "Un castillo mágico flotando en el cielo",
        prompt3: "Un astronauta solitario en la superficie de un planeta distante",
        prompt4: "Un tranquilo jardín japonés al atardecer",
        prompt5: "Una ciudad con autos voladores futuristas"
    },
    zh: {
        prompt1: "霓虹灯照亮的网络朋克雨夜街道",
        prompt2: "漂浮在天空中的神奇城堡",
        prompt3: "远方星球表面孤独的宇航员",
        prompt4: "日落时宁静的日本花园",
        prompt5: "拥有未来飞行汽车的城市"
    },
    su: {
        prompt1: "Neo luzum hujanutu cyberpunku streetumu",
        prompt2: "Aki magicu castleu floatingu ka skyu",
        prompt3: "Aki lonelyu astronautu on planetumu",
        prompt4: "Aki peacefulu japanu gardenu at sunsetu",
        prompt5: "Aki cityumu withu flyatu carsumu"
    }
};

const languages = ['en', 'tr', 'fr', 'de', 'es', 'zh', 'su'];

languages.forEach(lang => {
    const filePath = path.join(localesDir, `${lang}.json`);
    if (fs.existsSync(filePath)) {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

        if (!data.imageGen) {
            data.imageGen = {};
        }

        // Add prompts
        data.imageGen.inspiration = translations[lang] || translations.en;

        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        console.log(`Updated ${lang}.json`);
    }
});
