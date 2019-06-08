const DmaManager = require('../dma/dmaManager');
const BufferUtils = require('../utils/bufferUtils');

class Memory {
    constructor(gameboy) {
        this.gameboy = gameboy;
        this.cartridge = gameboy.cartridge;

        this.register = null;
        this.keypad = null;
        this.gpu = null;
        this.timer = null;
        this.dmaManager = null;
        this.spu = null;

        this.internalRam = Buffer.alloc(0x1000);
        this.highInternalRam = Buffer.alloc(0x7f);
        this.internalSwitchableRam = Buffer.alloc(this.cartridge.isGameboyColour ? 0x7000 : 0x1000);

        this.internalRamBank = 1;
    }

    copy () {
        return {
            internalRam: BufferUtils.serialize(this.internalRam),
            highInternalRam: BufferUtils.serialize(this.highInternalRam),
            internalSwitchableRam: BufferUtils.serialize(this.internalSwitchableRam),
            internalRamBank: this.internalRamBank,
            dmaManager: this.dmaManager.copy(),
        };
    }

    restore (quickSaveData) {
        this.internalRam = BufferUtils.deserialize(quickSaveData.internalRam);
        this.highInternalRam = BufferUtils.deserialize(quickSaveData.highInternalRam);
        this.internalSwitchableRam = BufferUtils.deserialize(quickSaveData.internalSwitchableRam);
        this.internalRamBank = quickSaveData.internalRamBank;
        this.dmaManager.restore(quickSaveData.dmaManager);
    }

    initialize() {
        this.register = this.gameboy.register;
        this.keypad = this.gameboy.keypad;
        this.gpu = this.gameboy.gpu;
        this.timer = this.gameboy.timer;
        this.spu = this.gameboy.spu;

        this.dmaManager = new DmaManager(this.gameboy);
        this.dmaManager.initialize();
    }
    
    reset() {
        this.switchRamBank(1);
        this.dmaManager.reset();
    }

    shutdown() {
        this.dmaManager.shutdown();
    }

    getSwitchableRamOffset() {
        return this.cartridge.isGameboyColour ? (this.internalRamBank - 1) * 0x1000 : 0;
    }

    switchRamBank(bank) {
        this.internalRamBank = (bank || 1) & 7;
    }

    read16Bit(address) {
        return this.readBytes(address, 2).readUInt16LE(0);
    }

    readBytes(address, length) {
        const result = Buffer.alloc(length);
        for (let i = 0; i < length; i++) {
            result[i] = this.readByte(address + i);
        }

        return result;
    }

    readByte(address) {
        switch (address >> 12) {
            case 0x0: // rom (0x0000 -> 0x3FFF)
            case 0x1:
            case 0x2:
            case 0x3:
            case 0x4: // switchable rom (0x4000 -> 0x7FFF)
            case 0x5:
            case 0x6:
            case 0x7: {
                return this.cartridge.readByte(address);
            }

            case 0x8: // vram (0x8000 -> 0x9FFF)
            case 0x9: {
                return this.gpu.readVRam(address - 0x8000);
                break;
            }

            case 0xa: // switchable ram (0xA000 -> 0xBFFF)
            case 0xb: {
                return this.cartridge.readByte(address);
            }

            case 0xc: {
                // internal ram (0xC000 -> 0xCFFF)
                return this.internalRam[address - 0xc000];
            }

            case 0xd: {
                // internal switchable ram (0xD000 -> 0xDFFF)
                return this.internalSwitchableRam[address - 0xd000 + this.getSwitchableRamOffset()];
            }

            case 0xe: {
                // Echo internal ram (0xE000 -> 0xEFFF)
                return this.internalRam[address - 0xe000];
            }

            case 0xf: {
                switch (address & 0xff00) {
                    default: {
                        // Echo internal ram (0xF000 -> 0xFDFF)
                        return this.internalSwitchableRam[address - 0xe000 + this.getSwitchableRamOffset()];
                    }

                    case 0xfe00: {
                        if (address < 0xfea0) {
                            // OAM (0xFE00 -> 0xFE9F)
                            return this.gpu.readOam(address & 0xff);
                        } else {
                            // Empty (0xFEA0 -> 0xFEFF)
                            return 0x0;
                        }
                    }

                    case 0xff00: {
                        // IO (0xFF00 -> 0xFFFF)
                        if (address >= 0xff10 && address < 0xff40) {
                            return this.spu.readRegister(address);
                        }

                        switch (address & 0xff) {
                            case 0x00: {
                                return this.keypad.joyP;
                            }
                            // return _device.KeyPad.JoyP;
                            case 0x01: {
                                return 0x80; // TODO: serial
                            }
                            case 0x02: {
                                return 0xfe; // TODO: serial
                            }
                            case 0x04:
                            case 0x05:
                            case 0x06:
                            case 0x07: {
                                return this.timer.readRegister(address & 0xff);
                            }
                            case 0x0f: {
                                return this.register.IF;
                            }
                            case 0x40:
                            case 0x41:
                            case 0x42:
                            case 0x43:
                            case 0x44:
                            case 0x45:
                            case 0x47:
                            case 0x48:
                            case 0x49:
                            case 0x4a:
                            case 0x4b:
                            case 0x4f:
                            case 0x68:
                            case 0x69:
                            case 0x6a:
                            case 0x6b: {
                                return this.gpu.readRegister(address & 0xff);
                            }
                            case 0x4c: {
                                break;
                            }
                            case 0x4d: {
                                // (byte) ((_device.Cpu.DoubleSpeed ? (1 << 7) : 0) |
                                // (_device.Cpu.IsPreparingSpeedSwitch ? 1 : 0));
                                return 0 | 0;
                            }
                            case 0x70: {
                                return this.internalRamBank;
                            }
                            default: {
                                if (address < 0xff80) {
                                    return 0;
                                }

                                return this.highInternalRam[address - 0xff80];
                            }

                            case 0xff: {
                                return this.register.IE;
                            }
                        }
                    }
                }
            }
        }

        this.throwErr('Memory address ' + address + ' is not addressible.');
    }

    write16Bit(address, value) {
        const buffer = Buffer.alloc(2);
        buffer.writeUInt16LE(value);

        return this.writeBytes(address, buffer);
    }

    writeBytes(address, buffer) {
        for (let i = 0; i < buffer.length; i++) {
            this.writeByte(address + i, buffer[i]);
        }
    }

    writeByte(address, value) {
        switch (address >> 12) {
            case 0x0: // rom (0x0000 -> 0x3FFF)
            case 0x1:
            case 0x2:
            case 0x3:
            case 0x4: // switchable rom (0x4000 -> 0x7FFF)
            case 0x5:
            case 0x6:
            case 0x7: {
                this.cartridge.writeByte(address, value);
                break;
            }

            case 0x8: // vram (0x8000 -> 0x9FFF)
            case 0x9: {
                this.gpu.writeVRam(address - 0x8000, value);
                break;
            }

            case 0xa: // switchable ram (0xA000 -> 0xBFFF)
            case 0xb: {
                this.cartridge.writeByte(address, value);
                break;
            }

            case 0xc: {
                this.internalRam[address - 0xc000] = value;
                break;
            }

            case 0xd: {
                this.internalSwitchableRam[address - 0xD000 + this.getSwitchableRamOffset()] = value;
                break;
            }

            case 0xe: {
                this.internalRam[address - 0xe000] = value;
                break;
            }

            case 0xf: {
                if (address >= 0xff10 && address < 0xff40) {
                    this.spu.writeRegister(address, value);
                    break;
                }

                switch (address & 0xff00) {
                    default: {
                        this.internalSwitchableRam[address - 0xe000 + this.getSwitchableRamOffset()] = value;
                        break;
                    }

                    case 0xfe00: {
                        if (address < 0xfea0) {
                            this.gpu.writeOam(address & 0xff, value);
                            break;
                        }
                    }

                    case 0xff00: {
                        switch (address & 0xff) {
                            case 0x00: {
                                this.keypad.joyP = value;
                                break;
                            }
                            case 0x04:
                            case 0x05:
                            case 0x06:
                            case 0x07: {
                                this.timer.writeRegister(address & 0xff, value);
                                break;
                            }
                            case 0x0f: {
                                this.register.IF = 0xE0 | value;
                                break;
                            }
                            case 0x40:
                            case 0x41:
                            case 0x42:
                            case 0x43:
                            case 0x44:
                            case 0x45:
                            case 0x47:
                            case 0x48:
                            case 0x49:
                            case 0x4a:
                            case 0x4b:
                            case 0x4f:
                            case 0x68:
                            case 0x69:
                            case 0x6a:
                            case 0x6b: {
                                this.gpu.writeRegister(address & 0xff, value);
                                break;
                            }
                            case 0x46:
                            case 0x51:
                            case 0x52:
                            case 0x53:
                            case 0x54:
                            case 0x55: {
                                this.dmaManager.writeRegister(address, value);
                                break;
                            }
                            case 0x4d: {
                                break;
                            }
                            case 0x70: {
                                this.switchRamBank(value);
                                break;
                            }
                            default: {
                                if (address >= 0xff80) {
                                    this.highInternalRam[address - 0xff80] = value;
                                }
                                break;
                            }

                            case 0xff: {
                                this.register.IE = value;
                                break;
                            }
                        }
                    }
                }
            }
        }
    }

    readBlock(address, length) {
        let section = null;

        switch (address >> 12) {
            case 0x0: // rom (0x0000 -> 0x3FFF)
            case 0x1:
            case 0x2:
            case 0x3:
            case 0x4: // switchable rom (0x4000 -> 0x7FFF)
            case 0x5:
            case 0x6:
            case 0x7:
                return this.cartridge.readBytes(address, length);
            case 0x8: // vram (0x8000 -> 0x9FFF)
            case 0x9:
                throw new Error('No Implemented');

            case 0xa: // switchable ram (0xA000 -> 0xBFFF)
            case 0xb:
                return this.cartridge.readBytes(address, length);
                break;

            case 0xc: // internal ram (0xC000 -> 0xDFFF)
                section = this.internalRam;
                address -= 0xc000;
                break;
            case 0xd:
                section = this.internalSwitchableRam;
                address -= 0xd000;
                address += this.getSwitchableRamOffset();
                break;

            case 0xe: // Echo internal ram (0xE000 -> 0xEFFF)
                section = this.internalRam;
                address -= 0xe000;
                break;

            case 0xf:
                section = this.internalRam;
                address -= 0xe000;
                break;
        }

        if (section !== null) {
            return section.slice(address, address + length);
        }
    }

    throwErr(err) {
        throw new Error(err);
    }
}

module.exports = Memory;
