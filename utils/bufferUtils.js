function trimBufferEnd(buffer) {
    let endOffset = 0
    for (var index = buffer.length - 1; index >= 0; index--) {
        if (buffer[index] !== 0x00) {
            endOffset = index;
            break
        }
    }

    return buffer.slice(0, endOffset + 1)
}

function logBuffer(buffer) {
    let buffArray = [];
    for (var index = 0; index < buffer.byteLength; index ++) {
        const rst = buffer[index].toString(16);
        buffArray.push(
            `0x${rst.padStart(2, 0).toUpperCase()}`
        );
    }

    console.log(
        JSON.stringify(buffArray)
    );
}

function serialize (buffer) {
    return buffer.toJSON().data;
}

function deserialize (buffer) {
    return Buffer.from(buffer);
}

module.exports = {
    logBuffer,
    trimBufferEnd,
    serialize,
    deserialize,
};
