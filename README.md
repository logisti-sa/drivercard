# بطاقة سائق — منسّق PDF

تطبيق ويب ثابت (بدون بناء) لتحرير بيانات بطاقة سائق وتصديرها كملف PDF.

## البنية

```
index.html            الصفحة الرئيسية (بنية HTML فقط)
css/
  card.css            كل التنسيقات بما فيها أوضاع pdf-capture و preview-mode
js/
  main.js             نقطة الدخول — يهيّئ الوحدات ويربط الأزرار
  utils/
    text.js           أدوات نصية مشتركة (قراءة/كتابة الحقول، تطبيع الاسم، تنظيف أسماء الملفات)
  modules/
    fields-sync.js    مزامنة الحقول المكررة (data-sync) وتنسيق الاسم على سطرين
    storage.js        الحفظ التلقائي في localStorage (حفظ/استعادة/مسح)
    barcode.js        استبدال الباركود: QR من رابط (QRious) أو صورة محلية
    pdf.js            توليد PDF عبر html2pdf وتسمية الملف وربط الأزرار
    preview.js        وضع معاينة الطباعة
assets/
  background.png      خلفية البطاقة (كانت مضمّنة كـ base64 داخل HTML)
```

## الاستخدام

- افتح الصفحة عبر خادم ملفات محلي (مطلوب لوحدات ES)، مثال:
  `python3 -m http.server 8000` ثم افتح `http://localhost:8000/index.html`
- لتبديل خلفية البطاقة: استبدل ملف `assets/background.png`.
- الحقول قابلة للتحرير ومتزامنة بين النسخ المكررة، وتُحفظ تلقائياً في المتصفح.
- «معاينة الطباعة» تعرض الشكل النهائي بلا خلفيات حقول، و«تحميل PDF» ينسّق الاسم
  على سطرين (الأول حتى 60 حرفاً بدون قطع كلمات، والثاني حتى 40).

## الاعتمادات الخارجية

- [html2pdf.js 0.10.1](https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js)
- [QRious 4.0.2](https://cdnjs.cloudflare.com/ajax/libs/qrious/4.0.2/qrious.min.js)
