#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const SEARCH_DIRS = [
  'src',
  'public'
];

const FILE_EXTENSIONS = ['.js', '.jsx', '.ts', '.tsx', '.json', '.md'];

// Patterns to search and replace
const REPLACEMENTS = [
  {
    search: /\.png/g,
    replace: '.jpeg',
    description: 'PNG to JPEG extension'
  },
  {
    search: /-thumbnail\.png/g,
    replace: '-thumbnail.jpeg',
    description: 'PNG thumbnail to JPEG thumbnail'
  }
];

// Get all files recursively
async function getAllFiles(dir, extensions = []) {
  const files = [];
  
  async function scanDirectory(currentDir) {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      
      if (entry.isDirectory() && !entry.name.startsWith('.') && !entry.name.includes('node_modules')) {
        await scanDirectory(fullPath);
      } else if (entry.isFile() && extensions.some(ext => entry.name.endsWith(ext))) {
        files.push(fullPath);
      }
    }
  }
  
  await scanDirectory(dir);
  return files;
}

// Update a single file
async function updateFile(filePath, replacements) {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    let updatedContent = content;
    let changes = 0;
    
    for (const replacement of replacements) {
      const matches = content.match(replacement.search);
      if (matches) {
        updatedContent = updatedContent.replace(replacement.search, replacement.replace);
        changes += matches.length;
      }
    }
    
    if (changes > 0) {
      await fs.writeFile(filePath, updatedContent, 'utf8');
      return { filePath, changes, success: true };
    }
    
    return { filePath, changes: 0, success: true };
  } catch (error) {
    return { filePath, error: error.message, success: false };
  }
}

// Main update function
async function updatePngToJpeg() {
  console.log('🚀 Starting PNG to JPEG reference update...\n');
  
  const projectRoot = path.join(__dirname, '..');
  let totalFiles = 0;
  let updatedFiles = 0;
  let totalChanges = 0;
  let errors = 0;
  
  for (const searchDir of SEARCH_DIRS) {
    const fullPath = path.join(projectRoot, searchDir);
    
    try {
      const files = await getAllFiles(fullPath, FILE_EXTENSIONS);
      console.log(`📁 Scanning ${searchDir}: ${files.length} files`);
      
      for (const filePath of files) {
        totalFiles++;
        const relativePath = path.relative(projectRoot, filePath);
        
        const result = await updateFile(filePath, REPLACEMENTS);
        
        if (result.success) {
          if (result.changes > 0) {
            updatedFiles++;
            totalChanges += result.changes;
            console.log(`  ✅ Updated: ${relativePath} (${result.changes} changes)`);
          }
        } else {
          errors++;
          console.log(`  ❌ Error: ${relativePath} - ${result.error}`);
        }
      }
    } catch (error) {
      console.log(`⚠️  Could not scan ${searchDir}: ${error.message}`);
    }
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('🎉 PNG to JPEG Update Complete!');
  console.log(`📊 Total files scanned: ${totalFiles}`);
  console.log(`✅ Files updated: ${updatedFiles}`);
  console.log(`🔄 Total changes made: ${totalChanges}`);
  console.log(`❌ Errors: ${errors}`);
  console.log('\n💡 Changes made:');
  REPLACEMENTS.forEach(replacement => {
    console.log(`   • ${replacement.description}`);
  });
  console.log('\n🔍 Files updated:');
  
  // Show which files were actually changed
  if (updatedFiles > 0) {
    console.log('   (Check the output above for specific files)');
  }
  console.log('='.repeat(50));
}

// Run if called directly
console.log('Script loaded, checking execution...');

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.includes('updatePngToJpeg.mjs')) {
  console.log('Starting PNG to JPEG update...');
  updatePngToJpeg().catch(console.error);
} else {
  console.log('Script imported as module, not running automatically');
}

export { updatePngToJpeg };
