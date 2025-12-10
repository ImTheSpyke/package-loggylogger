import * as Logger from './Logger.js'
import * as Server from './Server.js'

/*

    FATAL = 10,
    ERROR = 20,
    WARN = 30,
    SUCCESS = 40,
    INFO = 50,
    LOG = 60,
    DEBUG = 70,
    VERBOSE = 80,
    SILLY = 90

    */
export type Features = {
    "log1_fatal": boolean
    "log2_error": boolean
    "log3_warn": boolean
    "log4_success": boolean
    "log5_info": boolean
    "log6_log": boolean
    "log7_debug": boolean
    "log8_verbose": boolean
    "log9_silly": boolean
    "setting_colorizing": boolean
    "setting_objectInspect": boolean
    "setting_callLine": boolean
}

export type productionModeConfig = {
    enabled: boolean,
    remoteServer: {
        host: string | null
        port: number | null
    }
    features: Features
}
export type productionModeConfigPartial = Partial<productionModeConfig>


export type ServerConfig = {
    port: number
}

export { Logger, Server }
