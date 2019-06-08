const INTERRUPT_FLAGS = require('../constants/interruptFlags');
const KEYPAD_BUTTONS = require('../constants/keypadButtons');

class KeyPad {
    constructor(gameboy) {
        this.gameboy = gameboy;
        this.register = null;

        this._joyP = 0;
        this._pressedButtons = KEYPAD_BUTTONS.NONE;
    }

    copy() {
        return {
            _joyP: this._joyP,
        };
    }

    restore(quicksaveData) {
        this._joyP = quicksaveData._joyP;
    }

    get pressedButtons() {
        return this._pressedButtons;
    }

    set pressedButtons(value) {
        if (this._pressedButtons < value) {
            this.register.IF |= INTERRUPT_FLAGS.JOYPAD;
        }

        this._pressedButtons = value;
    }

    get joyP() {
        if ((this._joyP & 0x10) == 0x10) {
            return (0xD0 | (~(this._pressedButtons >> 4) & 0xF));
        }

        if ((this._joyP & 0x20) == 0x20) {
            return (0xE0 | (~this._pressedButtons & 0xF));
        }

        return 0xFE;
    }

    set joyP(value) {
        this._joyP = value;
    }

    initialize() {
        this.register = this.gameboy.register;
    }

    shutdown() {
        // Null
    }

    reset() {
        this.joyP = 0;
        this.pressedButtons = KEYPAD_BUTTONS.NONE;
    }
}

module.exports = KeyPad;
