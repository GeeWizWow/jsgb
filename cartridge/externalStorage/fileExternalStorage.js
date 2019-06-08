const fs = require('fs');
const path = require('path');
const BufferUtils = require('../../utils/bufferUtils');

class ExternalStorage {
    constructor() {
        this.path = null;
        this.baseStream = Buffer.alloc(0);
        this.isActive = false;
        this.isFdDirty = false;
        this.interval = null;
    }

    initialize(cartridge) {
        this.path = path.join(process.env.APPDATA, 'jsgb', `${cartridge.getTitle()}.sav`);
        this.baseStream = Buffer.alloc(cartridge.getExternalRamSize());
        this.isActive = true;

        this.initializeFileStream();
        this.interval = setInterval(this.flushData.bind(this), 32); // every 2 frames;
    }

    copy() {
        return {
            baseStream: BufferUtils.serialize(this.baseStream),
            isActive: this.isActive,
        };
    }

    restore(quicksaveData) {
        this.baseStream = BufferUtils.deserialize(quicksaveData.baseStream);
        this.isActive = quicksaveData.isActive;
        this.isFdDirty = true;
    }

    initializeFileStream() {
        if (!fs.existsSync(path.dirname(this.path))) {
            fs.mkdirSync(path.dirname(this.path));
        }

        if (fs.existsSync(this.path)) {
            this.baseStream = fs.readFileSync(this.path);
        }

        fs.openSync(this.path, 'w');
    }

    flushData() {
        if (this.isFdDirty) {
            this.isFdDirty = false;
            fs.writeFileSync(this.path, this.baseStream);
        }
    }

    activate() {
        this.isActive = true;
    }
    
    deactivate() {
        this.isActive = false;
        this.isFdDirty = true;
    }

    readByte(address) {
        return this.baseStream[address];
    }

    readBytes(address, length) {
        return this.baseStream.slice(address, address + length);
    }

    writeByte(address, value) {
        this.baseStream[address] = value;
        this.isFdDirty = true;
    }
}

module.exports = ExternalStorage;
