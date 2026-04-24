import { AppError } from '../app-error';
import { AisErrorCodes, type AisErrorCode } from '../sources/ais.error-codes';

export class AisError extends AppError<AisErrorCode> {
  public readonly source = '@yinuo-ngm/ais';
}

export const aisErrors = {
  bitBufferOverflow: (field: string, bits: number, capacity: number) =>
    new AisError(AisErrorCodes.AIS_BIT_BUFFER_OVERFLOW, `位缓冲区溢出: ${field} (${bits} > ${capacity})`, { field, bits, capacity }),

  bitBufferUnderflow: (field: string, bits: number) =>
    new AisError(AisErrorCodes.AIS_BIT_BUFFER_UNDERFLOW, `位缓冲区下溢: ${field} (${bits} < 0)`, { field, bits }),

  invalidSixbitChar: (char: string, position: number) =>
    new AisError(AisErrorCodes.AIS_INVALID_SIXBIT_CHAR, `无效的 6-bit 字符: '${char}' at position ${position}`, { char, position }),

  encodeFailed: (reason: string, meta?: Record<string, unknown>) =>
    new AisError(AisErrorCodes.AIS_ENCODE_FAILED, `AIS 编码失败: ${reason}`, meta),

  decodeFailed: (reason: string, meta?: Record<string, unknown>) =>
    new AisError(AisErrorCodes.AIS_DECODE_FAILED, `AIS 解码失败: ${reason}`, meta),

  textEncodeFailed: (text: string, reason: string) =>
    new AisError(AisErrorCodes.AIS_TEXT_ENCODE_FAILED, `文本编码失败: ${reason}`, { text, reason }),

  textDecodeFailed: (reason: string, meta?: Record<string, unknown>) =>
    new AisError(AisErrorCodes.AIS_TEXT_DECODE_FAILED, `文本解码失败: ${reason}`, meta),

  invalidLatLng: (field: 'lat' | 'lng', value: number) =>
    new AisError(AisErrorCodes.AIS_INVALID_LATLNG, `经纬度无效: ${field}=${value}`, { field, value }),

  invalidNmeaSentence: (sentence: string, reason: string) =>
    new AisError(AisErrorCodes.AIS_INVALID_NMEA_SENTENCE, `NMEA 语句无效: ${reason}`, { sentence, reason }),

  transportInvalid: (field: string, reason: string) =>
    new AisError(AisErrorCodes.AIS_TRANSPORT_INVALID, `传输层配置无效: ${field} - ${reason}`, { field, reason }),

  schemaEncodeFailed: (field: string, reason: string) =>
    new AisError(AisErrorCodes.AIS_SCHEMA_ENCODE_FAILED, `Schema 编码失败: ${field} - ${reason}`, { field, reason }),

  fieldConstraintViolated: (field: string, constraint: string, value: unknown) =>
    new AisError(AisErrorCodes.AIS_FIELD_CONSTRAINT_VIOLATED, `字段约束违反: ${field} (${constraint}): ${value}`, { field, constraint, value }),

  channelRequired: () =>
    new AisError(AisErrorCodes.AIS_CHANNEL_REQUIRED, '频道必填'),

  channelInvalid: (channel: string) =>
    new AisError(AisErrorCodes.AIS_CHANNEL_INVALID, `频道无效: ${channel}`, { channel }),

  msgTypeNotSupported: (msgType: number) =>
    new AisError(AisErrorCodes.AIS_MSG_TYPE_NOT_SUPPORTED, `消息类型不支持: ${msgType}`, { msgType }),

  dacInvalid: (dac: number) =>
    new AisError(AisErrorCodes.AIS_DAC_INVALID, `DAC 无效: ${dac}`, { dac }),

  fiInvalid: (fi: number) =>
    new AisError(AisErrorCodes.AIS_FI_INVALID, `FI 无效: ${fi}`, { fi }),

  appDataTooLong: (dataLen: number, maxLen: number) =>
    new AisError(AisErrorCodes.AIS_APP_DATA_TOO_LONG, `应用数据过长: ${dataLen} > ${maxLen}`, { dataLen, maxLen }),
} as const;
