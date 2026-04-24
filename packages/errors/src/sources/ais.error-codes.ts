/**
 * AIS 协议错误码 (25XXX)
 *
 * | 码值   | 常量名                        | 说明                   | HTTP Status |
 * |--------|------------------------------|------------------------|-------------|
 * | 25001  | AIS_BIT_BUFFER_OVERFLOW      | 位缓冲区溢出            | 400         |
 * | 25002  | AIS_BIT_BUFFER_UNDERFLOW    | 位缓冲区下溢            | 400         |
 * | 25003  | AIS_INVALID_SIXBIT_CHAR     | 无效的 6-bit 字符       | 400         |
 * | 25004  | AIS_ENCODE_FAILED           | AIS 编码失败            | 500         |
 * | 25005  | AIS_DECODE_FAILED           | AIS 解码失败            | 500         |
 * | 25006  | AIS_TEXT_ENCODE_FAILED      | 文本编码失败            | 500         |
 * | 25007  | AIS_TEXT_DECODE_FAILED      | 文本解码失败            | 500         |
 * | 25008  | AIS_INVALID_LATLNG          | 经纬度无效              | 400         |
 * | 25009  | AIS_INVALID_NMEA_SENTENCE   | NMEA 语句无效           | 400         |
 * | 25010  | AIS_TRANSPORT_INVALID       | 传输层配置无效          | 400         |
 * | 25011  | AIS_SCHEMA_ENCODE_FAILED    | Schema 编码失败         | 500         |
 * | 25012  | AIS_FIELD_CONSTRAINT_VIOLATED | 字段约束违反           | 400         |
 * | 25013  | AIS_CHANNEL_REQUIRED         | 频道必填               | 400         |
 * | 25014  | AIS_CHANNEL_INVALID          | 频道无效               | 400         |
 * | 25015  | AIS_MSG_TYPE_NOT_SUPPORTED  | 消息类型不支持          | 400         |
 * | 25016  | AIS_DAC_INVALID            | DAC 无效                | 400         |
 * | 25017  | AIS_FI_INVALID             | FI 无效                 | 400         |
 * | 25018  | AIS_APP_DATA_TOO_LONG       | 应用数据过长            | 400         |
 */
export const AisErrorCodes = {
  AIS_BIT_BUFFER_OVERFLOW: 25001,
  AIS_BIT_BUFFER_UNDERFLOW: 25002,
  AIS_INVALID_SIXBIT_CHAR: 25003,
  AIS_ENCODE_FAILED: 25004,
  AIS_DECODE_FAILED: 25005,
  AIS_TEXT_ENCODE_FAILED: 25006,
  AIS_TEXT_DECODE_FAILED: 25007,
  AIS_INVALID_LATLNG: 25008,
  AIS_INVALID_NMEA_SENTENCE: 25009,
  AIS_TRANSPORT_INVALID: 25010,
  AIS_SCHEMA_ENCODE_FAILED: 25011,
  AIS_FIELD_CONSTRAINT_VIOLATED: 25012,
  AIS_CHANNEL_REQUIRED: 25013,
  AIS_CHANNEL_INVALID: 25014,
  AIS_MSG_TYPE_NOT_SUPPORTED: 25015,
  AIS_DAC_INVALID: 25016,
  AIS_FI_INVALID: 25017,
  AIS_APP_DATA_TOO_LONG: 25018,
} as const;

export type AisErrorCode = typeof AisErrorCodes[keyof typeof AisErrorCodes];
