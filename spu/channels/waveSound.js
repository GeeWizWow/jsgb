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
        // double cpuSpeedFactor = Spu.Device.Cpu.SpeedFactor;
        // if (!Active
        //     || !SoundEnabled
        //     || double.IsNaN(cpuSpeedFactor)
        //     || double.IsInfinity(cpuSpeedFactor)
        //     || cpuSpeedFactor < 0.5)
        // {
        //     return;
        // }
        // int sampleRate = ChannelOutput.SampleRate;
        // double timeDelta = (cycles / GameBoyCpu.OfficialClockFrequency) / cpuSpeedFactor;
        // int sampleCount = (int) (timeDelta * sampleRate) * 2;
        // float[] buffer = new float[sampleCount];
        // double interval = 1.0 / Frequency;
        // int intervalSampleCount = (int) (interval * sampleRate);
        // if (intervalSampleCount > 0)
        // {
        //     for (int i = 0; i < buffer.Length; i += 2)
        //     {
        //         _coordinate++;
        //         if (_coordinate >= intervalSampleCount)
        //         {
        //             _top = !_top;
        //             _coordinate = 0;
        //         }
        //         int waveRamCoordinate = (int) (_coordinate / (double) intervalSampleCount * _waveRam.Length);
        //         int waveDataSample = _top
        //             ? (_waveRam[waveRamCoordinate] & 0xF)
        //             : ((_waveRam[waveRamCoordinate] >> 4) & 0xF);
        //         float sample = ChannelVolume * OutputLevel * (waveDataSample - 7) / 15f;
        //         Spu.WriteToSoundBuffer(ChannelNumber, buffer, i, sample);
        //     }
        // }
        // ChannelOutput.BufferSoundSamples(buffer, 0, buffer.Length);
    }
}

module.exports = WaveSoundChannel;
