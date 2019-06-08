class LfsRegister {
    constructor(channel) {
        this.channel = channel;
        this.state = 0x7f;
    }

    copy() {
        return {
            state: this.state,
        };
    }

    restore(quicksaveData) {
        this.state = quicksaveData.state;
    }

    get currentValue() {
        return (this.state & 1) == 1;
    }

    get use7BitStepWidth() {
        return (this.channel.NR3 & (1 << 3)) != 0;
    }

    set use7BitStepWidth(value) {
        this.channel.NR3 = (this.channel.NR3 & ~(1 << 3)) | (value ? (1 << 3) : 0); 
        this.reset();
    }

    reset() {
        this.state = this.use7BitStepWidth ? 0x7F : 0x7FFF;
    }

    performShift() {
        const nextBit = ((this.state >> 1) & 1) ^ (this.state & 1);
        this.state >>= 1;
        this.state |= nextBit << (this.use7BitStepWidth ? 6 : 14);
    }
}

module.exports = LfsRegister;
