const REGISTER_FLAGS = require('../constants/registerFlags');

class Alu {
    constructor(register) {
        this.register = register;
    }

    perform16Bit(a, b, operation, affectedFlags) {
        const intermediate = operation(a, b);
        const result = intermediate & 0xffff;
        const carryBits = a ^ b ^ intermediate;
        const halfCarryBits = a ^ b ^ result;

        this.register.clearFlags(affectedFlags);

        let setAffected = REGISTER_FLAGS.NONE;

        if ((carryBits & 0x10000) == 0x10000) {
            setAffected |= REGISTER_FLAGS.C;
        }

        if ((halfCarryBits & 0x1000) == 0x1000) {
            setAffected |= REGISTER_FLAGS.H;
        }

        if (result == 0) {
            setAffected |= REGISTER_FLAGS.Z;
        }

        this.register.setFlags(setAffected & affectedFlags);

        return result;
    }

    perform16And8Bit(a, b, operation, affectedFlags) {
        const intermediate = operation(a, b);
        const result = intermediate & 0xffff;
        const carryBits = a ^ b ^ intermediate;

        this.register.clearFlags(affectedFlags);

        let setAffected = REGISTER_FLAGS.NONE;

        if ((carryBits & 0x100) == 0x100) {
            setAffected |= REGISTER_FLAGS.C;
        }

        if ((carryBits & 0x10) == 0x10) {
            setAffected |= REGISTER_FLAGS.H;
        }

        if (result == 0) {
            setAffected |= REGISTER_FLAGS.Z;
        }

        this.register.setFlags(setAffected & affectedFlags);

        return result;
    }

    perform(a, b, operation, affectedFlags) {
        const intermediate = operation(a, b);
        const result = intermediate & 0xff;
        const carryBits = a ^ b ^ intermediate;

        this.register.clearFlags(affectedFlags);

        let setAffected = REGISTER_FLAGS.NONE;

        if ((carryBits & 0x100) == 0x100) {
            setAffected |= REGISTER_FLAGS.C;
        }

        if ((carryBits & 0x10) == 0x10) {
            setAffected |= REGISTER_FLAGS.H;
        }

        if (result == 0) {
            setAffected |= REGISTER_FLAGS.Z;
        }

        this.register.setFlags(setAffected & affectedFlags);

        return result;
    }

    add(a, b, affectedFlags = REGISTER_FLAGS.NONE, setFlags = REGISTER_FLAGS.NONE, resetFlags = REGISTER_FLAGS.NONE) {
        this.register.clearFlags(resetFlags);
        this.register.setFlags(setFlags);

        return this.perform(a, b, (x, y) => x + y, affectedFlags);
    }

    add16Bit(a, b, affectedFlags = REGISTER_FLAGS.NONE, setFlags = REGISTER_FLAGS.NONE, resetFlags = REGISTER_FLAGS.NONE) {
        this.register.clearFlags(resetFlags);
        this.register.setFlags(setFlags);

        return this.perform16Bit(a, b, (x, y) => x + y, affectedFlags);
    }

    add16And8Bit(a, b, affectedFlags = REGISTER_FLAGS.NONE, setFlags = REGISTER_FLAGS.NONE, resetFlags = REGISTER_FLAGS.NONE) {
        this.register.clearFlags(resetFlags);
        this.register.setFlags(setFlags);

        return this.perform16And8Bit(a, b, (x, y) => x + y, affectedFlags);
    }

    sub(a, b, affectedFlags = REGISTER_FLAGS.NONE, setFlags = REGISTER_FLAGS.NONE, resetFlags = REGISTER_FLAGS.NONE) {
        this.register.clearFlags(resetFlags);
        this.register.setFlags(setFlags);

        return this.perform(a, b, (x, y) => x - y, affectedFlags);
    }

    sub16Bit(a, b, affectedFlags = REGISTER_FLAGS.NONE, setFlags = REGISTER_FLAGS.NONE, resetFlags = REGISTER_FLAGS.NONE) {
        this.register.clearFlags(resetFlags);
        this.register.setFlags(setFlags);

        return this.perform16Bit(a, b, (x, y) => x - y, affectedFlags);
    }

    adc(a, b, affectedFlags = REGISTER_FLAGS.NONE, setFlags = REGISTER_FLAGS.NONE, resetFlags = REGISTER_FLAGS.NONE) {
        this.register.clearFlags(resetFlags);
        this.register.setFlags(setFlags);

        return this.perform(a, b, (x, y) => x + y + (this.register.getFlags(REGISTER_FLAGS.C) ? 1 : 0), affectedFlags);
    }

    sbc(a, b, affectedFlags = REGISTER_FLAGS.NONE, setFlags = REGISTER_FLAGS.NONE, resetFlags = REGISTER_FLAGS.NONE) {
        this.register.clearFlags(resetFlags);
        this.register.setFlags(setFlags);

        return this.perform(a, b, (x, y) => x - (y + (this.register.getFlags(REGISTER_FLAGS.C) ? 1 : 0)), affectedFlags);
    }

    and(a) {
        const intermediate = this.register.A & a;
        const result = intermediate & 0xff;

        this.register.overwriteFlags(REGISTER_FLAGS.H | (result == 0 ? REGISTER_FLAGS.Z : REGISTER_FLAGS.NONE));

        return result;
    }

    xor(a) {
        const intermediate = this.register.A ^ a;
        const result = intermediate & 0xff;

        this.register.overwriteFlags(result == 0 ? REGISTER_FLAGS.Z : REGISTER_FLAGS.NONE);

        return result;
    }

    or(a) {
        const intermediate = this.register.A | a;
        const result = intermediate & 0xff;

        this.register.overwriteFlags(result == 0 ? REGISTER_FLAGS.Z : REGISTER_FLAGS.NONE);

        return result;
    }

    cp(a) {
        return this.sub(
            this.register.A, 
            a, 
            REGISTER_FLAGS.Z | REGISTER_FLAGS.H | REGISTER_FLAGS.C, REGISTER_FLAGS.N
        );
    }

    rl(a, affectedFlags = REGISTER_FLAGS.NONE, setFlags = REGISTER_FLAGS.NONE, resetFlags = REGISTER_FLAGS.NONE) {
        const newValue = ((a << 1) | (this.register.getFlags(REGISTER_FLAGS.C) ? 1 : 0)) & 0xff;

        this.register.clearFlags(affectedFlags | resetFlags);
        this.register.setFlags(setFlags);

        let setAffected = REGISTER_FLAGS.NONE;

        if (newValue == 0) {
            setAffected |= REGISTER_FLAGS.Z;
        }

        if ((a & (1 << 7)) == (1 << 7)) {
            setAffected |= REGISTER_FLAGS.C;
        }

        this.register.setFlags(setAffected & affectedFlags);

        return newValue;
    }

    rlc(a, affectedFlags = REGISTER_FLAGS.NONE, setFlags = REGISTER_FLAGS.NONE, resetFlags = REGISTER_FLAGS.NONE) {
        const newValue = ((a << 1) | (a >> 7)) & 0xff;

        this.register.clearFlags(affectedFlags | resetFlags);
        this.register.setFlags(setFlags);

        let setAffected = REGISTER_FLAGS.NONE;

        if (newValue == 0) {
            setAffected |= REGISTER_FLAGS.Z;
        }

        if ((a & (1 << 7)) == (1 << 7)) {
            setAffected |= REGISTER_FLAGS.C;
        }

        this.register.setFlags(setAffected & affectedFlags);

        return newValue;
    }

    rr(a, affectedFlags = REGISTER_FLAGS.NONE, setFlags = REGISTER_FLAGS.NONE, resetFlags = REGISTER_FLAGS.NONE) {
        const newValue = (a >> 1) | (this.register.getFlags(REGISTER_FLAGS.C) ? 1 << 7 : 0);

        this.register.clearFlags(affectedFlags | resetFlags);
        this.register.setFlags(setFlags);

        let setAffected = REGISTER_FLAGS.NONE;

        if (newValue == 0) {
            setAffected |= REGISTER_FLAGS.Z;
        }

        if ((a & 1) == 1) {
            setAffected |= REGISTER_FLAGS.C;
        }

        this.register.setFlags(setAffected & affectedFlags);

        return newValue;
    }

    rrc(a, affectedFlags = REGISTER_FLAGS.NONE, setFlags = REGISTER_FLAGS.NONE, resetFlags = REGISTER_FLAGS.NONE) {
        const newValue = (a >> 1) | ((a & 1) << 7);

        this.register.clearFlags(affectedFlags | resetFlags);
        this.register.setFlags(setFlags);

        let setAffected = REGISTER_FLAGS.NONE;

        if (newValue == 0) {
            setAffected |= REGISTER_FLAGS.Z;
        }

        if ((a & 1) == 1) {
            setAffected |= REGISTER_FLAGS.C;
        }

        this.register.setFlags(setAffected & affectedFlags);

        return newValue;
    }

    sla(a) {
        const newValue = (a << 1) & 0xFF;

        let setAffected = REGISTER_FLAGS.NONE;

        if (newValue == 0) {
            setAffected |= REGISTER_FLAGS.Z;
        } 

        if ((a & (1 << 7)) == (1 << 7)) {
            setAffected |= REGISTER_FLAGS.C;
        }

        this.register.overwriteFlags(setAffected);

        return newValue;
    }

    sr(a, rst) {
        let newValue = a >> 1;

        if (!rst) {
            newValue |= a & (1 << 7);
        }

        let setAffected = REGISTER_FLAGS.NONE;

        if (newValue == 0) {
            setAffected |= REGISTER_FLAGS.Z;
        } 

        if ((a & 1) == 1) {
            setAffected |= REGISTER_FLAGS.C;
        }

        this.register.overwriteFlags(setAffected);

        return newValue;
    }

    swap(a) {
        const newValue = ((a & 0xF) << 4) | ((a & 0xF0) >> 4);
        const setAffected = newValue == 0 ? REGISTER_FLAGS.Z : REGISTER_FLAGS.NONE;

        this.register.overwriteFlags(setAffected);

        return newValue;
    }

    set(a, pos) {
        return a | (1 << pos);
    }

    res(a, pos) {
        return a & ~(1 << pos);
    }

    bit(a, pos) {
        const C = this.register.getFlags(REGISTER_FLAGS.C) ? REGISTER_FLAGS.C : REGISTER_FLAGS.NONE;
        const Z = ((a >> pos) & 1) == 0 ? REGISTER_FLAGS.Z : REGISTER_FLAGS.NONE;

        this.register.overwriteFlags(Z | REGISTER_FLAGS.H | C);
    }

    inc(a, affectedFlags = REGISTER_FLAGS.NONE, setFlags = REGISTER_FLAGS.NONE, resetFlags = REGISTER_FLAGS.NONE) {
        return this.add(a, 1, affectedFlags, setFlags, resetFlags);
    }

    inc16Bit(a, affectedFlags = REGISTER_FLAGS.NONE, setFlags = REGISTER_FLAGS.NONE, resetFlags = REGISTER_FLAGS.NONE) {
        return this.add16Bit(a, 1, affectedFlags, setFlags, resetFlags);
    }

    dec(a, affectedFlags = REGISTER_FLAGS.NONE, setFlags = REGISTER_FLAGS.NONE, resetFlags = REGISTER_FLAGS.NONE) {
        return this.sub(a, 1, affectedFlags, setFlags, resetFlags);
    }

    dec16Bit(a, affectedFlags = REGISTER_FLAGS.NONE, setFlags = REGISTER_FLAGS.NONE, resetFlags = REGISTER_FLAGS.NONE) {
        return this.sub16Bit(a, 1, affectedFlags, setFlags, resetFlags);
    }

    cpl(a) {
        this.register.setFlags(REGISTER_FLAGS.N | REGISTER_FLAGS.H);
        return ~a & 0xff;
    }

    ccf() {
        if (this.register.getFlags(REGISTER_FLAGS.C)) {
            this.register.clearFlags(REGISTER_FLAGS.C);
        } else {
            this.register.setFlags(REGISTER_FLAGS.C);
        }

        this.register.clearFlags(REGISTER_FLAGS.N | REGISTER_FLAGS.H);
    }

    daa() {
        let a = this.register.A;
        let correction = 0;
        let setFlagC = REGISTER_FLAGS.NONE;

        if (this.register.getFlags(REGISTER_FLAGS.H) || (!this.register.getFlags(REGISTER_FLAGS.N) && (a & 0xF) > 9)) {
            correction |= 0x6;
        }

        if (this.register.getFlags(REGISTER_FLAGS.C) || (!this.register.getFlags(REGISTER_FLAGS.N) && a > 0x99)) {
            correction |= 0x60;
            setFlagC = REGISTER_FLAGS.C;
        }

        a += this.register.getFlags(REGISTER_FLAGS.N) ? -correction : correction;
        a &= 0xFF;

        var setFlagZ = a == 0 ? REGISTER_FLAGS.Z : REGISTER_FLAGS.NONE;
        var newFlags = this.register.F & ~(REGISTER_FLAGS.H | REGISTER_FLAGS.Z | REGISTER_FLAGS.C);

        newFlags |= setFlagC | setFlagZ;
        
        this.register.overwriteFlags(newFlags);
        this.register.A = a & 0xff;
    }
}

module.exports = Alu;
