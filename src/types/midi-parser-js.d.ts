// 定义一个名为'midi - parser - js'的模块
declare module 'midi-parser-js' {
    // 定义MidiParser接口，表示MIDI解析器
    interface MidiParser {
        // 调试标志，用于控制是否开启调试模式，类型为布尔值
        debug: boolean;
        // 解析函数，用于解析MIDI数据
        // 可以接受Uint8Array类型、字符串类型或者HTMLInputElement类型的输入
        // 可选地接受一个回调函数，该回调函数在解析完成后被调用，传入解析结果（Midi类型）
        parse(input: Uint8Array | string | HTMLInputElement, _callback?: (result: Midi) => void): void;
        // 添加监听器函数，用于监听HTMLInputElement（可能是文件输入元素）的变化
        // 可选地接受一个回调函数，该回调函数在有结果时被调用，传入解析结果（Midi类型）
        // 返回值为布尔值，表示是否成功添加监听器
        addListener(_fileElement: HTMLInputElement, _callback?: (result: Midi) => void): boolean;
        // 将Base64编码的字符串转换为Midi对象的函数
        Base64(b64String: string): Midi;
        // 将Uint8Array转换为Midi对象的函数
        Uint8(FileAsUint8Array: Uint8Array): Midi;
        // 自定义解释器，类型为一个函数或者null
        // 该函数接受事件类型（number）、DataView类型的缓冲区以及可选的元事件长度（number）作为参数
        // 可以返回number类型或者布尔值类型
        customInterpreter: ((e_type: number, arrayByffer: DataView, metaEventLength?: number) => number | boolean) | null;
    }

    // 定义MidiTrack接口，表示MIDI轨道
    export interface MidiTrack {
        // 事件数组，每个事件包含以下属性：
        event: {
            // 增量时间，表示事件之间的时间间隔，类型为number
            deltaTime: number;
            // 事件类型，类型为number
            type: number;
            // 元事件类型，可选属性，类型为number
            metaType?: number;
            // 通道号，可选属性，类型为number
            channel?: number;
            // 数据，可以是number类型、字符串类型或者number数组类型，可选属性
            data?: number | string | number[];
        }[]
    }

    // 定义Midi接口，表示整个MIDI文件的结构
    export interface Midi {
        // MIDI格式类型，类型为number
        formatType: number;
        // 轨道数量，类型为number
        tracks: number;
        // 轨道数组，每个元素为MidiTrack类型
        track: MidiTrack[];
        // 时间划分，可以是number数组或者单个number，表示歌曲的节奏（例如节拍等）
        timeDivision: number[] | number;
    }

    // 定义常量MidiParser，类型为MidiParser接口
    const MidiParser: MidiParser;
    // 将MidiParser导出为模块的默认导出
    export = MidiParser;
}
