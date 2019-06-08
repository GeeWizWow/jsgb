const EventManager = require('../events/eventManager');
const BufferUtils = require('../utils/bufferUtils');
const LCD_STATUS = require('../constants/lcdStatus');
const INTERRUPT_FLAGS = require('../constants/interruptFlags');
const LCD_CONTROL = require('../constants/lcdControlFlags');
const SPRITE_DATA = require('../constants/spriteDataFlags');

const { readInt8 } = require('../utils/bufferUtils');

class Gpu {
    constructor(gameboy) {
        this.cartridge = gameboy.cartridge;
        this.gameboy = gameboy;
        this.cpu = null;
        this.register = null;

        this.scanLineOamCycles = 80;
        this.scanLineVramCycles = 172;
        this.hBlankCycles = 204;
        this.oneLineCycles = 456;
        this.frameHeight = 144;
        this.frameWidth = 160;
        this.fullFrameCycles = 70224;

        this.vram = new Uint8Array(this.cartridge.isGameboyColour ? 0x4000 : 0x2000);
        this.bgPaletteMemory = new Uint8Array(0x40, 0xff);
        this.spritePaletteMemory = new Uint8Array(0x40);
        this.oam = new Uint8Array(0xa0);
        this.frameIndices = new Uint8Array(this.frameWidth * this.frameHeight);
        this.frameBuffer = new Uint8Array(this.frameWidth * this.frameHeight * 4);

        this.greyshades = [[224, 248, 208], [136, 192, 112], [52, 104, 86], [8, 24, 32]];

        this.modeClock = 0;
        this._lcdc = 0x00;
        this.Stat = 0x00;
        this.ScY = 0x00;
        this.ScX = 0x00;
        this._ly = 0x00;
        this._lyc = 0x00;
        this.Bgp = 0x00;
        this.ObjP0 = 0x00;
        this.ObjP1 = 0x00;
        this.WY = 0x00;
        this.WX = 0x00;
        this.Vbk = 0x00;
        this.BgpI = 0x00;
        this.ObpI = 0x00;
        this._obpD = 0x00;

        this.onGpuHBlankStarted = new EventManager();
        this.onGpuVBlankStarted = new EventManager();
        this.onRenderFrame = new EventManager();
    }

    copy() {
        return {
            _lcdc: this._lcdc,
            Stat: this.Stat,
            ScY: this.ScY,
            ScX: this.ScX,
            _ly: this._ly,
            _lyc: this._lyc,
            Bgp: this.Bgp,
            ObjP0: this.ObjP0,
            ObjP1: this.ObjP1,
            WY: this.WY,
            WX: this.WX,
            Vbk: this.Vbk,
            BgpI: this.BgpI,
            ObpI: this.ObpI,
            _obpD: this._obpD,
            modeClock: this.modeClock,
            frameBuffer: BufferUtils.serialize(this.frameBuffer),
            vram: BufferUtils.serialize(this.vram),
            bgPaletteMemory: BufferUtils.serialize(this.bgPaletteMemory),
            spritePaletteMemory: BufferUtils.serialize(this.spritePaletteMemory),
            oam: BufferUtils.serialize(this.oam),
            frameIndices: BufferUtils.serialize(this.frameIndices),
        };
    }

    restore(quicksaveData) {
        this._lcdc = quicksaveData._lcdc;
        this.Stat = quicksaveData.Stat;
        this.ScY = quicksaveData.ScY;
        this.ScX = quicksaveData.ScX;
        this._ly = quicksaveData._ly;
        this._lyc = quicksaveData._lyc;
        this.Bgp = quicksaveData.Bgp;
        this.ObjP0 = quicksaveData.ObjP0;
        this.ObjP1 = quicksaveData.ObjP1;
        this.WY = quicksaveData.WY;
        this.WX = quicksaveData.WX;
        this.Vbk = quicksaveData.Vbk;
        this.BgpI = quicksaveData.BgpI;
        this.ObpI = quicksaveData.ObpI;
        this._obpD = quicksaveData._obpD;
        this.modeClock = quicksaveData.modeClock;
        this.frameBuffer = BufferUtils.deserialize(quicksaveData.frameBuffer);
        this.vram = BufferUtils.deserialize(quicksaveData.vram);
        this.bgPaletteMemory = BufferUtils.deserialize(quicksaveData.bgPaletteMemory);
        this.spritePaletteMemory = BufferUtils.deserialize(quicksaveData.spritePaletteMemory);
        this.oam = BufferUtils.deserialize(quicksaveData.oam);
        this.frameIndices = BufferUtils.deserialize(quicksaveData.frameIndices);
    };

    get Lcdc() {
        return this._lcdc;
    }

    set Lcdc(value) {
        if ((value & LCD_CONTROL.EnableLcd) == 0) {
            
            this.frameBuffer.fill(255);
            this.frameIndices = new Uint8Array(this.frameIndices.length);

            this.renderVideoFrame();

            this.LY = 0;
            this.switchMode(LCD_STATUS.HBlankMode);
            this.modeClock = 0;
        } else if ((this._lcdc & LCD_CONTROL.EnableLcd) == 0) {
            this.modeClock = 0;

            if (this.LY == this.LYC) {
                this.Stat |= LCD_STATUS.Coincidence;
            }
        }

        this._lcdc = value;
    }

    get LY() {
        return this._ly;
    }

    set LY(value) {
        if (this._ly != value) {
            this._ly = value;
            this.checkCoincidenceInterrupt();
        }
    }

    get LYC() {
        return this._lyc;
    }

    set LYC(value) {
        if (this._lyc != value) {
            this._lyc = value;
            this.checkCoincidenceInterrupt();
        }
    }

    get BgpD() {
        return this.bgPaletteMemory[this.BgpI & 0x3f];
    }

    set BgpD(value) {
        this.bgPaletteMemory[this.BgpI & 0x3f] = value;

        if ((this.BgpI & 0x80) != 0) {
            this.BgpI = 0x80 | ((this.BgpI + 1) & 0x3F);
        }
    }

    get ObpD() {
        return this._obpD;
    }

    set ObpD(value) {
        this.spritePaletteMemory[this.ObpI & 0x3f] = value;

        if ((this.ObpI & 0x80) != 0) {
            this.ObpI++;
        }
    }

    initialize() {
        this.cpu = this.gameboy.cpu;
        this.register = this.gameboy.register;
        this.cpu.onCpuStep.register(this.onCpuStep.bind(this));
    }

    shutdown() {
        this.cpu.onCpuStep.remove(this.onCpuStep);
    }

    reset() {
        this.modeClock = 0;
        this.LY = 0;
        this.ScY = 0;
        this.ScX = 0;
        this.Stat = 0x85;
        this.Lcdc = 0x91;
        this.ScY = 0;
        this.ScX = 0;
        this.Lyc = 0;
        this.Bgp = 0xfc;
        this.ObjP0 = 0xff;
        this.ObjP1 = 0xff;
        this.WY = 0;
        this.WX = 0;

        this.vram = new Uint8Array(this.vram.length);
        this.bgPaletteMemory = new Uint8Array(this.bgPaletteMemory.length).fill(0xff);
    }

    renderScan() {
        if ((this._lcdc & LCD_CONTROL.EnableBackground) == LCD_CONTROL.EnableBackground) {
            this.renderBackgroundScan();
        }

        if ((this._lcdc & LCD_CONTROL.EnableWindow) == LCD_CONTROL.EnableWindow) {
            this.renderWindowScan();
        }

        if ((this._lcdc & LCD_CONTROL.EnableSprites) == LCD_CONTROL.EnableSprites) {
            this.renderSpritesScan();
        }
    }

    renderBackgroundScan() {
        // Move to correct tile map address.
        let tileMapAddress = (this._lcdc & LCD_CONTROL.BgTileMapSelect) == LCD_CONTROL.BgTileMapSelect ? 0x1c00 : 0x1800;

        const tileMapLine = ((this.LY + this.ScY) & 0xff) >> 3;

        tileMapAddress += tileMapLine * 0x20;

        // Move to correct tile data address.
        const tileDataAddress = (this._lcdc & LCD_CONTROL.BgWindowTileDataSelect) == LCD_CONTROL.BgWindowTileDataSelect ? 0x0000 : 0x0800;

        const tileDataOffset = ((this.LY + this.ScY) & 7) * 2;
        const flippedTileDataOffset = 14 - tileDataOffset;

        let x = this.ScX;

        // Read first tile data to render.
        let flags;

        if (this.cartridge.isGameboyColour) {
            flags = this.getTileDataFlags(tileMapAddress, (x >> 3) & 0x1f);
        } else {
            flags = 0;
        }

        let currentTileData = this.copyTileData(
            tileMapAddress,
            (x >> 3) & 0x1f,
            tileDataAddress + ((flags & SPRITE_DATA.YFlip) != 0 ? flippedTileDataOffset : tileDataOffset),
            flags,
        );

        // Render scan line.
        for (let outputX = 0; outputX < this.frameWidth; outputX++, x++) {
            if ((x & 7) == 0) {
                // Read next tile data to render.
                if (this.cartridge.isGameboyColour) {
                    flags = this.getTileDataFlags(tileMapAddress, (x >> 3) & 0x1f);
                }

                currentTileData = this.copyTileData(
                    tileMapAddress,
                    (x >> 3) & 0x1f,
                    tileDataAddress + ((flags & SPRITE_DATA.YFlip) != 0 ? flippedTileDataOffset : tileDataOffset),
                    flags,
                );
            }

            this.renderTileDataPixel(currentTileData, flags, outputX, x);
        }
    }

    renderTileDataPixel(currentTileData, flags, outputX, localX) {
        if (this.cartridge.isGameboyColour) {
            // TODO: support other flags.
            let actualX = localX & 7;

            // Horizontal flip when specified.
            if ((flags & SPRITE_DATA.XFlip) != 0) {
                actualX = 7 - actualX;
            }

            const paletteIndex = flags & SPRITE_DATA.PaletteNumberMask;
            const colorIndex = this.getPixelColorIndex(actualX, currentTileData);

            this.renderPixel(outputX, this.LY, colorIndex, this.getGbcColor(this.bgPaletteMemory, paletteIndex, colorIndex));
        } else {
            const colorIndex = this.getPixelColorIndex(localX & 7, currentTileData);
            const greyshadeIndex = this.getGreyshadeIndex(this.Bgp, colorIndex);

            this.renderPixel(outputX, this.LY, colorIndex, this.greyshades[greyshadeIndex]);
        }
    }

    renderWindowScan() {
        if (this.LY >= this.WY) {
            // Move to correct tile map address.
            let tileMapAddress = (this._lcdc & LCD_CONTROL.WindowTileMapSelect) == LCD_CONTROL.WindowTileMapSelect ? 0x1c00 : 0x1800;

            const tileMapLine = ((this.LY - this.WY) & 0xff) >> 3;
            tileMapAddress += tileMapLine * 0x20;

            // Move to correct tile data address.
            const tileDataAddress = (this._lcdc & LCD_CONTROL.BgWindowTileDataSelect) == LCD_CONTROL.BgWindowTileDataSelect ? 0x0000 : 0x0800;

            const tileDataOffset = ((this.LY - this.WY) & 7) * 2;
            const flippedTileDataOffset = 14 - tileDataOffset;

            let x = 0;
            let flags = SPRITE_DATA.None;
            let currentTileData = new Uint8Array(2);

            // Render scan line.
            for (let outputX = this.WX - 7; outputX < this.frameWidth; outputX++, x++) {
                if ((x & 7) == 0) {
                    // Read next tile data to render.
                    if (this.cartridge.isGameboyColour) {
                        flags = this.getTileDataFlags(tileMapAddress, x >> 3 & 0x1f);
                    }

                    currentTileData = this.copyTileData(
                        tileMapAddress,
                        x >> 3 & 0x1f,
                        tileDataAddress + ((flags & SPRITE_DATA.YFlip) != 0 ? flippedTileDataOffset : tileDataOffset),
                        flags,
                    );
                }

                if (outputX >= 0) {
                    this.renderTileDataPixel(currentTileData, flags, outputX, x);
                }
            }
        }
    }

    renderSpritesScan() {
        const spriteHeight = (this.Lcdc & LCD_CONTROL.Sprite8By16Mode) != 0 ? 16 : 8;

        // GameBoy only supports 10 sprites in one scan line.
        let spritesCount = 0;

        for (let i = 0; i < 40 && spritesCount < 10; i++) {
            const data = this.getSpriteData(this.oam, i);
            const absoluteY = data.y - 16;

            // Check if sprite is on current scan line.
            if (absoluteY <= this.LY && this.LY < absoluteY + spriteHeight) {
                // TODO: take order into account.
                spritesCount++;

                // Check if actually on the screen.
                if (data.x > 0 && data.x < this.frameWidth + 8) {
                    // Read tile data.
                    let rowIndex = this.LY - absoluteY;

                    // Flip sprite vertically if specified.
                    if ((data.flags & SPRITE_DATA.YFlip) == SPRITE_DATA.YFlip) {
                        rowIndex = spriteHeight - 1 - rowIndex;
                    }

                    // Read tile data.
                    const vramBankOffset = this.cartridge.isGameboyColour && (data.flags & SPRITE_DATA.TileVramBank) != 0 ? 0x2000 : 0x0000;
                    const address = vramBankOffset + (data.tileDataIndex << 4) + rowIndex * 2;
                    const currentTileData = this.vram.slice(address, address + 2);

                    // Render sprite.
                    for (let x = 0; x < 8; x++) {
                        let absoluteX = data.x - 8;

                        // Flip sprite horizontally if specified.
                        absoluteX += (data.flags & SPRITE_DATA.XFlip) != SPRITE_DATA.XFlip ? x : 7 - x;

                        // Check if in frame and sprite is above or below background.
                        if (
                            absoluteX >= 0 &&
                            absoluteX < this.frameWidth &&
                            ((data.flags & SPRITE_DATA.BelowBackground) == 0 || this.getRenderedColorIndex(absoluteX, this.LY) == 0)
                        ) {
                            const colorIndex = this.getPixelColorIndex(x, currentTileData);

                            // Check if not transparent.
                            if (colorIndex != 0) {
                                if (this.cartridge.isGameboyColour) {
                                    const paletteIndex = data.flags & SPRITE_DATA.PaletteNumberMask;
                                    this.renderPixel(absoluteX, this.LY, colorIndex, this.getGbcColor(this.spritePaletteMemory, paletteIndex, colorIndex));
                                } else {
                                    const palette = (data.flags & SPRITE_DATA.UsePalette1) == SPRITE_DATA.UsePalette1 ? this.ObjP1 : this.ObjP0;

                                    const greyshadeIndex = this.getGreyshadeIndex(palette, colorIndex);
                                    this.renderPixel(absoluteX, this.LY, colorIndex, this.greyshades[greyshadeIndex]);
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    copyTileData(tileMapAddress, tileIndex, tileDataAddress, flags) {
        let dataIndex = readInt8(this.vram, tileMapAddress + tileIndex);

        if ((this._lcdc & LCD_CONTROL.BgWindowTileDataSelect) != LCD_CONTROL.BgWindowTileDataSelect) {
            // Index is signed number in [-128..127] => compensate for it.
            dataIndex = dataIndex + 0x80;
        }

        const bankOffset = (flags & SPRITE_DATA.TileVramBank) != 0 ? 0x2000 : 0x0000;
        const addr = bankOffset + tileDataAddress + (dataIndex << 4);
        return this.vram.slice(addr, addr + 2);
    }

    onCpuStep(cycles) {
        if ((this._lcdc & LCD_CONTROL.EnableLcd) == 0) {
            return;
        }

        this.modeClock += cycles;

        let stat = this.Stat;
        let currentMode = stat & LCD_STATUS.ModeMask;

        switch (currentMode) {
            case LCD_STATUS.ScanLineOamMode: {
                if (this.modeClock >= this.scanLineOamCycles) {
                    this.modeClock -= this.scanLineOamCycles;
                    currentMode = LCD_STATUS.ScanLineVRamMode;
                }
                break;
            }

            case LCD_STATUS.ScanLineVRamMode: {
                if (this.modeClock >= this.scanLineVramCycles) {
                    this.modeClock -= this.scanLineVramCycles;
                    currentMode = LCD_STATUS.HBlankMode;

                    if ((stat & LCD_STATUS.HBlankModeInterrupt) == LCD_STATUS.HBlankModeInterrupt) {
                        this.register.IF |= INTERRUPT_FLAGS.LCDSTAT;
                    }

                    this.onHBlankStarted();
                    this.renderScan();
                }
                break;
            }

            case LCD_STATUS.HBlankMode: {
                if (this.modeClock >= this.hBlankCycles) {
                    this.modeClock -= this.hBlankCycles;
                    this.LY++;

                    if (this.LY == this.frameHeight) {
                        currentMode = LCD_STATUS.VBlankMode;

                        this.onVBlankStarted();
                        this.renderVideoFrame();
                        this.register.IF |= INTERRUPT_FLAGS.VBLANK;

                        if ((stat & LCD_STATUS.VBlankModeInterrupt) == LCD_STATUS.VBlankModeInterrupt) {
                            this.register.IF |= INTERRUPT_FLAGS.LCDSTAT;
                        }
                    } else {
                        currentMode = LCD_STATUS.ScanLineOamMode;
                    }
                }
                break;
            }

            case LCD_STATUS.VBlankMode: {
                if (this.modeClock >= this.oneLineCycles) {
                    this.modeClock -= this.oneLineCycles;
                    this.LY++;

                    if (this.LY > this.frameHeight + 9) {
                        currentMode = LCD_STATUS.ScanLineOamMode;
                        this.LY = 0;

                        if ((stat & LCD_STATUS.OamBlankModeInterrupt) == LCD_STATUS.OamBlankModeInterrupt) {
                            this.register.IF |= INTERRUPT_FLAGS.LCDSTAT;
                        }
                    }
                }
                break;
            }
        }

        stat &= ~0b111;
        stat |= currentMode;

        if (this.LY == this.LYC) {
            stat |= LCD_STATUS.Coincidence;
        }

        this.Stat = stat;
    }

    getSpriteData(arr, index) {
        const addr = index * 4;
        return {
            y: arr[addr],
            x: arr[addr + 1],
            tileDataIndex: arr[addr + 2],
            flags: arr[addr + 3],
        };
    }

    readVRam(address) {
        return this.vram[address + this.getVRamOffset()];
    }

    writeVRam(address, value) {
        this.vram[address + this.getVRamOffset()] = value;
    }

    writeVRamBlock(address, buffer) {
        this.vram.set(buffer, address + this.getVRamOffset());
    }

    readOam(address) {
        return this.oam[address];
    }

    writeOam(address, value) {
        this.oam[address] = value;
    }

    importOam(oamData) {
        this.oam = new Uint8Array(oamData);
    }

    readRegister(address) {
        switch (address) {
            case 0x40:
                return this.Lcdc;
            case 0x41:
                return this.Stat;
            case 0x42:
                return this.ScY;
            case 0x43:
                return this.ScX;
            case 0x44:
                return this.LY;
            case 0x45:
                return this.LYC;
            case 0x47:
                return this.Bgp;
            case 0x48:
                return this.ObjP0;
            case 0x49:
                return this.ObjP1;
            case 0x4a:
                return this.WY;
            case 0x4b:
                return this.WX;
            case 0x4f:
                return this.Vbk;
            case 0x68:
                return this.BgpI;
            case 0x69:
                return this.BgpD;
            case 0x6a:
                return this.ObpI;
            case 0x6b:
                return this.ObpD;
        }
    }

    writeRegister(address, value) {
        switch (address) {
            case 0x40:
                this.Lcdc = value;
                return;
            case 0x41:
                this.Stat = (this.Stat & 0b111) | (value & 0b01111000);
                return;
            case 0x42:
                this.ScY = value;
                return;
            case 0x43:
                this.ScX = value;
                return;
            case 0x44:
                this.LY = value;
                return;
            case 0x45:
                this.LYC = value;
                return;
            case 0x47:
                this.Bgp = value;
                return;
            case 0x48:
                this.ObjP0 = value;
                return;
            case 0x49:
                this.ObjP1 = value;
                return;
            case 0x4a:
                this.WY = value;
                return;
            case 0x4b:
                this.WX = value;
                return;
            case 0x4f:
                this.Vbk = value & 1;
                return;
            case 0x68:
                this.BgpI = value;
                return;
            case 0x69:
                this.BgpD = value;
                return;
            case 0x6a:
                this.ObpI = value;
                return;
            case 0x6b:
                this.ObpD = value;
                return;
        }
    }

    getVRamOffset() {
        return this.cartridge.isGameboyColour ? 0x2000 * this.Vbk : 0;
    }

    switchMode(mode) {
        this.Stat = (this.Stat & ~LCD_STATUS.ModeMask) | mode;
    }

    onHBlankStarted() {
        this.onGpuHBlankStarted.invoke();
    }

    onVBlankStarted() {
        this.onGpuVBlankStarted.invoke();
    }

    getTileDataFlags(tileMapAddress, tileIndex) {
        return this.vram[0x2000 + tileMapAddress + tileIndex];
    }

    checkCoincidenceInterrupt() {
        if (this.LY == this.LYC && (this.Stat & LCD_STATUS.CoincidenceInterrupt) != 0) {
            this.register.IF |= INTERRUPT_FLAGS.LCDSTAT;
        }
    }

    getRenderedColorIndex(x, y) {
        return this.frameIndices[y * this.frameWidth + x];
    }

    getPixelColorIndex(x, tileRowData) {
        const bitIndex = 7 - (x & 7);
        const paletteIndex = ((tileRowData[0] >> bitIndex) & 1) | (((tileRowData[1] >> bitIndex) & 1) << 1);

        return paletteIndex;
    }

    getGreyshadeIndex(palette, paletteIndex) {
        return (palette >> (paletteIndex * 2)) & 3;
    }

    getGbcColor(paletteMemory, paletteIndex, colorIndex) {
        const rawValue = paletteMemory[paletteIndex * 8 + colorIndex * 2] | (paletteMemory[paletteIndex * 8 + colorIndex * 2 + 1] << 8);
        return [
            (rawValue & 0x1f) * 8, 
            ((rawValue >> 5) & 0x1f) * 8, 
            ((rawValue >> 10) & 0x1f) * 8,
        ];
    }

    renderPixel(x, y, colorIndex, color) {
        this.frameIndices[y * this.frameWidth + x] = colorIndex;

        this.frameBuffer[((y * this.frameWidth + x) * 4) + 0] = color[0];
        this.frameBuffer[((y * this.frameWidth + x) * 4) + 1] = color[1];
        this.frameBuffer[((y * this.frameWidth + x) * 4) + 2] = color[2];
        this.frameBuffer[((y * this.frameWidth + x) * 4) + 3] = 255; // alpha
    }

    renderVideoFrame() {
        this.onRenderFrame.invoke(this.frameBuffer);
    }
}

module.exports = Gpu;
