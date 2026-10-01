/**
 * إنشاء ملف PDF للبطاقة باستخدام html2pdf (html2canvas + jsPDF).
 */
import { getFieldText, sanitizeFilePart } from "../utils/text.js";

/* حقول تتمدد وتُصوَّر كـ div لتفادي نزول النص في html2canvas */
export const GROW_IDS = ["f-card-en", "f-card-ar", "f-name-en", "f-name-ar", "f-co-en", "f-co-ar"];

/** بناء اسم ملف PDF من الاسم ورقم البطاقة. */
export function buildPdfFilename() {
    const name =
        getFieldText(document.getElementById("f-name-ar")) ||
        getFieldText(document.getElementById("f-name-en")) ||
        "driver";
    const card =
        getFieldText(document.getElementById("f-card-title")) ||
        getFieldText(document.getElementById("f-card-en")) ||
        "card";
    return sanitizeFilePart(name) + "_" + sanitizeFilePart(card) + ".pdf";
}

/** تاريخ ISO → "يوم-شهر-سنة" للجهة العربية و"سنة-شهر-يوم" للجهة الإنكليزية. */
function formatDateForSide(iso, side) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso).trim());
    if (!m) return iso;
    const [, y, mo, d] = m;
    return side === "ar" ? d + "-" + mo + "-" + y : y + "-" + mo + "-" + d;
}

const DATE_SYNC_KEYS = ["driverIssue", "driverExpiry", "licenseIssue", "licenseExpiry"];

/** داخل نسخة الالتقاط: عرض كل تاريخ بالاتجاه الخاص بجهته (القيمة canon تبقى ISO). */
function applyDateDirections(clonedDoc) {
    DATE_SYNC_KEYS.forEach((key) => {
        clonedDoc.querySelectorAll('[data-sync="' + key + '"]').forEach((el) => {
            const side = el.classList.contains("ar") ? "ar" : "en";
            const raw = el.value != null ? el.value : el.innerText;
            const formatted = formatDateForSide(raw, side);
            if (el.value != null) el.value = formatted;
            else el.innerText = formatted;
        });
    });
}

/** وضع التصوير: إخفاء خلفيات الحقول وعناصر الواجهة. */
function setCaptureChrome(on) {
    document.body.classList.toggle("pdf-capture", !!on);
}

async function waitPaint() {
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    await new Promise((r) => setTimeout(r, 40));
}

function clearFieldChrome(el) {
    el.style.background = "transparent";
    el.style.backgroundColor = "transparent";
    el.style.borderColor = "transparent";
    el.style.boxShadow = "none";
    el.style.outline = "none";
    el.style.caretColor = "transparent";
}

/** توليد ملف PDF وتنزيله. يُستخدم رقم البطاقة اسماً للملف عند تمريره من المعالج. */
export async function generatePdf(cardName) {
    if (typeof html2pdf === "undefined") {
        alert("تعذر تحميل محرك PDF. تحقق من الاتصال بالإنترنت.");
        return;
    }

    const sheet = document.getElementById("sheet");
    setCaptureChrome(true);
    await waitPaint();

    const opt = {
        margin: [4, 4, 4, 4],
        filename: cardName ? sanitizeFilePart(cardName) + ".pdf" : buildPdfFilename(),
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: {
            scale: 3,
            useCORS: true,
            allowTaint: true,
            backgroundColor: "#ffffff",
            logging: false,
            removeContainer: true,
            imageTimeout: 15000,
            onclone: function (clonedDoc) {
                clonedDoc.body.classList.add("pdf-capture");

                /* التواريخ تُطبع باتجاهين مختلفين لنفس القيمة المخزنة */
                applyDateDirections(clonedDoc);

                /* شفافية لكل الحقول دون تغيير مواضعها */
                clonedDoc.querySelectorAll(".field").forEach(clearFieldChrome);

                /*
                  حقول (card/name/co) هي contenteditable div أصلاً —
                  تُصوَّر في مكانها بدون إزاحة textarea المعروفة في html2canvas.
                  نضمن فقط line-height المتقارب والتمدد التلقائي.
                */
                GROW_IDS.forEach((id) => {
                    const el = clonedDoc.getElementById(id);
                    if (!el) return;
                    clearFieldChrome(el);
                    el.style.lineHeight = "1";
                    el.style.paddingTop = "0";
                    el.style.paddingBottom = "0";
                    el.style.height = "auto";
                    el.style.overflow = "visible";
                    el.removeAttribute("contenteditable");
                });
            }
        },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        pagebreak: { mode: ["avoid-all"] }
    };

    try {
        await html2pdf().set(opt).from(sheet).save();
    } catch (err) {
        console.error(err);
        alert("حدث خطأ أثناء إنشاء ملف PDF.");
    } finally {
        setCaptureChrome(false);
    }
}

/** تفعيل زر مع مؤشر "جارٍ التجهيز" أثناء إنشاء PDF. */
export function bindPdfButton(buttonId) {
    const btn = document.getElementById(buttonId);
    btn.addEventListener("click", async () => {
        const prev = btn.textContent;
        btn.disabled = true;
        btn.textContent = "جارٍ التجهيز...";
        try {
            await generatePdf();
        } finally {
            btn.disabled = false;
            btn.textContent = prev;
        }
    });
}
