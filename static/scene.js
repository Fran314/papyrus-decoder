const SCENES = {
    'papiro-1': {
        background: 'assets/papiro-1/background.png',
        symbols: [
            { value: 100, icon: 'assets/papiro-1/corda-arrotolata.png' },
            { value: 10, icon: 'assets/papiro-1/corda-piegata.png' },
            { value: 1000, icon: 'assets/papiro-1/fiore.png' },
            { value: 10000, icon: 'assets/papiro-1/dito.png' },
        ],
    },
    'papiro-2': {
        background: 'assets/papiro-2/background.png',
        symbols: [
            { value: 100000, icon: 'assets/papiro-2/girino.png' },
            { value: 30, icon: 'assets/papiro-2/corda-piegata.png' },
            { value: 200, icon: 'assets/papiro-2/corda-arrotolata.png' },
            { value: 2, icon: 'assets/papiro-2/bastoncino.png' },
        ],
    },
    'papiro-3': {
        background: 'assets/papiro-3/background.png',
        symbols: [
            { value: 100, icon: 'assets/papiro-3/corda-arrotolata.png' },
            { value: 10, icon: 'assets/papiro-3/corda-piegata.png' },
            { value: 20000, icon: 'assets/papiro-3/dito.png' },
        ],
    },
    'papiro-4': {
        background: 'assets/papiro-4/background.png',
        symbols: [
            { value: 20000, icon: 'assets/papiro-4/dito.png' },
            { value: 400, icon: 'assets/papiro-4/corda-arrotolata.png' },
            { value: 20, icon: 'assets/papiro-4/corda-piegata.png' },
            { value: 2, icon: 'assets/papiro-4/bastoncino.png' },
        ],
    },
}

// keep in sync with START_DELAY in app.py
const START_DELAY = 2.0

// every phase of the animation, in seconds
const SCAN = 5.0 // keep in sync with SWEEP_DURATION in leds.py
const BAR_FADE = 0.75 // bar fades in/out parked at each end of the scan
const PAUSE = 1.0
const SHRINK = 1.0
const HIGHLIGHT_FADE = 0.3
const DIM_PAUSE = 0.6 // the all-dim beat before each symbol lights up
const NUMBER_FADE = 0.4
const SUM_FADE = 0.4
const RESULT_FADE = 0.4

const MARGIN_LEFT = 60
const LARGE_FRACTION = 0.9
const SMALL_FACTOR = 0.8
const FULL_OPACITY = 1.0
const DIM_OPACITY = 0.3

const canvas = document.getElementById('scene')
const ctx = canvas.getContext('2d')
const images = {}

let current = null
let timeline = null
let startTime = 0
let width = 0
let height = 0

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))
const lerp = (a, b, t) => a + (b - a) * t
const smoothstep = t => t * t * (3 - 2 * t)

// 0..1 progress of t through a {start, duration} segment, linear or
// smoothstepped
const progress = (t, seg) => clamp((t - seg.start) / seg.duration, 0, 1)
const ease = (t, seg) => smoothstep(progress(t, seg))

// a value that ramps up over `rise`, holds at 1, then ramps back down
// over `fall` (omit `fall` for something that rises and stays)
const pulse = (t, rise, fall) => ease(t, rise) - (fall ? ease(t, fall) : 0)

// lays the whole animation out as a sequence of named segments, so
// every absolute time is computed in exactly one place. reads top to
// bottom like the storyboard it drives
function buildTimeline(count) {
    let cursor = 0
    const seg = duration => {
        const start = cursor
        cursor += duration
        return { start, duration }
    }
    const tl = {}

    tl.scan = seg(SCAN)
    // the bar parks while fading in/out, so the papyrus is wiped in
    // only during the middle of the scan
    tl.scanTravel = {
        start: tl.scan.start + BAR_FADE,
        duration: tl.scan.duration - 2 * BAR_FADE,
    }
    seg(PAUSE)
    tl.shrink = seg(SHRINK)
    seg(PAUSE)

    tl.turns = []
    for (let i = 0; i < count; i++) {
        const dimFade = seg(HIGHLIGHT_FADE) // previous symbol out, all dim
        seg(DIM_PAUSE)
        const lightFade = seg(HIGHLIGHT_FADE) // this symbol in
        seg(PAUSE)
        const number = seg(NUMBER_FADE) // its number appears
        seg(PAUSE)
        tl.turns.push({ dimFade, lightFade, number })
    }

    tl.allLight = seg(HIGHLIGHT_FADE) // every symbol back to full
    seg(PAUSE)
    tl.sum = seg(SUM_FADE) // operators and rule
    seg(PAUSE)
    tl.result = seg(RESULT_FADE)
    return tl
}

// each symbol is full while spotlit and dim otherwise, but only once the
// highlight sequence is under way. Before and after it everyone is full
function symbolOpacity(t, tl, index) {
    const next = tl.turns[index + 1]
    const spotlight = pulse(t, tl.turns[index].lightFade, next && next.dimFade)
    const inSequence = pulse(t, tl.turns[0].dimFade, tl.allLight)
    const base = lerp(FULL_OPACITY, DIM_OPACITY, inSequence)
    return lerp(base, FULL_OPACITY, spotlight)
}

function papyrusLayout(scene, t, tl) {
    const img = images[scene.background]
    const nw = img.naturalWidth
    const nh = img.naturalHeight
    const scaleLarge = (LARGE_FRACTION * height) / nh
    const scaleSmall = scaleLarge * SMALL_FACTOR
    const shrink = ease(t, tl.shrink)
    const scale = lerp(scaleLarge, scaleSmall, shrink)
    const xLarge = (width - nw * scaleLarge) / 2
    const x = lerp(xLarge, MARGIN_LEFT, shrink)
    const y = (height - nh * scale) / 2
    return {
        img,
        scale,
        x,
        y,
        w: nw * scale,
        h: nh * scale,
        right: x + nw * scale,
    }
}

// the papyrus and its symbols, wiped in left-to-right during the scan
function drawPapyrus(scene, t, tl, lay) {
    const reveal = progress(t, tl.scanTravel)
    ctx.save()
    if (reveal < 1) {
        ctx.beginPath()
        ctx.rect(lay.x, 0, lay.w * reveal, height)
        ctx.clip()
    }

    ctx.drawImage(lay.img, lay.x, lay.y, lay.w, lay.h)

    // every overlay shares the background's rect, so dimming it dims its symbol
    scene.symbols.forEach((symbol, i) => {
        ctx.globalAlpha = symbolOpacity(t, tl, i)
        ctx.drawImage(images[symbol.icon], lay.x, lay.y, lay.w, lay.h)
    })

    ctx.restore()
}

// glowing scanner line: parks at the left fading in, travels with the
// reveal edge, parks at the right fading out
function drawScanBar(t, tl, lay) {
    const scan = tl.scan
    if (t >= scan.start + scan.duration) return

    const reveal = progress(t, tl.scanTravel)
    const opacity = pulse(
        t,
        { start: scan.start, duration: BAR_FADE },
        { start: scan.start + scan.duration - BAR_FADE, duration: BAR_FADE },
    )
    ctx.save()
    ctx.globalAlpha = opacity
    ctx.shadowColor = 'rgba(255, 255, 255, 0.9)'
    ctx.shadowBlur = 24
    ctx.fillStyle = '#fff'
    ctx.fillRect(lay.x + lay.w * reveal - 15, 0, 30, height)
    ctx.restore()
}

// the stacked addition that grows in the area freed by the shrunk papyrus:
// one right-aligned addend per symbol (dimming in lockstep with it), then
// operators, a rule and the total
function drawNumbers(scene, t, tl, papyrusRight) {
    const count = scene.symbols.length
    const fontSize = height * 0.07
    const lineHeight = fontSize * 1.6
    const numbersRight = papyrusRight + (width - papyrusRight) * 0.55
    const operatorX = numbersRight + fontSize * 0.6
    const top = (height - count * lineHeight) / 2
    const rowY = row => top + row * lineHeight

    const values = scene.symbols.map(s => s.value)
    const result = values.reduce((a, b) => a + b, 0)

    ctx.save()
    ctx.font = `${fontSize}px monospace`
    ctx.textBaseline = 'middle'
    ctx.fillStyle = '#fff'
    ctx.strokeStyle = '#fff'

    ctx.textAlign = 'right'
    values.forEach((value, i) => {
        ctx.globalAlpha = symbolOpacity(t, tl, i) * ease(t, tl.turns[i].number)
        ctx.fillText(String(value), numbersRight, rowY(i))
    })

    ctx.globalAlpha = ease(t, tl.sum)
    ctx.textAlign = 'left'
    values.forEach((value, i) => {
        ctx.fillText(i === count - 1 ? '=' : '+', operatorX, rowY(i))
    })

    const labels = [...values, result].map(String)
    const widest = Math.max(...labels.map(s => ctx.measureText(s).width))
    const ruleY = rowY(count - 0.5)
    ctx.lineWidth = Math.max(2, fontSize * 0.06)
    ctx.beginPath()
    ctx.moveTo(numbersRight - widest - fontSize * 0.2, ruleY)
    ctx.lineTo(operatorX + fontSize * 0.5, ruleY)
    ctx.stroke()

    ctx.textAlign = 'right'
    ctx.globalAlpha = ease(t, tl.result)
    ctx.fillText(String(result), numbersRight, rowY(count))

    ctx.restore()
}

function drawScene(scene, t, tl) {
    const lay = papyrusLayout(scene, t, tl)
    drawPapyrus(scene, t, tl, lay)
    drawScanBar(t, tl, lay)
    drawNumbers(scene, t, tl, lay.right)
}

function frame(now) {
    ctx.clearRect(0, 0, width, height)
    if (current) drawScene(current, (now - startTime) / 1000, timeline)
    requestAnimationFrame(frame)
}

function resize() {
    const dpr = window.devicePixelRatio || 1
    width = window.innerWidth
    height = window.innerHeight
    canvas.width = width * dpr
    canvas.height = height * dpr
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
}

function play(scene) {
    current = scene
    timeline = buildTimeline(scene.symbols.length)
    startTime = performance.now()
}

// preload every image a scene needs, so nothing fades in progressively the
// first time it is shown
async function preloadAll() {
    const paths = new Set()
    for (const scene of Object.values(SCENES)) {
        paths.add(scene.background)
        for (const symbol of scene.symbols) paths.add(symbol.icon)
    }
    await Promise.all(
        [...paths].map(async path => {
            const image = new Image()
            image.src = path
            await image.decode().catch(() => {})
            images[path] = image
        }),
    )
}

// when the backend is reachable, scenes are driven by NFC tags; otherwise we
// fall back to manual triggering and stop polling (see startup)
async function poll() {
    let data
    try {
        data = await (await fetch('/tag')).json()
    } catch (e) {
        console.info(
            'no /tag backend: press 1-%d to trigger a scene',
            Object.keys(SCENES).length,
        )
        return
    }
    if (data.scene && SCENES[data.scene]) {
        const scene = SCENES[data.scene]
        setTimeout(() => play(scene), START_DELAY * 1000)
    }
    setTimeout(poll, 400)
}

function reset() {
    return fetch('/reset', { method: 'POST' }).catch(() => {})
}

// debug: trigger the Nth scene with its number key, with or without a backend
function enableManualTrigger() {
    const scenes = Object.values(SCENES)
    window.addEventListener('keydown', e => {
        const n = Number(e.key)
        if (n >= 1 && n <= scenes.length) play(scenes[n - 1])
    })
}

window.addEventListener('resize', resize)
resize()
reset()
    .then(preloadAll)
    .finally(() => {
        enableManualTrigger()
        requestAnimationFrame(frame)
        poll()
    })
