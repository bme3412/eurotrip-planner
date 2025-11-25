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
const COMPRESSED_DIR = path.join(__dirname, '../public/images/compressed');
const IMAGES_DIR = path.join(__dirname, '../public/images');

// Check if ImageMagick is available
async function checkImageMagick() {
  try {
    await execAsync('which convert');
    return true;
  } catch {
    console.log('❌ ImageMagick not found! Please install with: brew install imagemagick');
    return false;
  }
}

// Get all thumbnail files from compressed directory
async function getCompressedThumbnails() {
  try {
    const files = await fs.readdir(COMPRESSED_DIR);
    return files.filter(file => file.includes('thumbnail') && file.endsWith('.jpeg'));
  } catch (error) {
    console.error('Error reading compressed directory:', error.message);
    return [];
  }
}

// Get all PNG thumbnail files from main images directory
async function getPngThumbnails() {
  try {
    const files = await fs.readdir(IMAGES_DIR);
    return files.filter(file => file.includes('thumbnail') && file.endsWith('.png'));
  } catch (error) {
    console.error('Error reading images directory:', error.message);
    return [];
  }
}

// Replace existing thumbnail with compressed version
async function replaceThumbnail(compressedFile) {
  try {
    // Extract city name from filename (e.g., "paris-thumbnail-compressed.jpeg" -> "paris-thumbnail.jpeg")
    const cityName = compressedFile.replace('-compressed.jpeg', '');
    
    const sourcePath = path.join(COMPRESSED_DIR, compressedFile);
    const destPath = path.join(IMAGES_DIR, `${cityName}.jpeg`);
    
    // Get file sizes for comparison
    const sourceStats = await fs.stat(sourcePath);
    
    // Check if destination exists and get its size
    let destSize = 0;
    let replaced = false;
    try {
      const destStats = await fs.stat(destPath);
      destSize = destStats.size;
      replaced = true;
    } catch {
      // File doesn't exist, will be created
    }
    
    // Copy file to destination
    await fs.copyFile(sourcePath, destPath);
    
    return {
      success: true,
      cityName,
      sourceSize: sourceStats.size,
      destSize: sourceStats.size, // New size is same as source
      replaced,
      oldSize: destSize
    };
  } catch (error) {
    console.error(`Error replacing ${compressedFile}:`, error.message);
    return { success: false, error: error.message };
  }
}

// Convert PNG thumbnail to JPEG
async function convertPngThumbnail(pngFile) {
  try {
    const cityName = pngFile.replace('.png', '');
    const sourcePath = path.join(IMAGES_DIR, pngFile);
    const destPath = path.join(IMAGES_DIR, `${cityName}.jpeg`);
    
    // Use ImageMagick to convert PNG to JPEG
    const cmd = `convert "${sourcePath}" -quality 85 -strip "${destPath}"`;
    await execAsync(cmd);
    
    // Get file sizes for comparison
    const sourceStats = await fs.stat(sourcePath);
    const destStats = await fs.stat(destPath);
    
    // Remove the original PNG file
    await fs.unlink(sourcePath);
    
    return {
      success: true,
      cityName,
      sourceSize: sourceStats.size,
      destSize: destStats.size,
      savings: ((sourceStats.size - destStats.size) / sourceStats.size * 100).toFixed(1)
    };
  } catch (error) {
    console.error(`Error converting ${pngFile}:`, error.message);
    return { success: false, error: error.message };
  }
}

// Main function
async function replaceThumbnails() {
  console.log('🚀 Starting thumbnail replacement and conversion...\n');
  
  if (!(await checkImageMagick())) {
    process.exit(1);
  }
  
  // Check if directories exist
  try {
    await fs.access(COMPRESSED_DIR);
    await fs.access(IMAGES_DIR);
  } catch (error) {
    console.log('❌ Directory not found:', error.message);
    return;
  }
  
  const compressedThumbnails = await getCompressedThumbnails();
  const pngThumbnails = await getPngThumbnails();
  
  console.log(`Found ${compressedThumbnails.length} compressed thumbnail files`);
  console.log(`Found ${pngThumbnails.length} PNG thumbnail files to convert\n`);
  
  let replacedCount = 0;
  let convertedCount = 0;
  let errorCount = 0;
  let totalSizeSaved = 0;
  
  // First, replace existing thumbnails with compressed versions
  console.log('🔄 Replacing existing thumbnails with compressed versions...');
  for (const compressedFile of compressedThumbnails) {
    console.log(`Processing: ${compressedFile}`);
    
    const result = await replaceThumbnail(compressedFile);
    
    if (result.success) {
      replacedCount++;
      if (result.replaced) {
        const savings = ((result.oldSize - result.destSize) / result.oldSize * 100).toFixed(1);
        totalSizeSaved += (result.oldSize - result.destSize);
        console.log(`  ✅ Replaced: ${result.cityName}.jpeg (${(result.oldSize / 1024).toFixed(1)}KB → ${(result.destSize / 1024).toFixed(1)}KB, ${savings}% smaller)`);
      } else {
        console.log(`  ✅ Created: ${result.cityName}.jpeg (${(result.destSize / 1024).toFixed(1)}KB)`);
      }
    } else {
      errorCount++;
      console.log(`  ❌ Failed: ${result.error || 'Unknown error'}`);
    }
  }
  
  // Then, convert remaining PNG thumbnails to JPEG
  console.log('\n🔄 Converting remaining PNG thumbnails to JPEG...');
  for (const pngFile of pngThumbnails) {
    console.log(`Converting: ${pngFile}`);
    
    const result = await convertPngThumbnail(pngFile);
    
    if (result.success) {
      convertedCount++;
      totalSizeSaved += (result.sourceSize - result.destSize);
      console.log(`  ✅ Converted: ${result.cityName}.jpeg (${(result.sourceSize / 1024).toFixed(1)}KB → ${(result.destSize / 1024).toFixed(1)}KB, ${result.savings}% smaller)`);
    } else {
      errorCount++;
      console.log(`  ❌ Failed: ${result.error || 'Unknown error'}`);
    }
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('🎉 Thumbnail Replacement Complete!');
  console.log(`📊 Compressed thumbnails: ${replacedCount}`);
  console.log(`🔄 PNG conversions: ${convertedCount}`);
  console.log(`❌ Errors: ${errorCount}`);
  console.log(`💰 Total space saved: ${(totalSizeSaved / 1024 / 1024).toFixed(2)}MB`);
  console.log(`📁 Working directory: ${IMAGES_DIR}`);
  console.log('\n💡 All thumbnails are now optimized JPEG files!');
  console.log('='.repeat(50));
}

// Run if called directly
console.log('Script loaded, checking execution...');

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.includes('replaceThumbnails.mjs')) {
  console.log('Starting thumbnail replacement...');
  replaceThumbnails().catch(console.error);
} else {
  console.log('Script imported as module, not running automatically');
}

export { replaceThumbnails };
