# LyricsX 與 Better Lyrics 歌詞來源／逐字同步研究

研究日期：2026-09-15。本文只以專案目前原始碼、其直接依賴，以及歌詞服務實際回應為依據。「逐字」泛指每個字、詞或音節各自帶有開始時間／時長；它不等同於只有一個時間戳的逐行 LRC。

## 結論摘要

- **網易雲有逐字歌詞。**欄位是 `yrc`（YRC）；較舊或不同歌曲也可能有 `klyric`。LyricsX 的 LyricsKit 會依序採用 **YRC → K-Lyric → 普通 LRC**，所以不能把「某一首未回傳 YRC」解讀成網易雲整個來源不支援逐字。[選擇順序](https://github.com/MxIris-LyricsX-Project/LyricsKit/blob/bb255842eb8fe48880e15c23c0a7704599dd3504/Sources/LyricsService/Provider/Services/NetEase/NetEase.swift#L62-L92)
- LyricsX/LyricsKit 中可直接產生逐字資料的來源共有 **網易雲（YRC/K-Lyric）、QQ 音樂（QRC）、酷狗（KRC）**。Musixmatch 在這個專案目前只解析逐行 subtitle；LRCLIB 也是普通逐行 LRC。
- Better Lyrics 中真正走 rich-synced 顯示路徑的來源有 **Apple Music TTML（顯示名 Better Lyrics）、Unison TTML、BiniLyrics TTML、QQ/Portato QRC、Musixmatch RichSync**。其中前三者最高可到音節級，後兩者標為 word 級。[來源優先序與同步類型](https://github.com/boidushya/better-lyrics/blob/037d8e14d914cbe056871a98d51487fbc8421b39/src/core/constants.ts#L393-L431)
- 若目標是提高日文歌逐字覆蓋率，建議接入順序是：**網易雲 YRC/K-Lyric → 酷狗 KRC → QQ QRC → Better Lyrics/Unison/BiniLyrics TTML → Musixmatch wordByWord**。前三個中國平台也較可能同時帶翻譯／音譯資料；但每首歌並非都有 rich sync。

## LyricsX 實際接入的來源

LyricsX 主程式把歌詞工作交給 LyricsKit；套件宣告可見它直接依賴 `MxIris-LyricsX-Project/LyricsKit`。[LyricsX Package.swift](https://github.com/MxIris-LyricsX-Project/LyricsX/blob/d4e44bcdb7b2872fb213ea5130d99de23a9c8a73/LyricsXPackage/Package.swift#L64-L74) LyricsKit 目前可執行的 `ServiceID` 是 NetEase、QQ、Kugou、Musixmatch、LRCLIB 五個；這比 README 還列出的 Spotify 更可靠，因為目前程式碼中沒有 Spotify provider。[ServiceID 與工廠](https://github.com/MxIris-LyricsX-Project/LyricsKit/blob/bb255842eb8fe48880e15c23c0a7704599dd3504/Sources/LyricsService/Provider/Service.swift#L12-L59)

| 來源 | LyricsKit 實際取得／解析格式 | 能力 | 翻譯／讀音 | 重要限制 |
| --- | --- | --- | --- | --- |
| 網易雲音樂 | YRC、K-Lyric、LRC | **YRC/K-Lyric：逐字或音節級**；LRC：逐行 | `tlyric` 為逐行翻譯；一般 LRC 回退時會合併 | YRC 需使用加密 EAPI；逐字資料是否存在取決於歌曲 |
| QQ 音樂 | QRC，回退 extended LRC/LRC | **QRC：逐字級**；回退格式多為逐行 | XML 的 `ts` 會合併為翻譯；另解析 QQ kana 來套用日文振假名 | QRC 內容需要解密；不是每首都有 QRC |
| 酷狗音樂 | KRC | **逐字／音節級** | KRC `language` header 的 type 1 是翻譯、type 0 是音譯 | 下載內容需 XOR + zlib 解密；覆蓋率依曲目而異 |
| Musixmatch | `subtitle_body` 的 JSON subtitle | **僅逐行** | 此實作沒有翻譯合併 | 需要 usertoken；雖請求帶 `lyrics_richsynched` namespace，程式沒有讀 richsync word 資料 |
| LRCLIB | `syncedLyrics` LRC | **僅逐行** | 無內建翻譯合併 | 無逐字欄位；只有 synced/plain 兩類 |

### 網易雲：YRC 確實存在，但不是普通端點穩定可得

LyricsKit 的單曲回應模型明確宣告 `yrc`、`klyric`、`lrc` 與 `tlyric` 欄位。[回應模型](https://github.com/MxIris-LyricsX-Project/LyricsKit/blob/bb255842eb8fe48880e15c23c0a7704599dd3504/Sources/LyricsService/Model/NetEase/NetEaseResponseSingleLyrics.swift#L3-L9) Provider 使用 `https://interface3.music.163.com/eapi/song/lyric/v1`，並在 payload 要求 `yv` 等版本；其後優先解析 `yrc`，才回退 `klyric` 與 `lrc`。[EAPI URL 與 payload](https://github.com/MxIris-LyricsX-Project/LyricsKit/blob/bb255842eb8fe48880e15c23c0a7704599dd3504/Sources/LyricsService/Provider/Services/NetEase/NetEase.swift#L13-L14) [取得與回退流程](https://github.com/MxIris-LyricsX-Project/LyricsKit/blob/bb255842eb8fe48880e15c23c0a7704599dd3504/Sources/LyricsService/Provider/Services/NetEase/NetEase.swift#L62-L92)

YRC 行的格式為：

```text
[lineStartMs,lineDurationMs](wordStartMs,wordDurationMs,0)fragment...
```

解析器將片段的絕對開始時間扣除行開始時間，再加上片段時長，存成行內時間標記，證明它不是只有逐行 timestamp。[YRC parser](https://github.com/MxIris-LyricsX-Project/LyricsKit/blob/bb255842eb8fe48880e15c23c0a7704599dd3504/Sources/LyricsService/Parser/NetEaseKLyricParser.swift#L49-L89) K-Lyric 則以 `(0,duration)fragment` 累加片段時長，同樣能形成逐字／音節時間。[K-Lyric parser](https://github.com/MxIris-LyricsX-Project/LyricsKit/blob/bb255842eb8fe48880e15c23c0a7704599dd3504/Sources/LyricsService/Parser/NetEaseKLyricParser.swift#L5-L47)

EAPI 並非等同「一定要登入」。LyricsKit 以 AES-128-ECB 與 MD5 封裝請求，並建立 Android 樣式 header；程式中的 `MUSIC_U` 是空字串。[EAPI 加密與 header](https://github.com/MxIris-LyricsX-Project/LyricsKit/blob/bb255842eb8fe48880e15c23c0a7704599dd3504/Sources/LyricsService/Provider/Services/NetEase/NetEaseEapiClient.swift#L13-L65) [參數加密](https://github.com/MxIris-LyricsX-Project/LyricsKit/blob/bb255842eb8fe48880e15c23c0a7704599dd3504/Sources/LyricsService/Provider/Services/NetEase/NetEaseEapiClient.swift#L82-L113)

實際在 2026-09-15 對該 EAPI 送出同樣的空 `MUSIC_U` 請求，得到以下結果：

- 曲目 `1901371647`、`1974443814`、`26092806`、`1824045033`：HTTP/API `code: 200`，且 `yrc.lyric` 有內容。
- 曲目 `1824020871`（宇多田ヒカル〈One Last Kiss〉）：同時有 `yrc` 與 `tlyric`，證明日文歌可取得逐字原文及逐行翻譯。
- 曲目 `26092806` 的實際片段例如 `[59610,1950](59610,450,0)In (60060,420,0)my ...`，具備每個片段的絕對開始時間與 duration。
- 曲目 `1409311773`（YOASOBI〈夜に駆ける〉）：只有 `lrc` 與 `tlyric`；曲目 `2122268819` 則只有 `lrc`。另測的 `2076481664` 也沒有 `yrc`。因此 YRC 可匿名樣式取得，但**按歌曲提供，不能保證**。

這也解釋了目前播放器為何可能看不到網易雲逐字：若只打簡單 `/api/song/lyric`，或 renderer 只解析 LRC，就會漏掉 EAPI 的 YRC；即使改成 EAPI，某些日文歌仍只會回傳逐行歌詞。

### QQ 音樂：QRC 逐字

QQ provider 以 `lrctype=4` 下載 XML，解碼 `orig` 後優先交給 QRC parser，失敗才回退 LRC。[下載與解析流程](https://github.com/MxIris-LyricsX-Project/LyricsKit/blob/bb255842eb8fe48880e15c23c0a7704599dd3504/Sources/LyricsService/Provider/Services/QQMusic/QQMusic.swift#L95-L139) QRC 格式同樣是 `[lineStart,duration]fragment(fragmentStart,fragmentDuration)`，解析器為每個 fragment 建立行內時間標記。[QRC parser](https://github.com/MxIris-LyricsX-Project/LyricsKit/blob/bb255842eb8fe48880e15c23c0a7704599dd3504/Sources/LyricsService/Parser/QQMusicQrcParser.swift#L17-L45) QRC 使用三次 DES 變換再 zlib 解壓，不能當一般 base64 LRC 處理。[QRC decrypter](https://github.com/MxIris-LyricsX-Project/LyricsKit/blob/bb255842eb8fe48880e15c23c0a7704599dd3504/Sources/LyricsService/Parser/QQMusicQrcDecrypter.swift#L3-L59)

### 酷狗：KRC 逐字，且可帶翻譯

酷狗先搜尋歌曲與歌詞候選，再以 `fmt=krc` 下載 KRC。[Kugou provider](https://github.com/MxIris-LyricsX-Project/LyricsKit/blob/bb255842eb8fe48880e15c23c0a7704599dd3504/Sources/LyricsService/Provider/Services/Kugou/Kugou.swift#L22-L80) KRC 內容是 `krc1` header、循環 XOR key 與 zlib 壓縮。[KRC decrypter](https://github.com/MxIris-LyricsX-Project/LyricsKit/blob/bb255842eb8fe48880e15c23c0a7704599dd3504/Sources/LyricsService/Parser/KugouKrcDecrypter.swift#L3-L21) 解析器讀取 `<offset,duration,0>fragment`，並把 language header 的 type 1 合併為逐行翻譯。[KRC parser 與 translation](https://github.com/MxIris-LyricsX-Project/LyricsKit/blob/bb255842eb8fe48880e15c23c0a7704599dd3504/Sources/LyricsService/Parser/KugouKrcParser.swift#L25-L62)

### Musixmatch 與 LRCLIB：LyricsKit 現況不是逐字

Musixmatch 雖然在 query 使用 `namespace=lyrics_richsynched`，實際只讀 `track.subtitles.get` 的 `subtitle_body`，再將每個 JSON item 的 `time.total` 建成一行，沒有解析 word start/duration。[請求設定](https://github.com/MxIris-LyricsX-Project/LyricsKit/blob/bb255842eb8fe48880e15c23c0a7704599dd3504/Sources/LyricsService/Provider/Services/Musixmatch/Musixmatch.swift#L26-L45) [逐行 mapping](https://github.com/MxIris-LyricsX-Project/LyricsKit/blob/bb255842eb8fe48880e15c23c0a7704599dd3504/Sources/LyricsService/Provider/Services/Musixmatch/Musixmatch.swift#L141-L178) 它也明確需要 usertoken。[LyricsKit README](https://github.com/MxIris-LyricsX-Project/LyricsKit/blob/bb255842eb8fe48880e15c23c0a7704599dd3504/README.md#L46-L48)

LRCLIB provider 只讀 `syncedLyrics` 並交給普通 LRC parser；若搜尋結果無內容才呼叫 `/api/get/{id}`，仍沒有逐字格式。[LRCLIB provider](https://github.com/MxIris-LyricsX-Project/LyricsKit/blob/bb255842eb8fe48880e15c23c0a7704599dd3504/Sources/LyricsService/Provider/Services/LRCLIB/LRCLIB.swift#L22-L69)

## Better Lyrics 實際接入的來源

Better Lyrics 對 UI 暴露 15 個「來源 key」，但部分其實是同一上游的 rich/line/plain 三種槽位。依目前 client code 可整理成下表。[完整 provider 設定](https://github.com/boidushya/better-lyrics/blob/037d8e14d914cbe056871a98d51487fbc8421b39/src/core/constants.ts#L393-L431) [key 到實作的映射](https://github.com/boidushya/better-lyrics/blob/037d8e14d914cbe056871a98d51487fbc8421b39/src/modules/lyrics/providers/shared.ts#L156-L175)

| Better Lyrics 顯示來源 | 上游／格式 | rich sync？ | 原始碼判斷 |
| --- | --- | --- | --- |
| Better Lyrics | Apple Music TTML（經自家 `golyrics` provider） | **是，音節級；也可回逐行** | 後端以 Apple Music track ID 取得 TTML；client 依 `isWordSynced` 放進 rich 或 synced 槽位 |
| Unison | 社群資料庫，TTML/LRC/plain | **TTML 可音節級**；LRC 逐行；plain 無同步 | 回應明列 `format` 與 `syncType`，client 分別解析 |
| BiniLyrics | Binimum 回傳 TTML | **是，音節級；也可回逐行** | `timingType` 為 syllable/line，會重新歸入相應槽位 |
| Better Lyrics Portato | QQ 音樂 QRC | **是，word 級** | server event `qq` 的內容交給 `parseQRC` |
| Musixmatch | `wordByWord` 或 `synced` LRC | **wordByWord 是 word 級**；synced 是逐行 | client 對兩個欄位分開建 rich/synced result |
| YouTube Captions | YouTube JSON3 captions | **否，逐行／字幕事件級** | 合併每個 event 的 segs，只保留 event start/duration，未保存各 seg 時間 |
| LRCLIB | synced LRC / plain | **否**；逐行或純文字 | 分別使用 LRC / Plain parser |
| Better Lyrics Legato | 酷狗 LRC | **否；目前 client 標為逐行** | 後端把整行時間平均切給字詞，那是插值而非來源提供的真實逐字 timing |
| YouTube | YouTube Music 頁面歌詞 | **否，純文字** | 直接用 PlainParser |

### Better Lyrics 哪些路徑「真的」解析 rich sync

1. **TTML 家族：Apple Music/Better Lyrics、Unison、BiniLyrics。**共用 `fillTtml`；它呼叫 `parseTTMLContent`，並依 `isWordSynced` 決定 rich 或 line 槽位。[TTML 分流](https://github.com/boidushya/better-lyrics/blob/037d8e14d914cbe056871a98d51487fbc8421b39/src/modules/lyrics/providers/ttmlSource.ts#L16-L62) Better Lyrics 的後端 provider 是以 Apple Music track ID 取得 TTML，並送出 `music.apple.com` 所需 headers。[Apple Music TTML provider](https://github.com/better-lyrics/api/blob/b0be234886b8649196362d388743e3fef8d574e8/services/providers/ttml/ttml.go#L11-L16) [Apple Music request headers](https://github.com/better-lyrics/api/blob/b0be234886b8649196362d388743e3fef8d574e8/services/providers/ttml/client.go#L226-L239) Unison 明確接受 `ttml`、`lrc`、`plain` 三格式，只有 TTML 走 rich 檢測。[Unison response 與解析](https://github.com/boidushya/better-lyrics/blob/037d8e14d914cbe056871a98d51487fbc8421b39/src/modules/lyrics/providers/unison.ts#L17-L31) [Unison 分流](https://github.com/boidushya/better-lyrics/blob/037d8e14d914cbe056871a98d51487fbc8421b39/src/modules/lyrics/providers/unison.ts#L171-L202)
2. **QQ/Portato：QRC。**`provider === "qq"` 時明確呼叫 `parseQRC`，並只填 `portato-richsynced`。[QQ richsync 路徑](https://github.com/boidushya/better-lyrics/blob/037d8e14d914cbe056871a98d51487fbc8421b39/src/modules/lyrics/providers/unified.ts#L521-L540) 後端 parser 也將每個 QRC fragment 的開始與結束時間保存為 word-level 資料。[QRC parser](https://github.com/better-lyrics/api/blob/b0be234886b8649196362d388743e3fef8d574e8/services/providers/qq/parser.go#L66-L105)
3. **Musixmatch RichSync。**server 若回 `results.wordByWord`，client 解析後放到 `musixmatch-richsync`；`results.synced` 則另放逐行槽位。[Musixmatch 兩條路徑](https://github.com/boidushya/better-lyrics/blob/037d8e14d914cbe056871a98d51487fbc8421b39/src/modules/lyrics/providers/unified.ts#L444-L475) Better Lyrics 後端會讀 RichSync token 的相對時間並轉成 Enhanced LRC；拿不到 RichSync 才回退普通 LRC。[RichSync 轉換](https://github.com/better-lyrics/cf-api/blob/3908d477e814919c500603109b338c88a61fa74a/src/providers/Musixmatch.ts#L277-L319) [逐行 fallback](https://github.com/better-lyrics/cf-api/blob/3908d477e814919c500603109b338c88a61fa74a/src/providers/Musixmatch.ts#L482-L496)
4. **BiniLyrics。**TTML 初步解析後，server 的 `timingType: "syllable" | "line"` 會再次校正 rich/line 歸類。[BiniLyrics timingType](https://github.com/boidushya/better-lyrics/blob/037d8e14d914cbe056871a98d51487fbc8421b39/src/modules/lyrics/providers/unified.ts#L561-L586) BiniLyrics API 本身也只宣告 `syllable` 或 `line` 並下載 TTML。[BiniLyrics provider](https://github.com/better-lyrics/cf-api/blob/3908d477e814919c500603109b338c88a61fa74a/src/providers/Binimum.ts#L21-L35) [TTML 下載](https://github.com/better-lyrics/cf-api/blob/3908d477e814919c500603109b338c88a61fa74a/src/providers/Binimum.ts#L68-L94)

相反地，酷狗 Legato 在 Better Lyrics 中只把回傳內容送入 `parseLRC`，並填 `legato-synced`，因此**不能因上游叫 Kugou 就假定此路徑保留了 KRC 逐字時間**。[Legato 路徑](https://github.com/boidushya/better-lyrics/blob/037d8e14d914cbe056871a98d51487fbc8421b39/src/modules/lyrics/providers/unified.ts#L505-L519) 其後端甚至註明 LRC 沒有 word-level timing，程式產生的 word 時間只是把整行時長平均分配。[Kugou 插值程式](https://github.com/better-lyrics/api/blob/b0be234886b8649196362d388743e3fef8d574e8/services/providers/kugou/parser.go#L142-L155) YouTube Captions 也把 JSON3 的 `segs` 合併成整個 event 字串，只保存 event 時間，實作上是逐行／字幕段落同步。[YouTube Captions parser](https://github.com/boidushya/better-lyrics/blob/037d8e14d914cbe056871a98d51487fbc8421b39/src/modules/lyrics/providers/ytCaptions.ts#L50-L81)

Better Lyrics 的 client source keys 與聚合後端初始化清單都沒有 NetEase，所以**不能靠 Better Lyrics 本身取得網易雲 YRC**；這條來源必須獨立接 LyricsX/LyricsKit 所示的網易 EAPI。[全部 client source keys](https://github.com/boidushya/better-lyrics/blob/037d8e14d914cbe056871a98d51487fbc8421b39/src/modules/lyrics/providers/shared.ts#L156-L173) [後端實際 providers](https://github.com/better-lyrics/cf-api/blob/3908d477e814919c500603109b338c88a61fa74a/src/services/LyricsService.ts#L20-L29)

## 對 pear-desktop 接入的建議

1. **先補 NetEase EAPI + YRC/K-Lyric parser。**這是目前缺失最明確的一段；不需要強制使用者登入，但需在 Electron main/backend 做 AES/MD5 請求封裝，renderer 只接收已解碼資料。取得 YRC 後仍將 `tlyric` 以行開始時間合併。
2. **再補 Kugou KRC。**它能提供逐字時間與內嵌翻譯，對中國平台及日文歌覆蓋率有實際加成；解密演算法也比 QRC 簡單。
3. **保留已接入的 QQ QRC。**它是確定可用的 word-level 來源；翻譯與 kana/furigana 可沿用目前流程。
4. **把 TTML 做成通用 parser，再考慮 Apple Music/Better Lyrics、Unison、BiniLyrics。**TTML 能表示音節、背景人聲等更豐富結構，但這些來源依賴第三方服務端與其授權／可用性，耦合風險高於直接接三個中國平台。
5. **Musixmatch richsync 放較後面。**Better Lyrics 證明其 server 可回 `wordByWord`，但 LyricsX 自己的 client 目前需要 usertoken 且只解析 subtitle。若直接接入，必須另外處理 token、使用條款與服務端 API 變動。

建議的自動選源權重可設為：`有翻譯的逐字 > 無翻譯的逐字 > 有翻譯的逐行 > 普通逐行 > 純文字`；並在 UI 明確顯示實際格式，例如 `NetEase · YRC`、`Kugou · KRC`，避免只顯示平台名讓使用者誤以為所有歌曲都有逐字。
