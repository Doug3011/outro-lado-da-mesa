// Gera um WAV de teste (tom senoidal, sem depender de nenhum arquivo de
// música de verdade) pra usar com test-music.mjs. Uso:
//   node make_test_tone.mjs tom_teste.wav
import { writeFileSync } from 'fs';

const sampleRate = 44100;
const seconds = 3;
const numSamples = sampleRate * seconds;
const freq = 440;
const bytesPerSample = 2;
const dataSize = numSamples * bytesPerSample;

const buf = Buffer.alloc(44 + dataSize);
buf.write('RIFF', 0);
buf.writeUInt32LE(36 + dataSize, 4);
buf.write('WAVE', 8);
buf.write('fmt ', 12);
buf.writeUInt32LE(16, 16);
buf.writeUInt16LE(1, 20); // PCM
buf.writeUInt16LE(1, 22); // mono
buf.writeUInt32LE(sampleRate, 24);
buf.writeUInt32LE(sampleRate * bytesPerSample, 28);
buf.writeUInt16LE(bytesPerSample, 32);
buf.writeUInt16LE(16, 34);
buf.write('data', 36);
buf.writeUInt32LE(dataSize, 40);

for (let i = 0; i < numSamples; i++) {
  const t = i / sampleRate;
  const sample = Math.sin(2 * Math.PI * freq * t) * 0.3 * 32767;
  buf.writeInt16LE(Math.round(sample), 44 + i * 2);
}

writeFileSync(process.argv[2], buf);
console.log('gerado:', process.argv[2]);
