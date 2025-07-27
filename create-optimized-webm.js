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

function createOptimizedWebM(inputPath, outputPath) {
  if (!checkFfmpeg()) {
    console.error('❌ ffmpeg is not installed. Please install ffmpeg to create WebM videos.');
    console.log('Install with: brew install ffmpeg (macOS) or apt-get install ffmpeg (Ubuntu)');
    return false;
  }

  const inputStats = fs.statSync(inputPath);
  const currentSizeMB = inputStats.size / (1024 * 1024);
  
  console.log(`🎬 Creating optimized WebM: ${path.basename(inputPath)}`);
  console.log(`   Current MP4 size: ${currentSizeMB.toFixed(1)}MB`);
  
  try {
    // More aggressive WebM conversion with lower quality for smaller size
    const command = `ffmpeg -i "${inputPath}" -c:v libvpx-vp9 -crf 35 -b:v 0 -deadline good -cpu-used 2 -row-mt 1 -tile-columns 2 -frame-parallel 1 -movflags +faststart "${outputPath}"`;
    execSync(command, { stdio: 'ignore' });
    
    const outputStats = fs.statSync(outputPath);
    const newSizeMB = outputStats.size / (1024 * 1024);
    const reduction = ((currentSizeMB - newSizeMB) / currentSizeMB * 100).toFixed(1);
    
    console.log(`   ✅ Optimized WebM: ${newSizeMB.toFixed(1)}MB (${reduction}% reduction)`);
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
  
  console.log('🎬 Creating Optimized WebM Videos (Smaller Size)\n');
  
  let converted = 0;
  let total = targetVideos.length;
  
  targetVideos.forEach(videoFile => {
    const inputPath = path.join(compressedDir, videoFile);
    const outputPath = path.join(compressedDir, videoFile.replace('.mp4', '-optimized.webm'));
    
    if (fs.existsSync(inputPath)) {
      if (createOptimizedWebM(inputPath, outputPath)) {
        converted++;
      }
    } else {
      console.log(`⚠️  Video not found: ${videoFile}`);
    }
  });
  
  console.log(`\n📊 Summary: ${converted}/${total} optimized WebM videos created`);
  
  if (converted > 0) {
    console.log('\n🚀 Optimized WebM videos created! They should be much smaller.');
    console.log('   These will load faster than the original MP4 files.');
  }
}

if (require.main === module) {
  main();
}

module.exports = { createOptimizedWebM, checkFfmpeg }; 