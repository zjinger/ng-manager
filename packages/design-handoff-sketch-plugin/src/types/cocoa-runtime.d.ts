// CocoaScript runtime 最小类型声明。
// 只声明当前项目实际用到的全局对象和常量，不建模完整 Cocoa API。

export {};

// 常用常量
declare const NSUTF8StringEncoding: number;
declare const NSAlertFirstButtonReturn: number;
declare const NSAlertSecondButtonReturn: number;
declare const NSTitledWindowMask: number;
declare const NSBackingStoreBuffered: number;
declare const NSRightTextAlignment: number;
declare const NSRoundedBezelStyle: number;

// 常用工厂函数
declare function NSMakeRect(x: number, y: number, width: number, height: number): unknown;
declare function NSMakePoint(x: number, y: number): unknown;
declare function NSHomeDirectory(): string;

// 运行时全局对象（当前统一声明为 any，按需逐步收窄）
declare const NSAlert: any;
declare const NSURL: any;
declare const NSWorkspace: any;
declare const NSArray: any;
declare const NSFileManager: any;
declare const NSString: any;
