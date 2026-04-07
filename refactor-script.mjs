import fs from 'fs'
import path from 'path'

const ROOT = '/home/runner/work/zardonic-industrial/zardonic-industrial/api'

// ── Helper: remove interface block ──────────────────────────────────────
function removeInterfaceBlock(content, name) {
  // Match: optional comment line before + interface Name { ... }
  // Handle nested braces
  const regex = new RegExp(
    `(// [^\n]*\n)?interface\\s+${name}\\s*\\{`,
    'g'
  )
  let match
  while ((match = regex.exec(content)) !== null) {
    const startIdx = match.index
    const braceStart = content.indexOf('{', startIdx + match[0].length - 1)
    let depth = 1
    let i = braceStart + 1
    while (i < content.length && depth > 0) {
      if (content[i] === '{') depth++
      if (content[i] === '}') depth--
      i++
    }
    // Remove from startIdx to i, plus any trailing newlines
    let endIdx = i
    while (endIdx < content.length && content[endIdx] === '\n') endIdx++
    content = content.slice(0, startIdx) + content.slice(endIdx)
    // Reset regex
    regex.lastIndex = 0
  }
  return content
}

// ── Helper: remove Redis boilerplate ────────────────────────────────────
function removeRedisBoilerplate(content) {
  // Remove: import { Redis } from '@upstash/redis'
  content = content.replace(/import\s*\{\s*Redis\s*\}\s*from\s*['"]@upstash\/redis['"]\s*\n/g, '')
  
  // Remove: const kv = new Redis({ url: ..., token: ... })
  // This handles the multi-line pattern
  content = content.replace(
    /const\s+kv\s*=\s*new\s+Redis\(\{\s*\n\s*url:\s*process\.env\.UPSTASH_REDIS_REST_URL\s*\|\|\s*'',?\s*\n\s*token:\s*process\.env\.UPSTASH_REDIS_REST_TOKEN\s*\|\|\s*'',?\s*\n\s*\}\)\s*\n/g,
    ''
  )
  
  return content
}

// ── Helper: remove CMS local getRedis function ─────────────────────────
function removeCmsLocalGetRedis(content) {
  // Remove: let _redis: Redis | null = null
  content = content.replace(/let\s+_redis:\s*Redis\s*\|\s*null\s*=\s*null\s*\n/g, '')
  
  // Remove the function getRedis(): Redis { ... } block
  const funcRegex = /function\s+getRedis\(\):\s*Redis\s*\{/g
  let match
  while ((match = funcRegex.exec(content)) !== null) {
    const startIdx = match.index
    const braceStart = content.indexOf('{', startIdx)
    let depth = 1
    let i = braceStart + 1
    while (i < content.length && depth > 0) {
      if (content[i] === '{') depth++
      if (content[i] === '}') depth--
      i++
    }
    let endIdx = i
    while (endIdx < content.length && content[endIdx] === '\n') endIdx++
    content = content.slice(0, startIdx) + content.slice(endIdx)
    funcRegex.lastIndex = 0
  }
  
  // Remove: import { Redis } from '@upstash/redis'
  content = content.replace(/import\s*\{\s*Redis\s*\}\s*from\s*['"]@upstash\/redis['"]\s*\n/g, '')
  
  return content
}

// ── Helper: add import at the top ───────────────────────────────────────
function addImportAfterImports(content, importLine) {
  // If this import already exists, skip
  if (content.includes(importLine)) return content
  
  // Find the last import line
  const lines = content.split('\n')
  let lastImportIdx = -1
  for (let i = 0; i < lines.length; i++) {
    if (/^\s*import\s/.test(lines[i])) {
      // Find the end of multi-line imports
      let j = i
      while (j < lines.length && !lines[j].includes("from ") && !lines[j].includes("from '")) {
        j++
      }
      lastImportIdx = j
    }
  }
  
  if (lastImportIdx >= 0) {
    lines.splice(lastImportIdx + 1, 0, importLine)
  } else {
    // No imports found, add at very top
    lines.unshift(importLine)
  }
  
  return lines.join('\n')
}

// ── Helper: add import at the very beginning ────────────────────────────
function addImportAtTop(content, importLine) {
  if (content.includes(importLine)) return content
  
  // If there's a leading comment block, add after it
  const lines = content.split('\n')
  let insertIdx = 0
  
  // Skip leading comment block if it exists
  if (lines[0]?.startsWith('/**') || lines[0]?.startsWith('//')) {
    while (insertIdx < lines.length) {
      if (lines[insertIdx].includes('*/')) {
        insertIdx++
        break
      }
      if (lines[insertIdx].startsWith('//')) {
        insertIdx++
        continue
      }
      if (!lines[insertIdx].startsWith(' *') && !lines[insertIdx].startsWith('/**')) {
        break
      }
      insertIdx++
    }
    // Skip blank line after comment
    while (insertIdx < lines.length && lines[insertIdx].trim() === '') insertIdx++
  }
  
  // Now find the first import or the position to insert
  // If there are already imports, add before them or after
  let hasImports = false
  for (let i = insertIdx; i < lines.length; i++) {
    if (/^\s*import\s/.test(lines[i])) {
      hasImports = true
      break
    }
  }
  
  if (hasImports) {
    // Add before first import
    for (let i = insertIdx; i < lines.length; i++) {
      if (/^\s*import\s/.test(lines[i])) {
        lines.splice(i, 0, importLine)
        break
      }
    }
  } else {
    lines.splice(insertIdx, 0, importLine)
  }
  
  return lines.join('\n')
}

// ── Helper: insert "const kv = getRedis()" at top of function body ──────
function insertKvInHandler(content) {
  // Find: export default async function handler(...)  { or export default function handler(...) {
  const handlerRegex = /export\s+default\s+(async\s+)?function\s+handler\s*\([^)]*\)\s*(?::\s*(?:Promise<void>|void))?\s*\{/
  const match = handlerRegex.exec(content)
  if (!match) return content
  
  const braceIdx = content.indexOf('{', match.index + match[0].length - 1)
  const afterBrace = content.slice(braceIdx + 1)
  
  // Check if there's already a "const kv = getRedis()" nearby
  const firstLines = afterBrace.slice(0, 200)
  if (firstLines.includes('const kv = getRedis()')) return content
  
  // Insert after the opening brace
  const indent = '  '
  content = content.slice(0, braceIdx + 1) + `\n${indent}const kv = getRedis()` + content.slice(braceIdx + 1)
  
  return content
}

// ── Helper: insert kv in each exported function that uses kv ────────────
function insertKvInExportedFunctions(content) {
  // Find all exported function declarations
  const funcRegex = /export\s+(async\s+)?function\s+(\w+)\s*\([^)]*\)(?:\s*:\s*[^{]*)?\s*\{/g
  let match
  const insertions = []
  
  while ((match = funcRegex.exec(content)) !== null) {
    const funcName = match[2]
    const braceIdx = content.indexOf('{', match.index + match[0].length - 1)
    
    // Find the function body to check if it uses `kv`
    let depth = 1
    let i = braceIdx + 1
    while (i < content.length && depth > 0) {
      if (content[i] === '{') depth++
      if (content[i] === '}') depth--
      i++
    }
    const funcBody = content.slice(braceIdx + 1, i - 1)
    
    // Check if function body references `kv.` or `kv,` or `redis: kv`
    if (/\bkv\b/.test(funcBody) && !funcBody.includes('const kv = getRedis()')) {
      insertions.push(braceIdx)
    }
  }
  
  // Apply insertions in reverse order to preserve indices
  for (const braceIdx of insertions.reverse()) {
    const indent = '  '
    content = content.slice(0, braceIdx + 1) + `\n${indent}const kv = getRedis()` + content.slice(braceIdx + 1)
  }
  
  return content
}

// ── Helper: replace isKVConfigured with isRedisConfigured ───────────────
function replaceIsKVConfigured(content) {
  // Check if file has a local isKVConfigured that simply checks env vars
  const localFnRegex = /const\s+isKVConfigured\s*=\s*\(?(?:\):\s*boolean)?\s*(?:=>)?\s*\{?\s*\n?\s*return\s+!!\(process\.env\.UPSTASH_REDIS_REST_URL\s*&&\s*process\.env\.UPSTASH_REDIS_REST_TOKEN\)\s*\n?\s*\}?/
  
  const match = localFnRegex.exec(content)
  if (match) {
    // Remove the local function definition
    let endIdx = match.index + match[0].length
    // Also remove trailing newlines
    while (endIdx < content.length && content[endIdx] === '\n') endIdx++
    content = content.slice(0, match.index) + content.slice(endIdx)
    
    // Replace all usages of isKVConfigured with isRedisConfigured
    content = content.replace(/\bisKVConfigured\(\)/g, 'isRedisConfigured()')
  }
  
  return content
}

// ── Process files ───────────────────────────────────────────────────────

function processFile(filePath, options) {
  const { replaceVercelInterfaces, replaceRedis, replaceRedisMultiExport, replaceCmsRedis, redisImportPath, replaceIsKV } = options
  
  let content = fs.readFileSync(filePath, 'utf8')
  const originalContent = content
  
  if (replaceVercelInterfaces) {
    content = removeInterfaceBlock(content, 'VercelRequest')
    content = removeInterfaceBlock(content, 'VercelResponse')
    content = addImportAfterImports(content, "import type { VercelRequest, VercelResponse } from '@vercel/node'")
  }
  
  if (replaceRedis || replaceRedisMultiExport) {
    content = removeRedisBoilerplate(content)
    content = addImportAtTop(content, `import { getRedis } from '${redisImportPath}'`)
    
    if (replaceRedis) {
      content = insertKvInHandler(content)
    }
    if (replaceRedisMultiExport) {
      content = insertKvInExportedFunctions(content)
    }
  }
  
  if (replaceCmsRedis) {
    content = removeCmsLocalGetRedis(content)
    // Add import from ../_redis.js if not already present
    if (!content.includes("from '../_redis.js'")) {
      content = addImportAfterImports(content, `import { getRedis } from '../_redis.js'`)
    }
  }
  
  if (replaceIsKV) {
    content = replaceIsKVConfigured(content)
    // Add isRedisConfigured import
    if (content.includes('isRedisConfigured()') && !content.includes('isRedisConfigured')) {
      // Already handled
    }
    if (content.includes('isRedisConfigured(') && !content.includes("import") || 
        (content.includes('isRedisConfigured(') && !content.includes('isRedisConfigured') )) {
      // need import
    }
    // Add to existing _redis import or create new one
    if (content.includes('isRedisConfigured(')) {
      if (content.includes(`from '${redisImportPath || "./_redis.js"}'`)) {
        // Already importing from _redis.js, add isRedisConfigured to that import
        const importPath = redisImportPath || './_redis.js'
        const existingImport = content.match(new RegExp(`import\\s*\\{([^}]+)\\}\\s*from\\s*'${importPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}'`))
        if (existingImport && !existingImport[1].includes('isRedisConfigured')) {
          const newImports = existingImport[1].trim() + ', isRedisConfigured'
          content = content.replace(existingImport[0], `import { ${newImports} } from '${importPath}'`)
        }
      } else {
        const importPath = redisImportPath || './_redis.js'
        content = addImportAtTop(content, `import { isRedisConfigured } from '${importPath}'`)
      }
    }
  }
  
  // Clean up excessive blank lines (3+ consecutive → 2)
  content = content.replace(/\n{4,}/g, '\n\n\n')
  
  if (content !== originalContent) {
    fs.writeFileSync(filePath, content)
    console.log(`✅ ${filePath}`)
  } else {
    console.log(`⏭️  ${filePath} (no changes needed)`)
  }
}

// ══════════════════════════════════════════════════════════════════════════
// GROUP A: Files needing BOTH VercelRequest replacement AND Redis refactor
// ══════════════════════════════════════════════════════════════════════════
const groupA = [
  'analytics.ts', 'auth.ts', 'canary-script.ts', 'canary-alerts.ts',
  'contact.ts', 'denied.ts', 'image-proxy.ts', 'kv.ts', 'newsletter.ts',
  'oauth.ts', 'og.ts', 'reset-password.ts', 'security-incidents.ts',
  'security-log.ts', 'security-settings.ts', 'subscribers.ts',
  'terminal.ts', 'validate-key.ts'
]

console.log('\n═══ GROUP A: VercelRequest + Redis (single handler) ═══')
for (const file of groupA) {
  processFile(path.join(ROOT, file), {
    replaceVercelInterfaces: true,
    replaceRedis: true,
    redisImportPath: './_redis.js'
  })
}

// ══════════════════════════════════════════════════════════════════════════
// GROUP B: Files needing ONLY VercelRequest replacement (no Redis)
// ══════════════════════════════════════════════════════════════════════════
const groupB = [
  'attacker-profile.ts', 'blocklist.ts', 'canary-callback.ts',
  'drive-download.ts', 'drive-folder.ts', 'env-check.ts', 'geo.ts',
  'image-proxy-protected.ts', 'itunes.ts', 'odesli.ts',
  'setlistfm.ts', 'sitemap-trap.ts', 'bandsintown.ts'
]

console.log('\n═══ GROUP B: VercelRequest only ═══')
for (const file of groupB) {
  processFile(path.join(ROOT, file), {
    replaceVercelInterfaces: true,
    redisImportPath: './_redis.js'
  })
}

// ══════════════════════════════════════════════════════════════════════════
// GROUP B2: Admin files needing ONLY VercelRequest replacement
// ══════════════════════════════════════════════════════════════════════════
console.log('\n═══ GROUP B2: Admin VercelRequest only ═══')
processFile(path.join(ROOT, 'admin/logs/[id].ts'), {
  replaceVercelInterfaces: true,
  redisImportPath: '../_redis.js'
})

// ══════════════════════════════════════════════════════════════════════════
// GROUP C: Admin files needing BOTH VercelRequest AND Redis
// ══════════════════════════════════════════════════════════════════════════
const groupC = ['admin/validate-theme-key.ts', 'admin/keys.ts', 'admin/seed-security.ts']

console.log('\n═══ GROUP C: Admin VercelRequest + Redis ═══')
for (const file of groupC) {
  processFile(path.join(ROOT, file), {
    replaceVercelInterfaces: true,
    replaceRedis: true,
    redisImportPath: '../_redis.js'
  })
}

// ══════════════════════════════════════════════════════════════════════════
// GROUP D: Underscore files needing ONLY Redis refactoring (multi-export)
// ══════════════════════════════════════════════════════════════════════════
const groupD = [
  '_alerting.ts', '_attacker-profile.ts', '_blocklist.ts',
  '_canary-documents.ts', '_honeytokens.ts', '_log-poisoning.ts',
  '_path-traversal.ts', '_probe-detection.ts', '_security-logger.ts',
  '_sql-backfire.ts', '_threat-score.ts'
]

console.log('\n═══ GROUP D: Underscore files Redis (multi-export) ═══')
for (const file of groupD) {
  processFile(path.join(ROOT, file), {
    replaceRedisMultiExport: true,
    redisImportPath: './_redis.js'
  })
}

// ══════════════════════════════════════════════════════════════════════════
// GROUP E: _ratelimit.ts (special handling)
// ══════════════════════════════════════════════════════════════════════════
console.log('\n═══ GROUP E: _ratelimit.ts (special) ═══')
processFile(path.join(ROOT, '_ratelimit.ts'), {
  replaceRedisMultiExport: true,
  redisImportPath: './_redis.js'
})

// ══════════════════════════════════════════════════════════════════════════
// GROUP F: CMS files (already import @vercel/node, need Redis replacement)
// ══════════════════════════════════════════════════════════════════════════
const groupF = [
  'cms/media.ts', 'cms/content.ts', 'cms/site-config.ts',
  'cms/publish.ts', 'cms/sections.ts', 'cms/autosave.ts'
]

console.log('\n═══ GROUP F: CMS files Redis replacement ═══')
for (const file of groupF) {
  processFile(path.join(ROOT, file), {
    replaceCmsRedis: true,
    redisImportPath: '../_redis.js'
  })
}

// ══════════════════════════════════════════════════════════════════════════
// GROUP G: isKVConfigured replacements
// ══════════════════════════════════════════════════════════════════════════
const groupG_api = [
  'attacker-profile.ts', 'blocklist.ts', 'kv.ts',
  'security-incidents.ts', 'security-log.ts', 'security-settings.ts'
]

console.log('\n═══ GROUP G: isKVConfigured → isRedisConfigured ═══')
for (const file of groupG_api) {
  processFile(path.join(ROOT, file), {
    replaceIsKV: true,
    redisImportPath: './_redis.js'
  })
}

console.log('\n✅ All files processed!')
