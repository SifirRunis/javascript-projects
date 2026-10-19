class SimpleAssembler {
    constructor() {
        this.opcodes = {
            'HLT': 0x00, 'LDA': 0x01, 'STA': 0x02, 'LDB': 0x03,
            'ADD': 0x04, 'SUB': 0x05, 'AND': 0x06, 'OR': 0x07,
            'JMP': 0x08, 'JZ': 0x09, 'JC': 0x0A, 'INC': 0x0B,
            'DEC': 0x0C, 'XCHG': 0x0D, 'OUT': 0x0E, 'CMP': 0x0F
        };
        
        this.registerCodes = {
            'A': 0,
            'B': 1
        };
    }

    isRegister(arg) {
        return arg in this.registerCodes;
    }

    isNumber(str) {
        // Check if it is a dec number
        if (/^\d+$/.test(str)) return true;

        // Check if it is a hex number
        if (/^0x[0-9A-F]+$/i.test(str)) return true;

        if (/^\$[0-9A-F]+$/i.test(str)) return true;
        
        // Check if it is in immediate value format
        if (str.startsWith('#')) {
            const numStr = str.substring(1);
            return /^\d+$/.test(numStr) || /^0x[0-9A-F]+$/i.test(numStr) || /^\$[0-9A-F]+$/i.test(numStr);
        }
        return false;
    }

    assemble(source) {
        const lines = source.split('\n');
        const program = [];
        const symbols = {};
        const patchList = [];
        
        // First pass: resolve labels and compute instruction addresses
        let addr = 0;
        for (let i = 0; i < lines.length; i++) {
            let line = lines[i].split(';')[0].trim();
            if (!line) continue;
            
            if (line.endsWith(':')) {
                const label = line.slice(0, -1).trim().toUpperCase();
                symbols[label] = addr;
                continue;
            }
            
            const parts = line.split(/\s+/).filter(p => p);
            if (parts.length > 0) {
                addr += this.getInstructionLength(parts);
            }
        }
        
        // Second pass: generate machine code and patch forward references
        addr = 0;
        for (let i = 0; i < lines.length; i++) {
            let line = lines[i].split(';')[0].trim();
            if (!line || line.endsWith(':')) continue;
            
            const parts = line.split(/\s+/).filter(p => p);
            const mnemonic = parts[0].toUpperCase();
            
            if (parts.length === 1) {
                program.push((this.opcodes[mnemonic] << 4));
                addr++;
            } else {
                const arg = parts[1].toUpperCase();
                
                const isLabel = !this.isRegister(arg) && 
                                arg !== '[B]' && 
                                !arg.startsWith('#') && 
                                !this.isNumber(arg) &&
                                !(arg in symbols);
                
                if (isLabel && arg in symbols) {
                    const bytes = this.encodeInstruction(this.opcodes[mnemonic], arg, symbols, addr);
                    bytes.forEach(b => program.push(b));
                    addr += bytes.length;
                } else if (isLabel) {
                    const patchAddr = program.length + 1;
                    program.push((this.opcodes[mnemonic] << 4) | (1 << 2));  // DIR
                    program.push(0);  // Placeholder
                    patchList.push({ addr: patchAddr, label: arg });
                    addr += 2;
                } else {
                    const bytes = this.encodeInstruction(this.opcodes[mnemonic], arg, symbols, addr);
                    bytes.forEach(b => program.push(b));
                    addr += bytes.length;
                }
            }
        }
        
        for (const patch of patchList) {
            if (patch.label in symbols) {
                program[patch.addr] = symbols[patch.label];
            } else {
                throw new Error(`Undefined label: ${patch.label}`);
            }
        }
        return program;
    }

    getInstructionLength(parts) {
        if (parts.length === 1) return 1;
        
        const mnemonic = parts[0].toUpperCase();
        const arg = parts[1].toUpperCase();
        
        if (mnemonic === 'XCHG' || mnemonic === 'OUT' || mnemonic === 'HLT') {
            return 1;  // One-byte Instruction
        }
        if (mnemonic === 'INC' || mnemonic === 'DEC') {
            // Special case for INC and DEC
            return (arg === 'A' || arg === 'B' || arg === '[B]') ? 1 : 2;
        }
        if (arg === 'A' || arg === 'B') {
            return 1;  // REG
        }
        if (arg === '[B]') {
            return 1;  // IND
        }
        return 2;
    }

    encodeInstruction(opcode, arg, symbols, currentAddr) {
        let mode = 0;
        let reg = 0;
        let operand = 0;
        
        if (arg in this.registerCodes) {
            mode = 0; // REG
            reg = this.registerCodes[arg];
            return [(opcode << 4) | (mode << 2) | reg];
        }
        if (arg === '[B]') {
            mode = 3; // IND
            return [(opcode << 4) | (mode << 2)];
        }
        if (arg.startsWith('#')) {
            mode = 2; // IMM
            const valueStr = arg.substring(1);
            operand = this.parseValue(valueStr, currentAddr, symbols);
            return [(opcode << 4) | (mode << 2), operand];
        }
        mode = 1; // DIR
        operand = this.parseValue(arg, currentAddr, symbols);
        return [(opcode << 4) | (mode << 2), operand];
    }

    parseValue(str, currentAddr, symbols) {
        str = str.trim().toUpperCase();
        
        // Check if it's a defined symbol
        if (str in symbols) {
            return symbols[str];
        }

        // Parse hex number
        if (str.startsWith('$')) {
            const value = parseInt(str.substring(1), 16);
            if (isNaN(value)) {
                throw new Error(`Invalid hex number: "${str}"`);
            }
            return value & 0xFF;
        }

        if (str.startsWith('0X')) {
            const value = parseInt(str.substring(2), 16);
            if (isNaN(value)) {
                throw new Error(`Invalid hex number: "${str}"`);
            }
            return value & 0xFF;
        }
        
        // Parse dec number
        const value = parseInt(str, 10);
        if (isNaN(value)) {
            throw new Error(`Invalid number or undefined label: "${str}" at address ${currentAddr.toString(16)}`);
        }
        return value & 0xFF;
    }
}

if (typeof window !== 'undefined') {
    window.SimpleAssembler = SimpleAssembler;
}