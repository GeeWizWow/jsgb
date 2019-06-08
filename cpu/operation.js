
class Operation {
    constructor(assemblyName, opCode, opCode2, opLength, cycles, implementation) {
        this.assemblyName = assemblyName;
        this.opCode = opCode;
        this.opCode2 = opCode2;
        this.opLength = opLength;
        this.cycles = cycles;

        this.implementation = (gb, ins) => {
            implementation(gb, ins);
            return this.cycles;
        };
    }
}

module.exports = Operation;