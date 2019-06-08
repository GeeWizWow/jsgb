const SquareChannel = require('./square');

class SquareSweepChannel extends SquareChannel {
    constructor(spu) {
        super(spu);

        this.channelNumber = 1;
        this.frequencySweepClock = 0;
    }

    copy() {
        return {
            active: this.active,
            coordinate: this.coordinate,
            length: this.length,
            _frequencyRegister: this._frequencyRegister,
            channelVolume: this.channelVolume,
            channelNumber: this.channelNumber,
            _NR0: this._NR0,
            _NR1: this._NR1,
            _NR2: this._NR2,
            _NR4: this._NR4,
            frequencySweepClock: this.frequencySweepClock,
            volumeEnvelope: this.volumeEnvelope.copy(),
        };
    }

    restore(quicksaveData) {
        this.active = quicksaveData.active;
        this.coordinate = quicksaveData.coordinate;
        this.length = quicksaveData.length;
        this._frequencyRegister = quicksaveData._frequencyRegister;
        this.channelVolume = quicksaveData.channelVolume;
        this.channelNumber = quicksaveData.channelNumber;
        this._NR0 = quicksaveData._NR0;
        this._NR1 = quicksaveData._NR1;
        this._NR2 = quicksaveData._NR2;
        this._NR4 = quicksaveData._NR4;
        this.frequencySweepClock = quicksaveData.frequencySweepClock;

        this.volumeEnvelope.restore(quicksaveData.volumeEnvelope);
    }

    set NR0(value) {
        this._NR0 = value;
        this.frequencySweepClock = 0;
    }

    get sweepTime() {
        return ((this.NR0 >> 4) & 7) / 128.0;
    }

    get sweepIncrease() {
        return ((this.NR0 >> 3) & 1) == 0;
    }

    get sweepShiftCount() {
        return this.NR0 & 0b111;
    }

    set sweepShiftCount(value) {
        this.NR0 = (this.NR0 & ~0b111) | (value & 0b111);
    }

    updateFrequency(cycles) {
        if (this.weepTime > 0 && this.spu.gameboy.cpu.speedFactor > 0.5) {
            const timeDelta = cycles / 4194304 / this.spu.gameboy.cpu.speedFactor;

            this.frequencySweepClock += timeDelta;

            while (this.frequencySweepClock >= this.sweepTime) {
                this.frequencySweepClock -= this.sweepTime;

                let delta = this.frequencyRegister / Math.pow(2, this.sweepShiftCount);

                if (!this.sweepIncrease) {
                    delta = -delta;
                }

                this.frequencyRegister = this.frequencyRegister + delta;
            }
        }
    }

    channelStep(cycles) {
        this.updateFrequency(cycles);
        this.channelStep(cycles);
    }
}

module.exports = SquareSweepChannel;
