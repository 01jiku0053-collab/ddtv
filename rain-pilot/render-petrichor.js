'use strict';
const fs = require('fs');
const path = require('path');
const {spawnSync} = require('child_process');
const dir = process.env.RAIN_DIR || __dirname;
const ffmpeg = process.env.FFMPEG_BIN || '/data/bin/ffmpeg';
const video = path.join(dir, 'loop-30s.mp4');
const soil = path.join(dir, 'soil-rain.png');
const voice = path.join(dir, 'petrichor-dialogue.mp3');
const captions = path.join(dir, 'petrichor-short.ass');
const output = path.join(dir, 'petrichor-short-30s.mp4');
for (const file of [video,soil,voice,captions]) if(!fs.existsSync(file)) throw new Error('Missing: '+file);
const filter = `[0:v]split=2[bg][fg];`+
  `[bg]scale=720:1280:force_original_aspect_ratio=increase,crop=720:1280,boxblur=20:1[blur];`+
  `[fg]scale=720:-2[front];[blur][front]overlay=0:(H-h)/2[base];`+
  `[1:v]scale=720:1280,zoompan=z='min(zoom+0.00022,1.05)':d=1:s=720x1280:fps=24,trim=duration=10,setpts=PTS-STARTPTS+11/TB[cutaway];`+
  `[base][cutaway]overlay=0:0:enable='between(t,11,21)':eof_action=pass,ass=${captions}[v];`+
  `[0:a]volume=0.12[rain];[2:a]adelay=3000:all=1,volume=1.0[dialogue];`+
  `[rain][dialogue]amix=inputs=2:duration=first:normalize=0[a]`;
const args=['-hide_banner','-loglevel','error','-y','-i',video,'-loop','1','-framerate','24','-i',soil,'-i',voice,
  '-filter_complex',filter,'-map','[v]','-map','[a]','-t','30','-r','24','-c:v','libx264','-preset','veryfast','-crf','22',
  '-pix_fmt','yuv420p','-c:a','aac','-b:a','128k','-movflags','+faststart',output];
if (!process.argv.includes('--run')) {console.log(JSON.stringify({dryRun:true,video,soil,voice,captions,output,seconds:30,videoCredits:0},null,2)); process.exit(0)}
const r=spawnSync(ffmpeg,args,{stdio:'inherit',timeout:300000});
if(r.error)throw r.error;
if(r.status!==0)throw new Error('FFmpeg failed with status '+r.status);
console.log(JSON.stringify({ok:true,file:output,bytes:fs.statSync(output).size},null,2));
