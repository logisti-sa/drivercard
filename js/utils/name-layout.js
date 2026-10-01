/**
 * قاعدة توزيع الاسم المزدوج (عربي + إنكليزي) على البطاقة:
 * - المسافة الكلية على السطر الأول = 60 خانة.
 * - الاسم الأقصر يوضع كاملاً في جهته، ثم مسافتان، ثم يُكمل الاسم الأطول
 *   بقدر ما يسع السطر (كلمات كاملة دون تقطيع).
 * - باقي الاسم الأطول ينزل في سطر ثانٍ ملاصق مباشرة تحته (جهة نفسه) حتى 40 خانة.
 * - إذا كان المجموع ≤ 59 يكتب الاسمان في سطر واحد مع الحفاظ على مسافتين بينهما.
 * - لا يفتح سطر ثالث؛ الفائض عن 40 يُعلَّم تحذيراً للمستخدم قبل المتابعة.
 */
import { characterCount, takeWholeWords } from "./text.js";

export const FIRST_ROW_CAPACITY = 60;
export const GAP_LENGTH = 2;
export const SECOND_ROW_CAPACITY = 40;

/**
 * @param {string} ar الاسم العربي (نظيف، سطر واحد)
 * @param {string} en الاسم الإنكليزي (نظيف، سطر واحد)
 * @returns {{ar:string, en:string, overflow:boolean}}
 */
export function layoutDualName(ar, en) {
    const total = characterCount(ar) + characterCount(en);
    const arIsShorter = characterCount(ar) <= characterCount(en);

    /* حالة السطر الواحد: المجموع 59 أو أقل → الاسمان كاملان في سطر واحد */
    if (total + GAP_LENGTH <= FIRST_ROW_CAPACITY) {
        return { ar, en, overflow: false };
    }

    const shortText = arIsShorter ? ar : en;
    const longText = arIsShorter ? en : ar;
    const firstRowLimit = Math.max(0, FIRST_ROW_CAPACITY - characterCount(shortText) - GAP_LENGTH);
    const firstPart = takeWholeWords(longText, firstRowLimit);
    const secondPart = takeWholeWords(firstPart.remainder, SECOND_ROW_CAPACITY);

    const longLines = [firstPart.text];
    if (secondPart.text) longLines.push(secondPart.text);
    const longValue = longLines.join("\n");
    const overflow = Boolean(secondPart.remainder);

    return {
        ar: arIsShorter ? ar : longValue,
        en: arIsShorter ? longValue : en,
        overflow,
    };
}
