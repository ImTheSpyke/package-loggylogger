

import { Loggy } from '../dist/index.js'

Loggy.startDashboard()

const logger0 = Loggy.createLogger({
    level: Loggy.LEVELS['9_SILLY'],
    colors: true,
    emojis: false,
    convertObjects: true,
    convertObjectsColorized: true,
    convertObjectsDepth: 0
})
const logger1 = Loggy.createLogger({
    level: Loggy.LEVELS['9_SILLY'],
    colors: true,
    emojis: false,
    convertObjects: true,
    convertObjectsColorized: true,
    convertObjectsDepth: 1
})
const logger2 = Loggy.createLogger({
    level: Loggy.LEVELS['9_SILLY'],
    colors: true,
    emojis: false,
    convertObjects: true,
    convertObjectsColorized: true,
    convertObjectsDepth: 2
})
const logger3 = Loggy.createLogger({
    level: Loggy.LEVELS['9_SILLY'],
    colors: true,
    emojis: false,
    convertObjects: true,
    convertObjectsColorized: true,
    convertObjectsDepth: 3
})
const logger4 = Loggy.createLogger({
    level: Loggy.LEVELS['9_SILLY'],
    colors: true,
    emojis: false,
    convertObjects: true,
    convertObjectsColorized: true,
    convertObjectsDepth: 4
})
const logger5 = Loggy.createLogger({
    level: Loggy.LEVELS['9_SILLY'],
    colors: true,
    emojis: false,
    convertObjects: true,
    convertObjectsColorized: true,
    convertObjectsDepth: 5
})
const logger6 = Loggy.createLogger({
    level: Loggy.LEVELS['9_SILLY'],
    colors: true,
    emojis: false,
    convertObjects: true,
    convertObjectsColorized: true,
    convertObjectsDepth: 6
})


let obj = { arr: [ { obj: { key: { subvalue: [ "value1", { v: { foo: "bar" }} ] } } } ] }

logger0.info("0",obj)
logger1.info("1",obj)
logger2.info("2",obj)
logger3.info("3",obj)
logger4.info("4",obj)
logger5.info("5",obj)
logger6.info("6",obj)

console.log("hi:\x1b[ \x1b[\x1b[" )