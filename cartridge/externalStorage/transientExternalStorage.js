const BufferUtils = require('../../utils/bufferUtils');

class ExternalStorage {
    constructor() {
        this.baseStream = Buffer.alloc(0);
        this.isActive = false;
    }

    initialize(cartridge) {
        this.baseStream = Buffer.alloc(cartridge.getExternalRamSize());
        this.isActive = true;
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
    }

    activate() {
        this.isActive = true;
    }
    
    deactivate() {
        this.isActive = false;
    }

    readByte(address) {
        return this.baseStream[address];
    }

    readBytes(address, length) {
        return this.baseStream.slice(address, address + length);
    }

    writeByte(address, value) {
        this.baseStream[address] = value;
    }
}

module.exports = ExternalStorage;
