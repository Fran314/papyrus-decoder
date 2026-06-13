# Papyrus decoder

Raspberry Pi 4 (Raspberry Pi OS Bookworm).

## PN532 NFC reader

Interface: HSU / UART @ 115200 on `/dev/serial0`. Mode switches: I0 LOW, I1 LOW.

| PN532 pin       | Pi signal    | Pi physical pin |
| --------------- | ------------ | --------------- |
| VCC             | 5V           | 2               |
| GND             | GND          | 6               |
| TXD (silk: SDA) | RXD / GPIO15 | 10              |
| RXD (silk: SCL) | TXD / GPIO14 | 8               |

Power from 5V, not 3.3V. TX/RX crossed. Power-cycle after changing mode
switches.

`raspi-config` -> Interface Options -> Serial Port: login shell over serial =
No, serial hardware = Yes.

## LEDs

5 LEDs, common ground, 100 ohm series resistor each.

| LED | Pi signal | Pi physical pin |
| --- | --------- | --------------- |
| 0   | GPIO17    | 11              |
| 1   | GPIO27    | 13              |
| 2   | GPIO22    | 15              |
| 3   | GPIO23    | 16              |
| 4   | GPIO24    | 18              |

## Software

```
python3 -m venv <venv>
<venv>/bin/pip install gpiozero lgpio pn532pi
```
