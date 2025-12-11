import LoggyLogger from '../dist/index.js';


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
let counter = 0;
let startTime = Date.now();

setInterval(() => {
    counter++;
    LoggyLogger.log(
        getRandomType(), // log type
        `c:\\Users\\user\\AppData\\Local\\Programs\\Microsoft VS Code\\Code.exe${getRandomCallLines()}`, // log callline
        new Date(), // log date
        ['arg1', { key: 'value', someList: [1,2,3,4,"hello","yes", 18n], myData: { "no": true, "yes": false}}], // log datas
        {
            key: randInt(1,10),
            yesOrNo: randInt(1,2) == 1
        } // bound Datas if any
    )

    
}, 100)


setInterval(() => {
    const now = Date.now();
    if (now - startTime >= 1000) {
        const average = counter / ((now - startTime) / 1000);
        console.log(`Average sent per second: ${average.toFixed(2)}`);
        startTime = now;
        counter = 0;
    }
}, 1000)