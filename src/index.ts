import Logger from './Logger/index.js'
import { startServer } from './server.js'
import * as Types from './types/index.js'
import { LEVELS } from './Logger/levels.js'


class LoggyLogger {

    private globalLoggerConfig: Types.Logger.TLoggyConfig = {
        /** Log level threshold (higher = more verbose). Use LoggyLogger.LEVELS constants. */
        level: LEVELS.DEFAULT,
        /** Enable ANSI color codes in output */
        colors: true,
        /** Enable emoji characters in log patterns */
        emojis: true,
        /** Show file path and line number in logs */
        showCallLines: false,
        /** Clean ISO date format (remove T and Z) */
        cleanDate: true,
        /** Convert objects to strings using util.inspect */
        convertObjects: false,
        /** Enable colors in object inspection output */
        convertObjectsColorized: true,
        /** Maximum depth for object inspection */
        convertObjectsDepth: 2,
    }

    private productionLoggerConfig: Types.Logger.TLoggyConfig = {
        level: Types.Logger.LOG_LEVEL.FATAL,
        colors: false,
        emojis: false,
        showCallLines: false,
        cleanDate: false,
        convertObjects: false,
        convertObjectsColorized: false,
        convertObjectsDepth: 2,
    }
    private productionModeConfig: Types.productionModeConfig = {
        enabled: false,
        remoteServer: {
            host: null,
            port: null,
        },
        features: {
            "log1_fatal": true,
            "log2_error": true,
            "log3_warn": true,
            "log4_success": true,
            "log5_info": true,
            "log6_log": false,
            "log7_debug": false,
            "log8_verbose": false,
            "log9_silly": false,
            "setting_colorizing": false,
            "setting_objectInspect": false,
            "setting_callLine": false,
        }
    }

    /* local websocket and http server config */
    private serverConfig: Types.ServerConfig = {
        port: 11000
    }
    private serverConfigDefaultPort: number = 11000;


    /**
     * LoggyLogger constructor
     */
    constructor() {
        startServer()
    }


    /** Global getters */

    public get LEVELS(): Types.Logger.AVAILABLE_LEVELS { return LEVELS }

    public getGlobalLoggerConfig(): Types.Logger.TLoggyConfig { return this.globalLoggerConfig }
    public getProductionLoggerConfig(): Types.Logger.TLoggyConfig { return this.productionLoggerConfig }
    public getProductionModeConfig(): Types.productionModeConfig { return this.productionModeConfig }
    public getServerConfig(): Types.Server.Config { return this.serverConfig }

    /** Global set functions */
    
    toggleProductionMode(boolean: boolean) {
        if(typeof boolean !== 'boolean') throw new Error('Value must be boolean')
        this.productionModeConfig.enabled = boolean
    }

    private setConfigProperty<K extends keyof Types.Logger.TLoggyConfig>(config: Types.Logger.TLoggyConfig, property: K, value: Types.Logger.TLoggyConfig[K]) {
        if (typeof value !== typeof config[property]) {
            throw new Error(`Invalid value type for ${property}. Expected ${typeof config[property]}, got ${typeof value}`)
        }
        config[property] = value
    }

    public setGlobalLoggerConfig(config?: Types.Logger.TLoggyConfigOptional) {
        if (!config) return
        for (const [property, value] of Object.entries(config)) {
            if (value === undefined) continue
            this.setConfigProperty(this.globalLoggerConfig, property as keyof Types.Logger.TLoggyConfig, value)
        }
    }

    public setProductionLoggerConfig(config?: Types.Logger.TLoggyConfigOptional) {
        if (!config) return
        for (const [property, value] of Object.entries(config)) {
            if (value === undefined) continue
            this.setConfigProperty(this.productionLoggerConfig, property as keyof Types.Logger.TLoggyConfig, value)
        }
    }

    public setServerConfig(serverConfig: Types.ServerConfig) {
        this.serverConfig = {
            port: serverConfig.port ?? this.serverConfigDefaultPort
        }
    }

    public startServer(): void {
        setTimeout(() => {
            if(this.getProductionModeConfig().enabled == true) return; // if production mode is enabled, don't start the server
            startServer(this.serverConfig.port)
        }, 300) // Ensures everything is good before starting
    }


    public createLogger(config?: Types.Logger.TLoggyConfigOptional) {
        return new Logger({
            ...(
                this.productionModeConfig.enabled
                ? this.productionLoggerConfig
                : this.globalLoggerConfig
            ),
            ...config
        })
    }




}

const Loggy = new LoggyLogger()


export default Loggy
export { Loggy }