/**
 * توليد رقم بطاقة عشوائي وتنسيقه والتحقق منه.
 * التنسيق المطلوب: رقمين (33) + نقطة + 8 أرقام، يُفضَّل أن يبدأ الجزء الثاني
 * بصفر العشرات (00..09) ثم 6 أرقام عشوائية. الرقم غير قابل للتكرار.
 */

const USED_KEY = "from2-used-card-numbers-v1";

/** رقم صحيح عشوائي بطول محدد مع الحفاظ على الأصفار Leading. */
function randomDigits(len) {
    let out = "";
    const buf = new Uint32Array(1);
    for (let i = 0; i < len; i++) {
        crypto.getRandomValues(buf);
        out += String(buf[0] % 10);
    }
    return out;
}

/** توليد رقم بطاقة جديد بصيغة "33.0X######". */
export function generateCardNumber() {
    const mid = randomDigits(2).replace(/^[1-9]/, (d) => "0"); /* يضمن 00..09 */
    return "33." + mid + randomDigits(6);
}

/** التحقق من صحة التنسيق: XX.XXXXXXXX */
export function isValidCardNumber(value) {
    return /^\d{2}\.\d{8}$/.test(String(value || "").trim());
}

/** قراءة الأرقام المستخدمة سابقاً من التخزين المحلي. */
export function getUsedCardNumbers() {
    try {
        return JSON.parse(localStorage.getItem(USED_KEY) || "[]");
    } catch (e) { return []; }
}

/** تسجيل رقم كمستخدم حتى لا يتكرر. */
export function markCardNumberUsed(value) {
    const v = String(value || "").trim();
    if (!v) return;
    const used = getUsedCardNumbers();
    if (!used.includes(v)) {
        used.push(v);
        try { localStorage.setItem(USED_KEY, JSON.stringify(used)); } catch (e) { /* تجاهل */ }
    }
}

/** هل الرقم مكرر (استُخدم من قبل)؟ */
export function isCardNumberUsed(value) {
    return getUsedCardNumbers().includes(String(value || "").trim());
}
