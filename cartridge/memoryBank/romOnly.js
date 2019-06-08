const BufferUtils = require('../../utils/bufferUtils');

class RomOnly {
    constructor(cartridge) {
        this.cartridge = cartridge;

        this.ramEnabled = false;
        this.ramBank = Buffer.alloc(this.cartridge.hasRam ? 0x2000 : 0);
    }

    copy() {
        return {
            ramEnabled: this.ramEnabled,
            ramBank: BufferUtils.serialize(this.ramBank),
        };
    }

    restore(quicksaveData) {
        this.ramEnabled = quicksaveData.ramEnabled;
        this.ramBank = BufferUtils.deserialize(quicksaveData.ramBank);
    }

    readByte(address) {
        if (address < 0x8000) {
            return this.cartridge.readByteFromRom(address);
        }

        if (this.ramEnabled && address >= 0xa000 && address <= 0xbfff) {
            return this.ramBank[address - 0xa000];
        }

        return 0;
    }

    readBytes(address, length) {
        if (address < 0x8000) {
            return this.cartridge.readFromRom(address, length);
        }

        if (this.ramEnabled && address >= 0xa000 && address <= 0xbfff) {
            return this.ramBank.slice(address - 0xa000, address - 0xa000 + length);
        }
    }

    writeByte() {}
    initialize() {}
    reset() {}
    shutdown() {}
}

module.exports = RomOnly;
