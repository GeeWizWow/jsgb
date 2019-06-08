const SPRITE_DATA = {
    None: 0,
    PaletteNumberMask: 0b111,
    TileVramBank: (1 << 3),
    UsePalette1: (1 << 4),
    XFlip: (1 << 5),
    YFlip: (1 << 6),
    BelowBackground: (1 << 7)
};

module.exports = SPRITE_DATA;