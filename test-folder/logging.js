import { Loggy } from 'loggylogger'

const Logger = Loggy.createLogger()

Loggy.setGlobalConfig({
    logLevels: {
        debug: true,
        info: true,
        warn: true,
        error: true,
        fatal: true,
    }
})