import { BitBuffer, encodeBySchema, type FieldDef, encodeAisNmeaWithEncoder } from "@yinuo-ngm/ais";

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

function encoder(payload: any, buf: BitBuffer) {
    encodeBySchema(schema, payload, buf);
}

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


console.log(out.join("\r\n"));

export { }