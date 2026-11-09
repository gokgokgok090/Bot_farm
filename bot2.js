'use strict'

require('dotenv').config()

const mineflayer = require('mineflayer')
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder')
const fs = require('node:fs')
const path = require('node:path')

const CONFIG = {
  host: process.env.MC_HOST || 'secretsmp118.mcsh.io',
  port: Number(process.env.MC_PORT || 25565),
  username: process.env.MC_USERNAME || 'SHAKIB_00',
  owner: (process.env.OWNER_NAME || 'RIFAT_MOJO00').toLowerCase(),
  password: process.env.BOT_PASSWORD || '',
  version: process.env.MC_VERSION || '26.2',
  farmRadius: Math.max(2, Math.min(32, Number(process.env.FARM_RADIUS || 12))),
  farmYRadius: Math.max(2, Math.min(12, Number(process.env.FARM_Y_RADIUS || 6))),
  reconnectMs: Math.max(3000, Number(process.env.RECONNECT_MS || 10000))
}

const FARM_FILE = path.join(__dirname, 'farm.json')
let bot = null
let reconnectTimer = null
let loginSent = false
let farmOrigin = readFarm()
let farming = false
let farmLoopRunning = false
let stopping = false
let lastErrorAt = 0

function readFarm () {
  try {
    if (!fs.existsSync(FARM_FILE)) return null
    const value = JSON.parse(fs.readFileSync(FARM_FILE, 'utf8'))
    if (![value.x, value.y, value.z].every(Number.isFinite)) return null
    return { x: value.x, y: value.y, z: value.z }
  } catch (err) {
    console.error('[Farm] Could not read farm.json:', err.message)
    return null
  }
}

function saveFarm (position) {
  const data = {
    x: Math.floor(position.x),
    y: Math.floor(position.y),
    z: Math.floor(position.z),
    savedAt: new Date().toISOString()
  }
  fs.writeFileSync(FARM_FILE, JSON.stringify(data, null, 2))
  farmOrigin = { x: data.x, y: data.y, z: data.z }
}

function logError (label, err) {
  const now = Date.now()
  if (now - lastErrorAt > 1500) {
    console.error(`[${label}]`, err && err.message ? err.message : err)
    lastErrorAt = now
  }
}

function wait (ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function isConnected () {
  return bot && bot.entity && bot.player
}

function createBot () {
  if (stopping) return
  console.log(`[Connect] ${CONFIG.username} -> ${CONFIG.host}:${CONFIG.port} (Minecraft ${CONFIG.version})`)

  loginSent = false
  bot = mineflayer.createBot({
    host: CONFIG.host,
    port: CONFIG.port,
    username: CONFIG.username,
    auth: 'offline',
    version: CONFIG.version,
    hideErrors: false
  })

  bot.loadPlugin(pathfinder)

  bot.once('spawn', () => {
    console.log('[Bot] Spawned in world.')
    const movements = new Movements(bot)
    movements.canDig = true
    bot.pathfinder.setMovements(movements)

    if (!loginSent) {
      loginSent = true
      setTimeout(() => {
        if (!isConnected() || !CONFIG.password) {
          if (!CONFIG.password) console.error('[Login] BOT_PASSWORD is missing; automatic login skipped.')
          return
        }
        // Never print the password to logs.
        bot.chat(`/login ${CONFIG.password}`)
        console.log('[Login] Login command sent.')
      }, 3000)
    }
  })

  bot.on('chat', (username, message) => {
    if (!username || username.toLowerCase() === CONFIG.username.toLowerCase()) return
    if (username.toLowerCase() !== CONFIG.owner) return
    handleOwnerCommand(message.trim())
  })

  bot.on('kicked', reason => {
    console.warn('[Bot] Kicked:', typeof reason === 'string' ? reason : JSON.stringify(reason))
  })

  bot.on('error', err => logError('Bot error', err))

  bot.on('end', () => {
    console.warn('[Bot] Disconnected.')
    farming = false
    farmLoopRunning = false
    bot = null
    scheduleReconnect()
  })
}

function scheduleReconnect () {
  if (stopping || reconnectTimer) return
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null
    createBot()
  }, CONFIG.reconnectMs)
  console.log(`[Reconnect] Trying again in ${Math.round(CONFIG.reconnectMs / 1000)} seconds.`)
}

function handleOwnerCommand (message) {
  const command = message.toLowerCase().split(/\s+/)[0]
  if (command === '!setfarm') {
    if (!isConnected()) return
    saveFarm(bot.entity.position)
    bot.chat(`Farm location saved: ${farmOrigin.x}, ${farmOrigin.y}, ${farmOrigin.z}`)
    console.log('[Farm] Location saved.')
    return
  }

  if (command === '!farm') {
    if (!farmOrigin) {
      bot.chat('Farm location not set. Stand at your farm and use !setfarm first.')
      return
    }
    if (farming) {
      bot.chat('Farming is already running.')
      return
    }
    farming = true
    bot.chat('Sugar cane farming started.')
    void farmLoop()
    return
  }

  if (command === '!stopfarm') {
    farming = false
    if (bot && bot.pathfinder) bot.pathfinder.setGoal(null)
    bot.chat('Sugar cane farming stopped.')
    return
  }

  if (command === '!status') {
    const state = !isConnected() ? 'disconnected' : (farming ? 'farming' : 'idle')
    bot.chat(`Bot: ${state}; farm: ${farmOrigin ? 'saved' : 'not set'}.`)
  }
}

function withinFarm (pos) {
  return Math.abs(pos.x - farmOrigin.x) <= CONFIG.farmRadius &&
    Math.abs(pos.z - farmOrigin.z) <= CONFIG.farmRadius &&
    Math.abs(pos.y - farmOrigin.y) <= CONFIG.farmYRadius
}

function findCaneTargets () {
  if (!isConnected() || !farmOrigin) return []
  const found = bot.findBlocks({
    matching: block => block && block.name === 'sugar_cane',
    maxDistance: CONFIG.farmRadius * 2 + CONFIG.farmYRadius,
    count: 256
  })
  const targets = []

  for (const pos of found) {
    if (!withinFarm(pos)) continue
    const block = bot.blockAt(pos)
    if (!block || block.name !== 'sugar_cane') continue

    // Only treat a cane block as a base when the block below is not cane.
    const below = bot.blockAt(pos.offset(0, -1, 0))
    if (below && below.name === 'sugar_cane') continue

    let height = 1
    while (height < 16) {
      const above = bot.blockAt(pos.offset(0, height, 0))
      if (!above || above.name !== 'sugar_cane') break
      height++
    }

    // A mature column is at least 3 blocks tall.
    // Break only its top two blocks; the bottom/base block is preserved.
    if (height >= 3) {
      targets.push({
        base: pos,
        height,
        top: pos.offset(0, height - 1, 0)
      })
    }
  }

  return targets.sort((a, b) => {
    const da = bot.entity.position.distanceTo(a.top)
    const db = bot.entity.position.distanceTo(b.top)
    return da - db
  })
}

async function moveNear (position, range = 3) {
  if (!isConnected()) return false
  const goal = new goals.GoalNear(position.x, position.y, position.z, range)
  bot.pathfinder.setGoal(goal)
  const started = Date.now()

  while (isConnected() && Date.now() - started < 30000) {
    if (bot.entity.position.distanceTo(position) <= range + 0.5) return true
    await wait(250)
  }
  bot.pathfinder.setGoal(null)
  return isConnected() && bot.entity.position.distanceTo(position) <= range + 0.5
}

async function harvestColumn (target) {
  // Harvest top-down, never touching the base block at y.
  for (let offset = target.height - 1; offset >= Math.max(1, target.height - 2); offset--) {
    if (!farming || !isConnected()) return
    const block = bot.blockAt(target.base.offset(0, offset, 0))
    if (!block || block.name !== 'sugar_cane') continue
    if (!withinFarm(target.base)) continue
    await moveNear(block.position, 3)
    if (!farming || !isConnected()) return
    const current = bot.blockAt(block.position)
    if (current && current.name === 'sugar_cane') {
      await bot.dig(current, true)
      await wait(350)
    }
  }
}

async function collectNearbyDrops () {
  if (!isConnected()) return
  const itemEntities = Object.values(bot.entities).filter(entity =>
    entity && entity.name === 'item' && entity.position &&
    bot.entity.position.distanceTo(entity.position) < 18
  )

  for (const entity of itemEntities) {
    if (!farming || !isConnected()) return
    try {
      await moveNear(entity.position, 1.5)
      await wait(900)
    } catch (err) {
      logError('Pickup', err)
    }
  }
}

function getSugarCaneItem () {
  return bot.inventory.items().find(item => item.name === 'sugar_cane')
}

async function depositSugarCane () {
  if (!isConnected()) return false
  const cane = getSugarCaneItem()
  if (!cane) return true

  const chestBlock = bot.findBlock({
    matching: block => block && (block.name === 'chest' || block.name === 'trapped_chest'),
    maxDistance: 24
  })
  if (!chestBlock) {
    console.warn('[Chest] No chest found within 24 blocks; keeping sugar cane in inventory.')
    return false
  }

  if (!await moveNear(chestBlock.position, 3)) return false
  const freshChest = bot.blockAt(chestBlock.position)
  if (!freshChest || !['chest', 'trapped_chest'].includes(freshChest.name)) return false

  let container
  try {
    container = await bot.openContainer(freshChest)
    const current = getSugarCaneItem()
    if (current) await container.deposit(current.type, null, current.count)
    console.log('[Chest] Deposited sugar cane.')
    return true
  } catch (err) {
    logError('Chest deposit', err)
    return false
  } finally {
    if (container) {
      try { container.close() } catch (err) { logError('Chest close', err) }
    }
  }
}

async function farmLoop () {
  if (farmLoopRunning) return
  farmLoopRunning = true
  try {
    while (farming && isConnected()) {
      const targets = findCaneTargets()
      if (targets.length === 0) {
        await collectNearbyDrops()
        await depositSugarCane()
        await wait(2500)
        continue
      }

      for (const target of targets) {
        if (!farming || !isConnected()) break
        try {
          await harvestColumn(target)
          await collectNearbyDrops()
        } catch (err) {
          logError('Harvest', err)
          await wait(1000)
        }
      }

      await collectNearbyDrops()
      await depositSugarCane()
      await wait(1200)
    }
  } catch (err) {
    logError('Farm loop', err)
  } finally {
    farmLoopRunning = false
    if (farming && isConnected()) {
      await wait(1000)
      if (!farmLoopRunning) void farmLoop()
    }
  }
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)

function shutdown () {
  if (stopping) return
  stopping = true
  farming = false
  if (reconnectTimer) clearTimeout(reconnectTimer)
  if (bot) {
    try { bot.quit('Process stopping') } catch (err) { logError('Shutdown', err) }
  }
  setTimeout(() => process.exit(0), 1000).unref()
}

if (!CONFIG.password) {
  console.warn('[Config] BOT_PASSWORD is empty. Set it in the environment for automatic login.')
}
if (!Number.isInteger(CONFIG.port) || CONFIG.port < 1 || CONFIG.port > 65535) {
  throw new Error('MC_PORT must be a valid TCP port.')
}

createBot()
