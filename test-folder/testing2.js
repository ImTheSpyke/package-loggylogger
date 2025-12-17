
import { Loggy } from 'loggylogger';

const Logger = Loggy.createLogger()

let loggerProcess = Logger.bind({ service: 'auth'})

setInterval(() => {
    Logger.success("some datas","hello")

    loggerProcess.info("Mon process started dans l'autre fichier")

}, 1000)

