/**
 * نقطة الدخول الرئيسية لتطبيق بطاقة السائق.
 * يجمع الوحدات: الحقول، التخزين، الباركود، PDF، المعاينة.
 */
import { saveFields, loadSavedFields, clearAllFields } from "./storage.js";
import { initFieldSync, formatNameFields } from "./fields-sync.js";
import { initBarcode } from "./barcode.js";
import { bindPdfButton } from "./pdf.js";
import { initPreview } from "./preview.js";
import { initWizard, wizard } from "./wizard.js";

/* استعادة القيم المحفوظة، ثم تطبيق تقسيم الاسم على القيم الافتراضية أيضاً. */
loadSavedFields();
formatNameFields();

/* مزامنة الحقول + الحفظ التلقائي بعد كل تعديل. */
initFieldSync(saveFields);

/* زر مسح الحقول. */
document.getElementById("clearFields").addEventListener("click", clearAllFields);

/* الباركود ومعاينة الطباعة وأزرار PDF (الشريط الرئيسي وشريط المعاينة). */
initBarcode();
initPreview();
bindPdfButton("downloadPdf");
bindPdfButton("downloadFromPreview");

/* معالج إدخال البيانات: يفتح تلقائياً أول مرة، ومن الزر في أي وقت. */
initWizard();
if (!localStorage.getItem("from2-wizard-seen-v1")) {
    try { localStorage.setItem("from2-wizard-seen-v1", "1"); } catch (e) { /* تجاهل */ }
    wizard.show();
}
