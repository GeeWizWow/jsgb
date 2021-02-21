const BufferUtils = require('../../utils/bufferUtils');

class WaveSoundChannel {
    constructor(spu) {
        this.spu = spu;

        this.active = false;
        this.channelVolume = 1;
        this.channelNumber = 3;
        this.channelOutput = null;

        this.coordinate = 0;
        this.top = 0;

        this.NR0 = 0;
        this.NR1 = 0;
        this.NR2 = 0;
        this.NR3 = 0;
        this.NR4 = 0;

        this.waveRam = new Uint8Array(0x10);
    }

    copy() {
        return {
            active: this.active,
            channelVolume: this.channelVolume,
            channelNumber: this.channelNumber,
            coordinate: this.coordinate,
            top: this.top,
            NR0: this.NR0,
            NR1: this.NR1,
            NR2: this.NR2,
            NR3: this.NR3,
            NR4: this.NR4,
            waveRam: BufferUtils.serialize(this.waveRam),
        };
    }

    restore(quicksaveData) {
        this.active = quicksaveData.active;
        this.channelVolume = quicksaveData.channelVolume;
        this.channelNumber = quicksaveData.channelNumber;
        this.coordinate = quicksaveData.coordinate;
        this.top = quicksaveData.top;
        this.NR0 = quicksaveData.NR0;
        this.NR1 = quicksaveData.NR1;
        this.NR2 = quicksaveData.NR2;
        this.NR3 = quicksaveData.NR3;
        this.NR4 = quicksaveData.NR4;
        this.waveRam = BufferUtils.deserialize(quicksaveData.waveRam);
    }

    get soundEnabled() {
        return (this.NR0 & (1 << 7)) != 0;
    }

    get soundLength() {
        return (256 - this.NR1) / 256;
    }

    get OutputLevel() {
        switch ((this.NR2 >> 5) & 0b11) {
            default:
                return 0.0;
            case 1:
                return 1.0;
            case 2:
                return 0.5;
            case 3:
                return 0.25;
        }
    }

    get frequency() {
        const value = this.NR3 | ((this.NR4 & 0b111) << 8);
        return 4194304 / (64 * (2048 - value));
    }

    readWavRam(address) {
        return this.waveRam[address];
    }

    writeWavRam(address, value) {
        this.waveRam[address] = value;
    }

    channelStep(cycles) {
        if (!this.active || this.spu.gameboy.cpu.speedFactor < 0.5) {
            return new Float32Array(0); 
        }

        const sampleRate = this.spu.gameboy.audioSampleRate;
        const timeDelta = (cycles / 4194304) / this.spu.gameboy.cpu.speedFactor;

        const sampleCount =  Math.ceil(timeDelta * sampleRate) * 2;
        const buffer = new Float32Array(sampleCount);

        const interval = 1 / this.frequency;
        const intervalSampleCount = interval * sampleRate;

        if (intervalSampleCount > 0) {
            for (let i = 0; i < buffer.length; i += 2) {
                this.coordinate++;

                if (this.coordinate >= intervalSampleCount)
                {
                    this.top = !this.top;
                    this.coordinate = 0;
                }

                const waveRamCoordinate = (this.coordinate / intervalSampleCount * this.waveRam.length);
                const waveDataSample = this.top
                    ? (this.waveRam[waveRamCoordinate] & 0xF)
                    : ((this.waveRam[waveRamCoordinate] >> 4) & 0xF);

                const sample = this.channelVolume * this.OutputLevel * (waveDataSample - 7) / 15.0;

                this.spu.writeToSoundBuffer(this.channelNumber, buffer, i, sample);
            }
        }

        return buffer;
    }
}

module.exports = WaveSoundChannel;
