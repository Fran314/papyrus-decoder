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

Free the serial port for the PN532 (reboot after):

```
sudo raspi-config nonint do_serial_hw 0    # serial hardware on
sudo raspi-config nonint do_serial_cons 1  # serial login console off
```

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
python3 -m venv .venv
.venv/bin/pip install flask gpiozero lgpio pn532pi
.venv/bin/python app.py
```

## Autostart

systemd service (`papyrus-decoder.service`). Assumes user `admin` and project at
`/home/admin/papyrus-decoder`. Edit the unit if your setup differs.

```
sudo cp papyrus-decoder.service /etc/systemd/system/
sudo systemctl enable --now papyrus-decoder
```

Logs: `journalctl -u papyrus-decoder -f`.
