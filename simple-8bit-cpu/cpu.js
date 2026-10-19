class Simple8BitCPU {
    constructor() {
        this.reset();
    }

    reset() {
        this.A = 0;
        this.B = 0;
        this.PC = 0;
        
        this.mem = new Uint8Array(256);
        
        this.halted = false;
        this.steps = 0;
        
        this.flags = {
            Z: false,
            C: false
        };
        
        this.debug = false;
    }

    setDebug(enabled) {
        this.debug = enabled;
    }

    load(program, addr = 0) {
        if (addr + program.length > 256) {
            throw new Error("Program exceeds memory size.");
        }
        for (let i = 0; i < program.length; i++) {
            this.mem[addr + i] = program[i] & 0xFF;
        }
        this.PC = addr;
    }

    getOperand(mode, operand) {
        switch(mode) {
            case 0:  // REG
                switch(operand) {
                    case 0: return this.A;
                    case 1: return this.B;
                    default:
                        throw new Error(`Invalid register number: ${operand}`);
                }
            
            case 1:  // DIR
                if (operand < 0 || operand > 255) {
                    throw new Error(`Memory address out of bounds: ${operand}`);
                }
                return this.mem[operand];
            
            case 2:  // IMM
                return operand;
            
            case 3:  // IND (via register B)
                const addr = this.B;
                if (addr < 0 || addr > 255) {
                    throw new Error(`Indirect address out of bounds: ${addr}`);
                }
                return this.mem[addr];
            
            default:
                throw new Error(`Invalid addressing modes: ${mode}`);
        }
    }

    setOperand(mode, operand, value) {
        value = value & 0xFF;
        
        switch(mode) {
            case 0:  // REG
                switch(operand) {
                    case 0: this.A = value; break;
                    case 1: this.B = value; break;
                    default:
                        throw new Error(`Invalid register number: ${operand}`);
                }
                break;
            
            case 1:  // DTR
                if (operand < 0 || operand > 255) {
                    throw new Error(`Memory address out of bounds: ${operand}`);
                }
                this.mem[operand] = value;
                break;

            case 3:  // IND (via register B)
                const addr = this.B;
                if (addr < 0 || addr > 255) {
                    throw new Error(`Indirect address out of bounds: ${addr}`);
                }
                this.mem[addr] = value;
                break;

            default:
                throw new Error(`Invalid destination addressing mode: ${mode}`);
        }
    }

    updateFlags(value) {
        this.flags.Z = (value === 0);
    }

    step() {
        if (this.halted) return false;

        const instruction = this.mem[this.PC];
        const currentPC = this.PC;

        if (this.debug) {
            console.log(`Step ${this.steps}: PC=0x${currentPC.toString(16).padStart(2, '0')}`);
            console.log(`  Instruction: 0x${instruction.toString(16).padStart(2, '0')}`);
        }

        const opcode = (instruction >> 4) & 0x0F;  // high 4 bits
        const mode = (instruction >> 2) & 0x03;    // middle 2 bits
        const reg = instruction & 0x03;            // low 2 bits (register number)

        let operand = reg;
        let hasImmediateOperand = false;

        if (mode === 1 || mode === 2 || 
            (mode === 0 && (opcode === 0x08 || opcode === 0x09 || opcode === 0x0A))) {
            operand = this.mem[this.PC + 1];
            hasImmediateOperand = true;
        }

        const opNames = {
            0x00: 'HLT', 0x01: 'LDA', 0x02: 'STA', 0x03: 'LDB',
            0x04: 'ADD', 0x05: 'SUB', 0x06: 'AND', 0x07: 'OR',
            0x08: 'JMP', 0x09: 'JZ',  0x0A: 'JC',  0x0B: 'INC',
            0x0C: 'DEC', 0x0D: 'XCHG', 0x0E: 'OUT', 0x0F: 'CMP'
        };

        const modeNames = ['REG', 'DIR', 'IMM', 'IND'];

        if (this.debug) {
            console.log(`  Decoding: OP=${opNames[opcode] || 'UNK'}, MODE=${modeNames[mode]}, REG=${reg}`);
            if (hasImmediateOperand) {
                console.log(`  Operand: 0x${operand.toString(16).padStart(2, '0')}`);
            }
            console.log(`  Before: A=0x${this.A.toString(16).padStart(2, '0')}, B=0x${this.B.toString(16).padStart(2, '0')}`);
        }

        // Execute instructions
        let pcIncrement = 1;
        
        switch(opcode) {
            case 0x00:  // HLT
                this.halted = true;
                if (this.debug) console.log('  HALTING...');
                break;

            case 0x01:  // LDA
                const valueLDA = this.getOperand(mode, operand);
                this.A = valueLDA;
                this.updateFlags(this.A);
                if (this.debug) console.log(`  LDA: A ← ${valueLDA}`);
                pcIncrement += hasImmediateOperand ? 1 : 0;
                break;

            case 0x02: // STA
              if (mode === 0) {
                throw new Error("STA cannot use register destination");
              }
              this.setOperand(mode, operand, this.A);
              if (this.debug) {
                if (mode === 1) {
                  console.log(` STA: [0x${operand.toString(16).padStart(2, '0')}] ← A(${this.A})`);
                } else if (mode === 3) {
                  console.log(` STA: [B](${this.B}) ← A(${this.A})`);
                }
              }
              pcIncrement += hasImmediateOperand ? 1 : 0;
              break;

            case 0x03:  // LDB
                const valueLDB = this.getOperand(mode, operand);
                this.B = valueLDB;
                this.updateFlags(this.B);
                if (this.debug) console.log(`  LDB: B ← ${valueLDB}`);
                pcIncrement += hasImmediateOperand ? 1 : 0;
                break;

            case 0x04:  // ADD
                const addValue = this.getOperand(mode, operand);
                const addResult = this.A + addValue;
                this.flags.C = (addResult > 0xFF);
                this.A = addResult & 0xFF;
                this.updateFlags(this.A);
                if (this.debug) console.log(`  ADD: A(${this.A - addValue}) + ${addValue} = ${this.A}, C=${this.flags.C}`);
                pcIncrement += hasImmediateOperand ? 1 : 0;
                break;

            case 0x05:  // SUB
                const subValue = this.getOperand(mode, operand);
                const subResult = this.A - subValue;
                this.flags.C = (subResult < 0);
                this.A = subResult & 0xFF;
                this.updateFlags(this.A);
                if (this.debug) console.log(`  SUB: A(${this.A + subValue}) - ${subValue} = ${this.A}, C=${this.flags.C}`);
                pcIncrement += hasImmediateOperand ? 1 : 0;
                break;

            case 0x06:  // AND
                const andValue = this.getOperand(mode, operand);
                this.A = this.A & andValue;
                this.updateFlags(this.A);
                if (this.debug) console.log(`  AND: A & ${andValue} = ${this.A}`);
                pcIncrement += hasImmediateOperand ? 1 : 0;
                break;

            case 0x07:  // OR
                const orValue = this.getOperand(mode, operand);
                this.A = this.A | orValue;
                this.updateFlags(this.A);
                if (this.debug) console.log(`  OR: A | ${orValue} = ${this.A}`);
                pcIncrement += hasImmediateOperand ? 1 : 0;
                break;

            case 0x08:  // JMP
                if (mode === 1 || mode === 2) {  // DIR or IMM
                    this.PC = operand;
                    if (this.debug) console.log(`  JMP to 0x${operand.toString(16).padStart(2, '0')}`);
                    this.steps++;
                    return true;
                }
                break;

            case 0x09:  // JZ
                if (this.flags.Z) {
                    this.PC = operand;
                    if (this.debug) console.log(`  JZ taken to 0x${operand.toString(16).padStart(2, '0')}\n`);
                    this.steps++;
                    return true;
                }
                pcIncrement += 1;
                break;

            case 0x0A:  // JC
                if (this.flags.C) {
                    this.PC = operand;
                    if (this.debug) console.log(`  JC taken to 0x${operand.toString(16).padStart(2, '0')}`);
                    this.steps++;
                    return true;
                }
                pcIncrement += 1;
                break;

            case 0x0B:  // INC
                if (mode === 0) {  // REG
                    if (reg === 0) {  // INC A
                        const oldA = this.A;
                        this.A = (this.A + 1) & 0xFF;
                        this.flags.C = (oldA === 0xFF);
                        this.updateFlags(this.A);
                        if (this.debug) console.log(`  INC A: ${oldA} → ${this.A}`);
                    } else if (reg === 1) {  // INC B
                        const oldB = this.B;
                        this.B = (this.B + 1) & 0xFF;
                        this.flags.C = (oldB === 0xFF);
                        this.updateFlags(this.B);
                        if (this.debug) console.log(`  INC B: ${oldB} → ${this.B}`);
                    }
                } else if (mode === 3) {  // IND [B]
                    const addr = this.B;
                    if (addr < 0 || addr > 255) {
                        throw new Error(`Indirect address out of bounds: ${addr}`);
                    }
                    const oldValue = this.mem[addr];
                    this.mem[addr] = (oldValue + 1) & 0xFF;
                    this.flags.C = (oldValue === 0xFF);
                    this.updateFlags(this.mem[addr]);
                    if (this.debug) console.log(`  INC [B]: mem[0x${addr.toString(16)}] = ${oldValue} → ${this.mem[addr]}`);
                }
                break;

            case 0x0C:  // DEC
                if (mode === 0) {  // REG
                    if (reg === 0) {  // DEC A
                        const oldA = this.A;
                        this.A = (this.A - 1) & 0xFF;
                        this.flags.C = (oldA === 0x00);
                        this.updateFlags(this.A);
                        if (this.debug) console.log(`  DEC A: ${oldA} → ${this.A}`);
                    } else if (reg === 1) {  // DEC B
                        const oldB = this.B;
                        this.B = (this.B - 1) & 0xFF;
                        this.flags.C = (oldB === 0x00);
                        this.updateFlags(this.B);
                        if (this.debug) console.log(`  DEC B: ${oldB} → ${this.B}`);
                    }
                } else if (mode === 3) {  // IND [B]
                    const addr = this.B;
                    if (addr < 0 || addr > 255) {
                        throw new Error(`Indirect address out of bounds: ${addr}`);
                    }
                    const oldValue = this.mem[addr];
                    this.mem[addr] = (oldValue - 1) & 0xFF;
                    this.flags.C = (oldValue === 0x00);
                    this.updateFlags(this.mem[addr]);
                    if (this.debug) console.log(`  DEC [B]: mem[0x${addr.toString(16)}] = ${oldValue} → ${this.mem[addr]}`);
                }
                break;

            case 0x0D:  // XCHG – Swap A and B
                const temp = this.A;
                this.A = this.B;
                this.B = temp;
                if (this.debug) console.log(`  XCHG: A↔B, now A=${this.A}, B=${this.B}`);
                break;

            case 0x0E:  // OUT - Output A
                console.log(`Output: ${this.A} (0x${this.A.toString(16).padStart(2, '0')})`);
                break;

            case 0x0F:  // CMP – Compare (set flags without storing result)
                const cmpValue = this.getOperand(mode, operand);
                const cmpResult = this.A - cmpValue;
                this.flags.Z = (cmpResult === 0);
                this.flags.C = (this.A < cmpValue);
                if (this.debug) console.log(`  CMP: A(${this.A}) - ${cmpValue}, Z=${this.flags.Z}, C=${this.flags.C}`);
                pcIncrement += hasImmediateOperand ? 1 : 0;
                break;

            default:
                throw new Error(`Unimplemented opcode: 0x${opcode.toString(16)}`);
        }

        // Update PC
        this.PC += pcIncrement;
        this.steps++;

        if (this.debug) {
            console.log(`  After: A=0x${this.A.toString(16).padStart(2, '0')}, B=0x${this.B.toString(16).padStart(2, '0')}`);
            console.log(`  Flags: Z=${this.flags.Z}, C=${this.flags.C}`);
            console.log(`  Next PC: 0x${this.PC.toString(16).padStart(2, '0')}\n`);
        }
        return true;
    }

    run(max = 1000) {
        while (this.steps < max && !this.halted) {
            if (!this.step()) break;
        }
        if (!this.halted && this.steps >= max) {
            console.warn(`Halted after ${max} steps.`);
        }
        return {
            A: this.A,
            B: this.B,
            PC: this.PC,
            steps: this.steps,
            halted: this.halted,
            flags: { ...this.flags }
        };
    }

    dumpMemory(start = 0, end = 255) {
        console.log(`Memory dump from 0x${start.toString(16).padStart(2, '0')} to 0x${end.toString(16).padStart(2, '0')}:`);
        for (let i = start; i <= end; i += 16) {
            const line = [];
            for (let j = 0; j < 16 && i + j <= end; j++) {
                line.push(this.mem[i + j].toString(16).padStart(2, '0'));
            }
            console.log(`0x${i.toString(16).padStart(2, '0')}: ${line.join(' ')}`);
        }
    }

    dumpRegisters() {
        console.log(`\nRegister status:`);
        console.log(`  A: 0x${this.A.toString(16).padStart(2, '0')} (${this.A})`);
        console.log(`  B: 0x${this.B.toString(16).padStart(2, '0')} (${this.B})`);
        console.log(`  PC: 0x${this.PC.toString(16).padStart(2, '0')}`);
        console.log(`  Steps: ${this.steps}`);
        console.log(`  Halted: ${this.halted}`);
        console.log(`  Flags: Z=${this.flags.Z}, C=${this.flags.C}`);
    }
}

if (typeof window !== 'undefined') {
    window.Simple8BitCPU = Simple8BitCPU;
}