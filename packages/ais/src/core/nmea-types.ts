// packages/ais/src/core/nmea-types.ts

import { CoreLatLng } from "./latlng";

/** AIS / ASM Talker，例如 "AI" */
export type AisTalker = string;
/**
 * 报文格式
 * ABM - 寻址二进制及寻址安全相关报文，ABM-AIS寻址二进制及寻址安全相关报文支持ITU-R M.1371-5定义的6号和12号报文通过AIS设备的外部接口与其他设备进行信息传输。这类数据由外部系统灵活定义，AIS设备的IEC 61162-2接口接收该语句后，启动发射机进行播发。接收端AIS设备传输成功接收报文后，通过 “寻址二进制以及安全相关信息确认”ABK语句进行确认。
 * BBM - 广播二进制报文，BBM-AIS二进制广播报文支持生成ITU-R M.1371-5二进制报文（8号报文）或安全相关的广播报文（14号报文）。这类数据由外部系统灵活定义，AIS设备的IEC 61162-2接口接收该语句后，会在4秒内启动8号报文或14号报文的VHF广播。
 * AGB - ASM 地理多播报文，该语句支持生成ITU-R M.2092定义的ASM报文，外部应用能够通过ASM站交换数据。数据由应用程序定义，而不是ASM站。该语句实现了转发器的系统功能像通信设备一样灵活。通过命令接口接收此语句后，转发器启动VDL广播。通过ASM确认报文（ID 5）AMK语句格式器以及支持生成AMK语句的过程，确认了是否成功传输已寻址消息。ASM站确定用于通过VHF数据链路传输使用通信状态的消息类型的适当通信状态。
 * ABB - ASM 广播报文，该语句支持生成由ITU-R M.2092定义的ASM消息。这为应用程序提供了一种广播二进制数据的方式。数据仅由应用程序定义，而不是ASM站。该语句为实现像数字广播设备一样使用ASM站的系统功能提供了灵活性
 * AAB - ASM 寻址报文，该语句支持生成由ITU-R M.2092定义的ASM消息，并为外部应用程序提供了通过ASM站交换数据的手段。数据仅由应用程序定义，而非ASM站。这个语句为实现使用类似通信设备的应答器的系统功能提供了灵活性。在通过命令接口接收此语句后，应答器启动VDL广播。
 */
export type AisFormatter = | 'ABM' | 'BBM' | 'AGB' | 'ABB' | 'AAB'
/** BBM 的 channel 选择：0：不选择信道广播，1：AIS信道A广播，2：AIS 信道B广播，3：AIS信道A和B都广播 */
export type AISChannelSel = 0 | 1 | 2 | 3;

/** ASM 的 channel 选择：0：没有偏好，1：ASM 1，2：ASM2，3：两个频道上都传输 */
export type ASMChannelSel = 0 | 1 | 2 | 3;

/** NMEA 语句的基础结构 */
export interface NmeaSentence {
    raw: string;
}
/** FEC 类型（前向纠错）0: 无错误编码 1: 3/4 FEC 2:ASM SAT 上行消息 3:保留 */
export type FecType = 0 | 1 | 2 | 3;
/** 
 * 地理矩形（西南角 SW，东北角 NE），十进制度
 * 经度1	18	组任务应用范围经度；右上角（东北）；在1/10′内
（±180°，东 = 正，西 = 负）。
纬度1	17	组任务应用范围纬度；右上角（东北）；在1/10′内
（±90°，北 = 正，南 = 负）。
经度2	18	组任务应用范围的经度；左下角（西南）；在1/10′内
（±180°，东 = 正，西 = 负）。
纬度2	17	组任务应用范围的纬度；左下角（西南）；在1/10′内
（±90°，北 = 正，南 = 负）。
 */
export interface CoreRegionBox {
    latlngNE: CoreLatLng; // 东北角（经纬度对象）
    latlngSW: CoreLatLng; // 西南角（经纬度对象）
}