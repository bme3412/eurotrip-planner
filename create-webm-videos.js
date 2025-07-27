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

function createWebM(inputPath, outputPath) {
  if (!checkFfmpeg()) {
    console.error('❌ ffmpeg is not installed. Please install ffmpeg to create WebM videos.');
    console.log('Install with: brew install ffmpeg (macOS) or apt-get install ffmpeg (Ubuntu)');
    return false;
  }

  const inputStats = fs.statSync(inputPath);
  const currentSizeMB = inputStats.size / (1024 * 1024);
  
  console.log(`🎬 Converting: ${path.basename(inputPath)}`);
  console.log(`   Current size: ${currentSizeMB.toFixed(1)}MB`);
  
  try {
    // WebM conversion with VP9 codec for better compression
    const command = `ffmpeg -i "${inputPath}" -c:v libvpx-vp9 -crf 30 -b:v 0 -c:a libopus -b:a 128k -movflags +faststart "${outputPath}"`;
    execSync(command, { stdio: 'inherit' });
    
    const outputStats = fs.statSync(outputPath);
    const newSizeMB = outputStats.size / (1024 * 1024);
    const reduction = ((currentSizeMB - newSizeMB) / currentSizeMB * 100).toFixed(1);
    
    console.log(`   ✅ WebM created: ${newSizeMB.toFixed(1)}MB (${reduction}% reduction)`);
    return true;
  } catch (error) {
    console.error(`   ❌ Error converting: ${error.message}`);
    return false;
  }
}

function main() {
  const compressedDir = path.join(__dirname, 'public', 'videos', 'compressed');
  
  if (!fs.existsSync(compressedDir)) {
    console.error('❌ Compressed videos directory not found');
    return;
  }
  
  const targetVideos = [
    'pamplona-runningofbulls.mp4',
    'venice-gondola.mp4', 
    'lisbon-tram.mp4'
  ];
  
  console.log('🎬 Creating WebM Videos for Faster Loading\n');
  
  let converted = 0;
  let total = targetVideos.length;
  
  targetVideos.forEach(videoFile => {
    const inputPath = path.join(compressedDir, videoFile);
    const outputPath = path.join(compressedDir, videoFile.replace('.mp4', '.webm'));
    
    if (fs.existsSync(inputPath)) {
      if (createWebM(inputPath, outputPath)) {
        converted++;
      }
    } else {
      console.log(`⚠️  Video not found: ${videoFile}`);
    }
  });
  
  console.log(`\n📊 Summary: ${converted}/${total} videos converted to WebM`);
  
  if (converted > 0) {
    console.log('\n🚀 WebM videos created! They should load much faster.');
    console.log('   Update your code to use .webm files for better performance.');
  }
}

if (require.main === module) {
  main();
}

module.exports = { createWebM, checkFfmpeg }; 