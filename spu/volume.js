class VolumeEnvelope {
    constructor(channel) {
        this.channel = channel;

        this.timer = 0;
        this.volume = 0;
    }

    copy() {
        return {
            timer: this.timer,
            volume: this.volume,
        };
    };

    restore(quicksaveData) {
        this.timer = quicksaveData.timer;
        this.volume = quicksaveData.volume;
    }

    get initialVolume() {
        return this.channel.NR2 >> 4;
    }

    get envelopeIncrease() {
        return (this.channel.NR2 & (1 << 3)) != 0;
    }

    get envelopeSweepCount() {
        return this.channel.NR2 & 7;
    }

    set envelopeSweepCount(value) {
        this.channel.NR2 = (this.channel.NR2 & ~7) | (value & 7);
    }

    reset() {
        this.volume = this.initialVolume;
        this.timer = 0;
    }

    update(cycles) {
        if (this.envelopeSweepCount > 0) {
            const timeDelta = cycles / 4194304 / 1;

            this.timer += timeDelta;

            const stepInterval = this.envelopeSweepCount / 64.0;
            while (this.timer >= stepInterval) {
                this.timer -= stepInterval;

                if (this.envelopeIncrease) {
                    this.volume++;
                } else {
                    this.volume--;
                }

                if (this.volume < 0) {
                    this.volume = 0;
                }
                if (this.volume > 15) {
                    this.volume = 15;
                }
            }
        }
    }
}

module.exports = VolumeEnvelope;
