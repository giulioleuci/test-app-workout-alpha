const fs = require('fs');

let content = fs.readFileSync('src/db/seed.ts', 'utf8');

// Update type signatures
content = content.replace(/Record<'it' \| 'en', ExerciseTranslation>/g, "Record<'en' | 'it' | 'es' | 'fr' | 'zh', ExerciseTranslation>");
content = content.replace(/language: 'it' \| 'en' = 'it'/g, "language: 'en' | 'it' | 'es' | 'fr' | 'zh' = 'en'");
content = content.replace(/language: 'it' \| 'en'/g, "language: 'en' | 'it' | 'es' | 'fr' | 'zh'");

// Inject es, fr, zh based on the en translation for each exercise
// The regex looks for the 'en: { ... }' block inside the dictionary and appends the other languages
content = content.replace(/(\s*)(en:\s*\{[^}]*\})/g, (match, p1, p2) => {
    const es = p2.replace(/^en:/, 'es:');
    const fr = p2.replace(/^en:/, 'fr:');
    const zh = p2.replace(/^en:/, 'zh:');
    return `${p1}${p2},${p1}${es},${p1}${fr},${p1}${zh}`;
});

fs.writeFileSync('src/db/seed.ts', content);
console.log('Successfully updated seed.ts');
