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
const QUALITY = 85;
const OUTPUT_DIR = path.join(__dirname, '../public/images/compressed');

// Check if required tools are available
async function checkDependencies() {
  const tools = ['convert', 'jpegoptim'];
  const available = [];
  
  for (const tool of tools) {
    try {
      await execAsync(`which ${tool}`);
      available.push(tool);
    } catch {
      console.log(`⚠️  ${tool} not found`);
    }
  }
  
  if (available.length === 0) {
    console.log('\n❌ No image compression tools found!');
    console.log('Please install one of these:');
    console.log('  • ImageMagick: brew install imagemagick');
    console.log('  • jpegoptim: brew install jpegoptim');
    console.log('\nOr use the Node.js version: npm install sharp && npm run compress-images');
    process.exit(1);
  }
  
  console.log(`✅ Using: ${available.join(', ')}`);
  return available[0]; // Return first available tool
}

// Ensure output directory exists
async function ensureOutputDir() {
  try {
    await fs.access(OUTPUT_DIR);
  } catch {
    await fs.mkdir(OUTPUT_DIR, { recursive: true });
  }
}

// Get all JPEG files recursively
async function getJpegFiles(dir) {
  const files = [];
  
  async function scanDirectory(currentDir) {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      
      if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'compressed') {
        await scanDirectory(fullPath);
      } else if (entry.isFile() && /\.(jpe?g|jpg)$/i.test(entry.name)) {
        files.push(fullPath);
      }
    }
  }
  
  await scanDirectory(dir);
  return files;
}

// Compress using ImageMagick
async function compressWithImageMagick(inputPath, outputPath) {
  try {
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
    console.error(`Error with ImageMagick: ${error.message}`);
    return null;
  }
}

// Compress using jpegoptim
async function compressWithJpegoptim(inputPath, outputPath) {
  try {
    // Copy file first since jpegoptim modifies in place
    await fs.copyFile(inputPath, outputPath);
    
    const cmd = `jpegoptim --max=${QUALITY} --strip-all "${outputPath}"`;
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
    console.error(`Error with jpegoptim: ${error.message}`);
    return null;
  }
}

// Main compression function
async function compressImages() {
  console.log('🚀 Starting JPEG compression...\n');
  
  const tool = await checkDependencies();
  await ensureOutputDir();
  
  const imagesDir = path.join(__dirname, '../public/images');
  const jpegFiles = await getJpegFiles(imagesDir);
  
  console.log(`Found ${jpegFiles.length} JPEG files to compress\n`);
  
  let totalInputSize = 0;
  let totalOutputSize = 0;
  let processedCount = 0;
  
  for (const filePath of jpegFiles) {
    const relativePath = path.relative(imagesDir, filePath);
    const fileName = path.basename(filePath, path.extname(filePath));
    const ext = path.extname(filePath);
    
    // Skip if already in compressed directory
    if (relativePath.startsWith('compressed/')) {
      continue;
    }
    
    console.log(`Processing: ${relativePath}`);
    
    // Create compressed version
    const compressedPath = path.join(OUTPUT_DIR, `${fileName}-compressed${ext}`);
    
    let result;
    if (tool === 'convert') {
      result = await compressWithImageMagick(filePath, compressedPath);
    } else {
      result = await compressWithJpegoptim(filePath, compressedPath);
    }
    
    if (result) {
      totalInputSize += result.inputSize;
      totalOutputSize += result.outputSize;
      processedCount++;
      
      console.log(`  ✅ Compressed: ${(result.inputSize / 1024).toFixed(1)}KB → ${(result.outputSize / 1024).toFixed(1)}KB (${result.savings} smaller)`);
    }
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('🎉 Compression Complete!');
  console.log(`📊 Processed: ${processedCount} files`);
  console.log(`💾 Total input size: ${(totalInputSize / 1024 / 1024).toFixed(2)}MB`);
  console.log(`💾 Total output size: ${(totalOutputSize / 1024 / 1024).toFixed(2)}MB`);
  console.log(`💰 Space saved: ${((totalInputSize - totalOutputSize) / 1024 / 1024).toFixed(2)}MB`);
  console.log(`📁 Output directory: ${OUTPUT_DIR}`);
  console.log('='.repeat(50));
}

// Run if called directly
console.log('Script loaded, checking execution...');
console.log('import.meta.url:', import.meta.url);
console.log('process.argv[1]:', process.argv[1]);

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.includes('compressImagesSimple.mjs')) {
  console.log('Starting compression...');
  compressImages().catch(console.error);
} else {
  console.log('Script imported as module, not running automatically');
}

export { compressImages };
