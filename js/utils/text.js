/**
 * أدوات نصية مشتركة: قراءة/كتابة الحقول، تطبيع الاسم، وعدّ الأحرف.
 */

export const NAME_IDS = ["f-name-ar", "f-name-en"];
export const NAME_FIRST_ROW_CAPACITY = 60;
export const NAME_GAP_LENGTH = 2;
export const NAME_SECOND_ROW_CAPACITY = 40;

/** هل العنصر div قابل للتحرير؟ */
export function isEditableDiv(el) {
    return el && el.getAttribute && el.getAttribute("contenteditable") === "true";
}

/** نص الحقل الحالي (textarea أو contenteditable). */
export function getFieldText(el) {
    if (!el) return "";
    if (isEditableDiv(el)) return (el.innerText || "").replace(/\n$/, "");
    return el.value || "";
}

/** تعيين نص الحقل مع مراعاة نوعه. */
export function setFieldText(el, value) {
    if (!el) return;
    const v = value == null ? "" : String(value);
    if (isEditableDiv(el)) el.innerText = v;
    else el.value = v;
}

/** إزالة الأسطر الزائدة والمسافات المتكررة من الاسم. */
export function normalizeName(value) {
    return String(value || "")
        .replace(/[\r\n]+/g, " ")
        .trim()
        .replace(/\s+/g, " ");
}

/** عدد الأحرف مع دعم الرموز اليونيكود المركبة. */
export function characterCount(value) {
    return Array.from(value).length;
}

/**
 * يأخذ كلمات كاملة فقط؛ فلا يمكن أن تنقسم كلمة عربية أو إنكليزية.
 * @returns {{text: string, remainder: string}}
 */
export function takeWholeWords(value, limit) {
    const words = normalizeName(value).split(" ").filter(Boolean);
    const taken = [];
    let length = 0;

    while (words.length) {
        const word = words[0];
        const candidateLength = length ? length + 1 + characterCount(word) : characterCount(word);
        if (taken.length && candidateLength > limit) break;
        if (!taken.length && limit === 0) break;
        taken.push(words.shift());
        length = candidateLength;
        if (length >= limit) break;
    }

    return { text: taken.join(" "), remainder: words.join(" ") };
}

/** تنظيف جزء من اسم لاستخدامه في اسم ملف. */
export function sanitizeFilePart(s) {
    return String(s || "")
        .trim()
        .replace(/\s+/g, "_")
        .replace(/[\\/:*?"<>|]+/g, "")
        .slice(0, 60) || "card";
}
