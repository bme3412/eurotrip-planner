#!/usr/bin/env node

import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const QUALITY = 85; // JPEG quality (0-100)
const MAX_WIDTH = 1920; // Maximum width for large images
const THUMBNAIL_WIDTH = 400; // Width for thumbnail versions
const OUTPUT_DIR = path.join(__dirname, '../public/images/compressed');

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

// Compress a single image
async function compressImage(inputPath, outputPath, options = {}) {
  try {
    const { width, quality = QUALITY } = options;
    
    let pipeline = sharp(inputPath);
    
    if (width) {
      pipeline = pipeline.resize(width, null, {
        withoutEnlargement: true,
        fit: 'inside'
      });
    }
    
    await pipeline
      .jpeg({ quality, progressive: true })
      .toFile(outputPath);
    
    const inputStats = await fs.stat(inputPath);
    const outputStats = await fs.stat(outputPath);
    const savings = ((inputStats.size - outputStats.size) / inputStats.size * 100).toFixed(1);
    
    return {
      inputSize: inputStats.size,
      outputSize: outputStats.size,
      savings: `${savings}%`
    };
  } catch (error) {
    console.error(`Error compressing ${inputPath}:`, error.message);
    return null;
  }
}

// Main compression function
async function compressImages() {
  console.log('🚀 Starting JPEG compression...\n');
  
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
    const result = await compressImage(filePath, compressedPath, { quality: QUALITY });
    
    if (result) {
      totalInputSize += result.inputSize;
      totalOutputSize += result.outputSize;
      processedCount++;
      
      console.log(`  ✅ Compressed: ${(result.inputSize / 1024).toFixed(1)}KB → ${(result.outputSize / 1024).toFixed(1)}KB (${result.savings} smaller)`);
    }
    
    // Create thumbnail version for large images
    const stats = await fs.stat(filePath);
    if (stats.size > 500 * 1024) { // Only create thumbnails for images > 500KB
      const thumbnailPath = path.join(OUTPUT_DIR, `${fileName}-thumb${ext}`);
      const thumbResult = await compressImage(filePath, thumbnailPath, { 
        width: THUMBNAIL_WIDTH, 
        quality: 80 
      });
      
      if (thumbResult) {
        console.log(`  📱 Thumbnail: ${(thumbResult.inputSize / 1024).toFixed(1)}KB → ${(thumbResult.outputSize / 1024).toFixed(1)}KB (${thumbResult.savings} smaller)`);
      }
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
if (import.meta.url === `file://${process.argv[1]}`) {
  compressImages().catch(console.error);
}

export { compressImages };
