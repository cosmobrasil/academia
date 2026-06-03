import fs from 'fs';
import path from 'path';

interface KnowledgeItem {
  id: string;
  path: string;
  title: string;
  frontmatter: Record<string, string>;
  content: string;
}

const PROJECT_ROOT = process.cwd();

// Find the directory containing "FORESIGHT" matching both decomposed and composed Unicode versions
function findForesightDir(): string {
  const dirs = fs.readdirSync(PROJECT_ROOT);
  const matched = dirs.find(d => {
    const normalized = d.normalize('NFD').toLowerCase();
    return normalized.includes('analise relatorio') && normalized.includes('foresight');
  });

  if (matched) {
    return path.join(PROJECT_ROOT, matched);
  }
  
  // Fallback to direct path
  return path.join(PROJECT_ROOT, 'ANÁLISE RELATORIO - FORESIGHT');
}

const FORESIGHT_DIR = findForesightDir();
const OUTPUT_DIR = path.join(PROJECT_ROOT, 'src', 'data');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'knowledge.json');

function walkDir(dir: string, fileList: string[] = []): string[] {
  if (!fs.existsSync(dir)) return fileList;
  
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    try {
      const stat = fs.lstatSync(filePath);
      if (stat.isSymbolicLink()) {
        // Skip symbolic links to avoid broken target issues
        continue;
      }
      if (stat.isDirectory()) {
        // Skip hidden folders like .git and .obsidian
        if (!file.startsWith('.')) {
          walkDir(filePath, fileList);
        }
      } else if (file.endsWith('.md')) {
        fileList.push(filePath);
      }
    } catch (e) {
      console.warn(`[Knowledge Compiler] Warning reading ${filePath}:`, e);
    }
  }
  return fileList;
}

function compile() {
  console.log(`[Knowledge Compiler] Diretorio do acervo detectado: ${FORESIGHT_DIR}`);
  if (!fs.existsSync(FORESIGHT_DIR)) {
    console.error(`[Knowledge Compiler] Erro: Diretorio do acervo nao encontrado.`);
    process.exit(1);
  }

  const files = walkDir(FORESIGHT_DIR);
  console.log(`[Knowledge Compiler] Encontrados ${files.length} arquivos Markdown.`);

  const items: KnowledgeItem[] = [];

  for (const file of files) {
    const relativePath = path.relative(FORESIGHT_DIR, file);
    const fileContent = fs.readFileSync(file, 'utf8');

    // Parse Frontmatter
    let frontmatter: Record<string, string> = {};
    let content = fileContent;
    
    const match = fileContent.match(/^---\r?\n([\s\S]+?)\r?\n---\r?\n([\s\S]*)$/);
    if (match) {
      const yamlContent = match[1];
      content = match[2];
      
      const lines = yamlContent.split('\n');
      for (const line of lines) {
        const colonIndex = line.indexOf(':');
        if (colonIndex !== -1) {
          const key = line.substring(0, colonIndex).trim();
          let val = line.substring(colonIndex + 1).trim();
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.substring(1, val.length - 1);
          }
          frontmatter[key] = val;
        }
      }
    }

    // Try to extract title from first # heading or use file name
    let title = path.basename(file, '.md');
    const headingMatch = content.match(/^#\s+(.+)$/m);
    if (headingMatch) {
      title = headingMatch[1].trim();
    }

    items.push({
      id: frontmatter.id || path.basename(file, '.md'),
      path: relativePath,
      title: title,
      frontmatter: frontmatter,
      content: content.trim()
    });
  }

  // Create output dir if it doesn't exist
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(items, null, 2), 'utf8');
  console.log(`[Knowledge Compiler] Compilados ${items.length} itens com sucesso para: ${OUTPUT_FILE}`);
}

compile();
