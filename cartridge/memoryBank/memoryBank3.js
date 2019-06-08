const BufferUtils = require('../../utils/bufferUtils');

class MemoryBank3 {
    constructor(cartridge) {
        this.cartridge = cartridge;

        this.romBank = new Uint8Array(0x4000);
        this.romBankIndex = 0;
        this.ramBankOrRtcIndex = 0;
        this.rtc = new Uint8Array(5);
    }

    copy() {
        return {
            romBankIndex: this.romBankIndex,
            romBank: BufferUtils.serialize(this.romBank),
            ramBankOrRtcIndex: this.ramBankOrRtcIndex,
            rtc: BufferUtils.serialize(this.rtc),
        };
    }

    restore(quicksaveData) {
        this.romBankIndex = quicksaveData.romBankIndex;
        this.romBank = BufferUtils.deserialize(quicksaveData.romBank);
        this.ramBankOrRtcIndex = quicksaveData.ramBankOrRtcIndex;
        this.rtc = BufferUtils.deserialize(quicksaveData.rtc);
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

        if (this.cartridge.externalMemory.isActive && address >= 0xa000 && address < 0xc000) {
            return this.readRamOrRtc(address);
        }

        return 0;
    }

    readRamOrRtc(address) {
        if (this.ramBankOrRtcIndex <= 3) {
            if (this.cartridge.hasRam) {
                return this.cartridge.externalMemory.readByte(address - 0xa000 + this.getRamOffset());
            } else {
                return 0;
            }
        } else {
            if (this.cartridge.hasTimer) {
                return this.rtc[this.ramBankOrRtcIndex - 0x8];
            } else {
                return 0;
            }
        }
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
            this.switchRomBank(value & 0x7f);
        } else if (address < 0x6000) {
            this.ramBankOrRtcIndex = value & 3;
        } else if (address < 0x8000) {
            // TODO: latch clock data
        } else if (this.cartridge.externalMemory.isActive && address >= 0xa000 && address - 0xa000 < this.cartridge.getExternalRamSize()) {
            this.cartridge.externalMemory.writeByte(address - 0xa000 + this.getRamOffset(), value);
        }
    }

    switchRomBank(index) {
        if (this.romBankIndex != index) {
            if (index == 0) {
                index++;
            }

            this.romBankIndex = index & 0x7f;
            this.updateRomBank();
        }
    }

    updateRomBank() {
        this.romBank = this.cartridge.readFromRom(this.romBank.length * this.romBankIndex, this.romBank.length);
    }

    getRamOffset() {
        return this.ramBankOrRtcIndex * 0x2000;
    }
}

module.exports = MemoryBank3;
