/**
 * استبدال الباركود الأصلي: توليد QR من رابط (QRious) أو رفع صورة محلية.
 */

/* عناصر الباركود تُسترجع عند التهيئة (DOMContentLoaded) لضمان جهوزية DOM. */
let barcodeOverlay, barcodeCanvas, barcodeImage, barcodeActions;
let barcodeImageInput, barcodeLinkDialog, barcodeLinkForm, barcodeLinkInput;

function cacheElements() {
    barcodeOverlay = document.getElementById("barcodeOverlay");
    barcodeCanvas = document.getElementById("barcodeCanvas");
    barcodeImage = document.getElementById("barcodeImage");
    barcodeActions = document.getElementById("barcodeActions");
    barcodeImageInput = document.getElementById("barcodeImageInput");
    barcodeLinkDialog = document.getElementById("barcodeLinkDialog");
    barcodeLinkForm = document.getElementById("barcodeLinkForm");
    barcodeLinkInput = document.getElementById("barcodeLinkInput");
}

function showBarcode(kind) {
    barcodeCanvas.hidden = kind !== "qr";
    barcodeImage.hidden = kind !== "image";
    barcodeActions.hidden = true;
    barcodeOverlay.classList.add("has-barcode");
}

/** إعادة الباركود إلى حالته الأصلية (أزرار الاختيار ظاهرة). */
export function resetBarcode() {
    const context = barcodeCanvas.getContext("2d");
    context.clearRect(0, 0, barcodeCanvas.width, barcodeCanvas.height);
    barcodeCanvas.hidden = true;
    barcodeImage.hidden = true;
    barcodeImage.removeAttribute("src");
    barcodeImageInput.value = "";
    barcodeActions.hidden = false;
    barcodeOverlay.classList.remove("has-barcode");
}

function createBarcodeFromLink(link) {
    if (typeof QRious === "undefined") {
        alert("تعذر تحميل مولد الباركود. تحقق من الاتصال بالإنترنت ثم أعد المحاولة.");
        return false;
    }
    new QRious({
        element: barcodeCanvas,
        value: link,
        size: 512,
        level: "H",
        foreground: "#000000",
        background: "#ffffff"
    });
    showBarcode("qr");
    return true;
}

function openLinkDialog() {
    barcodeLinkInput.value = "";
    barcodeLinkDialog.showModal();
    barcodeLinkInput.focus();
}

function onLinkSubmit(event) {
    event.preventDefault();
    const link = barcodeLinkInput.value.trim();
    if (!link) return;
    if (createBarcodeFromLink(link)) barcodeLinkDialog.close();
}

function onImageChosen() {
    const file = barcodeImageInput.files && barcodeImageInput.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
        barcodeImage.src = String(reader.result || "");
        showBarcode("image");
    };
    reader.readAsDataURL(file);
}

/** استرجاع العناصر وربط مستمعي أزرار الباركود. */
export function initBarcode() {
    cacheElements();
    document.getElementById("pasteBarcodeLink").addEventListener("click", openLinkDialog);
    barcodeLinkForm.addEventListener("submit", onLinkSubmit);
    document.getElementById("cancelBarcodeLink").addEventListener("click", () => barcodeLinkDialog.close());
    document.getElementById("chooseBarcodeImage").addEventListener("click", () => barcodeImageInput.click());
    barcodeImageInput.addEventListener("change", onImageChosen);
    document.getElementById("resetBarcode").addEventListener("click", resetBarcode);
}
