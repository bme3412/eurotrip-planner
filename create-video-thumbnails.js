#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function checkFfmpeg() {
  try {
    execSync('ffmpeg -version', { stdio: 'ignore' });
    return true;
  } catch (error) {
    return false;
  }
}

function createThumbnail(videoPath, outputPath) {
  if (!checkFfmpeg()) {
    console.error('❌ ffmpeg is not installed. Please install ffmpeg to create thumbnails.');
    console.log('Install with: brew install ffmpeg (macOS) or apt-get install ffmpeg (Ubuntu)');
    return false;
  }

  console.log(`🖼️  Creating thumbnail: ${path.basename(videoPath)}`);
  
  try {
    // Extract first frame at 0.1 seconds (to avoid black frame)
    const command = `ffmpeg -i "${videoPath}" -ss 0.1 -vframes 1 -q:v 2 -vf "scale=800:450:force_original_aspect_ratio=decrease,pad=800:450:(ow-iw)/2:(oh-ih)/2" "${outputPath}"`;
    execSync(command, { stdio: 'ignore' });
    
    const outputStats = fs.statSync(outputPath);
    const sizeKB = outputStats.size / 1024;
    
    console.log(`   ✅ Thumbnail created: ${sizeKB.toFixed(1)}KB`);
    return true;
  } catch (error) {
    console.error(`   ❌ Error creating thumbnail: ${error.message}`);
    return false;
  }
}

function main() {
  const compressedDir = path.join(__dirname, 'public', 'videos', 'compressed');
  const thumbnailsDir = path.join(__dirname, 'public', 'images', 'video-thumbnails');
  
  if (!fs.existsSync(compressedDir)) {
    console.error('❌ Compressed videos directory not found');
    return;
  }
  
  // Create thumbnails directory if it doesn't exist
  if (!fs.existsSync(thumbnailsDir)) {
    fs.mkdirSync(thumbnailsDir, { recursive: true });
  }
  
  const targetVideos = [
    'pamplona-runningofbulls.mp4',
    'venice-gondola.mp4', 
    'lisbon-tram.mp4'
  ];
  
  console.log('🖼️  Creating Video Thumbnails for Instant Loading\n');
  
  let created = 0;
  let total = targetVideos.length;
  
  targetVideos.forEach(videoFile => {
    const inputPath = path.join(compressedDir, videoFile);
    const thumbnailName = videoFile.replace('.mp4', '-thumbnail.jpg');
    const outputPath = path.join(thumbnailsDir, thumbnailName);
    
    if (fs.existsSync(inputPath)) {
      if (createThumbnail(inputPath, outputPath)) {
        created++;
      }
    } else {
      console.log(`⚠️  Video not found: ${videoFile}`);
    }
  });
  
  console.log(`\n📊 Summary: ${created}/${total} thumbnails created`);
  
  if (created > 0) {
    console.log('\n🚀 Video thumbnails created! They will load instantly.');
    console.log('   Update your code to use these thumbnails as immediate fallbacks.');
  }
}

if (require.main === module) {
  main();
}

module.exports = { createThumbnail, checkFfmpeg }; 