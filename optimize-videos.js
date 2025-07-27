#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Check if ffmpeg is available
const { execSync } = require('child_process');

function checkFfmpeg() {
  try {
    execSync('ffmpeg -version', { stdio: 'ignore' });
    return true;
  } catch (error) {
    return false;
  }
}

function getVideoInfo(videoPath) {
  try {
    const output = execSync(`ffprobe -v quiet -print_format json -show_format -show_streams "${videoPath}"`, { encoding: 'utf8' });
    return JSON.parse(output);
  } catch (error) {
    console.error(`Error getting info for ${videoPath}:`, error.message);
    return null;
  }
}

function optimizeVideo(inputPath, outputPath, targetSizeMB = 1.5) {
  if (!checkFfmpeg()) {
    console.error('❌ ffmpeg is not installed. Please install ffmpeg to optimize videos.');
    console.log('Install with: brew install ffmpeg (macOS) or apt-get install ffmpeg (Ubuntu)');
    return false;
  }

  const inputStats = fs.statSync(inputPath);
  const currentSizeMB = inputStats.size / (1024 * 1024);
  
  console.log(`📹 Processing: ${path.basename(inputPath)}`);
  console.log(`   Current size: ${currentSizeMB.toFixed(1)}MB`);
  
  if (currentSizeMB <= targetSizeMB) {
    console.log(`   ✅ Already optimized (under ${targetSizeMB}MB)`);
    return true;
  }

  // Calculate target bitrate based on target file size
  const videoInfo = getVideoInfo(inputPath);
  if (!videoInfo) return false;
  
  const duration = parseFloat(videoInfo.format.duration);
  const targetBitrate = Math.floor((targetSizeMB * 8 * 1024 * 1024) / duration); // bits per second
  
  console.log(`   Target size: ${targetSizeMB}MB`);
  console.log(`   Target bitrate: ${Math.floor(targetBitrate / 1024)}kbps`);
  
  try {
    const command = `ffmpeg -i "${inputPath}" -c:v libx264 -crf 28 -preset medium -c:a aac -b:a 128k -movflags +faststart "${outputPath}"`;
    execSync(command, { stdio: 'inherit' });
    
    const outputStats = fs.statSync(outputPath);
    const newSizeMB = outputStats.size / (1024 * 1024);
    const reduction = ((currentSizeMB - newSizeMB) / currentSizeMB * 100).toFixed(1);
    
    console.log(`   ✅ Optimized: ${newSizeMB.toFixed(1)}MB (${reduction}% reduction)`);
    return true;
  } catch (error) {
    console.error(`   ❌ Error optimizing: ${error.message}`);
    return false;
  }
}

// Main optimization function
function main() {
  const videosDir = path.join(__dirname, 'public', 'videos');
  const compressedDir = path.join(videosDir, 'compressed');
  
  if (!fs.existsSync(compressedDir)) {
    console.error('❌ Compressed videos directory not found');
    return;
  }
  
  const targetVideos = [
    'pamplona-runningofbulls.mp4',
    'venice-gondola.mp4', 
    'lisbon-tram.mp4'
  ];
  
  console.log('🎬 Video Optimization Script\n');
  
  let optimized = 0;
  let total = targetVideos.length;
  
  targetVideos.forEach(videoFile => {
    const inputPath = path.join(compressedDir, videoFile);
    const outputPath = path.join(compressedDir, `optimized-${videoFile}`);
    
    if (fs.existsSync(inputPath)) {
      if (optimizeVideo(inputPath, outputPath, 1.5)) {
        optimized++;
        // Replace original with optimized version
        fs.renameSync(outputPath, inputPath);
      }
    } else {
      console.log(`⚠️  Video not found: ${videoFile}`);
    }
  });
  
  console.log(`\n📊 Summary: ${optimized}/${total} videos optimized`);
  
  if (optimized > 0) {
    console.log('\n🚀 Your videos are now optimized for web deployment!');
    console.log('   Deploy your app and the videos should load much faster.');
  }
}

if (require.main === module) {
  main();
}

module.exports = { optimizeVideo, checkFfmpeg }; 