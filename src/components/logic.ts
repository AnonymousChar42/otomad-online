import type { Midi } from 'midi-parser-js'
import MidiParser from 'midi-parser-js'
import axios from 'axios'
import localForage from "localforage";
import _ from 'lodash'
import { reactive } from 'vue'

const VERSION = '1.0'

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
  static create(cls: typeof FileItem, file: File) {
    const storeKey = _.uniqueId(Date.now() + '-')
    localForage.setItem(storeKey, file)
    return new cls({ storeKey, name: file.name, raw: file })
  }
  constructor(data: Partial<FileItem>) {
    this.id = _.uniqueId(Date.now() + '-')
    Object.assign(this, data || {})
    this.name = data.name || data.path?.replace('assets/', '') as string
  }
  async init() {
    return this.getFile().then(file => {
      this.raw = file
      this.src = URL.createObjectURL(file)
    })
  }
  async getFile() {
    if (this.raw && !_.isEmpty(this.raw)) return this.raw
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
  toJSON() {
    return _.omit(this, 'raw', 'src')
  }
}

export class MidiFileItem extends FileItem {
  isMidi = true
  tracks: MidiTrack[] = []
  /** 微秒/拍 */
  deltaTime = 0
  /** 总时长(ms) */
  totalTime = 0
  /** 返回 */
  async init() {
    if (this.tracks.length) return
    return this.getFile().then(async file => {
      this.tracks = await this.file2tracks(file)
      const deltaTime = this.tracks[0].tickDuration * 1e3
      this.deltaTime = deltaTime
      this.totalTime = Math.max(...this.tracks.flatMap(track => track.notes).map(note => note.end)) * deltaTime
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
  constructor(data: Partial<FileItem>) {
    super(data)
    this.init()
  }
}

export class SoundFileItem extends FileItem {
  isSound = true
  basePitch = 60
  loopRange: [number, number]
  offset: number
  constructor(data: Partial<SoundFileItem>) {
    super(data)
    this.basePitch = 'basePitch' in data ? data.basePitch || 60 : 60
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
  name = '新建配置'
  sound?: SoundFileItem
  image?: ImageFileItem
  midi?: MidiFileItem
  constructor(config?: Partial<OtomadConfig>) {
    this.id = _.uniqueId(Date.now() + '-')
    Object.assign(this, config || {})
  }
  /** 指向素材库里的文件 */
  match(fileLibrary: Record<'midi' | 'sound' | 'image', FileLibrary>) {
    if (this.midi) this.midi = fileLibrary.midi.find(item => item.id === this.midi?.id) as MidiFileItem
    if (this.sound) this.sound = fileLibrary.sound.find(item => item.id === this.sound?.id) as SoundFileItem
    if (this.image) this.image = fileLibrary.image.find(item => item.id === this.image?.id) as ImageFileItem
    return this
  }
  /** 更新轨道 */
  async init() {
    if (!this.midi) return
    await this.midi.init()
    await this.image?.init()
  }
}

const STATIC_FILES = {
  "ALBIDA": new MidiFileItem({ path: "assets/ALBIDA.mid" }),
  "Flower": new MidiFileItem({ path: "assets/Flower.mid" }),
  "Giorno's Theme": new MidiFileItem({ path: "assets/Giorno's Theme.mid" }),
  "Lisa‐RICCIA": new MidiFileItem({ path: "assets/Lisa‐RICCIA.mid" }),
  "MC": new MidiFileItem({ path: "assets/MC.mid" }),
  "Metal Beat": new MidiFileItem({ path: "assets/Metal Beat.mid" }),
  "Red Zone": new MidiFileItem({ path: "assets/Red Zone.mid" }),
  "Rolling Girl": new MidiFileItem({ path: "assets/Rolling Girl.mid" }),
  "Undertale": new MidiFileItem({ path: "assets/Undertale.mid" }),
  "Your Best Nightmare": new MidiFileItem({ path: "assets/Your Best Nightmare.mid" }),
  "上海紅茶館": new MidiFileItem({ path: "assets/上海紅茶館.mid" }),
  "亡き王女の為のセプテット": new MidiFileItem({ path: "assets/亡き王女の為のセプテット.mid" }),
  "俄罗斯方块": new MidiFileItem({ path: "assets/俄罗斯方块.mid" }),
  "嗵嗵": new MidiFileItem({ path: "assets/嗵嗵.mid" }),
  "少女幻葬": new MidiFileItem({ path: "assets/少女幻葬.mid" }),
  "思い出はおっくせんまん!": new MidiFileItem({ path: "assets/思い出はおっくせんまん!.mid" }),
  "植物大战僵尸": new MidiFileItem({ path: "assets/植物大战僵尸.mid" }),
  "残酷な天使のテーゼ": new MidiFileItem({ path: "assets/残酷な天使のテーゼ.mid" }),
  "琪露诺的完美算数教室": new MidiFileItem({ path: "assets/琪露诺的完美算数教室.mid" }),
  "甩葱歌": new MidiFileItem({ path: "assets/甩葱歌.mid" }),
  "稲田姫様に叱られるから": new MidiFileItem({ path: "assets/稲田姫様に叱られるから.mid" }),
  "野蜂飞舞": new MidiFileItem({ path: "assets/野蜂飞舞.mid" }),
  "魔法少女まどか☆マギカ - Magia": new MidiFileItem({ path: "assets/魔法少女まどか☆マギカ - Magia.mid" }),
  "鳥の詩": new MidiFileItem({ path: "assets/鳥の詩.mid" }),

  "VAN": new ImageFileItem({ path: "assets/VAN.png" }),
  "刘醒": new ImageFileItem({ path: "assets/刘醒.png" }),
  "电棍": new ImageFileItem({ path: "assets/电棍.png" }),
  "魔理沙": new ImageFileItem({ path: "assets/魔理沙.png" }),

  fa: new SoundFileItem({ path: 'assets/fa.mp3', offset: 0.025, basePitch: 60, loopRange: [0.079, 0.096] }),
  吔: new SoundFileItem({ path: 'assets/吔.mp3', offset: 0.061, basePitch: 50, loopRange: [0.187, 0.226] }),
  电棍唢呐: new SoundFileItem({ path: 'assets/电棍唢呐.mp3', offset: 0.082, basePitch: 50, loopRange: [0.314, 0.327] }),
  UDK姐贵: new SoundFileItem({ path: 'assets/UDK姐贵.mp3', offset: 0.082, basePitch: 54, loopRange: [0.251, 0.262] }),
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
    const fileItem = reactive(FileItem.create(this.fileItemClass, file))
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
    { name: '野蜂飞舞', midi: STATIC_FILES.野蜂飞舞, sound: STATIC_FILES.吔, image: STATIC_FILES.刘醒 },
    { name: '俄罗斯方块', midi: STATIC_FILES.俄罗斯方块, sound: STATIC_FILES.电棍唢呐, image: STATIC_FILES.电棍 },
    { name: '少女幻葬', midi: STATIC_FILES.少女幻葬, sound: STATIC_FILES.UDK姐贵, image: STATIC_FILES.魔理沙 },
    { name: '甩葱歌', midi: STATIC_FILES.甩葱歌, sound: STATIC_FILES.fa, image: STATIC_FILES.VAN },
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
  async save() {
    const save2local = (key: string, obj: object) => localForage.setItem(key, JSON.parse(JSON.stringify(obj)))
    return Promise.all([
      save2local('configList', this.configList),
      save2local('fileLibrary', this.fileLibrary)
    ])
  }
  /** 读取配置和文件 */
  async load() {
    await localForage.getItem<typeof this.fileLibrary>('fileLibrary').then((data) => {
      if (!data) return
      this.fileLibrary = {
        midi: new FileLibrary(MidiFileItem, data.midi.map(item => new MidiFileItem(item))),
        sound: new FileLibrary(SoundFileItem, data.sound.map(item => new SoundFileItem(item as SoundFileItem))),
        image: new FileLibrary(ImageFileItem, data.image.map(item => new ImageFileItem(item)))
      }
    }).then(async () => {
      return localForage.getItem<OtomadConfig[]>('configList').then(data => {
        if (!data) return
        this.configList = data.map(item => new OtomadConfig(item).match(this.fileLibrary))
      })
    })
    // 清除游离数据
    localForage.keys().then(arr => {
      const reserveKeys = new Set([
        'configList',
        'fileLibrary',
        ...Object.values(this.fileLibrary).flatMap(arr => arr.map(item => item.storeKey))
      ])

      arr.forEach(key => {
        if (!reserveKeys.has(key)) {
          localForage.removeItem(key)
        }
      })
    })
  }
  clearStore() {
    localForage.clear()
  }
  addConfig() {
    this.configList.push(new OtomadConfig())
    this.curConfig = this.configList[this.configList.length - 1]
  }

  /** 初始化 读取配置 */
  async init(index?: number) {
    await this.load()
    index = _.isNil(index) ? this.configList.length - 1 : index
    const curConfig = this.configList[index]
    curConfig.init()
    this.curConfig = curConfig
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
  starProgressTime = 0
  playId = _.uniqueId('audio-ctx')
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
    if (loopStart !== loopEnd) Object.assign(source, this.fixStartEnd({ offset, loopStart, loopEnd, loop: true, duration } as MyCtxOption))
    source.playbackRate.value = playbackRate
    source.start(when, offset, duration)
    this.playing = true
    source.onended = () => {
      this.playing = false
      this.ctx?.close()
    }
    const updateProgress = () => {
      const currentTime = this.getCurTime(playbackRate)
      callback?.(currentTime)
      if (!this.playing) return
      requestAnimationFrame(updateProgress);
    }

    updateProgress()
  }
  calculatePlaybackRate(pitch: number, basePitch = 60) {
    // MIDI音符编号60对应中央C
    const pitchDifference = pitch - basePitch
    return Math.pow(2, pitchDifference / 12)
  }
  startCount(midi?: MidiFileItem, playId?: string) {
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
      if (!this.playing || this.playId !== playId) return
      const time = new Date().getTime() + this.starProgressTime - startTime
      counter.forEach((timeIdx, index) => {
        if (time < starts[index][timeIdx]) return
        while (time >= starts[index][timeIdx]) timeIdx++
        counter[index] = timeIdx
      })
      requestAnimationFrame(updateProgress)
    }
    updateProgress()
  }
  startProgress(midi?: MidiFileItem, playId?: string) {
    if (!midi || !midi.tracks[0]) return
    const totalTime = midi.totalTime
    const startTime = new Date().getTime()
    const updateProgress = () => {
      if (!this.playing || this.playId !== playId) return
      this.progress = Math.min(_.round((new Date().getTime() + this.starProgressTime - startTime) / totalTime, 5), 1)
      requestAnimationFrame(updateProgress)
    }
    updateProgress()
  }
  // 很坑的一点是，如果duration < loopStart - offset，则无声音。所以在这把区间去掉
  fixStartEnd(option: MyCtxOption) {
    const { offset = 0, loopStart = 0, duration = 0 } = option
    if (!duration) return option
    if ((option.loopStart || option.loopEnd) && duration < loopStart - offset) {
      option.loopStart = 0
      option.loopEnd = 0
    }
    return option
  }
  playMidi(midi?: MidiFileItem, sound?: SoundFileItem, startPerc = 0) {
    this.pause()
    if (!midi || !sound) return
    if (startPerc >= 1) startPerc = 0
    this.playId = _.uniqueId('audio-ctx')
    const track = midi?.tracks[0]
    if (!track) return
    this.init(sound.buffer as AudioBuffer)
    const notes = _.chain(midi.tracks)
      .filter(track => track.selected)
      .flatMap(track => track.notes || [])
      .orderBy(note => note.start)
      .value()
    const deltaTime = track.tickDuration
    const { offset, loopRange: [loopStart, loopEnd] } = sound
    this.starProgressTime = startPerc * midi.totalTime
    const starProgressSec = this.starProgressTime / 1e3

    this.playMulti(notes.map(note => {
      const playbackRate = this.calculatePlaybackRate(note.pitch, 120 - sound.basePitch)
      const isPlayingNote = _.inRange(starProgressSec, note.start * deltaTime, note.end * deltaTime)
      const playedTime = starProgressSec - note.start * deltaTime
      // 正在播放的音符
      const option = isPlayingNote ? {
        playbackRate,
        when: 0,
        offset: offset + playedTime,
        velocity: note.velocity,
        loopStart, loopEnd,
        duration: (note.end - note.start) * deltaTime - playedTime,
      } : {
        playbackRate,
        when: note.start * deltaTime - starProgressSec,
        offset,
        velocity: note.velocity,
        loopStart, loopEnd,
        duration: (note.end - note.start) * deltaTime
      }
      return this.fixStartEnd(option)
    }).filter(item => (item.when ?? 0) >= 0), this.playId)
    this.startCount(midi, this.playId)
    this.startProgress(midi, this.playId)
  }
  async playMulti(optList: MyCtxOption[], playId: string) {
    this.playing = true
    let restCount = optList.length

    const onended = () => {
      restCount--
      if (restCount > 0) return
      this.playing = false
      this.ctx?.close()
    }

    const playNode = (opt: MyCtxOption) => {
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
      source.onended = onended
    }

    // 每一帧去查询下一个节点，若 when >= 播放时间，则播放，否则等待下一帧再查询
    const startTime = new Date().getTime()
    const rec = () => {
      const time = new Date().getTime() - startTime
      // 去掉超时的音符
      while (optList.length && ((optList[0].when || 0) + (optList[0].duration || 0)) * 1000 <= time) {
        optList.shift()
      }
      // 播放当前时间的音符
      while (optList.length && (optList[0].when || 0) * 1000 <= time) {
        playNode(optList.shift()!)
      }
      if (!this.playing || playId !== this.playId) return
      requestAnimationFrame(rec)
    }
    rec()
  }
  pause() {
    this.playing = false
    if (this.ctx && this.ctx.state !== 'closed') this.ctx?.close()
  }

  getCurTime(playbackRate: number) {
    const source = this.source
    if (!this.playing || !source) return 0
    const { loopStart = 0, loopEnd = 0, loop } = source
    const time = this.ctx!.currentTime * playbackRate + this.offset
    if (!loop || loopStart === loopEnd || time <= loopEnd) return time
    return loopStart + (time - loopEnd) % (loopEnd - loopStart)
  }
}
