# @yinuo-ngm/ais

一个偏“纯算法”的 AIS/ASM 应用数据编码 + NMEA 封装核心库（TypeScript），用于把上层应用 payload 编码为 bit 流（DAC/FI + appBits），再转换为 6-bit payload，最终输出可直接喂给 AIS/ASM 设备外部接口的 ABM / BBM / AAB / ABB / AGB 等 NMEA 语句。

## 特性

- 应用层编码管线：payload -> BitBuffer(appBits) -> Msg(DAC/FI+appBits) -> sixbit -> NMEA sentences

- 多种传输类型（TransportKind）：

    - AIS：AIS6(ABM)、AIS8/AIS25(BBM)、AIS26(BBM/ABM)

    - ASM：ASM1/ASM2(ABB)、ASM3/ASM4(AAB)、ASM6(AGB 区域多播)

    - 支持多目的地址批量生成：destMmsi: number[] | string[]（ABM/AAB 批量）

- 文本编码：

    - text6：ITU-R M.1371 6-bit ASCII（字段级 bit 串）

    - text13：13 位中文规则（中英文混排 13/7）

    - text14：14 位中文规则（中英文混排 14/7）

- schema 驱动编码：用 FieldDef[] 描述位域，自动写入 BitBuffer

## 快速上手：直接用 encoder 输出 NMEA

核心入口：encodeAisNmeaWithEncoder(options) -> string[]

```typescript
import { BitBuffer, encodeAisNmeaWithEncoder } from "@yinuo-ngm/ais";

/** 示例：自定义应用编码器（payload -> appBits） */
function myAppEncoder(payload: { foo: number; bar: boolean }, buf: BitBuffer) {
  buf.writeUnsigned(payload.foo, 10); // 10bit
  buf.writeBool(payload.bar);         // 1bit
  // ...继续写其他字段
}

const sentences = encodeAisNmeaWithEncoder({
  dac: 413,
  fi: 1,
  payload: { foo: 12, bar: true },
  encoder: myAppEncoder,
  transportOpts: {
    kind: "AIS6",          // 生成 AIS 6号：ABM（寻址）
    channel: 1,            // AIS channel 选择（0/1/2/3）
    talker: "AI",          // 可选：Talker，例如 "AI"
    seqId: 0,              // 可选：多句序号 0-9
    srcMmsi: 677033200,    // 可选：源 MMSI
    destMmsi: [400400400], // 必填：目的 MMSI（AIS6/ASM3/ASM4）
    maxLineLen: 80,        // 可选：强制 NMEA 行长度上限
  },
});

console.log(sentences.join("\r\n"));

```

## 用 schema 编码：encodeBySchema
如果你的应用负载结构比较“位表化”（字段名 + 位宽 + 类型），推荐用 encodeBySchema(schema, input, buf) 快速生成 appBits。

1. 定义 schema
```typescript
import { BitBuffer, encodeBySchema, type FieldDef } from "@yinuo-ngm/ais";

const schema: FieldDef[] = [
  { name: "mrn", kind: "uint", bitW: 32, defaultValue: 0 },
  { name: "enabled", kind: "bool", defaultValue: false },

  // 经纬度：支持数字十进制度，或对象 {deg,min,flag}
  { name: "lat", kind: "lat", bitW: 21 },
  { name: "lng", kind: "lng", bitW: 22 },

  // 文本：写入“bit 串”（注意：text 编码函数输出 bitstring）
  { name: "title", kind: "text6" },
  { name: "cn13", kind: "text13" },
  { name: "cn14", kind: "text14" },
];

```

2. 写入 BitBuffer
```typescript
function encoder(payload: any, buf: BitBuffer) {
  encodeBySchema(schema, payload, buf);
}
```

3. 封装成 NMEA
```typescript
import { encodeAisNmeaWithEncoder } from "@yinuo-ngm/ais";

const out = encodeAisNmeaWithEncoder({
  dac: 413,
  fi: 1,
  payload: {
    mrn: 123,
    enabled: true,
    lat: 31.233,
    lng: 121.499,
    title: "HELLO",
    cn13: "你好",
    cn14: "NIHAO",
  },
  encoder,
  transportOpts: {
    kind: "AIS8",  // 广播：BBM
    channel: 1,
    talker: "AI",
  },
});
```

### 编码器注册机制(Optional)
```typescript
import { registerAppEncoder, getAppEncoder } from "@yinuo-ngm/ais";

registerAppEncoder(413, 1, (payload, buf) => {
  // ...
});
const enc = getAppEncoder(413, 1);

```

### TransportOptions（传输封装参数）

transportOpts 结构（关键字段）：

- kind：'AIS6' | 'AIS8' | 'AIS25' | 'AIS26' | 'ASM1' | 'ASM2' | 'ASM3' | 'ASM4' | 'ASM6'

- channel：AIS/ASM 信道选择（0 | 1 | 2 | 3）

- talker?：Talker 标识（如 "AI"）

- seqId?：多句序列号（0-9 循环） 

- maxLineLen?：强制 NMEA 行总长度上限（不含 CRLF）

- srcMmsi?：源 MMSI 

- destMmsi?：目的 MMSI（数组，AIS6/ASM3/ASM4 必填；AIS26 寻址模式也需要）

- broadcastOrAddressed?：AIS26 模式下，0=广播(BBM) / 1=寻址(ABM)

- fecType?：ASM FEC 类型（0|1|2|3，ASM 系列可能需要）

- region?：ASM6 区域多播（CoreRegionBox）


