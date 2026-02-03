<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref } from "vue";

type ConnState = "idle" | "connecting" | "open" | "closed" | "error";

type ConnStat = {
  id: number;
  state: ConnState;
  ws?: WebSocket;

  // counters
  connectAttempts: number;
  opens: number;
  closes: number;
  errors: number;
  reconnects: number;

  sent: number;
  received: number;

  // last info
  lastOpenAt?: number;
  lastCloseAt?: number;
  lastErrorAt?: number;
  lastCloseCode?: number;
  lastCloseReason?: string;

  // RTT
  lastRttMs?: number;
  avgRttMs?: number;
  rttSamples: number;

  // timers
  hbTimer?: number;
  sendTimer?: number;
  reconnectTimer?: number;
};

type AppState = {
  // config
  url: string;
  count: number;
  batchSize: number;
  batchIntervalMs: number;

  autoReconnect: boolean;
  reconnectBaseDelayMs: number;
  reconnectMaxDelayMs: number;

  heartbeatEnabled: boolean;
  heartbeatIntervalMs: number;
  heartbeatPayload: string;

  // sending
  sendMode: "manual" | "interval" | "random";
  sendIntervalMs: number;
  sendPayload: string;
  randomMinMs: number;
  randomMaxMs: number;

  // protocol
  measureRtt: boolean;
  rttPayloadPrefix: string; // client will send `${prefix}${ts}`
  rttEchoMode: "server-echo" | "client-loopback";
};

const state = reactive<AppState>({
  url: "ws://192.168.1.19:11103/websocket",
  count: 20,
  batchSize: 5,
  batchIntervalMs: 200,

  autoReconnect: true,
  reconnectBaseDelayMs: 500,
  reconnectMaxDelayMs: 10000,

  heartbeatEnabled: true,
  heartbeatIntervalMs: 5000,
  heartbeatPayload: "PING",

  sendMode: "manual",
  sendIntervalMs: 1000,
  sendPayload: "hello",
  randomMinMs: 200,
  randomMaxMs: 1200,

  measureRtt: false,
  rttPayloadPrefix: "__rtt__:",
  rttEchoMode: "server-echo",
});

const logs = ref<string[]>([]);
function log(msg: string) {
  const line = `[${new Date().toLocaleTimeString()}] ${msg}`;
  logs.value.unshift(line);
  if (logs.value.length > 500) logs.value.pop();
}

const conns = reactive<ConnStat[]>([]);
const running = ref(false);

function createConn(id: number): ConnStat {
  return {
    id,
    state: "idle",
    connectAttempts: 0,
    opens: 0,
    closes: 0,
    errors: 0,
    reconnects: 0,
    sent: 0,
    received: 0,
    rttSamples: 0,
  };
}

function clearTimers(c: ConnStat) {
  if (c.hbTimer) window.clearInterval(c.hbTimer);
  if (c.sendTimer) window.clearInterval(c.sendTimer);
  if (c.reconnectTimer) window.clearTimeout(c.reconnectTimer);
  c.hbTimer = undefined;
  c.sendTimer = undefined;
  c.reconnectTimer = undefined;
}

function closeConn(c: ConnStat, code = 1000, reason = "client stop") {
  clearTimers(c);
  try {
    c.ws?.close(code, reason);
  } catch { }
  c.ws = undefined;
  c.state = "closed";
}

function stopAll() {
  running.value = false;
  for (const c of conns) closeConn(c);
  log(`STOP all connections`);
}

function scheduleReconnect(c: ConnStat) {
  if (!state.autoReconnect || !running.value) return;

  c.reconnects += 1;
  const attempt = c.reconnects;
  const delay = Math.min(
    state.reconnectMaxDelayMs,
    state.reconnectBaseDelayMs * Math.pow(2, Math.min(6, attempt - 1))
  );

  c.reconnectTimer = window.setTimeout(() => {
    if (!running.value) return;
    connectOne(c);
  }, delay);

  log(`conn#${c.id} reconnect scheduled in ${delay}ms (attempt ${attempt})`);
}

function updateRtt(c: ConnStat, rttMs: number) {
  c.lastRttMs = rttMs;
  c.rttSamples += 1;
  if (!c.avgRttMs) c.avgRttMs = rttMs;
  else c.avgRttMs = (c.avgRttMs * (c.rttSamples - 1) + rttMs) / c.rttSamples;
}

function connectOne(c: ConnStat) {
  clearTimers(c);
  c.state = "connecting";
  c.connectAttempts += 1;

  let ws: WebSocket;
  try {
    ws = new WebSocket(state.url);
  } catch (e: any) {
    c.state = "error";
    c.errors += 1;
    c.lastErrorAt = Date.now();
    log(`conn#${c.id} new WebSocket failed: ${String(e?.message ?? e)}`);
    scheduleReconnect(c);
    return;
  }

  c.ws = ws;

  ws.onopen = () => {
    c.state = "open";
    c.opens += 1;
    c.lastOpenAt = Date.now();
    log(`conn#${c.id} OPEN`);

    // heartbeat
    if (state.heartbeatEnabled) {
      c.hbTimer = window.setInterval(() => {
        if (ws.readyState !== WebSocket.OPEN) return;
        try {
          ws.send(state.heartbeatPayload);
          c.sent += 1;
        } catch { }
      }, state.heartbeatIntervalMs);
    }

    // sending mode
    if (state.sendMode === "interval") {
      c.sendTimer = window.setInterval(() => {
        if (ws.readyState !== WebSocket.OPEN) return;
        sendPayload(ws, c, state.sendPayload);
      }, state.sendIntervalMs);
    } else if (state.sendMode === "random") {
      // use interval tick to trigger randomized delay (simple but effective)
      c.sendTimer = window.setInterval(() => {
        if (ws.readyState !== WebSocket.OPEN) return;
        const delay = randInt(state.randomMinMs, state.randomMaxMs);
        window.setTimeout(() => {
          if (ws.readyState !== WebSocket.OPEN) return;
          sendPayload(ws, c, state.sendPayload);
        }, delay);
      }, Math.max(100, Math.min(state.randomMinMs, 1000)));
    }
  };

  ws.onmessage = (ev) => {
    c.received += 1;

    const data =
      typeof ev.data === "string"
        ? ev.data
        : ev.data instanceof ArrayBuffer
          ? `[ArrayBuffer ${ev.data.byteLength}]`
          : `[Binary]`;

    // RTT measuring: two modes
    if (state.measureRtt && typeof ev.data === "string") {
      if (state.rttEchoMode === "server-echo") {
        // expect server to echo back same payload: "__rtt__:timestamp"
        if (data.startsWith(state.rttPayloadPrefix)) {
          const tsStr = data.slice(state.rttPayloadPrefix.length).trim();
          const ts = Number(tsStr);
          if (!Number.isNaN(ts) && ts > 0) updateRtt(c, Date.now() - ts);
        }
      } else {
        // client-loopback: if server doesn't echo, measure between send and next recv as approximation (weak)
        // handled in sendPayload
      }
    }
  };

  ws.onerror = () => {
    c.state = "error";
    c.errors += 1;
    c.lastErrorAt = Date.now();
    log(`conn#${c.id} ERROR`);
    // note: onclose usually follows; reconnect handled there
  };

  ws.onclose = (ev) => {
    clearTimers(c);
    c.state = "closed";
    c.closes += 1;
    c.lastCloseAt = Date.now();
    c.lastCloseCode = ev.code;
    c.lastCloseReason = ev.reason;
    c.ws = undefined;
    log(`conn#${c.id} CLOSE code=${ev.code} reason=${ev.reason || "-"}`);

    // normal close (1000) also can be reconnect if running
    if (running.value) scheduleReconnect(c);
  };
}

function randInt(min: number, max: number) {
  const a = Math.min(min, max);
  const b = Math.max(min, max);
  return Math.floor(a + Math.random() * (b - a + 1));
}

function sendPayload(ws: WebSocket, c: ConnStat, payload: string) {
  if (ws.readyState !== WebSocket.OPEN) return;

  try {
    if (state.measureRtt) {
      if (state.rttEchoMode === "server-echo") {
        const msg = `${state.rttPayloadPrefix}${Date.now()}`;
        ws.send(msg);
        c.sent += 1;
        return;
      } else {
        // approximation: send ts and record, then treat next message recv as "response"
        const ts = Date.now();
        const msg = `${payload} | ts=${ts}`;
        ws.send(msg);
        c.sent += 1;

        // weak heuristic: if a message arrives soon, treat as RTT
        // const start = ts;
        const timeout = window.setTimeout(() => { }, 0);
        // can't intercept next onmessage per-conn easily without queue;
        // leave avg RTT to server-echo mode for correctness.
        window.clearTimeout(timeout);
        return;
      }
    }

    ws.send(payload);
    c.sent += 1;
  } catch (e: any) {
    c.errors += 1;
    c.lastErrorAt = Date.now();
    log(`conn#${c.id} send failed: ${String(e?.message ?? e)}`);
  }
}

async function startAll() {
  stopAll();
  logs.value = [];
  conns.splice(0, conns.length);

  // build conns
  const total = Math.max(1, Math.floor(state.count));
  for (let i = 1; i <= total; i++) conns.push(createConn(i));

  running.value = true;
  log(`START url=${state.url} count=${total}`);

  // batch connect
  const batchSize = Math.max(1, Math.floor(state.batchSize));
  const interval = Math.max(0, Math.floor(state.batchIntervalMs));

  for (let i = 0; i < conns.length; i += batchSize) {
    const batch = conns.slice(i, i + batchSize);
    for (const c of batch) connectOne(c);
    if (i + batchSize < conns.length && interval > 0) {
      await new Promise((r) => setTimeout(r, interval));
    }
  }
}

function broadcastSend() {
  const payload = state.sendPayload;
  let n = 0;
  for (const c of conns) {
    if (c.ws && c.ws.readyState === WebSocket.OPEN) {
      sendPayload(c.ws, c, payload);
      n++;
    }
  }
  log(`BROADCAST sent to ${n} open connections`);
}

const summary = computed(() => {
  const total = conns.length;
  const open = conns.filter((c) => c.state === "open").length;
  const connecting = conns.filter((c) => c.state === "connecting").length;
  const closed = conns.filter((c) => c.state === "closed").length;
  const error = conns.filter((c) => c.state === "error").length;

  const sent = conns.reduce((a, c) => a + c.sent, 0);
  const received = conns.reduce((a, c) => a + c.received, 0);
  const reconnects = conns.reduce((a, c) => a + c.reconnects, 0);
  const errors = conns.reduce((a, c) => a + c.errors, 0);

  return { total, open, connecting, closed, error, sent, received, reconnects, errors };
});

onBeforeUnmount(() => stopAll());
</script>

<template>
  <div class="page">
    <!-- 顶部 -->
    <header class="header">
      <div class="title">WebSocket 稳定性测试</div>
      <div class="actions">
        <button class="btn primary" @click="startAll" :disabled="running">
          启动测试
        </button>
        <button class="btn" @click="stopAll" :disabled="!running">
          停止测试
        </button>
        <button class="btn" @click="broadcastSend" :disabled="!running">
          广播发送
        </button>
      </div>
    </header>

    <!-- 配置区 -->
    <section class="grid">
      <!-- 连接配置 -->
      <div class="card">
        <h3>连接配置</h3>

        <label>WebSocket 地址</label>
        <input v-model="state.url" class="input" placeholder="ws://服务器地址:端口/路径" />

        <div class="row">
          <div class="col">
            <label>连接数量</label>
            <input v-model.number="state.count" class="input" type="number" min="1" />
          </div>
          <div class="col">
            <label>分批连接数</label>
            <input v-model.number="state.batchSize" class="input" type="number" min="1" />
          </div>
          <div class="col">
            <label>批次间隔（毫秒）</label>
            <input v-model.number="state.batchIntervalMs" class="input" type="number" min="0" />
          </div>
        </div>

        <div class="row">
          <div class="chk">
            <input id="reco" type="checkbox" v-model="state.autoReconnect" />
            <label for="reco">启用自动重连</label>
          </div>
          <div class="col">
            <label>重连基础延迟（ms）</label>
            <input v-model.number="state.reconnectBaseDelayMs" class="input" type="number" />
          </div>
          <div class="col">
            <label>最大重连延迟（ms）</label>
            <input v-model.number="state.reconnectMaxDelayMs" class="input" type="number" />
          </div>
        </div>
      </div>

      <!-- 心跳配置 -->
      <div class="card">
        <h3>心跳配置</h3>

        <div class="row">
          <div class="chk">
            <input id="hb" type="checkbox" v-model="state.heartbeatEnabled" />
            <label for="hb">启用心跳</label>
          </div>
          <div class="col">
            <label>心跳间隔（ms）</label>
            <input v-model.number="state.heartbeatIntervalMs" class="input" type="number" />
          </div>
        </div>

        <label>心跳内容</label>
        <input v-model="state.heartbeatPayload" class="input" />
        <p class="hint">
          浏览器 WebSocket 无法发送真正的 Ping 帧，这里发送的是应用层心跳消息，
          需服务端自行识别和处理。
        </p>
      </div>

      <!-- 消息发送 -->
      <div class="card">
        <h3>消息发送</h3>

        <div class="row">
          <div>
            <label>发送模式</label>
            <select v-model="state.sendMode" class="input">
              <option value="manual">手动发送</option>
              <option value="interval">固定间隔发送</option>
              <option value="random">随机间隔发送</option>
            </select>
          </div>

          <div>
            <label>发送间隔（ms）</label>
            <input v-model.number="state.sendIntervalMs" class="input" type="number"
              :disabled="state.sendMode !== 'interval'" />
          </div>

          <div>
            <label>随机间隔（最小 / 最大 ms）</label>
            <div class="row2">
              <input v-model.number="state.randomMinMs" class="input" type="number"
                :disabled="state.sendMode !== 'random'" />
              <input v-model.number="state.randomMaxMs" class="input" type="number"
                :disabled="state.sendMode !== 'random'" />
            </div>
          </div>
        </div>

        <label>发送内容</label>
        <input v-model="state.sendPayload" class="input" />

        <!-- <div class="row">
          <div class="chk">
            <input id="rtt" type="checkbox" v-model="state.measureRtt" />
            <label for="rtt">统计往返延迟（RTT）</label>
          </div>

          <div>
            <label>RTT 模式</label>
            <select v-model="state.rttEchoMode" class="input" :disabled="!state.measureRtt">
              <option value="server-echo">服务端回显</option>
              <option value="client-loopback">客户端估算（不精确）</option>
            </select>
          </div>
        </div> -->

        <!-- <label>RTT 标识前缀</label>
        <input v-model="state.rttPayloadPrefix" class="input"
          :disabled="!state.measureRtt || state.rttEchoMode !== 'server-echo'" />

        <p class="hint">
          服务端回显模式要求服务端原样返回：
          <code>__rtt__:时间戳</code>
        </p> -->
      </div>

      <!-- 汇总 -->
      <div class="card">
        <h3>总体统计</h3>
        <div class="kvs">
          <div><span>连接总数</span><b>{{ summary.total }}</b></div>
          <div><span>已连接</span><b>{{ summary.open }}</b></div>
          <div><span>连接中</span><b>{{ summary.connecting }}</b></div>
          <div><span>已关闭</span><b>{{ summary.closed }}</b></div>
          <div><span>错误</span><b>{{ summary.error }}</b></div>
          <div><span>发送消息</span><b>{{ summary.sent }}</b></div>
          <div><span>接收消息</span><b>{{ summary.received }}</b></div>
          <div><span>重连次数</span><b>{{ summary.reconnects }}</b></div>
          <div><span>异常次数</span><b>{{ summary.errors }}</b></div>
        </div>
      </div>
    </section>

    <!-- 连接明细 -->
    <section class="panel">
      <div class="panel-head">
        <h3>连接明细</h3>
      </div>

      <div class="table">
        <div class="tr th">
          <div>编号</div>
          <div>状态</div>
          <div>尝试次数</div>
          <div>连接 / 关闭</div>
          <div>发送 / 接收</div>
          <div>错误</div>
          <div>重连</div>
          <!-- <div>RTT（ms）</div> -->
          <div>最近关闭原因</div>
        </div>

        <div class="tr" v-for="c in conns" :key="c.id">
          <div>#{{ c.id }}</div>
          <div>
            <span class="badge" :data-s="c.state">
              {{
                c.state === 'open'
                  ? '已连接'
                  : c.state === 'connecting'
                    ? '连接中'
                    : c.state === 'closed'
                      ? '已关闭'
                      : '错误'
              }}
            </span>
          </div>
          <div>{{ c.connectAttempts }}</div>
          <div>{{ c.opens }}/{{ c.closes }}</div>
          <div>{{ c.sent }}/{{ c.received }}</div>
          <div>{{ c.errors }}</div>
          <div>{{ c.reconnects }}</div>
          <!-- <div>
            <span v-if="c.avgRttMs != null">
              {{ c.lastRttMs?.toFixed(0) }} / {{ c.avgRttMs.toFixed(0) }}
            </span>
            <span v-else>-</span>
          </div> -->
          <div>{{ c.lastCloseCode ?? '-' }} {{ c.lastCloseReason ?? '' }}</div>
        </div>
      </div>
    </section>

    <!-- 日志 -->
    <section class="panel">
      <div class="panel-head">
        <h3>运行日志</h3>
        <button class="btn" @click="logs = []">清空日志</button>
      </div>
      <div class="logs">
        <div class="log" v-for="(l, i) in logs" :key="i">{{ l }}</div>
      </div>
    </section>
  </div>
</template>


<style scoped>
*,
*::before,
*::after {
  box-sizing: border-box;
}

.page {
  font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial;
  padding: 16px;
  color: #111;
  background: #fafafa;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.title {
  font-size: 18px;
  font-weight: 700;
}

.actions {
  display: flex;
  gap: 8px;
}

.btn {
  border: 1px solid #ddd;
  background: #fff;
  padding: 8px 10px;
  border-radius: 8px;
  cursor: pointer;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn.primary {
  border-color: #111;
}

/* 整体网格：允许卡片在窄屏自动变一列 */
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(420px, 1fr));
  gap: 12px;
  margin-bottom: 12px;
}

/* 卡片：桌面两列，窄屏一列 */
.card {
  border: 1px solid #eee;
  background: #fff;
  border-radius: 12px;
  padding: 12px;
  min-width: 0;
}

@media (max-width: 980px) {
  .card {
    grid-column: span 12;
  }
}

/* 一行表单项：用 auto-fit 自适应，最小宽度 180px */
.row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 10px;
  margin-top: 10px;
}

.col {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

/* 两列的 row2 保持，但也加 min-width 防挤压 */
.row2 {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px;
}

/* 每个表单项容器 */
.field {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

/* label 更紧凑一点 */
label {
  font-size: 12px;
  color: #555;
  display: inline-flex;
  /* 方便未来加 tooltip icon */
  align-items: center;
  gap: 6px;
  margin-top: 0;
  /* 取消你原先的 margin-top 挤压感 */
  margin-bottom: 6px;
  /* label 与 input 的间距更合理 */
}

/* checkbox 那块别用 margin-top 18 撑开，统一对齐 */
.chk {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-top: 22px;
  /* 让它和右边输入在同一水平区域（按需微调） */
}

/* input 防止宽度计算异常 */
.input {
  width: 100%;
  min-width: 0;
  border: 1px solid #ddd;
  border-radius: 10px;
  padding: 8px 10px;
  outline: none;
}

b .chk {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 18px;
}

.hint {
  font-size: 12px;
  color: #666;
  margin: 8px 0 0;
}

.panel {
  border: 1px solid #eee;
  background: #fff;
  border-radius: 12px;
  padding: 12px;
  margin-bottom: 12px;
}

.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.table {
  margin-top: 10px;
  border: 1px solid #f0f0f0;
  border-radius: 10px;
  overflow: hidden;
}

.tr {
  display: grid;
  grid-template-columns: 80px 120px 100px 120px 120px 120px 120px 1fr;
  gap: 8px;
  padding: 8px 10px;
  border-top: 1px solid #f3f3f3;
  align-items: center;
  font-size: 13px;
}

.th {
  background: #fafafa;
  border-top: none;
  font-weight: 600;
}

.badge {
  display: inline-flex;
  align-items: center;
  padding: 3px 8px;
  border-radius: 999px;
  border: 1px solid #ddd;
  font-size: 12px;
}

.badge[data-s="open"] {
  border-color: #1f8f3a;
}

.badge[data-s="connecting"] {
  border-color: #b08200;
}

.badge[data-s="closed"] {
  border-color: #999;
}

.badge[data-s="error"] {
  border-color: #c0362c;
}

.logs {
  margin-top: 10px;
  background: #0b0b0b;
  color: #ddd;
  border-radius: 10px;
  padding: 10px;
  max-height: 260px;
  overflow: auto;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 12px;
}

.log {
  padding: 2px 0;
}

.kvs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
  margin-top: 6px;
}

.kvs>div {
  display: flex;
  justify-content: space-between;
  border: 1px solid #f2f2f2;
  border-radius: 10px;
  padding: 8px 10px;
}
</style>
