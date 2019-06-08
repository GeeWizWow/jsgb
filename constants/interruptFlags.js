
const INTERRUPT_FLAGS = {
    'NONE': 0,
    'VBLANK': (1 << 0),
    'LCDSTAT': (1 << 1),
    'TIMER': (1 << 2),
    'SERIAL': (1 << 3),
    'JOYPAD': (1 << 4),
};

module.exports = INTERRUPT_FLAGS;