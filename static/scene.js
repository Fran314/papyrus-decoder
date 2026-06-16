const SCENES = {
    'papyrus-1': {
        papyrus: 'papiro.png',
        groups: [
            {
                value: 20000,
                icons: [
                    { name: 'dito.png', cx: 167, cy: 372, h: 380 },
                    { name: 'dito.png', cx: 347, cy: 372, h: 380 },
                ],
            },
            {
                value: 400,
                icons: [
                    { name: 'corda_arrotolata.png', cx: 511, cy: 245, h: 95 },
                    { name: 'corda_arrotolata.png', cx: 659, cy: 245, h: 95 },
                    { name: 'corda_arrotolata.png', cx: 511, cy: 500, h: 95 },
                    { name: 'corda_arrotolata.png', cx: 659, cy: 500, h: 95 },
                ],
            },
            {
                value: 20,
                icons: [
                    { name: 'corda_piegata.png', cx: 799, cy: 245, h: 160 },
                    { name: 'corda_piegata.png', cx: 799, cy: 500, h: 160 },
                ],
            },
            {
                value: 2,
                icons: [
                    { name: 'bastoncino.png', cx: 905, cy: 245, h: 180 },
                    { name: 'bastoncino.png', cx: 905, cy: 500, h: 180 },
                ],
            },
        ],
    },
    'papyrus-2': {
        papyrus: 'papiro.png',
        groups: [
            {
                value: 1,
                icons: [{ name: 'bastoncino.png', cx: 350, cy: 400, h: 300 }],
            },
            {
                value: 10,
                icons: [
                    { name: 'corda_piegata.png', cx: 650, cy: 400, h: 280 },
                ],
            },
        ],
    },
}

// every phase of the animation, in seconds
const SCAN = 5.0 // keep in sync with SWEEP_DURATION in leds.py
const BAR_FADE = 0.75 // bar fades in/out parked at each end of the scan
const PAUSE = 1.0
const SHRINK = 1.0
const HIGHLIGHT_FADE = 0.3
const DIM_PAUSE = 0.6 // the all-dim beat before each group lights up
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
    for (let g = 0; g < count; g++) {
        const dimFade = seg(HIGHLIGHT_FADE) // previous group out, all dim
        seg(DIM_PAUSE)
        const lightFade = seg(HIGHLIGHT_FADE) // this group in
        seg(PAUSE)
        const number = seg(NUMBER_FADE) // its number appears
        seg(PAUSE)
        tl.turns.push({ dimFade, lightFade, number })
    }

    tl.allLight = seg(HIGHLIGHT_FADE) // every group back to full
    seg(PAUSE)
    tl.sum = seg(SUM_FADE) // operators and rule
    seg(PAUSE)
    tl.result = seg(RESULT_FADE)
    return tl
}

// each group is full while spotlit and dim otherwise, but only once
// the highlight sequence is under way; before and after it everyone
// is full
function groupOpacity(t, tl, group) {
    const next = tl.turns[group + 1]
    const spotlight = pulse(t, tl.turns[group].lightFade, next && next.dimFade)
    const inSequence = pulse(t, tl.turns[0].dimFade, tl.allLight)
    const base = lerp(FULL_OPACITY, DIM_OPACITY, inSequence)
    return lerp(base, FULL_OPACITY, spotlight)
}

function papyrusLayout(scene, t, tl) {
    const img = images[scene.papyrus]
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

    // icons are authored in papyrus-native coords, so they ride the
    // same scale and offset as the papyrus
    scene.groups.forEach((group, g) => {
        ctx.globalAlpha = groupOpacity(t, tl, g)
        for (const icon of group.icons) {
            const image = images[icon.name]
            const h = icon.h * lay.scale
            const w = h * (image.naturalWidth / image.naturalHeight)
            const cx = lay.x + icon.cx * lay.scale
            const cy = lay.y + icon.cy * lay.scale
            ctx.drawImage(image, cx - w / 2, cy - h / 2, w, h)
        }
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

// the stacked addition that grows in the area freed by the shrunk
// papyrus: one right-aligned addend per group (dimming in lockstep
// with its symbols), then operators, a rule and the total
function drawNumbers(scene, t, tl, papyrusRight) {
    const count = scene.groups.length
    const fontSize = height * 0.07
    const lineHeight = fontSize * 1.6
    const numbersRight = papyrusRight + (width - papyrusRight) * 0.55
    const operatorX = numbersRight + fontSize * 0.6
    const top = (height - count * lineHeight) / 2
    const rowY = row => top + row * lineHeight

    const values = scene.groups.map(g => g.value)
    const result = values.reduce((a, b) => a + b, 0)

    ctx.save()
    ctx.font = `${fontSize}px monospace`
    ctx.textBaseline = 'middle'
    ctx.fillStyle = '#fff'
    ctx.strokeStyle = '#fff'

    ctx.textAlign = 'right'
    values.forEach((value, g) => {
        ctx.globalAlpha = groupOpacity(t, tl, g) * ease(t, tl.turns[g].number)
        ctx.fillText(String(value), numbersRight, rowY(g))
    })

    ctx.globalAlpha = ease(t, tl.sum)
    ctx.textAlign = 'left'
    values.forEach((value, g) => {
        ctx.fillText(g === count - 1 ? '=' : '+', operatorX, rowY(g))
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

// preload all the assets at the beginning so that they don't fade
// in progressively on first appearence
async function preloadAll() {
    const res = await fetch('/assets')
    const urls = await res.json()
    await Promise.all(
        urls.map(async url => {
            const image = new Image()
            image.src = url
            await image.decode().catch(() => {})
            images[url.split('/').pop()] = image
        }),
    )
}

// check if a tag is present, and if so start the animation
async function poll() {
    try {
        const res = await fetch('/tag')
        const data = await res.json()
        if (data.scene && SCENES[data.scene]) {
            current = SCENES[data.scene]
            timeline = buildTimeline(current.groups.length)
            startTime = performance.now()
        }
    } catch (e) {}
    setTimeout(poll, 400)
}

// reset the state of the backend
function reset() {
    return fetch('/reset', { method: 'POST' }).catch(() => {})
}

window.addEventListener('resize', resize)
resize()
reset()
    .then(preloadAll)
    .finally(() => {
        requestAnimationFrame(frame)
        poll()
    })
