

import { Loggy } from '../dist/index.js'

Loggy.startDashboard()

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))


async function aaa() {

    console.log("process.cwd()", process.cwd())

    Loggy.setConfig({
        level: Loggy.LEVELS['9_SILLY'],
        colors: true,
        emojis: true,
        "showCallLines": false,
        "convertObjects": true,
        "convertObjectsColorized": true,
        "convertObjectsDepth": 5,
        "basePath": process.cwd()
    })

    const logger1 = Loggy.createLogger({}, { logger: 1 })

    logger1.bind({ defaultConfig: true }).info("hello logger 1", { arr: [ { obj: { key: "value" } } ] })

    await sleep(1000)

    const logger2 = Loggy.createLogger({
        color: false,
        showCallLines: true,
        convertObjectsDepth: 5,
        convertObjectsColorized: false,
    }, { logger: 2 })

    logger2.bind({ color: false, showCallLines: false }).info("hello logger 2", { arr: [ { obj: { key: "value" } } ] })

    await sleep(1000)

    Loggy.setConfig({
        level: Loggy.LEVELS['9_SILLY'],
        colors: true,
        emojis: true,
        "showCallLines": false,
        "convertObjects": true,
        "convertObjectsColorized": true,
        "convertObjectsDepth": 1,
    })
    logger1.bind({ config: {
        level: Loggy.LEVELS['9_SILLY'],
        colors: true,
        emojis: true,
        "showCallLines": true,
        "convertObjects": true,
        "convertObjectsColorized": true,
        "convertObjectsDepth": 2,
    }}).info('setConfig executed')


    await sleep(1000)
    logger1.bind({ when: 'after second setConfg' }).info("hello logger 1", { arr: [ { obj: { key: "value" } } ] })

    await sleep(1000)
    logger2.bind({ when: 'after second setConfg' }).info("hello logger 2", { arr: [ { obj: { key: "value" } } ] })


}


aaa()