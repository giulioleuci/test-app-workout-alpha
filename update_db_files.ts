import * as fs from 'fs';

function processFile(path: string) {
    let content = fs.readFileSync(path, 'utf8');

    // Add imports if missing
    if (!content.includes('LexoRank') && content.includes('orderIndex')) {
        content = `import { LexoRank } from 'lexorank';\n` + content;
    }

    if (!content.includes('function generateRank')) {
        content = content.replace("import { LexoRank } from 'lexorank';",
            "import { LexoRank } from 'lexorank';\n\nfunction generateRank(index: number) {\n  let rank = LexoRank.min().between(LexoRank.middle());\n  for(let i=0; i<index; i++) rank = rank.genNext();\n  return rank.toString();\n}\n\n"
        );
    }

    content = content.replace(/orderIndex:\s+(\d+)/g, "orderIndex: generateRank($1)");

    fs.writeFileSync(path, content, 'utf8');
    console.log(`Updated ${path}`);
}

processFile('src/db/seed.ts');
processFile('src/db/fixtures.ts');
