const TIMER_CONTROL_FLAGS = require('../constants/timerControlFlags');
const INTERRUPT_FLAGS = require('../constants/interruptFlags');

class Timer {
    constructor(gameboy) {
        this.gameboy = gameboy;
        this.register = null;
        this.cpu = null;

        this.divFrequency = 16384;
        this.divCycleInterval = 4194304 / this.divFrequency;

        this.timerClock = 0;
        this.divClock = 0;

        this._div = 0x00;
        this.tac = 0x00;
        this.tima = 0x00;
        this.tma = 0x00;
    }

    copy() {
        return {
            divFrequency: this.divFrequency,
            divCycleInterval: this.divCycleInterval,
            timerClock: this.timerClock,
            divClock: this.divClock,
            _div: this._div,
            tac: this.tac,
            tima: this.tima,
            tma: this.tma,
        };
    }

    restore(quicksaveData) {
        this.divFrequency = quicksaveData.divFrequency;
        this.divCycleInterval = quicksaveData.divCycleInterval;
        this.timerClock = quicksaveData.timerClock;
        this.divClock = quicksaveData.divClock;
        this._div = quicksaveData._div;
        this.tac = quicksaveData.tac;
        this.tima = quicksaveData.tima;
        this.tma = quicksaveData.tma;
    }

    get div() {
        return this._div;
    }

    set div(value) {
        this._div = value;
        this.timerClock = 0;
        this.divClock = 0;
    }

    initialize() {
        this.cpu = this.gameboy.cpu;
        this.register = this.gameboy.register;
        this.cpu.onCpuStep.register(this.step.bind(this));
    }

    shutdown() {
        this.cpu.onCpuStep.remove(this.step);
    }

    reset() {
        this.div = 0x1e;
        this.tima = 0;
        this.tma = 0;
        this.tac = 0;
    }

    getTimaFrequency() {
        switch (this.tac & TIMER_CONTROL_FLAGS.ClockMask) {
            case TIMER_CONTROL_FLAGS.Clock4096Hz:
                return 4096;
            case TIMER_CONTROL_FLAGS.Clock16384Hz:
                return 16384;
            case TIMER_CONTROL_FLAGS.Clock65536Hz:
                return 65536;
            case TIMER_CONTROL_FLAGS.Clock262144Hz:
                return 262144;
        }
        return 0;
    }

    getTimaClockCycles() {
        return 4194304 / this.getTimaFrequency();
    }

    step(cycles) {
        this.divClock += cycles;

        while (this.divClock > this.divCycleInterval) {
            this.divClock -= this.divCycleInterval;
            this._div = (this.div + 1) % 0xff;
        }

        if ((this.tac & TIMER_CONTROL_FLAGS.EnableTimer) == TIMER_CONTROL_FLAGS.EnableTimer) {
            this.timerClock += cycles;
            const timaCycles = this.getTimaClockCycles();

            while (this.timerClock > timaCycles) {
                this.timerClock -= timaCycles;

                const result = this.tima + 1;

                this.tima = result & 0xff;

                if (result > 0xff) {
                    this.tima = this.tma;
                    this.register.IF |= INTERRUPT_FLAGS.TIMER;
                }
            }
        }
    }

    readRegister(address) {
        switch (address) {
            case 0x04:
                return this.div;
            case 0x05:
                return this.tima;
            case 0x06:
                return this.tma;
            case 0x07:
                return this.tac;
        }
    }

    writeRegister(address, value) {
        switch (address) {
            case 0x04:
                this.div = 0;
                break;
            case 0x05:
                this.tima = value;
                break;
            case 0x06:
                this.tma = value;
                break;
            case 0x07:
                this.tac = value & 0b111;
                break;
        }
    }
}

module.exports = Timer;
