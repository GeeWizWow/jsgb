const BufferUtils = require('../../utils/bufferUtils');

class MemoryBank1 {
    constructor(cartridge) {
        this.cartridge = cartridge;

        this.romBankIndex = 0;
        this.ramBankIndex = 0;
        this.romRamMode = false;

        this.ramEnabled = false;
        this.romBank = new Uint8Array(0x4000);
    }

    copy() {
        return {
            romBankIndex: this.romBankIndex,
            ramBankIndex: this.ramBankIndex,
            romRamMode: this.romRamMode,
            ramEnabled: this.ramEnabled,
            romBank: BufferUtils.serialize(this.romBank),
        };
    }

    restore(quicksaveData) {
        this.romBankIndex = quicksaveData.romBankIndex;
        this.ramBankIndex = quicksaveData.ramBankIndex;
        this.romRamMode = quicksaveData.romRamMode;
        this.ramEnabled = quicksaveData.ramEnabled;
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
        } else if (address < 0x4000) {
            this.switchRomBank(value & 0x1f);
        } else if (address < 0x6000) {
            this.switchRamBank(value & 0x3);
        } else if (address < 0x8000) {
            this.switchRomRamMode(value);
        } else if (this.cartridge.externalMemory.isActive && address >= 0xa000 && address - 0xa000 < this.cartridge.getExternalRamSize()) {
            this.cartridge.externalMemory.writeByte(address - 0xa000 + this.getRamOffset(), value);
        }
    }

    switchRomRamMode(value) {
        const romRamMode = value == 1;
        if (this.romRamMode != romRamMode) {
            this.romRamMode = romRamMode;
            this.updateRomBank();
        }
    }

    switchRamBank(index) {
        if (this.ramBankIndex != index) {
            this.ramBankIndex = index;
            this.updateRomBank();
        }
    }

    switchRomBank(index) {
        if (this.romBankIndex != index) {
            if (index == 0 || index == 0x20 || index == 0x40 || index == 0x60) {
                index++;
            }
            this.romBankIndex = index;
            this.updateRomBank();
        }
    }

    updateRomBank() {
        let index = this.romBankIndex;

        if (this.romRamMode) {
            index |= this.ramBankIndex << 5;
        }

        this.romBank = this.cartridge.readFromRom(this.romBank.length * index, this.romBank.length);
    }

    getRamOffset() {
        return this.ramBankIndex * 0x2000;
    }
}

module.exports = MemoryBank1;
