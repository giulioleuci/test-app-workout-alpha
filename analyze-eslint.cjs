const fs = require('fs');
const path = require('path');

const report = JSON.parse(fs.readFileSync('eslint-report.json', 'utf8'));
let totalErrors = 0;
let totalWarnings = 0;
let fixableErrors = 0;
let fixableWarnings = 0;
const ruleCounts = {};
const fileCounts = [];

report.forEach(file => {
    totalErrors += file.errorCount;
    totalWarnings += file.warningCount;
    fixableErrors += file.fixableErrorCount;
    fixableWarnings += file.fixableWarningCount;

    let fixable = file.fixableErrorCount + file.fixableWarningCount;
    if (file.errorCount > 0 || file.warningCount > 0) {
        fileCounts.push({
            path: path.relative(process.cwd(), file.filePath),
            errors: file.errorCount,
            warnings: file.warningCount,
            fixable
        });
    }

    file.messages.forEach(msg => {
        ruleCounts[msg.ruleId] = (ruleCounts[msg.ruleId] || 0) + 1;
    });
});

fileCounts.sort((a, b) => (b.errors + b.warnings) - (a.errors + a.warnings));

console.log('--- ESLint Report Summary ---');
console.log(`Total Errors: ${totalErrors} (${fixableErrors} fixable)`);
console.log(`Total Warnings: ${totalWarnings} (${fixableWarnings} fixable)`);
console.log('\nTop 10 Rules:');
Object.entries(ruleCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .forEach(([rule, count]) => console.log(`  ${rule}: ${count}`));

console.log('\nTop 10 Files by Issue Count:');
fileCounts.slice(0, 20).forEach(f => {
    console.log(`  ${f.path}: ${f.errors} errors, ${f.warnings} warnings (${f.fixable} fixable)`);
});
