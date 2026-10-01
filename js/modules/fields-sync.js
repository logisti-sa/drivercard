/**
 * مزامنة الحقول المكررة (data-sync) والتحقق من تنسيق الاسم.
 */
import {
    getFieldText,
    setFieldText,
    normalizeName,
} from "../utils/text.js";
import { layoutDualName } from "../utils/name-layout.js";

const syncing = new Set();

/**
 * تطبيق قاعدة توزيع الاسم المزدوج (60 خانة للسطر الأول + مسافتان،
 * وسطر ثانٍ ملاصق حتى 40 خانة) على حقلي الاسم في البطاقة.
 * تُستدعى بعد إتمام الترجمة أو عند تغيير النصوص يدوياً.
 */
export function formatNameFields() {
    const arEl = document.getElementById("f-name-ar");
    const enEl = document.getElementById("f-name-en");
    const laid = layoutDualName(
        normalizeName(getFieldText(arEl)),
        normalizeName(getFieldText(enEl))
    );
    if (getFieldText(arEl) !== laid.ar) setFieldText(arEl, laid.ar);
    if (getFieldText(enEl) !== laid.en) setFieldText(enEl, laid.en);
    [arEl, enEl].forEach((el) => {
        el.title = laid.overflow
            ? "يسمح حقل الاسم بسطرين فقط، والسطر الثاني حتى 40 حرفاً دون قطع الكلمات."
            : "";
    });
    return laid;
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
            /* تنسيق الاسم لا يُعاد حسابه أثناء الكتابة المباشرة على البطاقة؛
               تتم الترتيبات كاملة من نافذة الإدخال عند الضغط على «التالي». */
            onSave();
        });
    });
}
