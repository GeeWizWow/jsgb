const { trimBufferEnd } = require('../utils/bufferUtils');

const RomOnlyMemoryBank = require('./memoryBank/romOnly');
const MemoryBank1 = require('./memoryBank/memoryBank1');
const MemoryBank2 = require('./memoryBank/memoryBank2');
const MemoryBank3 = require('./memoryBank/memoryBank3');
const MemoryBank5 = require('./memoryBank/memoryBank5');

class Cartridge {
    constructor(buffer, externalMemory) {
        this.rom = buffer;
        this.externalMemory = externalMemory;
        this.memory = this.getMemoryBankController();
    }

    initialize() {
        this.externalMemory.initialize(this);
        this.memory.initialize();
    }

    reset() {
        this.memory.reset();
    }

    shutdown() {
        this.memory.shutdown();
    }

    copy() {
        return {
            externalMemory: this.externalMemory.copy(),
            memoryBank: this.memory.copy(),
        };
    }

    restore(quicksaveData) {
        this.externalMemory.restore(quicksaveData.externalMemory);
        this.memory.restore(quicksaveData.memoryBank);
    }

    getMemoryBankController() {
        if (this.isRom) {
            return new RomOnlyMemoryBank(this);
        } else if (this.isMbc1) {
            return new MemoryBank1(this);
        } else if (this.isMbc2) {
            return new MemoryBank2(this);
        } else if (this.isMbc3) {
            return new MemoryBank3(this);
        } else if (this.isMbc5) {
            return new MemoryBank5(this);
        }
    }

    get gameboyTypes() {
        return {
            gameboy: 0x00,
            gameboyColour: 0x80,
        };
    }

    get isGameboy() {
        return this.getColour() === this.gameboyTypes.gameboy;
    }

    get isGameboyColour() {
        return this.getColour() === this.gameboyTypes.gameboyColour;
    }

    get cartridgeTypes() {
        return {
            romOnly: 0x00,
            mbc1: 0x01,
            mbc1Ram: 0x02,
            mbc1RamBattery: 0x03,
            mbc2: 0x05,
            mbc2Battery: 0x06,
            romRam: 0x8,
            romRamBattery: 0x9,
            mmm01: 0xb,
            mmm01Ram: 0xc,
            mmm01RamBattery: 0xd,
            mbc3TimerBattery: 0xf,
            mbc3TimerRamBattery: 0x10,
            mbc3: 0x11,
            mbc3Ram: 0x12,
            mbc3RamBattery: 0x13,
            mbc4: 0x15,
            mbc4Ram: 0x16,
            mbc4RamBattery: 0x17,
            mbc5: 0x19,
            mbc5Ram: 0x1a,
            mbc5RamBattery: 0x1b,
            mbc5Rumble: 0x1c,
            mbc5RumbleRam: 0x1d,
            mbc5RumbleRamBattery: 0x1e,
            pocketCamera: 0xfc,
            bandaiTama5: 0xfd,
            huC3: 0xfe,
            huC1RamBattery: 0xff,
        };
    }

    get isRom() {
        switch (this.getCartridgeType()) {
            case this.cartridgeTypes.romOnly:
            case this.cartridgeTypes.romRam:
            case this.cartridgeTypes.romRamBattery:
                return true;
        }

        return false;
    }

    get isMbc1() {
        switch (this.getCartridgeType()) {
            case this.cartridgeTypes.mbc1:
            case this.cartridgeTypes.mbc1Ram:
            case this.cartridgeTypes.mbc1RamBattery:
                return true;
        }

        return false;
    }

    get isMbc2() {
        switch (this.getCartridgeType()) {
            case this.cartridgeTypes.mbc2:
            case this.cartridgeTypes.mbc2Battery:
                return true;
        }

        return false;
    }

    get isMbc3() {
        switch (this.getCartridgeType()) {
            case this.cartridgeTypes.mbc3TimerBattery:
            case this.cartridgeTypes.mbc3TimerRamBattery:
            case this.cartridgeTypes.mbc3:
            case this.cartridgeTypes.mbc3Ram:
            case this.cartridgeTypes.mbc3RamBattery:
                return true;
        }

        return false;
    }

    get isMbc4() {
        switch (this.getCartridgeType()) {
            case this.cartridgeTypes.mbc4:
            case this.cartridgeTypes.mbc4Ram:
            case this.cartridgeTypes.mbc4RamBattery:
                return true;
        }

        return false;
    }

    get isMbc5() {
        switch (this.getCartridgeType()) {
            case this.cartridgeTypes.mbc5:
            case this.cartridgeTypes.mbc5Ram:
            case this.cartridgeTypes.mbc5RamBattery:
            case this.cartridgeTypes.mbc5Rumble:
            case this.cartridgeTypes.mbc5RumbleRam:
            case this.cartridgeTypes.mbc5RumbleRamBattery:
                return true;
        }

        return false;
    }

    get hasRam() {
        switch (this.getCartridgeType()) {
            case this.cartridgeTypes.mbc1Ram:
            case this.cartridgeTypes.mbc3Ram:
            case this.cartridgeTypes.mbc3RamBattery:
            case this.cartridgeTypes.mbc3TimerRamBattery:
            case this.cartridgeTypes.mbc4Ram:
            case this.cartridgeTypes.mbc4RamBattery:
            case this.cartridgeTypes.mbc5Ram:
            case this.cartridgeTypes.mbc5RamBattery:
            case this.cartridgeTypes.mbc5RumbleRam:
            case this.cartridgeTypes.mbc5RumbleRamBattery:
            case this.cartridgeTypes.huC1RamBattery:
            case this.cartridgeTypes.romRam:
            case this.cartridgeTypes.mmm01Ram:
            case this.cartridgeTypes.mmm01RamBattery:
                return true;
        }

        return false;
    }

    get hasBattery() {
        switch (this.getCartridgeType()) {
            case this.cartridgeTypes.romRamBattery:
            case this.cartridgeTypes.mbc1RamBattery:
            case this.cartridgeTypes.mbc2Battery:
            case this.cartridgeTypes.mbc3RamBattery:
            case this.cartridgeTypes.mbc3TimerBattery:
            case this.cartridgeTypes.mbc3TimerRamBattery:
            case this.cartridgeTypes.mbc4RamBattery:
            case this.cartridgeTypes.mbc5RamBattery:
            case this.cartridgeTypes.mmm01RamBattery:
            case this.cartridgeTypes.huC1RamBattery:
                return true;
        }

        return false;
    }

    get hasTimer() {
        switch (this.getCartridgeType()) {
            case this.cartridgeTypes.mbc3TimerBattery:
            case this.cartridgeTypes.mbc3TimerRamBattery:
                return true;
        }

        return false;
    }

    get hasRumble() {
        switch (this.getCartridgeType()) {
            case this.cartridgeTypes.mbc5Rumble:
            case this.cartridgeTypes.mbc5RumbleRam:
            case this.cartridgeTypes.mbc5RumbleRamBattery:
                return true;
        }

        return false;
    }

    getCodeBeginExecutionPoint() {
        /*
        0100-0103  
        This is the begin code execution point in a cart. 
        Usually there is a NOP and a JP instruction here but not always.
        */

        const offsetStart = 0x100;
        const offsetEnd = 0x103 + 1;
        const beginCodeExecutionPoint = this.rom.slice(offsetStart, offsetEnd);

        return beginCodeExecutionPoint;
    }

    getTitle() {
        /*
        0134-0142  
        Title of the game in UPPER CASE ASCII. 
        If it is less than 16 characters then the remaining bytes are filled with 00's.
        */

        const offsetStart = 0x134;
        const offsetEnd = 0x142 + 1;
        const nameBuffer = trimBufferEnd(this.rom.slice(offsetStart, offsetEnd));

        return nameBuffer;
    }

    getColour() {
        /*
        0143       
        $80 = Color GB, $00 or other = not Color GB
        */

        const addr = 0x143;
        const type = this.rom[addr];

        return type;
    }

    getCartridgeType() {
        /*
        0147       
        0 - ROM ONLY                12 - ROM+MBC3+RAM
        1 - ROM+MBC1                13 - ROM+MBC3+RAM+BATT
        2 - ROM+MBC1+RAM            19 - ROM+MBC5
        3 - ROM+MBC1+RAM+BATT       1A - ROM+MBC5+RAM
        5 - ROM+MBC2                1B - ROM+MBC5+RAM+BATT
        6 - ROM+MBC2+BATTERY        1C - ROM+MBC5+RUMBLE
        8 - ROM+RAM                 1D - ROM+MBC5+RUMBLE+SRAM
        9 - ROM+RAM+BATTERY         1E - ROM+MBC5+RUMBLE+SRAM+BATT
        B - ROM+MMM01               1F - Pocket Camera
        C - ROM+MMM01+SRAM          FD - Bandai TAMA5
        D - ROM+MMM01+SRAM+BATT     FE - Hudson HuC-3
        F - ROM+MBC3+TIMER+BATT     FF - Hudson HuC-1
        10 - ROM+MBC3+TIMER+RAM+BATT
        11 - ROM+MBC3
        */

        const addr = 0x147;
        const type = this.rom[addr];

        return type;
    }

    getDestinationCode() {
        /*
        014A       
        Destination code:
        0 - Japanese
        1 - Non-Japanese
        */

        const addr = 0x14a;
        const code = this.rom[addr];

        return code;
    }

    getNintendoLogo() {
        /*
        0104-0133  
        Scrolling Nintendo graphic:
        CE ED 66 66 CC 0D 00 0B 03 73 00 83 00 0C 00 0D
        00 08 11 1F 88 89 00 0E DC CC 6E E6 DD DD D9 99
        BB BB 67 63 6E 0E EC CC DD DC 99 9F BB B9 33 3E
        ( PROGRAM WON'T RUN IF CHANGED!!!)
        */

        const offsetStart = 0x104;
        const offsetEnd = 0x133 + 1;
        const logoBuffer = this.rom.slice(offsetStart, offsetEnd);

        return logoBuffer;
    }

    getExternalRamSize() {
        /*
        0149       
        RAM size:
        0 - None
        1 -  16kBit =  2kB = 1 bank
        2 -  64kBit =  8kB = 1 bank
        3 - 256kBit = 32kB = 4 banks
        4 -   1MBit =128kB =16 banks
        */

        const addr = 0x149;

        switch (this.rom[addr])
        {
            case 1:
                return 0x800;
            case 2:
                return 0x2000;
            case 3:
                return 0x8000;
        }

        return 0;
    }

    readFromRom(address, length) {
        return this.rom.slice(address, address + length);
    }

    readByteFromRom(address) {
        return this.rom[address];
    }

    readByte(addr) {
        return this.memory.readByte(addr);
    }

    readBytes(startAddr, length) {
        return this.memory.readBytes(startAddr, length);
    }

    writeByte(address, value) {
        this.memory.writeByte(address, value);
    }
}

module.exports = Cartridge;
