// Constants & Global State
let cpu, asm;
let program = null;
let runInterval = null;
const RUN_DELAY = 200;

// DOM Elements
const asmInput = document.getElementById('asmInput');
const btnAssemble = document.getElementById('btnAssemble');
const btnLoad = document.getElementById('btnLoad');
const btnExample = document.getElementById('btnExample');
const btnSave = document.getElementById('btnSave');
const btnClear = document.getElementById('btnClear');
const btnStep = document.getElementById('btnStep');
const btnRun = document.getElementById('btnRun');
const btnPause = document.getElementById('btnPause');
const btnReset = document.getElementById('btnReset');
const btnSaveLog = document.getElementById('btnSaveLog');
const btnClearLog = document.getElementById('btnClearLog');
const outputDiv = document.getElementById('output');
const debugLog = document.getElementById('debugLog');
const memoryView = document.getElementById('memoryView');

// Save code or log to File
function saveToFile() {
  const code = asmInput.value.trim();
  saveContentToFile(code, 'assembly', 'asm', '汇编代码');
}

function saveLogToFile() {
  const log = debugLog.textContent.trim();
  saveContentToFile(log, 'debug_log', 'txt', '调试日志');
}

function saveContentToFile(content, prefix, extension, description) {
  if (!content) {
    alert(`没有内容可保存！${description}为空。`);
    return;
  }
  
  try {
    const isAssembly = extension === 'asm';
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[-:T]/g, '_');
    const filename = `${prefix}_${timestamp}.${extension}`;
    
    const commentChar = isAssembly ? '; ' : '';
    const fullContent = `${commentChar}8位CPU模拟器 - ${description}\n${commentChar}保存时间: ${new Date().toLocaleString()}\n\n${content}\n`;
    
    const blob = new Blob([fullContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 100);
    
    console.log(`${description}已保存为: ${filename}`);
  } catch (error) {
    console.error(`保存${description}文件失败:`, error);
    alert(`保存失败: ${error.message}`);
  }
}

// Display logs in debug panel
const originalLog = console.log;
console.log = function (...args) {
  const timestamp = new Date().toLocaleTimeString();
  const logMessage = `[${timestamp}] ${args.map(a =>
    typeof a === 'object' ? JSON.stringify(a) : String(a)
  ).join(' ')}`;
  debugLog.textContent += logMessage + '\n';
  debugLog.scrollTop = debugLog.scrollHeight;
  originalLog.apply(console, args);
};

// Initialize CPU and Assembler, bind UI state
function init() {
  try {
    cpu = new Simple8BitCPU();
    asm = new SimpleAssembler();
    console.log('CPU 和汇编器初始化成功');
    updateUI();
    pauseRun();
    btnLoad.disabled = true;
  } catch (error) {
    console.error('初始化失败:', error);
    alert('初始化失败:' + error.message);
  }
}

// Update all UI components to reflect current CPU state
function updateUI() {
  document.getElementById('regA').textContent = '0x' + cpu.A.toString(16).padStart(2, '0');
  document.getElementById('regB').textContent = '0x' + cpu.B.toString(16).padStart(2, '0');
  document.getElementById('regPC').textContent = '0x' + cpu.PC.toString(16).padStart(2, '0');
  document.getElementById('flagZ').textContent = String(cpu.flags.Z);
  document.getElementById('flagC').textContent = String(cpu.flags.C);
  document.getElementById('steps').textContent = cpu.steps;
  document.getElementById('halted').textContent = String(cpu.halted);
  renderMemory();
}

// Render memory view with PC highlight
function renderMemory() {
  let html = '';
  for (let i = 0; i < 256; i += 16) {
    let row = `0x${i.toString(16).padStart(2, '0')}: `;
    for (let j = 0; j < 16; j++) {
      const addr = i + j;
      const val = cpu.mem[addr];
      const isPC = addr === cpu.PC;
      const cls = isPC ? ' style="background:#ffeb3b"' : '';
      row += `<span${cls}>${val.toString(16).padStart(2, '0')}</span> `;
    }
    html += row + '<br>';
  }
  memoryView.innerHTML = html;
}

// Clear both output and debug logs
function clearLogs() {
  debugLog.textContent = '';
  outputDiv.textContent = '';
}

// Pause continuous execution
function pauseRun() {
  if (runInterval) {
    clearInterval(runInterval);
    runInterval = null;
  }
  btnRun.disabled = false;
  btnPause.disabled = true;
  btnStep.disabled = false;
  cpu.setDebug(true);
}

// Capture and display OUT instruction output
function captureOutput(value) {
  const timestamp = new Date().toLocaleTimeString();
  outputDiv.textContent += `[${timestamp}] Output: 0x${value.toString(16).padStart(2, '0')} (${value})\n`;
  outputDiv.scrollTop = outputDiv.scrollHeight;
}

// Execute one CPU step and handle OUT instruction
function executeSingleStep() {
  if (cpu.halted) {
    alert('CPU 已停止运行，点击“重置”以重新启动');
    return;
  }
  cpu.setDebug(true);
  const pcBefore = cpu.PC;
  const instruction = cpu.mem[pcBefore];
  const opcode = (instruction >> 4) & 0x0F;

  try {
    cpu.step();
    console.log(`单步执行: PC=0x${pcBefore.toString(16).padStart(2, '0')}, instruction=0x${instruction.toString(16).padStart(2, '0')}`);
    updateUI();

    if (opcode === 0x0E) {  // OUT instruction
      captureOutput(cpu.A);
      console.log(`OUT 指令输出: A=0x${cpu.A.toString(16).padStart(2, '0')} (${cpu.A})`);
    }
  } catch (e) {
    console.error('执行错误: ', e);
    alert('执行错误: ' + e.message);
  }
}

// Start continuous CPU execution
function startRun() {
  if (cpu.halted) {
    alert('CPU 已停止运行，点击“重置”以重新启动');
    return;
  }

  btnRun.disabled = true;
  btnPause.disabled = false;
  btnStep.disabled = true;
  cpu.setDebug(false);  // Reduce log spam
  console.log('开始连续运行...');

  runInterval = setInterval(() => {
    if (cpu.halted) {
      pauseRun();
      console.log('程序执行完毕！');
      return;
    }

    const pcBefore = cpu.PC;
    const instruction = cpu.mem[pcBefore];
    const opcode = (instruction >> 4) & 0x0F;

    try {
      cpu.step();
      updateUI();
      if (opcode === 0x0E) {
        captureOutput(cpu.A);
      }
    } catch (e) {
      pauseRun();
      console.error('运行错误: ', e);
      alert('运行错误: ' + e.message);
    }
  }, RUN_DELAY);
}

// Reset CPU to initial state
function resetCPU() {
  cpu = new Simple8BitCPU();
  clearLogs();
  updateUI();
  pauseRun();
  console.log('CPU 已重置');
}

// Load a built-in example assembly program
function loadExample() {
  asmInput.value = `LDA #10     ; A = 10
STA $80     ; mem[0x80] = A (=> 10)
LDB #$80    ; B = 0x80 = 128
LDA #20     ; A = 20
STA [B]     ; mem[B] = A (=> 20)
LDA $80     ; A = mem[0x80] = 20
OUT
HLT`;
  console.log('已加载示例代码');
}

// Clear assembly input and program
function clearCode() {
  asmInput.value = '';
  program = null;
  console.log('代码已清空');
  btnLoad.disabled = true;
}

// Assemble user-written assembly code
function assembleCode() {
  const code = asmInput.value.trim();
  
  if (!code) {
    alert('请先输入汇编代码！');
    asmInput.focus();
    return;
  }
  
  const lines = code.split('\n').filter(line => {
    const trimmed = line.trim();
    return trimmed && !trimmed.startsWith(';');
  });
  
  if (lines.length === 0) {
    alert('未检测到有效代码！请至少输入一条指令。');
    return;
  }
  
  try {
    program = asm.assemble(code);
    const byteCount = program.length;
    console.log(`汇编成功！共 ${byteCount} 字节`);
    alert(`汇编成功！\n已生成 ${byteCount} 字节的机器码\n程序计数器（PC）将从 0x00 开始执行`);
    
    btnLoad.disabled = false;
  } catch (e) {
    console.error('汇编错误: ', e);
    alert('汇编错误:\n' + e.message);
    program = null;
    btnLoad.disabled = true;
  }
}

// Load assembled program into CPU memory
function loadProgram() {
  if (!program) {
    alert('请先进行汇编！');
    return;
  }
  try {
    cpu = new Simple8BitCPU();
    cpu.load(program);
    clearLogs();
    updateUI();
    pauseRun();
    console.log('程序已加载到内存，准备执行');
    console.log('程序字节: ', program.map(b => '0x' + b.toString(16).padStart(2, '0')).join(' '));
  } catch (e) {
    console.error('加载失败: ', e);
    alert('加载失败: ' + e.message);
  }
}

// Applies custom CSS styles to <code> elements
function applyHelpStyles() {
  const style = document.createElement('style');
  style.textContent = `
    code {
      font-size: 15px !important;
      font-family: monospace;
    }
  `;
  document.head.appendChild(style);
}

// Dynamically generate help modal content
function generateHelpContent() {
  const content = document.getElementById('helpContent');
  const html = `
<h3>寻址模式</h3>
<table border="1" style="width:100%; border-collapse:collapse; margin-bottom:20px;">
  <thead><tr><th>模式码</th><th>名称</th><th>说明</th></tr></thead>
  <tbody>
    <tr><td>00</td><td>REG</td><td>操作对象是寄存器：0=A, 1=B</td></tr>
    <tr><td>01</td><td>DIR</td><td>直接寻址，如 <code>LDA 0x40</code></td></tr>
    <tr><td>10</td><td>IMM</td><td>立即数，如 <code>LDA #10</code></td></tr>
    <tr><td>11</td><td>IND</td><td>间接寻址，如 <code>LDA [B]</code></td></tr>
  </tbody>
</table>

<h3>指令列表</h3>
<table border="1" style="width:100%; border-collapse:collapse;">
  <thead>
    <tr>
      <th>指令</th>
      <th>助记符</th>
      <th>功能</th>
      <th>支持模式</th>
      <th>影响标志</th>
    </tr>
  </thead>
  <tbody>
    <tr><td>0x00</td><td>HLT</td><td>停机</td><td>—</td><td>—</td></tr>
    <tr><td>0x01</td><td>LDA</td><td>加载到 A</td><td>REG, DIR, IMM, IND</td><td>Z</td></tr>
    <tr><td>0x02</td><td>STA</td><td>存储 A</td><td>DIR, IND</td><td>—</td></tr>
    <tr><td>0x03</td><td>LDB</td><td>加载到 B</td><td>REG, DIR, IMM, IND</td><td>Z</td></tr>
    <tr><td>0x04</td><td>ADD</td><td>A ← A + 操作数</td><td>REG, DIR, IMM, IND</td><td>Z, C</td></tr>
    <tr><td>0x05</td><td>SUB</td><td>A ← A - 操作数</td><td>REG, DIR, IMM, IND</td><td>Z, C</td></tr>
    <tr><td>0x06</td><td>AND</td><td>A ← A & 操作数</td><td>REG, DIR, IMM, IND</td><td>Z</td></tr>
    <tr><td>0x07</td><td>OR</td><td>A ← A | 操作数</td><td>REG, DIR, IMM, IND</td><td>Z</td></tr>
    <tr><td>0x08</td><td>JMP</td><td>无条件跳转</td><td>DIR, IMM</td><td>—</td></tr>
    <tr><td>0x09</td><td>JZ</td><td>若 Z=1 则跳转</td><td>DIR, IMM</td><td>—</td></tr>
    <tr><td>0x0A</td><td>JC</td><td>若 C=1 则跳转</td><td>DIR, IMM</td><td>—</td></tr>
    <tr><td>0x0B</td><td>INC</td><td>目标加 1</td><td>REG, IND</td><td>Z, C</td></tr>
    <tr><td>0x0C</td><td>DEC</td><td>目标减 1</td><td>REG, IND</td><td>Z, C</td></tr>
    <tr><td>0x0D</td><td>XCHG</td><td>交换 A 和 B</td><td>—</td><td>—</td></tr>
    <tr><td>0x0E</td><td>OUT</td><td>输出 A</td><td>—</td><td>—</td></tr>
    <tr><td>0x0F</td><td>CMP</td><td>比较 A 与操作数（不修改 A）</td><td>REG, DIR, IMM, IND</td><td>Z, C</td></tr>
  </tbody>
</table>

<h3>汇编语法说明</h3>
<ul>
  <li><strong>寄存器</strong>： <code>A</code>, <code>B</code></li>
  <li><strong>立即数</strong>： <code>#5</code>, <code>#0x80</code>, <code>#$10</code></li>
  <li><strong>直接地址</strong>： <code>0x30</code>, <code>48</code>, <code>$30</code></li>
  <li><strong>间接寻址</strong>： <code>[B]</code></li>
  <li><strong>标签</strong>：如 <code>loop:</code> 和 <code>JMP loop</code></li>
  <li><strong>注释</strong>：以 <code>;</code> 开头</li>
</ul>
  `;
  content.innerHTML = html;
}

// Event Listeners
function bindEvents() {
  btnAssemble.addEventListener('click', assembleCode);
  btnLoad.addEventListener('click', loadProgram);
  btnExample.addEventListener('click', loadExample);
  btnClear.addEventListener('click', clearCode);
  btnSave.addEventListener('click', saveToFile);
  btnStep.addEventListener('click', executeSingleStep);
  btnRun.addEventListener('click', startRun);
  btnPause.addEventListener('click', pauseRun);
  btnReset.addEventListener('click', resetCPU);
  btnSaveLog.addEventListener('click', saveLogToFile);
  btnClearLog.addEventListener('click', () => {
    debugLog.textContent = '';
    console.log('调试日志已清空');
  });

  // Help modal
  const btnHelp = document.getElementById('btnHelp');
  const btnCloseHelp = document.getElementById('btnCloseHelp');
  const helpModal = document.getElementById('helpModal');

  btnHelp.addEventListener('click', () => {
    generateHelpContent();
    helpModal.style.display = 'block';
  });

  btnCloseHelp.addEventListener('click', () => {
    helpModal.style.display = 'none';
  });

  helpModal.addEventListener('click', (e) => {
    if (e.target === helpModal) {
      helpModal.style.display = 'none';
    }
  });
}

// Application Entry Point
document.addEventListener('DOMContentLoaded', function () {
  init();
  bindEvents();
  applyHelpStyles();
  console.log('Web UI 初始化成功');
});