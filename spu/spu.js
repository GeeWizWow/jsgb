const NoiseChannel = require('./channels/noise');
const WaveSoundChannel = require('./channels/waveSound');
const SquareSweepChannel = require('./channels/squareSweep');
const SquareChannel = require('./channels/square');
const BufferUtils = require('../utils/bufferUtils');
const EventManager = require('../events/eventManager');

class Spu {
    constructor(gameboy) {
        this.gameboy = gameboy;
        this.unused = new Uint8Array(9);
        this.onBufferSample = new EventManager();

        this.waveChannel = new WaveSoundChannel(this);
        this.channels = [new SquareSweepChannel(this), new SquareChannel(this), this.waveChannel, new NoiseChannel(this)];

        this.NR50 = 0x0;
        this.NR51 = 0x0;
        this.NR52 = 0x0;

        this.activateAllChannels();
    }

    copy() {
        return {
            unused: BufferUtils.serialize(this.unused),
            NR50: this.NR50,
            NR51: this.NR51,
            NR52: this.NR52,
            channels: this.channels.map(c => c.copy()),
        };
    }

    restore(quicksaveData) {
        this.unused = BufferUtils.deserialize(quicksaveData.unused);
        this.NR50 = quicksaveData.NR50;
        this.NR51 = quicksaveData.NR51;
        this.NR52 = quicksaveData.NR52;

        this.channels.forEach((c, i) => c.restore(quicksaveData.channels[i]));
    }

    get enableSO1() {
        return (this.NR50 & (1 << 3)) != 0;
    }

    set enableSO1(value) {
        this.NR50 = (this.NR50 & ~(1 << 3)) | ((value ? 1 : 0) << 3);
    }

    get SO1Volume() {
        return this.NR50 & 0x7;
    }

    set SO1Volume(value) {
        this.NR50 = (this.NR50 & ~0x7) | (value << 4);
    }

    get enableSO2() {
        return (this.NR50 & (1 << 7)) != 0;
    }

    set enableSO2(value) {
        this.NR50 = (this.NR50 & ~(1 << 7)) | ((value ? 1 : 0) << 7);
    }

    get SO2Volume() {
        return (this.NR50 >> 4) & 0x7;
    }

    set SO2Volume(value) {
        this.NR50 = (this.NR50 & ~(0x7 << 4)) | ((value & 0x7) << 4);
    }

    initialize() {
        this.reset();
        this.channels.forEach(c => {
            c.channelVolume = 0.05;
        });
    }

    reset() {
        this.channels[0].NR0 = 0x80;
        this.channels[0].NR1 = 0xbf;
        this.channels[0].NR2 = 0xf3;
        this.channels[0].NR4 = 0xbf;

        this.channels[1].NR1 = 0x3f;
        this.channels[1].NR2 = 0x00;
        this.channels[1].NR4 = 0xbf;

        this.channels[2].NR0 = 0x7f;
        this.channels[2].NR1 = 0xff;
        this.channels[2].NR2 = 0x9f;
        this.channels[2].NR3 = 0xbf;

        this.channels[3].NR1 = 0xff;
        this.channels[3].NR2 = 0x00;
        this.channels[3].NR3 = 0x00;
        this.channels[3].NR4 = 0xbf;

        this.NR50 = 0x77;
        this.NR51 = 0xf3;
        this.NR52 = 0xf1;
    }

    shutdown() {}

    spuStep(cycles) {
        if ((this.NR52 & (1 << 7)) != 0) {
            this.onBufferSample.invoke(
                this.channels.map(function runChannelStep (channel) {
                    return channel.channelStep(cycles);
                })
            );
        }
    }

    writeRegister(address, value) {
        switch (address) {
            case 0xff24: {
                this.NR50 = value;
                break;
            }

            case 0xff25: {
                this.NR51 = value;
                break;
            }

            case 0xff26: {
                this.NR52 = value;
                break;
            }

            default: {
                if (address >= 0xff27 && address < 0xff30) {
                    this.unused[address - 0xff27] = value;
                } else if (address >= 0xff30 && address < 0xff40) {
                    this.waveChannel.writeWavRam(address - 0xff30, value);
                } else {
                    const relativeAddress = address - 0xff10;
                    const channelIndex = Math.floor(relativeAddress / 5);
                    const channel = this.channels[channelIndex];

                    switch (relativeAddress % 5) {
                        case 0:
                            channel.NR0 = value;
                            break;
                        case 1:
                            channel.NR1 = value;
                            break;
                        case 2:
                            channel.NR2 = value;
                            break;
                        case 3:
                            channel.NR3 = value;
                            break;
                        case 4:
                            channel.NR4 = value;
                            break;
                    }
                }
                break;
            }
        }
    }

    readRegister(address) {
        switch (address) {
            case 0xff24: {
                return this.NR50;
            }
            case 0xff25: {
                return this.NR51;
            }
            case 0xff26: {
                return this.NR52;
            }
            default: {
                if (address >= 0xff27 && address < 0xff30) {
                    return this.unused[address - 0xff27];
                }
                if (address >= 0xff30 && address < 0xff40) {
                    return this.waveChannel.readWavRam(address - 0xff30);
                }

                const relativeAddress = address - 0xff10;
                const channelIndex = Math.floor(relativeAddress / 5);
                const channel = this.channels[channelIndex];

                switch (relativeAddress % 5) {
                    case 0:
                        return channel.NR0;
                    case 1:
                        return channel.NR1;
                    case 2:
                        return channel.NR2;
                    case 3:
                        return channel.NR3;
                    case 4:
                        return channel.NR4;
                }
            }
        }
    }

    activateAllChannels() {
        this.channels.forEach(c => (c.active = true));
    }

    deactivateAllChannels() {
        this.channels.forEach(c => (c.active = false));
    }

    writeToSoundBuffer(channel, totalBuffer, index, sample) {
        sample *= this.SO1Volume / 7;

        if ((this.NR51 & (1 << (channel - 1))) != 0) {
            totalBuffer[index + 1] = sample;
        }

        if ((this.NR51 & (1 << (channel + 3))) != 0) {
            totalBuffer[index] = sample;
        }
    }
}

module.exports = Spu;
