// မြန်မာသရ၊ အသတ်နှင့် သင်္ကေတများကို ဖယ်ရှားပေးမည့် Helper Function (အသတ်များကိုပါ ထည့်မတွက်ပါ)
function normalizeMyanmarText(text) {
    if (!text) return "";
    return text
        .replace(/[က-အ]်/g, "") // အသတ်ပါသော အက္ခရာများကို ဖြုတ်မည် (ဥပမာ - 'တ်', 'က်', 'ခ်')
        .replace(/[\u102B-\u103E\u1056-\u1059]/g, "") // သရနှင့် အခြားသင်္ကေတများ ဖြုတ်မည်
        .toLowerCase();
}

function getRootBookIndex() {
    return [
        { key: 'ပ', file: 'book-indices/book-index-p.js' },
        { key: 'မ', file: 'book-indices/book-index-m.js' },
        { key: 'စ', file: 'book-indices/book-index-s.js' }
    ];
}
