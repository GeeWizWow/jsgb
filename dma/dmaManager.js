class DmaManager {
    constructor(gameboy) {
        this.gameboy = gameboy;
        this.memory = null;
        this.gpu = null;

        this.isTransferring = false;
        this.currentBlockIndex = 0;
        this.sourceHigh = 0x00;
        this.sourceLow = 0x00;
        this.destinationHigh = 0x00;
        this.destinationLow = 0x00;
        this.dmaLengthMode = 0x00;
    }

    copy () {
        return {
            isTransferring: this.isTransferring,
            currentBlockIndex: this.currentBlockIndex,
            sourceHigh: this.sourceHigh,
            sourceLow: this.sourceLow,
            destinationHigh: this.destinationHigh,
            destinationLow: this.destinationLow,
            dmaLengthMode: this.dmaLengthMode,
        };
    }

    restore(quicksaveData) {
        this.isTransferring = quicksaveData.isTransferring;
        this.currentBlockIndex = quicksaveData.currentBlockIndex;
        this.sourceHigh = quicksaveData.sourceHigh;
        this.sourceLow = quicksaveData.sourceLow;
        this.destinationHigh = quicksaveData.destinationHigh;
        this.destinationLow = quicksaveData.destinationLow;
        this.dmaLengthMode = quicksaveData.dmaLengthMode;
    }

    get sourceAddress() {
        return (this.sourceHigh << 8) | (this.sourceLow & 0xf0);
    }

    get destinationAddress() {
        return 0x8000 | ((this.destinationHigh & 0x1f) << 8) | (this.destinationLow & 0xf0);
    }

    get length() {
        return ((this.dmaLengthMode & 0x7f) + 1) * 0x10;
    }

    initialize() {
        this.memory = this.gameboy.memory;
        this.gpu = this.gameboy.gpu;
        this.gpu.onGpuHBlankStarted.register(this.onGpuHBlankStarted.bind(this));
    }

    shutdown() {
        this.gpu.onGpuHBlankStarted.remove(this.onGpuHBlankStarted);
    }

    reset() {
        this.isTransferring = false;
        this.currentBlockIndex = 0;
        this.sourceHigh = 0;
        this.sourceLow = 0;
        this.destinationHigh = 0;
        this.destinationLow = 0;
        this.dmaLengthMode = 0;
    }

    // EVENT listener
    onGpuHBlankStarted() {
        if (this.isTransferring && this.gpu.LY < this.gpu.frameHeight) {
            this.hDmaStep();
        }
    }

    readRegister(address) {
        switch (address) {
            case 0xff46:
                return 0;
            case 0xff51:
                return this.sourceHigh;
            case 0xff52:
                return this.sourceLow;
            case 0xff53:
                return this.destinationHigh;
            case 0xff54:
                return this.destinationLow;
            case 0xff55:
                return this.dmaLengthMode;
        }
    }

    writeRegister(address, value) {
        switch (address) {
            case 0xff46:
                this.performOamDmaTransfer(value);
                break;
            case 0xff51:
                this.sourceHigh = value;
                break;
            case 0xff52:
                this.sourceLow = value;
                break;
            case 0xff53:
                this.destinationHigh = value;
                break;
            case 0xff54:
                this.destinationLow = value;
                break;
            case 0xff55:
                if (this.isTransferring && (value & 0x80) == 0) {
                    this.stopVramDmaTransfer();
                } else {
                    this.dmaLengthMode = value;
                    this.startVramDmaTransfer();
                }
                break;
        }
    }

    stopVramDmaTransfer() {
        this.dmaLengthMode |= 0x80;
        this.currentBlockIndex = 0;
        this.isTransferring = false;
    }

    startVramDmaTransfer() {
        if ((this.dmaLengthMode & 0x80) == 0) {
            const vram = this.memory.readBlock(this.sourceAddress, this.length);
            this.gpu.writeVRamBlock(this.destinationAddress - 0x8000, vram);
        } else {
            this.currentBlockIndex = 0;
            this.isTransferring = true;
            this.dmaLengthMode &= 0x7f;
        }
    }

    performOamDmaTransfer(dma) {
        const oamData = this.memory.readBlock(dma * 0x100, 0xa0);
        this.gpu.importOam(oamData);
    }

    hDmaStep() {
        const currentOffset = this.currentBlockIndex * 0x10;
        const block = this.memory.readBlock(this.sourceAddress + currentOffset, 0x10);
        
        this.gpu.writeVRamBlock(this.destinationAddress - 0x8000 + currentOffset, block);

        this.currentBlockIndex++;

        let next = (this.dmaLengthMode & 0x7f) - 1;

        this.dmaLengthMode = (this.dmaLengthMode & 0x80) | next;

        if (next <= 0) {
            this.dmaLengthMode = 0xff;
            this.isTransferring = false;
        }
    }
}

module.exports = DmaManager;
