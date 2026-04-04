#!/usr/bin/env node
/**
 * Image Optimization Script
 * Optimizes all JPG images in public/images/experiences for web display
 * 
 * Usage: node scripts/optimize-images.js
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const EXPERIENCES_DIR = path.join(__dirname, '../public/images/experiences');
const QUALITY = 80; // Good balance of quality vs size
const MAX_WIDTH = 1024; // Max width for web display
const MAX_HEIGHT = 1536; // Max height (maintains 3:4 aspect ratio)

async function getFileSizeKB(filePath) {
  const stats = fs.statSync(filePath);
  return (stats.size / 1024).toFixed(0);
}

async function optimizeImage(filePath) {
  const originalSize = await getFileSizeKB(filePath);
  const tempPath = filePath + '.tmp';
  
  try {
    await sharp(filePath)
      .resize(MAX_WIDTH, MAX_HEIGHT, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({
        quality: QUALITY,
        mozjpeg: true, // Use mozjpeg for better compression
        progressive: true
      })
      .toFile(tempPath);
    
    // Replace original with optimized version
    fs.unlinkSync(filePath);
    fs.renameSync(tempPath, filePath);
    
    const newSize = await getFileSizeKB(filePath);
    const savings = ((originalSize - newSize) / originalSize * 100).toFixed(1);
    
    return {
      file: path.basename(filePath),
      originalSize: `${originalSize}KB`,
      newSize: `${newSize}KB`,
      savings: `${savings}%`
    };
  } catch (error) {
    // Clean up temp file if it exists
    if (fs.existsSync(tempPath)) {
      fs.unlinkSync(tempPath);
    }
    throw error;
  }
}

async function findAllImages(dir) {
  const images = [];
  
  function walkDir(currentPath) {
    const files = fs.readdirSync(currentPath);
    for (const file of files) {
      const filePath = path.join(currentPath, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        walkDir(filePath);
      } else if (/\.(jpg|jpeg|png)$/i.test(file)) {
        images.push(filePath);
      }
    }
  }
  
  walkDir(dir);
  return images;
}

async function main() {
  console.log('🖼️  Image Optimization Script');
  console.log('============================\n');
  console.log(`Settings: Quality ${QUALITY}%, Max ${MAX_WIDTH}x${MAX_HEIGHT}px\n`);
  
  const images = await findAllImages(EXPERIENCES_DIR);
  console.log(`Found ${images.length} images to optimize\n`);
  
  let totalOriginal = 0;
  let totalNew = 0;
  const results = [];
  
  for (const imagePath of images) {
    try {
      const result = await optimizeImage(imagePath);
      results.push(result);
      totalOriginal += parseInt(result.originalSize);
      totalNew += parseInt(result.newSize);
      console.log(`✓ ${result.file}: ${result.originalSize} → ${result.newSize} (${result.savings} saved)`);
    } catch (error) {
      console.error(`✗ ${path.basename(imagePath)}: ${error.message}`);
    }
  }
  
  console.log('\n============================');
  console.log(`Total: ${totalOriginal}KB → ${totalNew}KB`);
  console.log(`Saved: ${totalOriginal - totalNew}KB (${((totalOriginal - totalNew) / totalOriginal * 100).toFixed(1)}%)`);
  console.log('✅ Optimization complete!');
}

main().catch(console.error);

