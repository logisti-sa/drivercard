/**
 * مزامنة الحقول المكررة (data-sync) والتحقق من تنسيق الاسم.
 */
import {
    NAME_IDS,
    NAME_FIRST_ROW_CAPACITY,
    NAME_GAP_LENGTH,
    NAME_SECOND_ROW_CAPACITY,
    getFieldText,
    setFieldText,
    normalizeName,
    characterCount,
    takeWholeWords,
} from "../utils/text.js";

const syncing = new Set();

/**
 * تقسيم الاسم الطويل على سطرين مع الحفاظ على السطر الأول للاسم الأقصر.
 * - السطر الأول: مساحة الاسم الأقصر + فاصل حرفين + بقية الاسم الأطول (كلمات كاملة).
 * - السطر الثاني: حتى 40 حرفاً دون قطع الكلمات.
 */
export function formatNameFields(activeId, preserveTrailingSpace) {
    const arEl = document.getElementById("f-name-ar");
    const enEl = document.getElementById("f-name-en");
    const names = { ar: normalizeName(getFieldText(arEl)), en: normalizeName(getFieldText(enEl)) };
    const arIsShorter = characterCount(names.ar) <= characterCount(names.en);
    const shortKey = arIsShorter ? "ar" : "en";
    const longKey = arIsShorter ? "en" : "ar";
    const firstRowLimit = Math.max(
        0,
        NAME_FIRST_ROW_CAPACITY - characterCount(names[shortKey]) - NAME_GAP_LENGTH
    );
    const firstPart = takeWholeWords(names[longKey], firstRowLimit);
    const secondPart = takeWholeWords(firstPart.remainder, NAME_SECOND_ROW_CAPACITY);
    const formatted = { ar: names.ar, en: names.en };

    formatted[longKey] = firstPart.text + (secondPart.text ? "\n" + secondPart.text : "");
    if (!firstPart.text && secondPart.text) formatted[longKey] = "\n" + secondPart.text;

    /* لا نحذف المسافة التي ضغطها المستخدم للتو أثناء الكتابة. */
    if (preserveTrailingSpace && NAME_IDS.includes(activeId)) {
        const activeKey = activeId.endsWith("-ar") ? "ar" : "en";
        formatted[activeKey] += " ";
    }

    if (getFieldText(arEl) !== formatted.ar) setFieldText(arEl, formatted.ar);
    if (getFieldText(enEl) !== formatted.en) setFieldText(enEl, formatted.en);

    const overflow = !!secondPart.remainder;
    [arEl, enEl].forEach((el) => {
        el.title = overflow
            ? "يسمح حقل الاسم بسطرين فقط، والسطر الثاني حتى 40 حرفاً دون قطع الكلمات."
            : "";
    });
}

/**
 * ربط مستمعي الإدخال: مزامنة النسخ المكررة + تنسيق الاسم + الحفظ التلقائي.
 * @param {() => void} onSave يُستدعى بعد كل تعديل لحفظ القيم.
 */
export function initFieldSync(onSave) {
    document.querySelectorAll("[data-sync]").forEach((el) => {
        el.addEventListener("input", () => {
            const key = el.getAttribute("data-sync");
            if (syncing.has(key)) return;
            syncing.add(key);
            const value = getFieldText(el);
            document.querySelectorAll('[data-sync="' + key + '"]').forEach((peer) => {
                if (peer !== el) setFieldText(peer, value);
            });
            syncing.delete(key);
            onSave();
        });
    });

    document.querySelectorAll(".field").forEach((el) => {
        if (el.hasAttribute("data-sync")) return;
        el.addEventListener("input", () => {
            if (NAME_IDS.includes(el.id)) {
                formatNameFields(el.id, / $/.test(getFieldText(el)));
            }
            onSave();
        });
    });
}
