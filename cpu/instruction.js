const { readInt8, readUInt16LE } = require('../utils/bufferUtils');

class Instruction {
    constructor(offset, operation, operand) {
        this.operation = operation;
        this.rawOperand = operand;
        this.offset = offset;
    }

    get operand8 () {
        return readInt8(this.rawOperand, 0);
    }

    get operandU8 () {
        return this.rawOperand[0];
    }

    get operand16 () {
        return readUInt16LE(this.rawOperand, 0);
    }

    execute (gameBoy) {
        return this.operation.implementation(
            gameBoy,
            this,
        );
    }
}

module.exports = Instruction;