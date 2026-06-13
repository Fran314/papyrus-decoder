import binascii
from time import sleep
from pn532pi import Pn532, pn532
from pn532pi import Pn532Hsu

PN532_HSU = Pn532Hsu(0)
nfc = Pn532(PN532_HSU)


def setup():
    print("looking for PN532")
    nfc.begin()

    version = nfc.getFirmwareVersion()
    if not version:
        raise RuntimeError("couldn't find PN532")

    print(f"found chip PN5{(version >> 24) & 0xFF:02x}")
    print(f"firmware ver. {(version >> 16) & 0xFF}.{(version >> 8) & 0xFF}")

    nfc.SAMConfig()
    print("waiting for an ISO14443A tag...")


def loop():
    tag_present, uid = nfc.readPassiveTargetID(pn532.PN532_MIFARE_ISO14443A_106KBPS)

    if tag_present:
        print(f"found tag! UID: {binascii.hexlify(uid).decode()}")


if __name__ == "__main__":
    setup()
    while True:
        loop()
        sleep(0.1)
