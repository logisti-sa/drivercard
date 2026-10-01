/**
 * ترجمة عربية → إنكليزية لأسماء المدن والأنشطة وأسماء الأشخاص والشركات.
 * يعتمد على قاموس محلي أولاً ثم خدمة ترجمة مجانية (MyMemory) عند توفر الإنترنت.
 */

const CITY_MAP = {
    "الرياض": "Riyadh", "مكة": "Makkah", "مكة المكرمة": "Makkah Al Mukarramah",
    "المدينة": "Madinah", "المدينة المنورة": "Madinah Al Munawwarah",
    "جدة": "Jeddah", "الدمام": "Dammam", "الخبر": "Khobar", "الظهران": "Dhahran",
    "الطائف": "Taif", "بريدة": "Buraidah", "تبوك": "Tabuk", "أبها": "Abha",
    "حائل": "Hail", "نجران": "Najran", "جازان": "Jazan", "جيزان": "Jizan",
    "عرعر": "Arar", "سكاكا": "Sakaka", "الباحة": "Baha", "القطيف": "Qatif",
    "الاحساء": "Al Ahsa", "الأحساء": "Al Ahsa", "الخرج": "Kharj", "خريص": "Khurais",
    "ينبع": "Yanbu", "رابغ": "Rabigh", "ضرما": "Dirma", "المزاحمية": "Muzahmiyah",
    "الدوادمي": "Duwadimi", "القريات": "Qurayyat", "الجبيل": "Jubail",
    "عنيزة": "Onaizah", "الرس": "Rass", "البدائع": "Budaifah", "رياض الخبراء": "Riyad Al Khubarra"
};

const ACTIVITY_MAP = {
    "النقل المتخصص": "Specialized Transport",
    "نقل البضائع": "Goods Transport",
    "نقل المواد": "Materials Transport",
    "نقل المواشي": "Livestock Transport",
    "نقل الوقود": "Fuel Transport",
    "نقل الحاويات": "Container Transport",
    "نقل الأثاث": "Furniture Transport",
    "النقل العام": "General Transport",
    "نقل الأشخاص": "Passenger Transport",
    "التأجير": "Renting",
    "اللوجستيات": "Logistics"
};

const cache = new Map();

/** تنظيف النص العربي القصير قبل الترجمة (حروف الجر الزائدة عن المعنى). */
function stripPrefixes(s) {
    return s.replace(/^(مؤسسة|شركة|مكتب|محل)\s+/, "").trim();
}

async function translateRemote(text, target) {
    const url = "https://api.mymemory.translated.net/get?q=" +
        encodeURIComponent(text) + "&langpair=ar|en";
    const res = await fetch(url);
    if (!res.ok) throw new Error("HTTP " + res.status);
    const data = await res.json();
    const t = data && data.responseData && data.responseData.translatedText;
    if (!t) throw new Error("لا يوجد رد ترجمة");
    return String(t).trim();
}

/**
 * ترجمة اسم مدينة تلقائياً (قاموس ثم خدمة).
 */
export async function translateCity(ar) {
    const key = String(ar || "").trim();
    if (!key) return "";
    if (CITY_MAP[key]) return CITY_MAP[key];
    return translateName(key);
}

/** ترجمة نوع النشاط. */
export async function translateActivity(ar) {
    const key = String(ar || "").trim();
    if (!key) return "";
    if (ACTIVITY_MAP[key]) return ACTIVITY_MAP[key];
    return translateName(key);
}

/**
 * ترجمة اسم شخص أو منشأة: يحاول الخدمة المجانية، وعند فشلها
 * يحوّل الحروف العربية إلى لاتينية تحويلًا صوتيًا تقريبيًا.
 */
export async function translateName(ar) {
    const key = String(ar || "").trim();
    if (!key) return "";
    if (cache.has(key)) return cache.get(key);
    const core = stripPrefixes(key) || key;
    let out = "";
    try {
        out = await translateRemote(core, "en");
    } catch (e) {
        out = transliterate(core);
    }
    /* إعادة البادئة (مؤسسة/شركة...) بترجمتها المعروفة */
    const prefix = String(ar).trim().match(/^(مؤسسة|شركة|مكتب|محل)/);
    if (prefix) {
        const map = { "مؤسسة": "Establishment", "شركة": "Company", "مكتب": "Office", "محل": "Shop" };
        out = map[prefix[0]] + " " + out;
    }
    out = out.replace(/\b\w/g, (c) => c.toUpperCase());
    cache.set(key, out);
    return out;
}

/** تحويل صوتي عربي → لاتيني احتياطي. */
export function transliterate(ar) {
    const map = [
        ["ة", "h"], ["ا", "a"], ["أ", "a"], ["إ", "i"], ["آ", "aa"], ["و", "w"],
        ["ي", "y"], ["ى", "a"], ["ر", "r"], ["ز", "z"], ["س", "s"], ["ش", "sh"],
        ["ص", "s"], ["ض", "d"], ["ط", "t"], ["ظ", "zh"], ["ع", "a"], ["غ", "gh"],
        ["ف", "f"], ["ق", "q"], ["ك", "k"], ["ل", "l"], ["م", "m"], ["ن", "n"],
        ["ه", "h"], ["ح", "h"], ["ج", "j"], ["خ", "kh"], ["د", "d"], ["ت", "t"],
        ["ب", "b"], ["ث", "th"], ["ذ", "dh"], ["ء", ""], ["ؤ", "o"], ["ئ", "e"],
        ["ـ", ""], ["ً", "an"], ["ٌ", "un"], ["ٍ", "in"], ["َ", "a"], ["ُ", "u"],
        ["ِ", "i"], ["ّ", ""], ["ٰ", "a"]
    ];
    let out = String(ar || "");
    map.forEach(([from, to]) => { out = out.split(from).join(to); });
    return out.replace(/\s+/g, " ").trim();
}
