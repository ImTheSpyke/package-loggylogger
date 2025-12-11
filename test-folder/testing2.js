
import { Loggy } from 'loggylogger'

const Logger = Loggy.createLogger()

setInterval(() => {
    Logger.success("some datas","hello")

}, 1000)

