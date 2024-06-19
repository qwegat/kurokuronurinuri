import P5 from "p5";
import { Player, Ease } from "textalive-app-api";

// プレイヤーの初期化 / Initialize TextAlive Player
const player = new Player({
  // トークンは https://developer.textalive.jp/profile で取得したものを使う
  app: { token: "rwvJzv4wogmC0ESW" },
  mediaElement: document.querySelector("#media"),
});

let animeInitFlag = 0

const blackOutBlocks = []
const words = []

// リスナの登録 / Register listeners
player.addListener({
  onAppReady: (app) => {
    if (!app.managed) {
      player.createFromSongUrl("https://piapro.jp/t/N--x/20210204215604", {
        video: {
          // 音楽地図訂正履歴: https://songle.jp/songs/2121403/history
          beatId: 3953761,
          repetitiveSegmentId: 2099586,
          // 歌詞タイミング訂正履歴: https://textalive.jp/lyrics/piapro.jp%2Ft%2FN--x%2F20210204215604
          lyricId: 52094,
          lyricDiffId: 5171,
        },
      });
      document.querySelector("#control").className = "active";
    } else {
      document.querySelector("#control").className = "inactive";
    }
  },

  onTextLoad: (body) => {
    // Webフォントを確実に読み込むためDOM要素に歌詞を貼り付ける
    document.querySelector("#dummy").textContent = body?.text;
  },

  onVideoReady: () => {
    let i = 0;

    while (i < player.video.wordCount) {
      const word = player.video.getWord(i)
      words.push(word)
      if (["V","N","J"].includes(word.pos)) {
        if (Math.random() < 0.8) {
          blackOutBlocks.push({
            text: word.text,
            startTime: word.startTime,
            endTime: word.endTime
          })
        }
      }
      i += 1;
    }
    if (!player.app.managed) {
      document.querySelector("#message").className = "active";
    }
    document.querySelector("#overlay").className = "inactive";
    animeInitFlag = 1
  },

  onPlay: () => {
    document.querySelector("#message").className = "inactive";
    console.log("player.onPlay");
  },

  onPause: () => {
    if (!player.app.managed) {
      document.querySelector("#message").className = "active";
    }
    console.log("player.onPause");
  },

  onSeek: () => {
    console.log("player.onSeek");
  },

  onStop: () => {
    console.log("player.onStop");
  },
});

// 再生ボタン
document.querySelector("#play").addEventListener("click", () => {
  player.requestPlay();
});

// 停止ボタン
document.querySelector("#stop").addEventListener("click", () => {
  player.requestStop();
});

// p5.js を初期化
new P5((p5) => {
  // キャンバスの大きさなどを計算
  const width = Math.min(1920, window.innerWidth);
  const height = Math.min(1080, window.innerHeight);
  const fontSize = Math.min(height/4,width/6)
  const margin = 30;
  const numChars = 10;
  const textAreaWidth = width - margin * 2;
  const textAreaHeight = height - margin * 2;

  const separationList = []


  // キャンバスを作成
  p5.setup = () => {
    p5.createCanvas(width, height);
    p5.frameRate(30);
    p5.background(230);
    p5.noStroke();
    p5.textFont("Noto Sans JP");
    p5.textSize(fontSize)
  };

  // ビートにあわせて背景を、発声にあわせて歌詞を表示
  p5.draw = () => {
    // プレイヤーが準備できていなかったら何もしない
    if (!player || !player.video) {
      return;
    }

    switch (animeInitFlag) {
      case 0:
        return;
      case 1:
        let lastEnd = 0
        let latestWidth = 0
        words.forEach(word=> {
          let wordWidth = 0
          word.children.forEach(chara => {
            wordWidth += p5.textWidth(chara.text)+1
          })
          wordWidth -= 1
          if (wordWidth > textAreaWidth-latestWidth) {
            separationList.push({
              type: "lineBreak"
            })
            latestWidth = 0
          }
          let cc = 0
          word.children.forEach(chara => {
            if (cc > 0) {
              separationList[separationList.length-1].endTime = chara.startTime
            }
            const charWidth = p5.textWidth(chara.text)
            if (charWidth > textAreaWidth-latestWidth) {
              separationList.push({
                type: "lineBreak"
              })
              latestWidth = 0
            }
            separationList.push({
              type: "char",
              text: chara.text,
              x: latestWidth,
              width: charWidth,
              startTime: chara.startTime,
              endTime: chara.endTime
            })

            latestWidth += charWidth+1
            cc += 1
          })
        })
        animeInitFlag = 2;
        break
    }


    const position = player.timer.position;

    // 背景
    p5.background(230);
    const beat = player.findBeat(position);
    if (beat) {
      const progress = beat.progress(position);
      const rectHeight = Ease.quintIn(progress) * height;
      p5.fill(0, 0, 0, Ease.quintOut(progress) * 60);
      p5.rect(0, rectHeight, width, height - rectHeight);
    }

    // 歌詞
    // - 再生位置より 100 [ms] 前の時点での発声文字を取得
    // - { loose: true } にすることで発声中でなければ一つ後ろの文字を取得
    const timeSpanner = []
    let y = 0
    separationList.forEach(block=> {
      if (block.type == "char") {
        p5.fill(20)
        p5.text(block.text,block.x+margin,y+margin)
      } else {
        y += fontSize+10
      }
      timeSpanner.push([block.startTime,block.endTime,block.x,y,block.width/(block.endTime-block.startTime)])
    })
    blackOutBlocks.forEach(bBlock=>{
      timeSpanner.some(item=>{
        const [sT,eT,xI,yI,xB] = item;
        if (bBlock.startTime >= sT-1000) {
          if (bBlock.startTime <= eT+1000) {
            p5.fill(0)
            p5.rect((xI+(bBlock.startTime-sT)*xB+margin,yI+margin,(bBlock.endTime-bBlock.startTime)*xB,fontSize))
            return true
          }
        }
      })
    })
  };
});
