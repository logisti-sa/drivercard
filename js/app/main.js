/**
 * نقطة الدخول الرئيسية لتطبيق بطاقة السائق.
 * يجمع الوحدات: الحقول، التخزين، الباركود، PDF، المعاينة.
 */
import { saveFields, loadSavedFields, clearAllFields } from "./storage.js";
import { initFieldSync, formatNameFields } from "./fields-sync.js";
import { formatCardTitleField } from "../utils/text.js";
import { initBarcode } from "./barcode.js";
import { bindPdfButton } from "./pdf.js";
import { initPreview } from "./preview.js";

/* التهيئة تتم بعد اكتمال تحميل الوثيقة لضمان جهوزية DOM والاعتمادات (defer). */
document.addEventListener("DOMContentLoaded", () => {
    /* استعادة القيم المحفوظة، ثم تطبيق تقسيم الاسم على القيم الافتراضية أيضاً. */
    loadSavedFields();
    formatNameFields();
    /* ضبط تنسيق رقم البطاقة العلوي (بجانب "بطاقة رقم :" في الخلفية). */
    formatCardTitleField(document.getElementById("f-card-title"));

    /* مزامنة الحقول + الحفظ التلقائي بعد كل تعديل. */
    initFieldSync(saveFields);

    /* زر مسح الحقول. */
    document.getElementById("clearFields").addEventListener("click", clearAllFields);

    /* الباركود ومعاينة الطباعة وأزرار PDF (الشريط الرئيسي وشريط المعاينة). */
    initBarcode();
    initPreview();
    bindPdfButton("downloadPdf");
    bindPdfButton("downloadFromPreview");
});
