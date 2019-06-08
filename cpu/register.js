const INTERRUPT_FLAGS = require('../constants/interruptFlags');

class Register {
    constructor() {
        // 8-bit registers
        this.A = 0;
        this.F = 0;
        this.B = 0;
        this.C = 0;
        this.D = 0;
        this.E = 0;
        this.H = 0;
        this.L = 0;

        // 16-bit registers
        this.PC = 0; // Program Counter
        this.SP = 0; // Stack Pointer

        // Flags
        this.IE = INTERRUPT_FLAGS.NONE;
        this.IF = INTERRUPT_FLAGS.NONE;

        // IME
        this.IME = false;
        this.IMESet = false;
    }

    get AF () {
        return ((this.A << 8) | this.F);
    }

    set AF(value) {
        this.A = ((value >> 8) & 0xFF);
        this.F = (value & 0xF0);
    }

    get BC () {
        return ((this.B << 8) | this.C);
    }

    set BC(value) {
        this.B = ((value >> 8) & 0xFF);
        this.C = (value & 0xFF);
    }

    get DE () {
        return ((this.D << 8) | this.E);
    }

    set DE(value) {
        this.D = ((value >> 8) & 0xFF);
        this.E = (value & 0xFF);
    }

    get HL () {
        return ((this.H << 8) | this.L);
    }

    set HL(value) {
        this.H = ((value >> 8) & 0xFF);
        this.L = (value & 0xFF);
    }

    incrementPC() {
        this.PC++;
    }

    getFlags(flag) {
        return (this.F & flag) == flag;
    }

    setFlags(flags) {
        this.F |= flags;
    }

    overwriteFlags(newFlags) {
        this.F = newFlags;
    }

    clearFlags(flags) {
        this.F &= ~flags;
    }

    reset(isGbc) {
        this.A = isGbc ? 0x11 : 0x01;
        this.F = 0xB0;
        this.BC = 0x0013;
        this.DE = 0x00D8;
        this.HL = 0x014D;
        this.PC = 0x100;
        this.SP = 0xFFFE;

        this.IE = INTERRUPT_FLAGS.NONE;
        this.IF = 0xE1;

        this.IME = false;
        this.IMESet = false;
    }

    toStr() {
        return `A=${this.A} F=${this.F} B=${this.B} C=${this.C} D=${this.D} E=${this.E} H=${this.H} L=${this.L}`;
    }

    copy() {
        return {
            A: this.A,
            F: this.F,
            B: this.B,
            C: this.C,
            D: this.D,
            E: this.E,
            H: this.H,
            L: this.L,
            PC: this.PC,
            SP: this.SP,
            IE: this.IE,
            IF: this.IF,
            IME: this.IME,
            IMESet: this.IMESet,
        };
    }

    restore(quickSaveData) {
        this.A = quickSaveData.A;
        this.F = quickSaveData.F;
        this.B = quickSaveData.B;
        this.C = quickSaveData.C;
        this.D = quickSaveData.D;
        this.E = quickSaveData.E;
        this.H = quickSaveData.H;
        this.L = quickSaveData.L;
        this.PC = quickSaveData.PC;
        this.SP = quickSaveData.SP;
        this.IE = quickSaveData.IE;
        this.IF = quickSaveData.IF;
        this.IME = quickSaveData.IME;
        this.IMESet = quickSaveData.IMESet;
    };
}

module.exports = Register;