import time

from gpiozero import PWMLED

PINS = [17, 27, 22, 23, 24]
SWEEP_DURATION = 3.0  # keep in sync with SCAN in static/index.html
SWEEP_INTERVAL = 0.02


class Leds:
    def __init__(self, pins):
        self._leds = [PWMLED(pin) for pin in pins]

    def sweep(self):
        last = len(self._leds) - 1
        start = time.monotonic()
        while True:
            progress = (time.monotonic() - start) / SWEEP_DURATION
            if progress >= 1.0:
                break
            pos = -1.0 + progress * (last + 2)
            for i, led in enumerate(self._leds):
                led.value = max(0.0, 1.0 - abs(pos - i))
            time.sleep(SWEEP_INTERVAL)
        for led in self._leds:
            led.off()


def open_leds():
    return Leds(PINS)
