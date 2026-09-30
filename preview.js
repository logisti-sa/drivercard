/**
 * معاينة الطباعة: إظهار/إخفاء وضع المعاينة وربط أزرارها.
 */

export function initPreview() {
    document.getElementById("previewPrint").addEventListener("click", () => {
        document.body.classList.add("preview-mode");
    });
    document.getElementById("exitPreview").addEventListener("click", () => {
        document.body.classList.remove("preview-mode");
    });
}
