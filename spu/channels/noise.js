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
        // double cpuSpeedFactor = Spu.Device.Cpu.SpeedFactor;
        // if (!Active || double.IsNaN(cpuSpeedFactor) || double.IsInfinity(cpuSpeedFactor) || cpuSpeedFactor < 0.5)
        //     return;
        // // Update volume.
        // _volumeEnvelope.Update(cycles);
        // float amplitude = ChannelVolume * _volumeEnvelope.Volume / 15.0f;
        // // Get elapsed gameboy time.
        // double timeDelta = (cycles / GameBoyCpu.OfficialClockFrequency) / cpuSpeedFactor;
        // // Allocate buffer.
        // int sampleRate = ChannelOutput.SampleRate;
        // int sampleCount = (int) (timeDelta * sampleRate) * 2;
        // float[] buffer = new float[sampleCount];
        // if (!UseSoundLength || _length >= 0)
        // {
        //     double period = 1 / Frequency;
        //     int periodSampleCount = (int) (period * sampleRate) * 2;
        //     for (int i = 0; i < buffer.Length; i += 2)
        //     {
        //         float sample = amplitude * (_lfsr.CurrentValue ? 1f : 0f);
        //         Spu.WriteToSoundBuffer(ChannelNumber, buffer, i, sample);
        //         _clock += 2;
        //         if (_clock >= periodSampleCount)
        //         {
        //             _lfsr.PerformShift();
        //             _clock -= periodSampleCount;
        //         }
        //     }
        //     if (UseSoundLength)
        //         _length -= timeDelta;
        // }
        // ChannelOutput.BufferSoundSamples(buffer, 0, buffer.Length);
    }
}

module.exports = NoiseChannel;
