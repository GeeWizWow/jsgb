const LCD_STATUS = {
    HBlankMode: 0b00,
    VBlankMode: 0b01,
    ScanLineOamMode: 0b10,
    ScanLineVRamMode: 0b11,
    ModeMask: 0b11,
    Coincidence: (1 << 2),
    HBlankModeInterrupt: (1 << 3),
    VBlankModeInterrupt: (1 << 4),
    OamBlankModeInterrupt: (1 << 5),
    CoincidenceInterrupt: (1 << 6),
};

module.exports = LCD_STATUS;