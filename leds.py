import time

from gpiozero import PWMLED

PINS = [17, 27, 22, 23, 24]
SWEEP_DURATION = 5.0  # keep in sync with SCAN in static/index.html
SWEEP_INTERVAL = 0.02
IDLE_BRIGHTNESS = 0.1
FLASH_DURATION = 0.5


class Leds:
    def __init__(self, pins):
        self._leds = [PWMLED(pin) for pin in pins]
        self.flash()

    def flash(self):
        for _ in range(3):
            for led in self._leds:
                led.value = 1
            time.sleep(FLASH_DURATION)

            for led in self._leds:
                led.value = 0
            time.sleep(FLASH_DURATION)

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
        self.idle()


def open_leds():
    return Leds(PINS)
