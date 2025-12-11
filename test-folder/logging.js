import { Loggy } from 'loggylogger'

import * as yes from './testing2.js'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
console.log(__dirname)


Loggy.setConfig({
    level: Loggy.LEVELS.DEFAULT,
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

Loggy.enableProduction({
    logLevels: {
        debug: true,
        info: true,
        warn: true,
        error: true,
        fatal: true,
    },
    "showCallLines": true,
    "colors": true,
    "convertObjects": true,
    "convertObjectsColorized": true,
    "convertObjectsDepth": 2,
    dashboard: true,
}, 10000)


const Logger = Loggy.createLogger({
    colors:false
}).bind({ loggerDatas: 10})

Logger.fatal("hello")
setTimeout(() => {

Loggy.disableProduction()
}, 100)

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

}, 1000)
