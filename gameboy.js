const CPU = require('./cpu/cpu');
const GPU = require('./gpu/gpu');
const SPU = require('./spu/spu');
const Register = require('./cpu/register');
const Memory = require('./memory/memory');
const Timer = require('./timer/timer');
const Keypad = require('./keypad/keypad');
const Compress = require('./utils/base64String');

class GameBoy {
    constructor(cartridge, audioSampleRate) {
        this.cartridge = cartridge;
        this.audioSampleRate = 0;

        this.cpu = new CPU(this);
        this.gpu = new GPU(this);
        this.spu = new SPU(this);
        this.memory = new Memory(this);
        this.keypad = new Keypad(this);
        this.timer = new Timer(this);
        this.register = new Register(this);

        this.components = [this.cartridge, this.memory, this.cpu, this.gpu, this.spu, this.keypad, this.timer];

        this.initialize();
        this.reset();
        this.isPoweredOn = true;
    }

    start() {
        this.cpu.start();
    }

    initialize() {
        this.components.forEach(c => c.initialize());
    }

    reset() {
        this.components.forEach(c => c.reset());
    }

    terminate() {
        this.components.forEach(c => c.shutdown());
        this.isPoweredOn = false;
    }

    setSampleRate (audioSampleRate) {
        this.audioSampleRate = audioSampleRate;
    }

    compress(quickSaveData) {
        return btoa(
            JSON.stringify(quickSaveData)
        );
    }

    deCompress(quickSaveData) {
        return JSON.parse(
            atob(quickSaveData)
        );
    }

    quickSave() {
        this.cpu.isRunning = false;

        while (this.cpu.isInCpuStep) {
            // wait for current instruction to end
        }

        const data = this.compress({
            register: this.register.copy(),
            gpu: this.gpu.copy(),
            memory: this.memory.copy(),
            cartridge: this.cartridge.copy(),
            keypad: this.keypad.copy(),
            timer: this.timer.copy(),
            spu: this.spu.copy(),
        });

        this.cpu.isRunning = true;

        return data;
    }

    quickLoad(quickSaveData) {
        this.cpu.isRunning = false;

        while (this.cpu.isInCpuStep) {
            // wait for current instruction to end
        }

        const data = this.deCompress(quickSaveData);

        this.register.restore(data.register),
            this.gpu.restore(data.gpu),
            this.memory.restore(data.memory),
            this.cartridge.restore(data.cartridge),
            this.keypad.restore(data.keypad),
            this.timer.restore(data.timer),
            this.spu.restore(data.spu),
            (this.cpu.isRunning = true);
    }
}

module.exports = GameBoy;
