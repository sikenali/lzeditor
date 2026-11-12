import assert from 'node:assert/strict'
import { test } from 'node:test'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import * as git from 'isomorphic-git'
import fs from 'node:fs'
import { getGitHistory, getGitShow } from '../electron/gitHistory.ts'

async function makeRepo() {
  const dir = await mkdtemp(join(tmpdir(), 'lze-git-'))
  await git.init({ fs, dir })
  return dir
}
async function commitFile(dir, rel, content, msg, t) {
  const abs = join(dir, rel)
  const parentDir = rel.includes('/') ? join(dir, rel.split('/').slice(0, -1).join('/')) : dir
  fs.mkdirSync(parentDir, { recursive: true })
  fs.writeFileSync(abs, content)
  await git.add({ fs, dir, filepath: rel })
  return git.commit({ fs, dir, message: msg, author: { name: 'a', email: 'a@x.com', timestamp: Math.floor(t/1000) } })
}

test('getGitHistory：提交列表含 changes/ts，getGitShow 读内容', async () => {
  const dir = await makeRepo()
  try {
    const oid = await commitFile(dir, 'doc.md', '# hi\n\nbody\n', 'add doc', Date.now())
    const res = await getGitHistory(join(dir, 'doc.md'))
    assert.equal(res.ok, true)
    assert.equal(res.gitPath, 'doc.md')
    assert.equal(res.commits.length, 1)
    assert.equal(res.commits[0].oid, oid)
    assert.ok(res.commits[0].changes >= 1)
    const show = await getGitShow(join(dir, 'doc.md'), oid)
    assert.equal(show.ok, true); assert.equal(show.text, '# hi\n\nbody\n')
  } finally { await rm(dir, { recursive: true, force: true }) }
})

test('getGitHistory：未提交文件 → 空 commits；非仓库 → ok:false', async () => {
  const dir = await makeRepo()
  try {
    fs.writeFileSync(join(dir, 'untracked.md'), 'x')
    const res = await getGitHistory(join(dir, 'untracked.md'))
    assert.equal(res.ok, true); assert.equal(res.commits.length, 0)
    const outside = join(tmpdir(), 'no-repo-' + Date.now() + '.md')
    fs.writeFileSync(outside, 'x')
    const bad = await getGitHistory(outside)
    assert.equal(bad.ok, false)
  } finally { await rm(dir, { recursive: true, force: true }) }
})

test('getGitHistory：提交上限 50', async () => {
  const dir = await makeRepo()
  try {
    for (let i = 0; i < 55; i++) await commitFile(dir, 'doc.md', `# v${i}\n`, `c${i}`, Date.now() + i * 1000)
    const res = await getGitHistory(join(dir, 'doc.md'))
    assert.equal(res.commits.length, 50)
  } finally { await rm(dir, { recursive: true, force: true }) }
})
