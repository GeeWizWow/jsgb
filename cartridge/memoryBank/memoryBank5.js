const BufferUtils = require('../../utils/bufferUtils');

class MemoryBank5 {
    constructor(cartridge) {
        this.cartridge = cartridge;

        this.romBank = new Uint8Array(0x4000);
        this.romBankIndex = 0;
        this.ramBankIndex = 0;
    }

    copy() {
        return {
            romBankIndex: this.romBankIndex,
            ramBankIndex: this.ramBankIndex,
            romBank: BufferUtils.serialize(this.romBank),
        };
    }

    restore(quicksaveData) {
        this.romBankIndex = quicksaveData.romBankIndex;
        this.ramBankIndex = quicksaveData.ramBankIndex;
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

        if (this.cartridge.externalMemory.isActive && address >= 0xa000 && address <= 0xbfff) {
            return this.cartridge.externalMemory.readByte(address - 0xa000 + this.getRamOffset());
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

        if (this.cartridge.externalMemory.isActive && address >= 0xa000 && address <= 0xbfff) {
            return this.cartridge.externalMemory.readBytes(address - 0xa000 + this.getRamOffset(), length);
        }
    }

    writeByte(address, value) {
        if (address < 0x2000) {
            if ((value & 0xa) == 0xa) {
                this.cartridge.externalMemory.activate();
            } else {
                this.cartridge.externalMemory.deactivate();
            }
        } else if (address < 0x3000) {
            this.switchRomBank((this.romBankIndex & 0x100) | value);
        } else if (address < 0x4000) {
            this.switchRomBank((this.romBankIndex & 0xff) | ((value & 1) << 8));
        } else if (address < 0x6000) {
            this.ramBankIndex = value & 0xf;
        } else if (this.cartridge.externalMemory.isActive && address >= 0xa000 && address - 0xa000 < this.cartridge.getExternalRamSize()) {
            this.cartridge.externalMemory.writeByte(address - 0xa000 + this.getRamOffset(), value);
        }
    }

    switchRomBank(index) {
        if (this.romBankIndex != index) {
            this.romBankIndex = index;
            this.romBank = this.cartridge.readFromRom(this.romBank.length * index, this.romBank.length);
        }
    }

    getRamOffset() {
        return this.ramBankIndex * 0x2000;
    }
}

module.exports = MemoryBank5;
