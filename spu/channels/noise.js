const LfsRegister = require('../lfsRegister');
const VolumeEnvelope = require('../volume');

class NoiseChannel {
    constructor(spu) {
        this.spu = spu;

        this.active = false;
        this.length = 0;
        this.clock = 0;

        this.channelVolume = 1;
        this.channelNumber = 4;
        this.channelOutput = null;

        this.volumeEnvelope = new VolumeEnvelope(this);
        this.lsfr = new LfsRegister(this);

        this.NR0 = 0;
        this._NR1 = 0;
        this._NR2 = 0;
        this._NR3 = 0;
        this.NR4 = 0;
    }

    copy() {
        return {
            active: this.active,
            length: this.length,
            clock: this.clock,
            channelVolume: this.channelVolume,
            channelNumber: this.channelNumber,
            NR0: this.NR0,
            _NR1: this._NR1,
            _NR2: this._NR2,
            _NR3: this._NR3,
            NR4: this.NR4,
            lsfr: this.lsfr.copy(),
            volumeEnvelope: this.volumeEnvelope.copy(),
        };
    }

    restore(quicksaveData) {
        this.active = quicksaveData.active;
        this.length = quicksaveData.length;
        this.clock = quicksaveData.clock;
        this.channelVolume = quicksaveData.channelVolume;
        this.channelNumber = quicksaveData.channelNumber;
        this.NR0 = quicksaveData.NR0;
        this._NR1 = quicksaveData._NR1;
        this._NR2 = quicksaveData._NR2;
        this._NR3 = quicksaveData._NR3;
        this.NR4 = quicksaveData.NR4;

        this.lsfr.restore(quicksaveData.lsfr);
        this.volumeEnvelope.restore(quicksaveData.volumeEnvelope);
    }

    get NR1() {
        return this._NR1;
    }

    set NR1(value) {
        this._NR1 = value;
        this.length = this.soundLength;
    }

    get NR2() {
        return this._NR2;
    }

    set NR2(value) {
        this._NR2 = value;
        this.volumeEnvelope.reset();
    }

    get NR3() {
        return this._NR3;
    }

    set NR3(value) {
        this._NR3 = value;
        this.clock = 0;
        this.lsfr.reset();
    }

    get soundLength() {
        return (64 - (this._NR1 & 63)) * (1 / 256);
    }

    get shiftClockFrequency() {
        return this.NR3 >> 4;
    }

    set shiftClockFrequency(value) {
        this.NR3 = (this.NR3 & 0b1111) | (value << 4);
    }

    get dividingRatio() {
        return this.NR3 & 0b111;
    }

    set dividingRatio(value) {
        this.NR3 = (this.NR3 & ~0b11) | (value & 0b111);
    }

    get frequency() {
        const ratio = this.dividingRatio == 0 ? 0.5 : this.dividingRatio;
        return 4194304 / 8 / ratio / Math.pow(2, this.shiftClockFrequency + 1);
    }

    get useSoundLength() {
        return (this.NR4 & (1 << 6)) != 0;
    }

    channelStep(cycles) {
        if (!this.active || this.spu.gameboy.cpu.speedFactor < 0.5) {
            return new Float32Array(0); 
        }

        // Update volume.
        this.volumeEnvelope.update(cycles);
        const amplitude = this.channelVolume * (this.volumeEnvelope.volume / 15.0);

        // Obtain elapsed gameboy time.
        const timeDelta = (cycles / 4194304) / this.spu.gameboy.cpu.speedFactor;

        // Allocate buffer.
        const sampleRate = this.spu.gameboy.audioSampleRate;
        const sampleCount = Math.ceil(timeDelta * sampleRate) * 2;

        const buffer = new Float32Array(sampleCount);

        if (!this.useSoundLength || this.length >= 0)
        {
            const period = 1 / this.frequency;
            const periodSampleCount = (period * sampleRate) * 2;

            for (let i = 0; i < buffer.length; i += 2)
            {
                const sample = amplitude * (this.lsfr.currentValue ? 1.0 : 0.0);
                this.spu.writeToSoundBuffer(this.channelNumber, buffer, i, sample);

                this.clock += 2;

                if (this.clock >= periodSampleCount)
                {
                    this.lsfr.performShift();
                    this.clock -= periodSampleCount;
                }
            }

            if (this.useSoundLength) {
                this.length -= timeDelta;
            }
        }

        return buffer;
    }
}

module.exports = NoiseChannel;
