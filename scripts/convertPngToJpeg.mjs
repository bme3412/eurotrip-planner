#!/usr/bin/env node

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const QUALITY = 85; // JPEG quality (0-100)
const OUTPUT_DIR = path.join(__dirname, '../public/images/converted');

// Check if ImageMagick is available
async function checkImageMagick() {
  try {
    await execAsync('which convert');
    console.log('✅ ImageMagick found');
    return true;
  } catch {
    console.log('❌ ImageMagick not found! Please install with: brew install imagemagick');
    return false;
  }
}

// Ensure output directory exists
async function ensureOutputDir() {
  try {
    await fs.access(OUTPUT_DIR);
  } catch {
    await fs.mkdir(OUTPUT_DIR, { recursive: true });
  }
}

// Get all PNG files recursively
async function getPngFiles(dir) {
  const files = [];
  
  async function scanDirectory(currentDir) {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      
      if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'converted') {
        await scanDirectory(fullPath);
      } else if (entry.isFile() && /\.png$/i.test(entry.name)) {
        files.push(fullPath);
      }
    }
  }
  
  await scanDirectory(dir);
  return files;
}

// Convert PNG to JPEG
async function convertSinglePngToJpeg(inputPath, outputPath) {
  try {
    // Use ImageMagick to convert PNG to JPEG with quality setting
    const cmd = `convert "${inputPath}" -quality ${QUALITY} -strip "${outputPath}"`;
    await execAsync(cmd);
    
    const inputStats = await fs.stat(inputPath);
    const outputStats = await fs.stat(outputPath);
    const savings = ((inputStats.size - outputStats.size) / inputStats.size * 100).toFixed(1);
    
    return {
      inputSize: inputStats.size,
      outputSize: outputStats.size,
      savings: `${savings}%`
    };
  } catch (error) {
    console.error(`Error converting ${inputPath}: ${error.message}`);
    return null;
  }
}

// Main conversion function
async function convertPngToJpeg() {
  console.log('🚀 Starting PNG to JPEG conversion...\n');
  
  if (!(await checkImageMagick())) {
    process.exit(1);
  }
  
  await ensureOutputDir();
  
  const imagesDir = path.join(__dirname, '../public/images');
  const pngFiles = await getPngFiles(imagesDir);
  
  console.log(`Found ${pngFiles.length} PNG files to convert\n`);
  
  let totalInputSize = 0;
  let totalOutputSize = 0;
  let processedCount = 0;
  let failedCount = 0;
  
  for (const filePath of pngFiles) {
    const relativePath = path.relative(imagesDir, filePath);
    const fileName = path.basename(filePath, '.png');
    
    console.log(`Converting: ${relativePath}`);
    
    // Create JPEG version
    const jpegPath = path.join(OUTPUT_DIR, `${fileName}.jpeg`);
    
    const result = await convertSinglePngToJpeg(filePath, jpegPath);
    
    if (result) {
      totalInputSize += result.inputSize;
      totalOutputSize += result.outputSize;
      processedCount++;
      
      console.log(`  ✅ Converted: ${(result.inputSize / 1024).toFixed(1)}KB → ${(result.outputSize / 1024).toFixed(1)}KB (${result.savings} smaller)`);
    } else {
      failedCount++;
      console.log(`  ❌ Failed to convert`);
    }
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('🎉 Conversion Complete!');
  console.log(`📊 Processed: ${processedCount} files`);
  console.log(`❌ Failed: ${failedCount} files`);
  console.log(`💾 Total input size: ${(totalInputSize / 1024 / 1024).toFixed(2)}MB`);
  console.log(`💾 Total output size: ${(totalOutputSize / 1024 / 1024).toFixed(2)}MB`);
  console.log(`💰 Space saved: ${((totalInputSize - totalOutputSize) / 1024 / 1024).toFixed(2)}MB`);
  console.log(`📁 Output directory: ${OUTPUT_DIR}`);
  console.log('\n💡 Next steps:');
  console.log('   1. Review the converted JPEG files');
  console.log('   2. Update your code to use .jpeg instead of .png');
  console.log('   3. Optionally delete the original PNG files');
  console.log('='.repeat(50));
}

// Run if called directly
console.log('Script loaded, checking execution...');

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.includes('convertPngToJpeg.mjs')) {
  console.log('Starting conversion...');
  convertPngToJpeg().catch(console.error);
} else {
  console.log('Script imported as module, not running automatically');
}

export { convertPngToJpeg };
