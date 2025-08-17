#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const COMPRESSED_DIR = path.join(__dirname, '../public/images/compressed');
const IMAGES_DIR = path.join(__dirname, '../public/images');

// Get all thumbnail files from compressed directory
async function getThumbnailFiles() {
  try {
    const files = await fs.readdir(COMPRESSED_DIR);
    return files.filter(file => file.includes('thumbnail') && file.endsWith('.jpeg'));
  } catch (error) {
    console.error('Error reading compressed directory:', error.message);
    return [];
  }
}

// Move thumbnail file to main images directory
async function moveThumbnail(thumbnailFile) {
  try {
    // Extract city name from filename (e.g., "paris-thumbnail-compressed.jpeg" -> "paris-thumbnail.jpeg")
    const cityName = thumbnailFile.replace('-compressed.jpeg', '');
    
    const sourcePath = path.join(COMPRESSED_DIR, thumbnailFile);
    const destPath = path.join(IMAGES_DIR, `${cityName}.jpeg`);
    
    // Check if destination already exists
    try {
      await fs.access(destPath);
      console.log(`  ⚠️  ${cityName}.jpeg already exists, skipping...`);
      return { success: false, reason: 'already exists' };
    } catch {
      // File doesn't exist, safe to move
    }
    
    // Copy file to destination
    await fs.copyFile(sourcePath, destPath);
    
    // Get file sizes for comparison
    const sourceStats = await fs.stat(sourcePath);
    const destStats = await fs.stat(destPath);
    
    return {
      success: true,
      cityName,
      sourceSize: sourceStats.size,
      destSize: destStats.size,
      savings: ((sourceStats.size - destStats.size) / sourceStats.size * 100).toFixed(1)
    };
  } catch (error) {
    console.error(`Error moving ${thumbnailFile}:`, error.message);
    return { success: false, error: error.message };
  }
}

// Main function
async function moveThumbnails() {
  console.log('🚀 Starting thumbnail move operation...\n');
  
  // Check if directories exist
  try {
    await fs.access(COMPRESSED_DIR);
    await fs.access(IMAGES_DIR);
  } catch (error) {
    console.log('❌ Directory not found:', error.message);
    return;
  }
  
  const thumbnailFiles = await getThumbnailFiles();
  console.log(`Found ${thumbnailFiles.length} thumbnail files to move\n`);
  
  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;
  let totalSizeSaved = 0;
  
  for (const thumbnailFile of thumbnailFiles) {
    console.log(`Processing: ${thumbnailFile}`);
    
    const result = await moveThumbnail(thumbnailFile);
    
    if (result.success) {
      successCount++;
      totalSizeSaved += result.sourceSize;
      console.log(`  ✅ Moved: ${result.cityName}.jpeg (${(result.sourceSize / 1024).toFixed(1)}KB)`);
    } else if (result.reason === 'already exists') {
      skipCount++;
    } else {
      errorCount++;
      console.log(`  ❌ Failed: ${result.error || 'Unknown error'}`);
    }
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('🎉 Thumbnail Move Complete!');
  console.log(`📊 Total files found: ${thumbnailFiles.length}`);
  console.log(`✅ Successfully moved: ${successCount}`);
  console.log(`⏭️  Skipped (already exists): ${skipCount}`);
  console.log(`❌ Errors: ${errorCount}`);
  console.log(`💾 Total size moved: ${(totalSizeSaved / 1024 / 1024).toFixed(2)}MB`);
  console.log(`📁 Destination: ${IMAGES_DIR}`);
  console.log('\n💡 Next steps:');
  console.log('   1. Verify the moved files in the images directory');
  console.log('   2. Update your code to use the new JPEG thumbnails');
  console.log('   3. Optionally clean up the compressed directory');
  console.log('='.repeat(50));
}

// Run if called directly
console.log('Script loaded, checking execution...');

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.includes('moveThumbnails.mjs')) {
  console.log('Starting thumbnail move...');
  moveThumbnails().catch(console.error);
} else {
  console.log('Script imported as module, not running automatically');
}

export { moveThumbnails };
