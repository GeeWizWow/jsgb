
const REGISTER_FLAGS = {
    'NONE': 0,
    'Z': 1 << 7, // 128 // 0x80
    'N': 1 << 6, // 64 // 0x40
    'H': 1 << 5, // 32 // 0x20
    'C': 1 << 4, // 16 // 0x10
    'All': 1 << 7 | 1 << 6 | 1 << 5 | 1 << 4,
};

module.exports = REGISTER_FLAGS;