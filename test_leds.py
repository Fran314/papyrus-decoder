from time import sleep

from gpiozero import LED

PINS = [17, 27, 22, 23, 24]
DELAY = 0.15


def sweep_frames(n):
    frames = [[]]
    for i in range(n):
        frames.append([i])
        if i < n - 1:
            frames.append([i, i + 1])
    return frames


def main():
    leds = [LED(pin) for pin in PINS]
    frames = sweep_frames(len(PINS))
    print(f"sweeping LEDs on GPIO {PINS}")
    try:
        while True:
            for frame in frames:
                for i, led in enumerate(leds):
                    led.value = 1 if i in frame else 0
                print([PINS[i] for i in frame])
                sleep(DELAY)
    except KeyboardInterrupt:
        for led in leds:
            led.off()
        print("\nstopped")


if __name__ == "__main__":
    main()
