import { readdir, readFile } from 'node:fs/promises'
import { resolve, join } from 'node:path'
import { createHash } from 'node:crypto'

const url = new URL(process.argv[2])
if (url.protocol !== 'https:' || url.username || url.password || !url.pathname.endsWith('/')) {
  throw new Error('Provide the permanent HTTPS site URL ending with /')
}
const output = resolve(process.argv[3] || 'dist')
async function filesAt(directory, prefix = '') {
  const entries = await readdir(directory, { withFileTypes: true })
  const nested = await Promise.all(entries.map(entry => entry.isDirectory()
    ? filesAt(join(directory, entry.name), prefix + entry.name + '/') : [prefix + entry.name]))
  return nested.flat().sort()
}
const files = await filesAt(output)
const hash = data => createHash('sha256').update(data).digest('hex')
for (let i = 0; i < files.length; i += 4) {
  await Promise.all(files.slice(i, i + 4).map(async file => {
    const expected = await readFile(join(output, file))
    const response = await fetch(new URL(file, url), { signal: AbortSignal.timeout(20000), cache: 'no-store' })
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${file}`)
    if (new URL(response.url).protocol !== 'https:') throw new Error(`HTTPS redirect failed: ${file}`)
    if (hash(Buffer.from(await response.arrayBuffer())) !== hash(expected)) throw new Error(`Resource differs from verified build: ${file}`)
  }))
}
console.log(JSON.stringify({ url: url.href, verified_files: files.length, public_resources: 'matched', https: true }))
