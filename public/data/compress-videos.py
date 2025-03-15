#!/usr/bin/env python3
import os
import subprocess
import glob
import argparse
from pathlib import Path

def get_video_orientation(input_file):
    """
    Determine if a video is horizontal (landscape) or vertical (portrait).
    
    Args:
        input_file (str): Path to the input video file
        
    Returns:
        str: 'horizontal' or 'vertical'
    """
    # Use ffprobe to get video dimensions
    cmd = [
        'ffprobe', 
        '-v', 'error', 
        '-select_streams', 'v:0', 
        '-show_entries', 'stream=width,height', 
        '-of', 'csv=p=0', 
        input_file
    ]
    
    result = subprocess.run(cmd, capture_output=True, text=True)
    dimensions = result.stdout.strip().split(',')
    
    if len(dimensions) == 2:
        width = int(dimensions[0])
        height = int(dimensions[1])
        
        if width > height:
            return 'horizontal'
        else:
            return 'vertical'
    
    # Default to vertical if dimensions can't be determined
    return 'vertical'

def compress_video(input_file, output_dir, quality='medium', format='mp4'):
    """
    Compress a video file using ffmpeg for web optimization.
    
    Args:
        input_file (str): Path to the input video file
        output_dir (str): Directory to save the compressed video
        quality (str): Compression quality: 'low', 'medium', or 'high'
        format (str): Output format (mp4, webm)
    
    Returns:
        str: Path to the compressed video
    """
    # Create output directory if it doesn't exist
    os.makedirs(output_dir, exist_ok=True)
    
    # Get the base filename without extension
    base_name = os.path.basename(input_file)
    file_name = os.path.splitext(base_name)[0]
    
    # Determine video orientation
    orientation = get_video_orientation(input_file)
    
    # Add orientation to filename if horizontal
    if orientation == 'horizontal':
        output_filename = f"{file_name}_horizontal.{format}"
    else:
        output_filename = f"{file_name}.{format}"
    
    # Define output file path
    output_file = os.path.join(output_dir, output_filename)
    
    # Define encoding parameters based on quality
    if quality == 'low':
        # Lower quality, smaller file size
        crf = "28"
        preset = "fast"
        scale = "-1:480"  # Scale to 480p maintaining aspect ratio
    elif quality == 'high':
        # Higher quality, larger file size
        crf = "23"
        preset = "slow"
        scale = "-1:720"  # Scale to 720p maintaining aspect ratio
    else:  # medium (default)
        crf = "26"
        preset = "medium"
        scale = "-1:540"  # Scale to 540p maintaining aspect ratio
    
    # Build the ffmpeg command
    if format == 'mp4':
        cmd = [
            'ffmpeg', '-i', input_file,
            '-c:v', 'libx264',  # H.264 video codec
            '-crf', crf,        # Constant Rate Factor (quality)
            '-preset', preset,  # Encoding speed/compression ratio
            '-vf', f'scale={scale}',  # Resize video
            '-c:a', 'aac',      # AAC audio codec
            '-b:a', '128k',     # Audio bitrate
            '-movflags', '+faststart',  # Optimize for web streaming
            '-y',               # Overwrite output files without asking
            output_file
        ]
    elif format == 'webm':
        cmd = [
            'ffmpeg', '-i', input_file,
            '-c:v', 'libvpx-vp9',  # VP9 video codec
            '-crf', crf,           # Constant Rate Factor
            '-b:v', '0',           # Variable bitrate
            '-vf', f'scale={scale}',  # Resize video
            '-c:a', 'libopus',     # Opus audio codec
            '-b:a', '128k',        # Audio bitrate
            '-y',                  # Overwrite output files without asking
            output_file
        ]
    
    # Execute the command
    print(f"Compressing {input_file}...")
    subprocess.run(cmd)
    
    # Get file sizes for comparison
    original_size = os.path.getsize(input_file) / (1024 * 1024)  # MB
    compressed_size = os.path.getsize(output_file) / (1024 * 1024)  # MB
    
    print(f"Original size: {original_size:.2f} MB")
    print(f"Compressed size: {compressed_size:.2f} MB")
    print(f"Reduction: {(1 - compressed_size/original_size) * 100:.2f}%")
    print(f"Orientation: {orientation}")
    
    return output_file

def main():
    parser = argparse.ArgumentParser(description='Compress video files for web optimization')
    parser.add_argument('--input', type=str, default='*.MOV', help='Input file pattern (default: *.MOV)')
    parser.add_argument('--output_dir', type=str, default='compressed_videos', help='Output directory')
    parser.add_argument('--quality', type=str, choices=['low', 'medium', 'high'], default='medium', 
                        help='Compression quality (default: medium)')
    parser.add_argument('--format', type=str, choices=['mp4', 'webm'], default='mp4',
                        help='Output format (default: mp4)')
    
    args = parser.parse_args()
    
    # Get all MOV files in the current directory
    video_files = glob.glob(args.input)
    
    if not video_files:
        print(f"No files matching '{args.input}' found.")
        return
    
    # Process each video file
    for video_file in video_files:
        compress_video(video_file, args.output_dir, args.quality, args.format)
    
    print(f"All videos compressed and saved to '{args.output_dir}' directory")
    print(f"You can now add these videos to your Next.js app by importing them or referencing them in your components")

if __name__ == "__main__":
    main()