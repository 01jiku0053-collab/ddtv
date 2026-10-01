'use strict';
const fs = require('fs');
const path = require('path');

const dir = '/data/rain-pilot';
const output = path.join(dir, 'petrichor-dialogue.mp3');
const record = path.join(dir, 'petrichor-dialogue-request.json');
const inputs = [
  { speaker: 'Duck', voice_id: 'FGY2WhTYpPnrIDTdsKH5', text: 'Hey, why does rain smell so earthy?' },
  { speaker: 'Hamster', voice_id: 'SAz9YHcvj6GT2YYXdXww', text: 'That scent has a name: petrichor.' },
  { speaker: 'Duck', voice_id: 'FGY2WhTYpPnrIDTdsKH5', text: 'Petrichor? Where does it come from?' },
  { speaker: 'Hamster', voice_id: 'SAz9YHcvj6GT2YYXdXww', text: 'Rain hitting dry soil can send tiny scented droplets into the air. Soil microbes also make geosmin, which smells earthy.' },
  { speaker: 'Duck', voice_id: 'FGY2WhTYpPnrIDTdsKH5', text: 'So the ground has perfume?' },
  { speaker: 'Hamster', voice_id: 'SAz9YHcvj6GT2YYXdXww', text: 'In a way! What does rain smell like to you?' }
];

async function main() {
  const chars = inputs.reduce((n, x) => n + x.text.length, 0);
  if (!process.argv.includes('--run')) {
    console.log(JSON.stringify({ dryRun: true, model: 'eleven_v3', characters: chars,
      lines: inputs.map(({speaker, text}) => `${speaker}: ${text}`),
      voices: { Duck: 'Laura', Hamster: 'River' } }, null, 2));
    return;
  }
  if (fs.existsSync(record)) throw new Error('Dialogue request already recorded. Do not rerun.');
  const key = JSON.parse(fs.readFileSync('/data/secrets.json', 'utf8')).elevenlabs_key;
  if (!key) throw new Error('ElevenLabs key missing');
  fs.writeFileSync(record, JSON.stringify({status:'submitting', model:'eleven_v3', characters:chars, at:new Date().toISOString()},null,2));
  const response = await fetch('https://api.elevenlabs.io/v1/text-to-dialogue?output_format=mp3_44100_128', {
    method:'POST', headers:{'xi-api-key':key,'Content-Type':'application/json'},
    body: JSON.stringify({model_id:'eleven_v3', language_code:'en', inputs:inputs.map(({voice_id,text})=>({voice_id,text}))}),
    signal:AbortSignal.timeout(180000)
  });
  if (!response.ok) throw new Error(`ElevenLabs HTTP ${response.status}: ${(await response.text()).slice(0,500)}`);
  const data = Buffer.from(await response.arrayBuffer());
  if (data.length < 1000) throw new Error('Audio response unexpectedly small');
  fs.writeFileSync(output, data);
  fs.writeFileSync(record, JSON.stringify({status:'complete',model:'eleven_v3',characters:chars,bytes:data.length,at:new Date().toISOString()},null,2));
  console.log(JSON.stringify({ok:true,file:output,bytes:data.length,characters:chars},null,2));
}
main().catch(e=>{console.error(e.message);process.exitCode=1});
