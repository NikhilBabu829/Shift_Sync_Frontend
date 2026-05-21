#!/usr/bin/env node
// Downloads the face-api.js model weights needed for face enrolment and clock-in verification.
// Run with: node scripts/download-face-models.js

const https = require('https')
const fs = require('fs')
const path = require('path')

const CDN = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights'
const OUT = path.join(__dirname, '..', 'public', 'models')

const FILES = [
    'tiny_face_detector_model-weights_manifest.json',
    'tiny_face_detector_model-shard1',
    'face_landmark_68_tiny_model-weights_manifest.json',
    'face_landmark_68_tiny_model-shard1',
    'face_recognition_model-weights_manifest.json',
    'face_recognition_model-shard1',
    'face_recognition_model-shard2',
]

function download(filename) {
    return new Promise((resolve, reject) => {
        const dest = path.join(OUT, filename)
        if (fs.existsSync(dest)) {
            console.log(`  ✓ ${filename} (already exists)`)
            return resolve()
        }
        const file = fs.createWriteStream(dest)
        const url = `${CDN}/${filename}`
        https.get(url, (res) => {
            if (res.statusCode === 301 || res.statusCode === 302) {
                file.close()
                fs.unlinkSync(dest)
                https.get(res.headers.location, (r) => {
                    r.pipe(file)
                    file.on('finish', () => { file.close(); console.log(`  ↓ ${filename}`); resolve() })
                    file.on('error', reject)
                }).on('error', reject)
                return
            }
            if (res.statusCode !== 200) {
                file.close(); fs.unlinkSync(dest)
                return reject(new Error(`HTTP ${res.statusCode} for ${filename}`))
            }
            res.pipe(file)
            file.on('finish', () => { file.close(); console.log(`  ↓ ${filename}`); resolve() })
        }).on('error', (err) => { fs.unlinkSync(dest); reject(err) })
    })
}

;(async () => {
    fs.mkdirSync(OUT, { recursive: true })
    console.log('Downloading face-api.js model weights to public/models/ ...')
    for (const f of FILES) {
        await download(f)
    }
    console.log('Done.')
})()
