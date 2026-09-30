/**
 * الحفظ التلقائي لقيم الحقول في localStorage واستعادتها.
 */
import { getFieldText, setFieldText } from "../utils/text.js";

const STORAGE_KEY = "from2-driver-card-fields-v1";

/** حفظ كل الحقول ذات الصنف .field تحت معرّفاتها. */
export function saveFields() {
    const data = {};
    document.querySelectorAll(".field").forEach((el) => {
        data[el.id] = getFieldText(el);
    });
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) { /* تجاهل حصة التخزين */ }
}

/** استعادة القيم المحفوظة مسبقاً إن وجدت. */
export function loadSavedFields() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return;
        const data = JSON.parse(raw);
        Object.keys(data).forEach((id) => {
            const el = document.getElementById(id);
            if (el) setFieldText(el, data[id]);
        });
    } catch (e) { /* تجاهل */ }
}

/** مسح جميع الحقول وحذف البيانات المحفوظة. */
export function clearAllFields() {
    document.querySelectorAll(".field").forEach((el) => { setFieldText(el, ""); });
    try { localStorage.removeItem(STORAGE_KEY); } catch (e) { /* تجاهل */ }
}
