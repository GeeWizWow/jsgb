const fs = require('fs');
const { Cartridge, GameBoy, TransientExternalStorage } = require('./index');

const buffer = fs.readFileSync("../test_roms/gbc_bios.bin");
const storage = new TransientExternalStorage();
const cartridge = new Cartridge(buffer, storage);
const gameBoy = new GameBoy(cartridge);

gameBoy.start();