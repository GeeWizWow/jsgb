const BufferUtils = require('../../utils/bufferUtils');

class MemoryBank2 {
    constructor(cartridge) {
        this.cartridge = cartridge;

        this.romBankIndex = 0;
        this.romBank = new Uint8Array(0x4000);
    }

    copy() {
        return {
            romBankIndex: this.romBankIndex,
            romBank: BufferUtils.serialize(this.romBank),
        };
    }

    restore(quicksaveData) {
        this.romBankIndex = quicksaveData.romBankIndex;
        this.romBank = BufferUtils.deserialize(quicksaveData.romBank);
    }

    initialize() {
        this.reset();
    }

    shutdown() {}

    reset() {
        this.switchRomBank(1);
    }

    readByte(address) {
        if (address < 0x4000) {
            return this.cartridge.readByteFromRom(address);
        }

        if (address < 0x8000) {
            return this.romBank[address - 0x4000];
        }

        if (this.cartridge.externalMemory.isActive && address < 0xa200) {
            return this.cartridge.externalMemory.readByte(address - 0xa000);
        }

        return 0;
    }

    readBytes(address, length) {
        if (address < 0x4000) {
            return this.cartridge.readFromRom(address, length);
        }

        if (address < 0x8000) {
            return this.romBank.slice(address - 0x4000, address - 0x4000 + length);
        }

        if (this.cartridge.externalMemory.isActive && address < 0xa200) {
            return this.cartridge.externalMemory.readBytes(address - 0xa000, length);
        }
    }

    writeByte(address, value) {
        if (address < 0x2000 && (address & 0x0100) == 0) {
            if ((value & 0xf) == 0xa) {
                this.cartridge.externalMemory.activate();
            } else {
                this.cartridge.externalMemory.deactivate();
            }
        } else if (address < 0x4000 && (address & 0x0100) == 0x0100) {
            this.switchRomBank(value & 0b1111);
        } else if (this.cartridge.externalMemory.isActive && address >= 0xa000 && address < 0xa200) {
            this.cartridge.externalMemory.writeByte(address - 0xa000, value & 0b1111);
        }
    }

    switchRomBank(index) {
        if (index == 0) {
            index++;
        }

        if (this.romBankIndex != index) {
            this.romBankIndex = index;
            this.romBank = this.cartridge.readFromRom(this.romBank.length * index, this.romBank.length);
        }
    }
}

module.exports = MemoryBank2;
