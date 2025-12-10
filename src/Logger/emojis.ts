
import * as Types from "../types/index.js";

const emojis: Readonly<Record<Types.Logger.EmojiType, string>> = {
    none___: "",
    empty__: " ",
    dot____: "•",
    warn___: "⚠",
    check__: "✔",
    cross__: "🞪",
    interro: "?",
    mlstart: "┠",
    mlstep: "┇",
    mlend: "┇",
    mlstart2: "┬",
    mlstep2: "│",
    mlend2: "└",
}

export { emojis }