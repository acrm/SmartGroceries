import fs from 'node:fs'
import path from 'node:path'
import { execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')

const versionPath = path.join(rootDir, 'version.json')
const packagePath = path.join(rootDir, 'package.json')
const notesPath = path.join(rootDir, 'build-notes.md')

function getIsoWeekCode(date = new Date()) {
  const utcDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = utcDate.getUTCDay() || 7
  utcDate.setUTCDate(utcDate.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1))
  const weekNo = Math.ceil((((utcDate - yearStart) / 86400000) + 1) / 7)
  return `${utcDate.getUTCFullYear()}w${String(weekNo).padStart(2, '0')}`
}

function parseArgs(argv) {
  let minor = false
  let desc = ''
  let noCommit = false
  let commitStagedOnly = false

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '--minor') {
      minor = true
      continue
    }
    if (arg === '--no-commit') {
      noCommit = true
      continue
    }
    if (arg === '--commit-staged-only') {
      commitStagedOnly = true
      continue
    }
    if (arg === '--desc') {
      desc = argv[i + 1] ?? ''
      i += 1
    }
  }

  return {
    minor,
    noCommit,
    commitStagedOnly,
    desc: desc.trim(),
  }
}

function runGit(args, options = {}) {
  return execSync(`git ${args.join(' ')}`, {
    cwd: rootDir,
    stdio: ['ignore', 'pipe', 'pipe'],
    encoding: 'utf8',
    ...options,
  }).trim()
}

function getStagedPaths() {
  const output = runGit(['diff', '--name-only', '--cached'])
  if (!output) return []
  return output.split('\n').map((line) => line.trim()).filter(Boolean)
}

function quotePathspec(filePath) {
  return `"${filePath.replace(/\\/g, '/').replace(/"/g, '\\"')}"`
}

function commitVersionBump({
  noCommit,
  commitStagedOnly,
  commitMessage,
  preStagedPaths,
}) {
  if (noCommit) return

  if (commitStagedOnly) {
    if (preStagedPaths.length === 0) {
      throw new Error(
        'No staged files found for --commit-staged-only. Stage files first or remove the option.'
      )
    }

    runGit(['reset', '-q'])

    const mandatoryPaths = ['version.json', 'package.json', 'build-notes.md']
    const targetPaths = [...new Set([...preStagedPaths, ...mandatoryPaths])]
    runGit(['add', '-A', '--', ...targetPaths.map(quotePathspec)], { shell: true })
  } else {
    runGit(['add', '-A'])
  }

  runGit(['commit', '-m', `"${commitMessage.replace(/"/g, '\\"')}"`], { shell: true })
}

function getFallbackDescription() {
  try {
    return execSync('git log -1 --pretty=%s', {
      cwd: rootDir,
      stdio: ['ignore', 'pipe', 'ignore'],
      encoding: 'utf8',
    }).trim()
  } catch {
    return ''
  }
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'))
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8')
}

function ensureBuildNotesExists() {
  if (!fs.existsSync(notesPath)) {
    fs.writeFileSync(notesPath, '# Build Notes\n\n', 'utf8')
  }
}

function main() {
  const {
    minor,
    noCommit,
    commitStagedOnly,
    desc,
  } = parseArgs(process.argv.slice(2))
  const currentWeekCode = getIsoWeekCode(new Date())
  const preStagedPaths = commitStagedOnly ? getStagedPaths() : []

  const versionData = readJson(versionPath)
  const packageData = readJson(packagePath)

  let nextWeekCode = versionData.weekCode
  let nextMinor = Number(versionData.minor ?? 0)
  let nextBuild = Number(versionData.build ?? 0)

  const isWeekRollover = nextWeekCode !== currentWeekCode

  if (isWeekRollover) {
    nextWeekCode = currentWeekCode
    nextMinor = 0
    nextBuild = 1
  } else if (minor) {
    nextMinor += 1
    nextBuild = 1
  } else {
    nextBuild += 1
  }

  const newVersion = `${nextWeekCode}-${nextMinor}.${nextBuild}`
  const finalDescription = desc || getFallbackDescription() || 'Version bump'

  const updatedVersionData = {
    weekCode: nextWeekCode,
    minor: nextMinor,
    build: nextBuild,
    currentVersion: newVersion,
  }

  packageData.version = newVersion

  writeJson(versionPath, updatedVersionData)
  writeJson(packagePath, packageData)

  ensureBuildNotesExists()
  fs.appendFileSync(notesPath, `- ${newVersion} — ${finalDescription}\n`, 'utf8')

  const commitMessage = `${newVersion}: ${finalDescription}`
  commitVersionBump({
    noCommit,
    commitStagedOnly,
    commitMessage,
    preStagedPaths,
  })

  process.stdout.write(`${newVersion}\n`)
}

main()
