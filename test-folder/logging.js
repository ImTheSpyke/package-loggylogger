import { Loggy } from 'loggylogger'

import * as yes from './testing2.js'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
console.log(__dirname)


Loggy.setConfig({
    level: Loggy.LEVELS['9_SILLY'],
    colors: true,
    emojis: true,
    "showCallLines": true,
    "colors": true,
    "convertObjects": true,
    "convertObjectsColorized": true,
    "convertObjectsDepth": 2,
    "basePath": __dirname
})

console.log("process.cwd()", process.cwd())

const Logger = Loggy.createLogger().bind({ loggerDatas: 10})

Logger.silly("hello")

Loggy.startDashboard()

function getRandomType() {
    let types = ["log","info","warn","error","debug"]
    return "log-" + types[Math.floor(Math.random() * types.length)]
}

function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
}

function getRandomCallLines() {
    return `:${randInt(1,100)}`
}


setInterval(() => {
    Logger.fatal("fatality","hello")
    Logger.bind({ logdatas:1111}).log('arg1', { key: 'value', someList: [1,2,3,4,"hello","yes", 18n], myData: { "no": true, "yes": false}})

Logger.fatal('System crash')        // Level 10 - Highest priority
Logger.error('Operation failed')    // Level 20
Logger.warn('Deprecation notice')   // Level 30
Logger.success('Task completed')    // Level 40
Logger.info('Status update')        // Level 50
Logger.log('General message')       // Level 60 - Default mode
Logger.debug('Debug info')          // Level 70
Logger.verbose('Detailed trace')    // Level 80
Logger.silly('Very precise trace')  // Level 90 - Lowest priority
}, 1000)
