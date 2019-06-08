const Alu = require('./alu');
const Instruction = require('./instruction');
const EventManager = require('../events/eventManager');
const INTERRUPT_FLAGS = require('../constants/interruptFlags');
const { operationMap, cbOperationMap, EXT_OPS_CB_CODE } = require('./operationMap');

/*

The GBA has a TFT color LCD that is 240 x 160 pixels in size and has a refresh rate of exactly 280,896 cpu cycles per frame, or around 59.73 hz. 
Most GBA programs will need to structure themselves around this refresh rate. 
Each refresh consists of a 160 scanline vertical draw (VDraw) period followed by a 68 scanline blank (VBlank) period. 
Furthermore, each of these scanlines consists of a 1004 cycle draw period (HDraw) followed by a 228 cycle blank period (HBlank). 
During the HDraw and VDraw periods the graphics hardware processes background and obj (sprite) data and draws it on the screen, 
while the HBlank and VBlank periods are left open so that program code can modify background and obj data without risk of creating graphical artifacts.

*/

const initialFrameRate = 60;
const fullFrameCycles = 100896; // 70224;

class CPU {
    constructor(gameboy) {
        this.gameboy = gameboy;

        this.register = null;
        this.memory = null;
        this.alu = null;
        
        this.onCpuStep = new EventManager();
        this.isRunning = false;
        this.isHalted = false;
        this.isInCpuStep = false;
        this.waitForFrame = false;
        
        this.ticks = 0;
        this.interval = null;
        this.cyclesPerSecond = 0;
        this.framesPerSecond = 0;
        this.frameStartTime = 0;

        this.framerate = initialFrameRate;
    }

    get speedFactor () {
        return Math.round(this.cyclesPerSecond / 4194304 * 100);
    }

    initialize() {
        this.ticks = 0;
        this.register = this.gameboy.register;
        this.memory = this.gameboy.memory;

        this.alu = new Alu(this.register);
    }

    reset() {
        this.ticks = 0;
        this.isRunning = false;
        this.register.reset(
            this.gameboy.cartridge.isGameboyColour
        );
    }

    onTick() {
        if (!this.frameStartTime) {
            this.frameStartTime = new Date();
        }

        this.waitForFrame = false;

        const time = new Date();
        const delta = (time - this.frameStartTime) / 1000;

        this.cyclesPerSecond = this.ticks / delta;
        this.framesPerSecond = 1 / delta;

        this.frameStartTime = time;
        this.ticks = 0;
    }

    shutdown() {
        this.terminate();
    }

    terminate() {
        clearTimeout(this.interval);
        // TODO
    }

    readNextInstruction() {
        const offset = this.register.PC;
        const code = this.memory.readByte(this.register.PC++);

        const operation = code === EXT_OPS_CB_CODE ? cbOperationMap[this.memory.readByte(this.register.PC++)] : operationMap[code];

        const operand = this.memory.readBytes(this.register.PC, operation.opLength);
        this.register.PC += operand.length;

        return new Instruction(offset, operation, operand);
    }

    start() {
        if (!this.isRunning) {
            this.isRunning = true;
            this.frameStartTime = new Date();
            this.frameStartTickCount = 0;
        }

        setTimeout(this.start.bind(this), 1000 / this.framerate);
        
        if (this.waitForFrame) {
            return;
        }  
        
        for (let cycles = 0; cycles < fullFrameCycles;) {
            cycles += this.step();
        }

        this.onTick();
    }

    step() {
        this.isInCpuStep = true;
        this.register.IMESet = false;

        let cycles;

        if (!this.isHalted) {
            const nextInstruction = this.readNextInstruction();
            cycles = nextInstruction.execute(this.gameboy);
        } else {
            cycles = 4;
        }

        // Check for interrupts.
        let interrupted = false;

        if (this.register.IE != INTERRUPT_FLAGS.NONE && this.register.IF != 0xe0) {
            const firedAndEnabled = this.register.IE & this.register.IF;
            for (let i = 0; i < 5 && !interrupted; i++) {
                if ((firedAndEnabled & (1 << i)) == 1 << i) {
                    if (this.register.IME && !this.register.IMESet) {
                        this.register.IF &= ~(1 << i);
                        this.register.IME = false;
                        interrupted = true;
                        this.rst(0x40 + (i << 3));
                        cycles += 12;
                    }

                    this.isHalted = false;
                }
            }
        }

        this.onCpuStep.invoke(cycles);
        this.ticks = (this.ticks + cycles);
        this.isInCpuStep = false;

        return cycles;
    }

    stop() {
        this.isRunning = false;
        clearTimeout(this.interval);
    }

    halt() {
        this.isHalted = true;
    }

    push(value) {
        this.register.SP -= 2;
        this.memory.write16Bit(this.register.SP, value);
    }

    pop() {
        const value = this.memory.read16Bit(this.register.SP);
        this.register.SP += 2;
        return value;
    }

    jump(address) {
        this.register.PC = address;
    }

    jumpFlag(operation, address, flag) {
        if (flag) {
            this.jump(address);
            return operation.cycles;
        }

        return operation.cyclesAlt;
    }

    call(address) {
        this.push(this.register.PC);
        this.register.PC = address;
    }

    callFlag(operation, address, flag) {
        if (flag) {
            this.call(address);
            return operation.cycles;
        }

        return operation.cyclesAlt;
    }

    ret() {
        this.register.PC = this.pop();
    }

    retFlag(operation, flag) {
        if (flag) {
            this.ret();
            return operation.cycles;
        }

        return operation.cyclesAlt;
    }

    rst(isr) {
        return this.call(isr);
    }
}

module.exports = CPU;
