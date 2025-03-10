import type { Midi } from 'midi-parser-js'
import MidiParser from 'midi-parser-js'
import axios from 'axios'
import localForage from "localforage";
import _ from 'lodash'
import { reactive } from 'vue'


/** 轨道 */
export class MidiTrack {
  name: string = ''
  notes: MidiNote[] = []
  endTime: number = -1
  selected: boolean = true
  /** 微秒/拍（Microseconds Per Beat）, 0.5s 一拍 */
  tempo: number = 0
  /** Ticks Per Beat, 一拍中有 48 ticks */
  timeDivision: number = 48

  get tickDuration() {
    return (this.tempo || 5e5) / this.timeDivision / 1e6
  }
  setTimeDivision(timeDivision: number | number[]) {
    timeDivision = Array.isArray(timeDivision) ? timeDivision[0] : timeDivision
    if (timeDivision) this.timeDivision = timeDivision
  }
}

/** 音符 */
export class MidiNote {
  start: number = -1
  end: number = -1
  pitch: number = 0
  velocity: number = 0
  channel: number = 0
}

/** 文件（静态/用户上传） */
export class FileItem {
  id = ''
  name = ''
  path = ''
  src = ''
  storeKey = ''
  isMidi = false
  isImage = false
  isSound = false
  raw?: File
  constructor(data: Partial<FileItem> | File) {
    this.id = _.uniqueId()
    if (data instanceof File) {
      // 上传的文件
      this.storeKey = _.uniqueId('localForage')
      this.name = data.name
      localForage.setItem(this.storeKey, data)
      this.raw = data
    } else {
      // 静态文件
      Object.assign(this, data || {})
      this.name = data.path as string
    }
  }
  async init() {
    if (this.src) return
    return this.getFile().then(file => {
      this.raw = file
      this.src = URL.createObjectURL(file)
    })
  }
  async getFile() {
    if (this.raw) return this.raw
    if (this.path) {
      // 静态文件
      return axios.get(this.path, { responseType: 'blob' })
        .then(response => this.raw = new File([response.data], this.path))
    } else if (this.storeKey) {
      // 上传的文件
      return localForage.getItem(this.storeKey)
        .then(file => this.raw = file as File)
    }
    throw new Error('找不到文件')
  }
}

export class MidiFileItem extends FileItem {
  isMidi = true
  tracks: MidiTrack[] = []
  /** 返回 */
  async init() {
    if (this.tracks.length) return
    return this.getFile().then(async file => {
      this.tracks = await this.file2tracks(file)
    })
  }
  /** 文件转音符 */
  async file2tracks(file: File): Promise<MidiTrack[]> {
    const reader = new FileReader()
    reader.readAsArrayBuffer(file)
    return new Promise((resolve, reject) => {
      reader.onload = () => {
        const arrayBuffer = reader.result as ArrayBuffer
        if (!arrayBuffer) return
        const uint8Array = new Uint8Array(arrayBuffer)
        const midi = MidiParser.Uint8(uint8Array)
        resolve(this.midi2tracks(midi))
      }
      reader.onerror = () => reject(new Error('读取文件失败'))
    })
  }
  /** midi转音符 */
  midi2tracks(midi: Midi) {
    console.log(midi)
    const tracks = midi.track.map(track => {
      const midiTrack = new MidiTrack()
      midiTrack.setTimeDivision(midi.timeDivision)
      const pitchMap = new Map<number, MidiNote[]>()
      let curTime = 0
      track.event.forEach(event => {
        curTime += event.deltaTime
        switch (event.metaType) {
          case 3: midiTrack.name = event.data as string; break
          case 81: midiTrack.tempo = event.data as number; break
          case 47: midiTrack.endTime = curTime; break
        }
        // type为8表示"Note Off"事件。type为9表示"Note On"事件
        if (![8, 9].includes(event.type)) return
        const [pitch, velocity] = event.data as number[]
        if (event.type === 9 && velocity) {
          const note = new MidiNote()
          note.start = curTime
          note.velocity = velocity || 50
          note.pitch = pitch
          note.channel = event.channel || 0
          if (!pitchMap.get(pitch)) pitchMap.set(pitch, [])
          pitchMap.get(pitch)?.push(note)
        } else {
          if (!pitchMap.get(pitch)) return
          const lastNote = pitchMap.get(pitch)!.slice(-1)[0]
          lastNote.end = curTime
        }
      })

      const notes = [...pitchMap.values()].flat()
      midiTrack.notes = _.chain(notes)
        .filter(note => note.end > 0)
        .orderBy(['start', 'end'], ['asc', 'desc'])
        .value()

      return midiTrack
    })

    // 赋值tempo
    const tempo = tracks.find(track => track.tempo)?.tempo
    if (tempo) tracks.forEach(track => track.tempo = track.tempo || tempo)

    return tracks.flatMap(midiTrack => {
      const channels = _.chain(midiTrack.notes).groupBy('channel').values().value()
      return channels.map(channel => {
        const newTrack = new MidiTrack()
        Object.assign(newTrack, midiTrack)
        newTrack.notes = channel
        return newTrack
      })
    })
  }
}

export class ImageFileItem extends FileItem {
  isImage = true
  constructor(data: Partial<FileItem> | File) {
    super(data)
    this.init()
  }
}

export class SoundFileItem extends FileItem {
  isSound = true
  loopRange: [number, number]
  offset: number
  constructor(data: Partial<SoundFileItem> | File) {
    super(data)
    this.loopRange = 'loopRange' in data ? data.loopRange || [0, 0] : [0, 0]
    this.offset = 'offset' in data ? data.offset || 0 : 0
    this.init().then(() => {
      this.raw?.arrayBuffer().then(arrayBuffer => {
        new AudioContext().decodeAudioData(arrayBuffer, buffer => {
          this.buffer = buffer
        })
      })
    })
  }
  buffer?: AudioBuffer
}

export class OtomadConfig {
  id = ''
  name = ''
  sound?: SoundFileItem
  image?: ImageFileItem
  midi?: MidiFileItem
  constructor(config?: Partial<OtomadConfig>) {
    this.id = _.uniqueId()
    Object.assign(this, config || {})
  }
  /** 更新轨道 */
  async init() {
    if (!this.midi) return
    await this.midi.init()
  }
}

const STATIC_FILES = {
  "albida": new MidiFileItem({ path: "albida.mid" }),
  "flower": new MidiFileItem({ path: "flower.mid" }),
  "lisa-riccia": new MidiFileItem({ path: "lisa-riccia.mid" }),
  "MC": new MidiFileItem({ path: "MC.mid" }),
  "Metal Masters Music - Metal Beat": new MidiFileItem({ path: "Metal Masters Music - Metal Beat.mid" }),
  "red zone": new MidiFileItem({ path: "red zone.mid" }),
  "rolling_girl": new MidiFileItem({ path: "rolling_girl.mid" }),
  "Undertale_Undertale_Piano": new MidiFileItem({ path: "Undertale_Undertale_Piano.mid" }),
  "Your_Best_Nightmare_-_Undertale": new MidiFileItem({ path: "Your_Best_Nightmare_-_Undertale.mid" }),
  "上海红茶馆": new MidiFileItem({ path: "上海红茶馆.mid" }),
  "俄罗斯方块": new MidiFileItem({ path: "俄罗斯方块.mid" }),
  "小圆Magia": new MidiFileItem({ path: "小圆Magia.mid" }),
  "少女幻葬": new MidiFileItem({ path: "少女幻葬.mid" }),
  "思出亿千万": new MidiFileItem({ path: "思出亿千万.mid" }),
  "植物大战僵尸": new MidiFileItem({ path: "植物大战僵尸.mid" }),
  "献给逝去公主的七重奏交响乐": new MidiFileItem({ path: "献给逝去公主的七重奏交响乐.mid" }),
  "甩葱歌": new MidiFileItem({ path: "甩葱歌.mid" }),
  "稲田姫様に叱られるから": new MidiFileItem({ path: "稲田姫様に叱られるから.mid" }),
  "算术教室": new MidiFileItem({ path: "算术教室.mid" }),
  "野蜂飞舞": new MidiFileItem({ path: "野蜂飞舞.mid" }),
  "鸟之诗": new MidiFileItem({ path: "鸟之诗.mid" }),
  "琪露诺的完美算数教室": new MidiFileItem({ path: "琪露诺的完美算数教室.mid" }),
  
  "VAN": new ImageFileItem({ path: "VAN.png" }),

  fa: new SoundFileItem({ path: 'fa.mp3', offset: 0.025, loopRange: [0.079, 0.096] }),
}

/** 文件库 */
export class FileLibrary extends Array<FileItem> {
  constructor(public fileItemClass: typeof FileItem, ...files: (FileItem | FileItem[])[]) {
    super(...files.flat())
  }
  remove(file: FileItem) {
    this.splice(this.indexOf(file), 1)
  }
  /** 文件上传 */
  addFile(file: File) {
    const fileItem = reactive(new this.fileItemClass(file))
    if (fileItem.isImage) fileItem.init()
    this.push(fileItem)
  }
  async init() {
    return await Promise.all(this.map(fileItem => fileItem.init()))
  }
}


export class OtomadMain {
  /** 当前配置 */
  curConfig = new OtomadConfig()

  /** 配置列表 */
  configList = [
    { name: '甩葱歌', midi: STATIC_FILES.甩葱歌, sound: STATIC_FILES.fa, image: STATIC_FILES.VAN },
    { name: '野蜂飞舞', midi: STATIC_FILES.野蜂飞舞, sound: STATIC_FILES.fa, image: STATIC_FILES.VAN },
  ].map(config => new OtomadConfig(config))

  /** 所有文件 */
  fileLibrary: Record<string, FileLibrary> = {
    midi: new FileLibrary(MidiFileItem, Object.values(STATIC_FILES).filter(item => item.isMidi)),
    sound: new FileLibrary(SoundFileItem, Object.values(STATIC_FILES).filter(item => item.isSound)),
    image: new FileLibrary(ImageFileItem, Object.values(STATIC_FILES).filter(item => item.isImage)),
  }

  /** 上传的 midi文件 */
  get midiFiles() {
    return this.fileLibrary.midi
  }

  /** 当前的midi轨道 */
  get tracks() {
    return this.curConfig?.midi?.tracks || []
  }

  /** 初始化 读取配置 */
  async init(index?: number) {
    index = _.isNil(index) ? this.configList.length - 1 : index
    const curConfig = this.configList[index]
    curConfig.init()
    this.curConfig = curConfig
  }
  get fileList() {
    return [...this.midiFiles]
  }

}




type MyCtxOption = { when?: number, offset?: number, loopStart?: number, loopEnd?: number, playbackRate?: number, duration?: number, velocity?: number, callback?: (time: number) => void }

export class MyAudioContext {
  ctx?: AudioContext
  buffer?: AudioBuffer
  source?: AudioBufferSourceNode
  sourceList: AudioBufferSourceNode[] = []
  offset = 0
  playing = false
  duration = 0
  counter: number[] = []
  progress = 0
  init(buffer: AudioBuffer) {
    this.buffer = buffer
    if (this.ctx && this.ctx.state !== 'closed') this.ctx.close()
    this.ctx = new AudioContext()
    const ctx = this.ctx
    this.duration = buffer.duration
    const source = ctx.createBufferSource()
    this.source = source
    source.buffer = buffer
    source.connect(ctx.destination)
  }
  async play({ when = 0, offset = 0, loopStart = 0, loopEnd = 0, duration, playbackRate = 1, callback }: MyCtxOption = {}) {
    const source = this.source!
    this.offset = offset
    if (loopStart !== loopEnd) Object.assign(source, { loopStart, loopEnd, loop: true })
    source.playbackRate.value = playbackRate
    source.start(when, offset, duration)
    this.playing = true
    source.onended = () => {
      this.playing = false
      this.ctx?.close()
    }
    const updateProgress = () => {
      const currentTime = this.curTime
      callback?.(currentTime)
      if (!this.playing) return
      requestAnimationFrame(updateProgress);
    }

    updateProgress()
  }
  calculatePlaybackRate(pitch: number) {
    // MIDI音符编号60对应中央C
    const centralCPitch = 60
    const pitchDifference = pitch - centralCPitch
    return Math.pow(2, pitchDifference / 12)
  }
  startCount(midi?: MidiFileItem) {
    if (!midi || !midi.tracks[0]) return
    const deltaTime = midi.tracks[0].tickDuration * 1e3
    const starts = midi.tracks
      .filter(track => track.selected && track.notes.length)
      .map(track => _.uniq(track.notes.map(note => note.start * deltaTime)))
    // requestAnimationFrame 每一帧去校验是否跨过时间，跨过则num++
    const counter = reactive(starts.map(() => 0))
    this.counter = counter

    const startTime = new Date().getTime()
    const updateProgress = () => {
      if (!this.playing) return
      const time = new Date().getTime() - startTime
      counter.forEach((timeIdx, index) => {
        if (time < starts[index][timeIdx]) return
        while (time >= starts[index][timeIdx]) timeIdx++
        counter[index] = timeIdx
      })
      requestAnimationFrame(updateProgress)
    }
    updateProgress()
  }
  startProgress(midi?: MidiFileItem) {
    if (!midi || !midi.tracks[0]) return
    const deltaTime = midi.tracks[0].tickDuration * 1e3
    const totalTime = Math.max(...midi.tracks.flatMap(track => track.notes).map(note => note.end)) * deltaTime
    const startTime = new Date().getTime()
    const updateProgress = () => {
      if (!this.playing) return this.progress = 0
      this.progress = _.round((new Date().getTime() - startTime) / totalTime, 5)
      requestAnimationFrame(updateProgress)
    }
    updateProgress()
  }
  playMidi(midi?: MidiFileItem, sound?: SoundFileItem) {
    if (!midi || !sound) return
    const track = midi?.tracks[0]
    if (!track) return
    this.init(sound.buffer as AudioBuffer)
    const notes = midi?.tracks.flatMap(track => track.selected ? track.notes : []) || []
    const deltaTime = track.tickDuration
    const { offset, loopRange: [loopStart, loopEnd] } = sound
    this.playMulti(notes.map(note => {
      const playbackRate = this.calculatePlaybackRate(note.pitch)
      return {
        playbackRate,
        when: note.start * deltaTime,
        offset,
        velocity: note.velocity,
        loopStart, loopEnd,
        duration: (note.end - note.start) * deltaTime,
      }
    }))
    this.startCount(midi)
    this.startProgress(midi)
  }
  async playMulti(optList: MyCtxOption[]) {
    this.playing = true
    const sourceList: AudioBufferSourceNode[] = []
    let restCount = optList.length
    optList.forEach(opt => {
      if (!this.ctx || !this.buffer) return
      const { when = 0, offset = 0, loopStart = 0, loopEnd = 0, duration, playbackRate = 1, velocity = 127 } = opt
      const source = this.ctx.createBufferSource()
      const gainNode = this.ctx.createGain()
      gainNode.gain.value = velocity / 127
      if (loopStart !== loopEnd) Object.assign(source, { loopStart, loopEnd, loop: true })
      source.buffer = this.buffer
      source.playbackRate.value = playbackRate
      source.connect(gainNode)
      gainNode.connect(this.ctx.destination)
      source.start(when, offset, duration)
      source.onended = () => {
        restCount--
        if (restCount === 0) {
          this.playing = false
          this.ctx?.close()
        }
      }
      sourceList.push(source)
    })
    this.sourceList = sourceList
  }
  stop() {
    this.playing = false
    this.progress = 0
    if (this.ctx && this.ctx.state !== 'closed') this.ctx?.close()
  }

  get curTime() {
    const source = this.source
    if (!this.playing || !source) return 0
    const { loopStart = 0, loopEnd = 0, loop } = source
    const time = this.ctx!.currentTime + this.offset
    if (!loop || time <= loopEnd) return time
    return loopStart + (time - loopEnd) % (loopEnd - loopStart)
  }
}
