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

export { }; 