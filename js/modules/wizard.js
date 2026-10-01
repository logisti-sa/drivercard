/**
 * معالج إدخال البيانات (Wizard): بدل ظهور صفحة الـPDF مباشرة، تظهر نافذة
 * خطوات متسلسلة تطلب المعلومات واحدة واحدة، ثم توزَّع على مناطق البطاقة
 * بنفس مواقع النصوص وخطوطها وتنسيقها الحالي. في النهاية يولَّد PDF
 * باسم رقم البطاقة (العشوائي أو المعدَّل).
 */
import { generateCardNumber, isValidCardNumber, isCardNumberUsed, markCardNumberUsed } from "../utils/cardno.js";
import { translateCity, translateActivity, translateName } from "../utils/translate.js";
import { layoutDualName } from "../utils/name-layout.js";
import { normalizeName, setFieldText, getFieldText } from "../utils/text.js";
import { saveFields } from "./storage.js";

const overlay = document.getElementById("wizardOverlay");
const titleEl = document.getElementById("wizardTitle");
const bodyEl = document.getElementById("wizardBody");
const errorEl = document.getElementById("wizardError");
const backBtn = document.getElementById("wizardBack");
const nextBtn = document.getElementById("wizardNext");
const progressEl = document.getElementById("wizardProgress");

let current = null;   /* الخطوة المعروضة حالياً: { id, run } */
let canGoBack = true;

function showError(msg) { errorEl.textContent = msg || ""; }
function el(sel) { return bodyEl.querySelector(sel); }

/* ————— أدوات عرض الخطوات ————— */

function showStep({ id, title, html, run, back = true, nextLabel = "التالي", onMount }) {
    current = { id, run: run || (async () => { wizard.next(); }) };
    canGoBack = back;
    titleEl.textContent = title;
    bodyEl.innerHTML = html;
    nextBtn.textContent = nextLabel;
    nextBtn.disabled = false;
    backBtn.style.visibility = back ? "visible" : "hidden";
    showError("");
    if (onMount) onMount();
}

/** شاشة انتظار الاستغفار (تظهر أثناء الترتيبات الحسابية والترجمة بالخلفية). */
function istighfarScreen(label) {
    return new Promise((resolve) => {
        const tasbihat = ["سُبْحَانَ اللَّهِ وَبِحَمْدِهِ", "أَسْتَغْفِرُ اللَّهَ وَأَسْتَجِيرُهُ", "لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ"];
        let i = 0;
        showStep({
            id: "wait",
            title: "انتظر قليلاً… استغفر الله 🤍",
            html: `
                <div class="istighfar-box">
                    <div class="istighfar-spinner"></div>
                    <p class="istighfar-text" id="istighfarText">${tasbihat[0]}</p>
                    <p class="istighfar-sub">جارٍ تجهيز «${label}»…</p>
                </div>`,
            back: false,
            nextLabel: "",
            run: async () => {},
        });
        nextBtn.disabled = true;
        const tick = setInterval(() => {
            i++;
            const t = document.getElementById("istighfarText");
            if (t) t.textContent = tasbihat[i % tasbihat.length];
        }, 700);
        setTimeout(() => { clearInterval(tick); resolve(); }, 2600);
    });
}

function inputRow(id, dir, value, placeholder) {
    return `<div class="wrow">
        <input id="${id}" dir="${dir}" value="${String(value ?? "").replace(/"/g, "&quot;")}"
               placeholder="${placeholder}" autocomplete="off" spellcheck="false">
    </div>`;
}
function labelRow(text) { return `<div class="wlabel">${text}</div>`; }

/* ————— توزيع القيم على مناطق البطاقة (نفس المواقع الحالية) ————— */

function setSynced(key, value) {
    document.querySelectorAll('[data-sync="' + key + '"]').forEach((f) => setFieldText(f, value));
}

function fillCardNumber(value) {
    setSynced("cardNo", value);
    const title = document.getElementById("f-card-title");
    if (title) setFieldText(title, value); /* المنطقة الثالثة تحت العنوان */
}

/** يطبق قاعدة الاسم المزدوج (60 خانة للسطر الأول + مسافتان، وسطر ثانٍ حتى 40). */
function applyDualNameLayout(ar, en, arId, enId) {
    const laid = layoutDualName(ar, en);
    setFieldText(document.getElementById(arId), laid.ar);
    setFieldText(document.getElementById(enId), laid.en);
    saveFields();
    if (laid.overflow) {
        showError("تنبيه: بقيت حروف زائدة عن سطرين (60+40) — اختصر الاسم إن لزم.");
    }
    return laid;
}

/* ————— التاريخ: يظهر مرة واحدة ويطبع باتجاهين —————
   القيمة canon مخزنة ISO (YYYY-MM-DD)؛ منطقة ar تُعرض يوم-شهر-سنة بالاتجاه RTL
   ومنطقة en تُعرض سنة-شهر-يوم بالاتجاه LTR (يتم التحويل في pdf.js عند التصوير). */
function pad(n) { return String(n).padStart(2, "0"); }
function isoOf(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
function parseIso(s) { const p = String(s).split("-").map(Number); return new Date(p[0], p[1] - 1, p[2]); }
function isIso(s) { return /^\d{4}-\d{2}-\d{2}$/.test(String(s).trim()); }
function arDate(iso) { if (!isIso(iso)) return iso; const p = String(iso).split("-"); return p[2] + "-" + p[1] + "-" + p[0]; }

function dateStep({ title, hint, initialIso }) {
    return new Promise((resolve) => {
        showStep({
            id: "date",
            title,
            html: labelRow(hint) +
                  inputRow("wDate", "ltr", initialIso, "YYYY-MM-DD") +
                  `<p class="whint" id="wDateHint">سيُطبع مرتين: <span dir="rtl">${arDate(initialIso)}</span> للعربي و<span dir="ltr">${initialIso}</span> للإنكليزي.</p>`,
            back: false,
            nextLabel: "تم",
            onMount() {
                const inp = el("#wDate");
                inp.focus();
                inp.addEventListener("change", () => {
                    const v = inp.value.trim();
                    if (isIso(v)) {
                        el("#wDateHint").innerHTML = `سيُطبع مرتين: <span dir="rtl">${arDate(v)}</span> للعربي و<span dir="ltr">${v}</span> للإنكليزي.`;
                    }
                });
            },
            run: async () => {
                const v = el("#wDate").value.trim();
                if (!isIso(v)) { showError("أدخل التاريخ بالصيغة YYYY-MM-DD (سنة-شهر-يوم)."); return; }
                resolve(v);
            },
        });
    });
}

/* ————— خطوات المعالج ————— */

const steps = [];

/* ١) رقم البطاقة: عشوائي بصيغة 33.0X###### أو تعديل كامل بنفس التنسيق، غير قابل للتكرار */
steps.push({
    enter() {
        let suggested = generateCardNumber();
        /* لا نقترح رقماً استُخدم سابقاً */
        while (isCardNumberUsed(suggested)) suggested = generateCardNumber();
        showStep({
            id: "card-number",
            title: "١ — رقم البطاقة",
            html: `
                ${labelRow("تم إنشاء رقم عشوائي بالتنسيق المطلوب: رقمان (33) ثم نقطة ثم 8 أرقام يبدأ أول رقمين منها بـ 00..09. اقبله أو عدّله بالكامل.")}
                <div class="wcardsuggest"><span dir="ltr" id="wCardSuggested">${suggested}</span></div>
                <div class="wbtnrow">
                    <button type="button" id="wCardAccept" class="primary">قبول الرقم العشوائي</button>
                    <button type="button" id="wCardEdit" class="ghost">تعديل الرقم</button>
                </div>
                <div id="wCardEditBox" hidden>
                    ${inputRow("wCardInput", "ltr", "", "33.01234567")}
                    <p class="whint">التنسيق الإلزامي: رقمان ثم نقطة ثم 8 أرقام — والرقم غير قابل للتكرار.</p>
                    <div class="wbtnrow"><button type="button" id="wCardDone" class="primary">تم</button></div>
                </div>`,
            back: false,
            nextLabel: "",
            run: async () => {},
            onMount() {
                nextBtn.disabled = true;
                document.getElementById("wCardAccept").addEventListener("click", () => {
                    fillCardNumber(suggested);
                    markCardNumberUsed(suggested);
                    saveFields();
                    wizard.next();
                });
                document.getElementById("wCardEdit").addEventListener("click", () => {
                    document.getElementById("wCardEditBox").hidden = false;
                    const inp = document.getElementById("wCardInput");
                    inp.value = suggested;
                    inp.focus();
                    document.getElementById("wCardAccept").disabled = true;
                    const confirmEdit = () => {
                        const v = inp.value.trim();
                        if (!isValidCardNumber(v)) { showError("التنسيق يجب أن يكون: رقمين . ثمانية أرقام (مثال 33.01234567)."); return; }
                        if (isCardNumberUsed(v)) { showError("هذا الرقم مستخدم سابقاً — غيّر رقماً من أرقامه."); return; }
                        fillCardNumber(v);
                        markCardNumberUsed(v);
                        saveFields();
                        wizard.next();
                    };
                    document.getElementById("wCardDone").addEventListener("click", confirmEdit);
                    inp.addEventListener("keydown", (e) => { if (e.key === "Enter") confirmEdit(); });
                });
            },
        });
    },
});

/* ٢) اسم السائق: عربي ← ترجمة تلقائية ← تم/تعديل ← استغفار ← توزيع 60/40 */
steps.push({
    enter() {
        showStep({
            id: "driver-name-ar",
            title: "٢ — اسم السائق (بالعربي)",
            html: labelRow("اكتب الاسم الكامل بالعربية كما في الوثيقة.") +
                  inputRow("wNameAr", "rtl", "", "مثال: محمد اختر محمد عبيد"),
            nextLabel: "التالي",
            onMount() { el("#wNameAr").focus(); },
            run: async () => {
                const ar = normalizeName(el("#wNameAr").value);
                if (!ar) { showError("الاسم العربي مطلوب."); return; }
                await istighfarScreen("ترجمة اسم السائق إلى الإنكليزية");
                const en = await translateName(ar);
                nameReviewStep(ar, en);
            },
        });
    },
});

function nameReviewStep(ar, en) {
    showStep({
        id: "driver-name-review",
        title: "٢ — اسم السائق (إنكليزي: ترجمة تلقائية)",
        html: `
            ${labelRow("العربي: <b>" + ar + "</b>")}
            ${inputRow("wNameEn", "ltr", en, "الاسم بالإنكليزية")}
            <p class="whint">عدّل الترجمة إن لزم ثم اضغط «تم»؛ ستُطبَّق قاعدة السطور (60 خانة ثم 40).</p>`,
        nextLabel: "تم",
        onMount() { el("#wNameEn").focus(); },
        run: async () => {
            const enFinal = normalizeName(el("#wNameEn").value);
            if (!enFinal) { showError("الاسم الإنكليزي مطلوب."); return; }
            await istighfarScreen("تنسيق الاسم على البطاقة");
            applyDualNameLayout(ar, enFinal, "f-name-ar", "f-name-en");
            wizard.next();
        },
    });
}

/* ٣) رقم هوية السائق (مرة واحدة، يطبع في مكانين) */
steps.push({
    enter() {
        showStep({
            id: "driver-id",
            title: "٣ — رقم هوية السائق",
            html: labelRow("يوضع تلقائياً في المكانين المخصصين له.") +
                  inputRow("wId", "ltr", getFieldText(document.getElementById("f-id-en")), "2567250671"),
            onMount() { el("#wId").focus(); },
            run: async () => {
                const v = el("#wId").value.trim();
                if (!v) { showError("رقم الهوية مطلوب."); return; }
                setSynced("driverId", v);
                saveFields();
                wizard.next();
            },
        });
    },
});

/* ٤) تاريخ الإصدار: اليوم تلقائياً، يظهر مرة واحدة ويطبع باتجاهين */
steps.push({
    async enter() {
        const v = await dateStep({
            title: "٤ — تاريخ الإصدار",
            hint: "تاريخ اليوم موضوع تلقائياً — عدّله إن لزم.",
            initialIso: isoOf(new Date()),
        });
        setSynced("driverIssue", v);
        saveFields();
        wizard.next();
    },
});

/* ٥) تاريخ الانتهاء: بعد سنة ميلادية من الإصدار تلقائياً، قابل للتعديل */
steps.push({
    async enter() {
        const savedIssue = getFieldText(document.getElementById("f-dissue-en"));
        const base = isIso(savedIssue) ? parseIso(savedIssue) : new Date();
        const plusYear = new Date(base); plusYear.setFullYear(plusYear.getFullYear() + 1);
        const v = await dateStep({
            title: "٥ — تاريخ الانتهاء",
            hint: "بعد سنة ميلادية من تاريخ الإصدار تلقائياً — يمكن تعديله.",
            initialIso: isoOf(plusYear),
        });
        setSynced("driverExpiry", v);
        saveFields();
        wizard.next();
    },
});

/* ٦) نوع البطاقة (اختياري): سنوية/نصف سنوية → yearly / Half a year */
steps.push({
    enter() {
        showStep({
            id: "card-category",
            title: "٦ — نوع البطاقة (اختياري)",
            html: `
                ${labelRow("سنوية أم نصف سنوية؟ يعبأ الإنكليزي تلقائياً حسب اختيارك.")}
                <div class="woptions">
                    <label><input type="radio" name="wCat" value="yearly" checked> سنوية</label>
                    <label><input type="radio" name="wCat" value="half"> نصف سنوية</label>
                    <label><input type="radio" name="wCat" value="skip"> تخطّي</label>
                </div>`,
            run: async () => {
                const choice = el('input[name="wCat"]:checked').value;
                if (choice === "yearly") {
                    setFieldText(document.getElementById("f-cat-ar"), "سنوية");
                    setFieldText(document.getElementById("f-cat-en"), "yearly");
                    saveFields();
                } else if (choice === "half") {
                    setFieldText(document.getElementById("f-cat-ar"), "نصف سنوية");
                    setFieldText(document.getElementById("f-cat-en"), "Half a year");
                    saveFields();
                }
                wizard.next();
            },
        });
    },
});

/* ٧) رقم الترخيص (مرة واحدة في مكانين) */
steps.push({
    enter() {
        showStep({
            id: "license-no",
            title: "٧ — رقم الترخيص",
            html: labelRow("يكتب مرة واحدة ويوضع في المكانين.") +
                  inputRow("wLic", "ltr", getFieldText(document.getElementById("f-lic-en")), "35/00000421"),
            onMount() { el("#wLic").focus(); },
            run: async () => {
                const v = el("#wLic").value.trim();
                if (!v) { showError("رقم الترخيص مطلوب."); return; }
                setSynced("licenseNo", v);
                saveFields();
                wizard.next();
            },
        });
    },
});

/* حقل مزدوج واحد: يُدخل بالعربي، يُترجم تلقائياً، ويوزع في مكانَيه */
function bilingualStep(cfg) {
    showStep({
        id: "bilingual",
        title: cfg.title,
        html: labelRow(cfg.hint) + inputRow("wBiAr", "rtl", cfg.getAr(), ""),
        nextLabel: "التالي",
        onMount() { el("#wBiAr").focus(); },
        run: async () => {
            const ar = normalizeName(el("#wBiAr").value);
            if (!ar) { showError("هذا الحقل مطلوب."); return; }
            await istighfarScreen("الترجمة التلقائية");
            const en = await cfg.translateFn(ar);
            cfg.apply(ar, en);
            saveFields();
            wizard.next();
        },
    });
}

/* ٨) مدينة الترخيص: عربي → ترجمة إنكليزية تلقائية (مكانان مختلفان) */
steps.push({
    enter() {
        bilingualStep({
            title: "٨ — مدينة الترخيص",
            hint: "اكتب المدينة بالعربي؛ تُترجم للإنكليزية تلقائياً لأن التراخيص أسماء مدن.",
            getAr: () => getFieldText(document.getElementById("f-city-ar")),
            translateFn: translateCity,
            apply: (ar, en) => {
                setFieldText(document.getElementById("f-city-ar"), ar);
                setFieldText(document.getElementById("f-city-en"), en);
            },
        });
    },
});

/* ٩) تاريخ إصدار الرخصة (يدوي، مكانان) */
steps.push({
    async enter() {
        const cur = getFieldText(document.getElementById("f-lissue-en"));
        const v = await dateStep({
            title: "٩ — تاريخ إصدار الرخصة",
            hint: "يُعبأ يدوياً ويوضع في المكانين باتجاهيهما.",
            initialIso: isIso(cur) ? cur : isoOf(new Date()),
        });
        setSynced("licenseIssue", v);
        saveFields();
        wizard.next();
    },
});

/* ١٠) تاريخ انتهاء الرخصة (يدوي، مكانان) */
steps.push({
    async enter() {
        const cur = getFieldText(document.getElementById("f-lexp-en"));
        const v = await dateStep({
            title: "١٠ — تاريخ انتهاء الرخصة",
            hint: "يُعبأ يدوياً ويوضع في المكانين باتجاهيهما.",
            initialIso: isIso(cur) ? cur : isoOf(new Date()),
        });
        setSynced("licenseExpiry", v);
        saveFields();
        wizard.next();
    },
});

/* ١١) نوع النشاط: عربي → ترجمة تلقائية */
steps.push({
    enter() {
        bilingualStep({
            title: "١١ — نوع النشاط",
            hint: "اكتب النشاط بالعربي؛ يُترجم للإنكليزية تلقائياً.",
            getAr: () => getFieldText(document.getElementById("f-act-ar")),
            translateFn: translateActivity,
            apply: (ar, en) => {
                setFieldText(document.getElementById("f-act-ar"), ar);
                setFieldText(document.getElementById("f-act-en"), en);
            },
        });
    },
});

/* ١٢) رقم المنشأة (مرة واحدة في مكانين) */
steps.push({
    enter() {
        showStep({
            id: "establishment-no",
            title: "١٢ — رقم المنشأة",
            html: labelRow("يكتب مرة واحدة ويوضع في المكانين.") +
                  inputRow("wMoi", "ltr", getFieldText(document.getElementById("f-moi-en")), "7001964399"),
            onMount() { el("#wMoi").focus(); },
            run: async () => {
                const v = el("#wMoi").value.trim();
                if (!v) { showError("رقم المنشأة مطلوب."); return; }
                setFieldText(document.getElementById("f-moi-en"), v);
                setFieldText(document.getElementById("f-moi-ar"), v);
                saveFields();
                wizard.next();
            },
        });
    },
});

/* ١٣) اسم المنشأة: عربي → إنكليزي تلقائي → استغفار → نفس قاعدة 60/40 */
steps.push({
    enter() {
        showStep({
            id: "company-name",
            title: "١٣ — اسم المنشأة (بالعربي)",
            html: labelRow("اكتب اسم المنشأة بالعربية؛ سيُترجم تلقائياً ثم يُوزَّع على البطاقة.") +
                  inputRow("wCoAr", "rtl", normalizeName(getFieldText(document.getElementById("f-co-ar"))), "مؤسسة ..."),
            onMount() { el("#wCoAr").focus(); },
            run: async () => {
                const ar = normalizeName(el("#wCoAr").value);
                if (!ar) { showError("اسم المنشأة العربي مطلوب."); return; }
                await istighfarScreen("ترجمة اسم المنشأة");
                const en = await translateName(ar);
                companyReviewStep(ar, en);
            },
        });
    },
});

function companyReviewStep(ar, en) {
    showStep({
        id: "company-name-review",
        title: "١٣ — اسم المنشأة (إنكليزي: ترجمة تلقائية)",
        html: `
            ${labelRow("العربي: <b>" + ar + "</b>")}
            ${inputRow("wCoEn", "ltr", en, "Company name in English")}
            <p class="whint">عدّل الترجمة إن لزم ثم اضغط «تم».</p>`,
        nextLabel: "تم",
        onMount() { el("#wCoEn").focus(); },
        run: async () => {
            const enFinal = normalizeName(el("#wCoEn").value);
            if (!enFinal) { showError("اسم المنشأة الإنكليزي مطلوب."); return; }
            await istighfarScreen("تنسيق اسم المنشأة على البطاقة");
            applyDualNameLayout(ar, enFinal, "f-co-ar", "f-co-en");
            wizard.next();
        },
    });
}

/* ١٤) الباركود: رفع صورة أو لصق الرابط/النص */
steps.push({
    enter() {
        showStep({
            id: "barcode",
            title: "١٤ — الباركود",
            html: `
                ${labelRow("ارفع صورة باركود، أو الصق الرابط/النص ليُولَّد رمز QR تلقائياً.")}
                ${inputRow("wBcLink", "ltr", "", "https://example.com أو نص")}
                <div class="wbtnrow">
                    <button type="button" id="wBcGen" class="primary">توليد من الرابط</button>
                    <button type="button" id="wBcUpload" class="ghost">رفع صورة باركود</button>
                    <button type="button" id="wBcSkip" class="ghost">تخطّي</button>
                </div>
                <input type="file" id="wBcFile" accept="image/*" hidden>`,
            nextLabel: "التالي",
            run: async () => { wizard.next(); },
            onMount() {
                document.getElementById("wBcGen").addEventListener("click", () => {
                    const link = el("#wBcLink").value.trim();
                    if (!link) { showError("الصق الرابط أو النص أولاً."); return; }
                    const dlg = document.getElementById("barcodeLinkDialog");
                    const inp = document.getElementById("barcodeLinkInput");
                    inp.value = link;
                    dlg.showModal();
                    const onClose = () => {
                        dlg.removeEventListener("close", onClose);
                        if (document.getElementById("barcodeOverlay").classList.contains("has-barcode")) {
                            wizard.next();
                        } else {
                            showError("تعذر توليد الباركود من هذا الرابط.");
                        }
                    };
                    dlg.addEventListener("close", onClose);
                    document.getElementById("barcodeLinkForm").requestSubmit();
                });
                document.getElementById("wBcUpload").addEventListener("click", () => document.getElementById("wBcFile").click());
                document.getElementById("wBcFile").addEventListener("change", (e) => {
                    const f = e.target.files[0];
                    if (!f) return;
                    const dt = new DataTransfer();
                    dt.items.add(f);
                    const orig = document.getElementById("barcodeImageInput");
                    orig.files = dt.files;
                    orig.dispatchEvent(new Event("change"));
                    wizard.next();
                });
                document.getElementById("wBcSkip").addEventListener("click", () => wizard.next());
            },
        });
    },
});

/* ١٥) النهاية: توليد PDF باسم رقم البطاقة */
steps.push({
    enter() {
        const card = getFieldText(document.getElementById("f-card-title")) || "card";
        showStep({
            id: "finish",
            title: "كل شيء جاهز ✔",
            html: `
                ${labelRow("ستُصدَّر البطاقة كملف PDF باسم رقم البطاقة:")}
                <div class="wcardsuggest"><span dir="ltr">${card}.pdf</span></div>
                <p class="whint">يمكنك إغلاق النافذة ومراجعة البطاقة والتعديل عليها يدوياً قبل التصدير.</p>`,
            nextLabel: "توليد PDF",
            run: async () => {
                wizard.hide();
                const { generatePdf } = await import("./pdf.js");
                await generatePdf(card);
            },
        });
    },
});

/* ————— آلة التنقل ————— */

const wizard = {
    index: 0,
    show() { overlay.hidden = false; this.index = 0; this.render(); },
    hide() { overlay.hidden = true; current = null; },
    isOpen() { return !overlay.hidden; },
    render() {
        progressEl.textContent = "خطوة " + (this.index + 1) + " من " + steps.length;
        steps[this.index].enter();
    },
    next() {
        if (this.index < steps.length - 1) { this.index++; this.render(); }
        else { this.hide(); }
    },
    back() { if (canGoBack && this.index > 0) { this.index--; this.render(); } },
};

nextBtn.addEventListener("click", async () => {
    if (!current || !current.run) return;
    showError("");
    nextBtn.disabled = true;
    try { await current.run(); }
    finally { if (wizard.isOpen() && current && current.id !== "wait") nextBtn.disabled = false; }
});
backBtn.addEventListener("click", () => wizard.back());

/* فتح/إغلاق المعالج */
export function initWizard() {
    document.getElementById("startWizard").addEventListener("click", () => wizard.show());
    document.getElementById("closeWizard").addEventListener("click", () => wizard.hide());
}

export { wizard };
