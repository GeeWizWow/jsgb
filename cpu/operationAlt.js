
class Operation {
    constructor(assemblyName, opCode, opCode2, opLength, cycles, cyclesAlt, implementation) {
        this.assemblyName = assemblyName;
        this.opCode = opCode;
        this.opCode2 = opCode2;
        this.opLength = opLength;
        this.cycles = cycles;
        this.cyclesAlt = cyclesAlt;
        this.implementation = implementation;
    }
}

module.exports = Operation;