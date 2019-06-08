function trimBufferEnd(buffer) {
    let endOffset = 0;
    for (var index = buffer.length - 1; index >= 0; index--) {
        if (buffer[index] !== 0x00) {
            endOffset = index;
            break;
        }
    }

    return buffer.slice(0, endOffset + 1);
}

function logBuffer(buffer) {
    let buffArray = [];
    for (var index = 0; index < buffer.byteLength; index++) {
        const rst = buffer[index].toString(16);
        buffArray.push(`0x${rst.padStart(2, 0).toUpperCase()}`);
    }

    console.log(JSON.stringify(buffArray));
}

function readInt8(buffer, addr) {
    if (!(buffer[addr] & 0x80)) {
        return buffer[addr];
    }

    return (0xff - buffer[addr] + 1) * -1;
}

function readUInt16LE(buffer, addr) {
    return buffer[addr] | (buffer[addr + 1] << 8);
}

function serialize(buffer) {
    let result = '';
    const data = new Uint8Array(buffer);

    for (let i = 0; i < data.byteLength; i++) {
        result += String.fromCharCode(data[i]);
    }

    return result;
}

function deserialize(str) {
    const result = new Uint8Array(str.length);
    for (let i = 0; i < str.length; i++) {
        result[i] = str.charCodeAt(i);
    }
    return result;
}

module.exports = {
    logBuffer,
    trimBufferEnd,
    serialize,
    deserialize,
    readInt8,
    readUInt16LE,
};
