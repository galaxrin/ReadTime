// jsdom 环境不自带 TextEncoder/TextDecoder，用 Node 的实现补上
const { TextDecoder, TextEncoder } = require('node:util')

global.TextDecoder = TextDecoder
global.TextEncoder = TextEncoder
