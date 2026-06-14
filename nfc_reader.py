import binascii

from pn532pi import Pn532, pn532, Pn532Hsu


class Reader:
    def __init__(self, nfc, card_type):
        self._nfc = nfc
        self._card_type = card_type

    def read(self):
        present, uid = self._nfc.readPassiveTargetID(self._card_type)
        if present:
            return binascii.hexlify(uid).decode()
        return None


def open_reader():
    nfc = Pn532(Pn532Hsu(0))
    nfc.begin()
    if not nfc.getFirmwareVersion():
        raise RuntimeError("PN532 not found on /dev/serial0")
    nfc.SAMConfig()
    nfc.setPassiveActivationRetries(1)
    return Reader(nfc, pn532.PN532_MIFARE_ISO14443A_106KBPS)
