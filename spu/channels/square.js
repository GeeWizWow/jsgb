const VolumeEnvelope = require('../volume');

class SquareChannel {
    constructor(spu) {
        this.spu = spu;

        this.active = false;
        this.coordinate = 0;
        this.length = 0;
        this._frequencyRegister = 0;

        this.channelVolume = 1;
        this.channelNumber = 2;
        this.channelOutput = null;

        this.volumeEnvelope = new VolumeEnvelope(this);

        this._NR0 = 0;
        this._NR1 = 0;
        this._NR2 = 0;
        this._NR4 = 0;
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

        this.volumeEnvelope.restore(quicksaveData.volumeEnvelope);
    }

    get NR0() {
        return this._NR0;
    }

    set NR0(value) {
        this._NR0 = value;
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
        return this.frequencyRegister & 0xff;
    }

    set NR3(value) {
        this.frequencyRegister = (this.frequencyRegister & ~0xff) | value;
    }

    get NR4() {
        return this._NR4;
    }

    set NR4(value) {
        this._NR4 = value & (1 << 6);
        if ((value & (1 << 7)) != 0) {
            this.length = this.soundLength;
            this.coordinate = 0;
        }
        this.frequencyRegister = (this.frequencyRegister & 0xff) | ((value & 0b111) << 8);
    }

    get frequencyRegister() {
        return this._frequencyRegister;
    }

    set frequencyRegister(value) {
        this._frequencyRegister = value & 0b11111111111;
    }

    get frequency() {
        return 4194304 / (32 * (2048 - this.frequencyRegister));
    }

    set frequency(value) {
        this.frequencyRegister = 2048 - 4194304 / (32 * value);
    }

    get soundLength() {
        return (64 - (this._NR1 & 0b111111)) * (1 / 256);
    }

    get useSoundLength() {
        return (this.NR4 & (1 << 6)) != 0;
    }

    get duty() {
        switch ((this.NR1 >> 6) & 0b11) {
            case 0:
                return 0.125;
            case 1:
                return 0.25;
            case 2:
                return 0.5;
            default:
                return 0.75;
        }
    }

    dutyWave(amplitude, x, period) {
        // Pulse waves with a duty can be constructed by subtracting a saw wave from the same but shifted saw wave.
        const saw1 = ((-2 * amplitude) / Math.PI) * Math.atan(this.cot((x * Math.PI) / period));
        const saw2 = ((-2 * amplitude) / Math.PI) * Math.atan(this.cot((x * Math.PI) / period - (1 - this.duty) * Math.PI));
        return saw1 - saw2;
    }

    cot(x) {
        return 1 / Math.tan(x);
    }

    channelStep(cycles) {
        if (!this.active || this.spu.gameboy.cpu.speedFactor < 0.5) {
            return new Float32Array(0); 
        }

        // Update volume and calculate wave amplitude.
        this.volumeEnvelope.update(cycles);
        const amplitude = this.channelVolume * (this.volumeEnvelope.volume / 15.0);

        // Obtain elapsed gameboy time.
        const timeDelta = (cycles / 4194304) / this.spu.gameboy.cpu.speedFactor;

        // Allocate sound buffer.
        const sampleRate = this.spu.gameboy.audioSampleRate;
        const sampleCount = Math.ceil(timeDelta * sampleRate) * 2;

        const buffer = new Float32Array(sampleCount);
        if (!this.useSoundLength || this.length >= 0)
        {
            const period = 1 / this.frequency;
            for (let i = 0; i < buffer.length; i += 2)
            {
                // Get current x coordinate and compute current sample value.
                const x = this.coordinate / sampleRate;
                const sample = this.dutyWave(amplitude, x, period);

                this.spu.writeToSoundBuffer(this.channelNumber, buffer, i, sample);
                this.coordinate = (this.coordinate + 1) % sampleRate;
            }

            if (this.useSoundLength) {
                this.length -= timeDelta;
            }
        }

        return buffer;
    }
}

module.exports = SquareChannel;
