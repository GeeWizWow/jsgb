
class Instruction {
    constructor(offset, operation, operand) {
        this.operation = operation;
        this.rawOperand = operand;
        this.offset = offset;
    }

    get operand8 () {
        return this.rawOperand.readInt8(0);
    }

    get operandU8 () {
        return this.rawOperand[0];
    }

    get operand16 () {
        return this.rawOperand.readUInt16LE(0);
    }

    execute (gameBoy) {
        return this.operation.implementation(
            gameBoy,
            this,
        );
    }
}

module.exports = Instruction;