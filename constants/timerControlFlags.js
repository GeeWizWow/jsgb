
const TIMER_CONTROL_FLAGS = {
    'Clock4096Hz': 0b00,
    'Clock262144Hz': 0b01,
    'Clock65536Hz': 0b10,
    'Clock16384Hz': 0b11,

    'ClockMask': 0b11,

    'EnableTimer': (1 << 2),
};

module.exports = TIMER_CONTROL_FLAGS;