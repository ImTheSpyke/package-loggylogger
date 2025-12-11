

import { Loggy } from '../dist/index.js'

Loggy.setConfig({
    level: Loggy.LEVELS['9_SILLY'],
    colors: true,
    emojis: true,
    "showCallLines": true,
    "convertObjects": true,
    "convertObjectsColorized": true,
    "convertObjectsDepth": 2,
    "basePath": process.cwd()
})

const Logger = Loggy.createLogger()

Logger.silly("hello")
Logger.verbose("hello")
Logger.debug("hello")
Logger.log("hello")
Logger.info("hello")
Logger.success("hello")
Logger.warn("hello")
Logger.error("hello")
Logger.fatal("hello")