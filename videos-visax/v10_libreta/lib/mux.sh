#!/bin/bash
# out/c*.mp4 + mix.wav -> NAME.mp4 (~21 MB, -14 LUFS)
D=$1; N=$2; cd $D
(cd out && ls c*.mp4 | sort -V | sed "s/^/file /") > out/list.txt
ffmpeg -v error -y -f concat -safe 0 -i out/list.txt -c copy out/video.mp4
ffmpeg -v error -y -i mix.wav -af loudnorm=I=-14:TP=-1.5:LRA=11 -ar 48000 out/mix_norm.wav
DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 out/video.mp4)
VB=$(python3 -c "print(int((21.0*8*1024*1024/$DUR - 192000)/1000))")
ffmpeg -v error -y -i out/video.mp4 -c:v libx264 -preset slow -b:v ${VB}k -pass 1 -an -f mp4 /dev/null
ffmpeg -v error -y -i out/video.mp4 -i out/mix_norm.wav -c:v libx264 -preset slow -b:v ${VB}k -pass 2 -pix_fmt yuv420p -c:a aac -b:a 192k -shortest -movflags +faststart "$N.mp4"
rm -f ffmpeg2pass-0.log*
ls -la "$N.mp4"
