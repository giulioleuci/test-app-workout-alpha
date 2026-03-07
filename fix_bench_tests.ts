import * as fs from 'fs';

function fixFile(file: string, replacements: [RegExp, string][]) {
    let content = fs.readFileSync(file, 'utf8');
    let changed = false;

    if (!content.includes('generateTestRank')) {
        content = `import { LexoRank } from 'lexorank';\nfunction generateTestRank(index: number) { let rank = LexoRank.min().between(LexoRank.middle()); for(let i=0; i<index; i++) rank = rank.genNext(); return rank.toString(); }\n` + content;
        changed = true;
    }

    for (const [regex, rep] of replacements) {
        if (regex.test(content)) {
            content = content.replace(regex, rep);
            changed = true;
        }
    }

    if (changed) {
        fs.writeFileSync(file, content, 'utf8');
        console.log(`Updated ${file}`);
    }
}

fixFile('tests/performance/durationEstimator.bench.test.ts', [
    [/orderIndex: s,/g, 'orderIndex: generateTestRank(s),'],
    [/orderIndex: g,/g, 'orderIndex: generateTestRank(g),'],
    [/orderIndex: i,/g, 'orderIndex: generateTestRank(i),'],
    [/orderIndex: st,/g, 'orderIndex: generateTestRank(st),']
]);

fixFile('tests/performance/benchmark_workout_list.test.ts', [
    [/orderIndex: j,/g, 'orderIndex: generateTestRank(j),'],
    [/orderIndex: k,/g, 'orderIndex: generateTestRank(k),'],
    [/orderIndex: l,/g, 'orderIndex: generateTestRank(l),'],
    [/orderIndex: m,/g, 'orderIndex: generateTestRank(m),']
]);

fixFile('tests/performance/sessionRotation.bench.test.ts', [
    [/orderIndex: index,/g, 'orderIndex: generateTestRank(index),']
]);

fixFile('tests/performance/bulkUpdateSets.bench.test.ts', [
    [/orderIndex: i,/g, 'orderIndex: generateTestRank(i),'],
    [/a\.orderIndex \- b\.orderIndex/g, 'a.orderIndex.localeCompare(b.orderIndex)']
]);

fixFile('src/db/repositories/__tests__/SessionRepository.test.ts', [
    [/orderIndex: 0,/g, 'orderIndex: generateTestRank(0),'],
    [/orderIndex: 1,/g, 'orderIndex: generateTestRank(1),'],
    [/orderIndex: 2,/g, 'orderIndex: generateTestRank(2),']
]);
