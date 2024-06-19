import P5 from "p5";
import { Player, Ease } from "textalive-app-api";

// プレイヤーの初期化 / Initialize TextAlive Player
const player = new Player({
  // トークンは https://developer.textalive.jp/profile で取得したものを使う
  app: { token: "rwvJzv4wogmC0ESW" },
  mediaElement: document.querySelector("#media"),
});

let animeInitFlag = 0

let blackOutBlocks = []
const words = []

// リスナの登録 / Register listeners
player.addListener({
  onAppReady: (app) => {
    if (!app.managed) {
      player.createFromSongUrl("https://piapro.jp/t/ELIC/20240130010349", {
        video: {
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
    let lastKilled = false
    while (i < player.video.wordCount) {
      const word = player.video.getWord(i)
      words.push(word)
      if (["V","N","J"].includes(word.pos)) {
        if (Math.random() < (lastKilled?0.10:0.75)) {
          blackOutBlocks.push({
            startTime: word.startTime,
            endTime: word.endTime
          })
          lastKilled = true
        } else {
          lastKilled = false
        }
      } else {
        lastKilled = false
      }
      i += 1;
    }
    if (!player.app.managed) {
      //document.querySelector("#message").className = "active";
    }
    document.querySelector("#overlay").className = "inactive";
    animeInitFlag = 1
  },

  onPlay: () => {
    //document.querySelector("#message").className = "inactive";
    console.log("player.onPlay");
  },

  onPause: () => {
    if (!player.app.managed) {
      //document.querySelector("#message").className = "active";
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

document.getElementById("changeSong").addEventListener("click", () => {
  player.createFromSongUrl(document.getElementById("urlInput").value, {
    video: {
    },
  });
});


// p5.js を初期化
new P5((p5) => {
  // キャンバスの大きさなどを計算
  const width = Math.min(1920, window.innerWidth);
  const height = Math.min(1080, window.innerHeight);
  const fontSize = Math.min(height/20,width/30)
  const margin = 50;
  const textAreaWidth = width - margin * 2;

  const separationList = []

  const toA = p5.createGraphics(width,height);

  let cursorLine = -1

  let cursorTime = -1

  let lastCursorLine = -1

  let lastCursorTime = -1

let aContext = new AudioContext()
let osc = null
let gain = aContext.createGain()
gain.gain.setValueAtTime(0.4,aContext.currentTime)

let beeping = false



  // キャンバスを作成
  p5.setup = () => {
    p5.createCanvas(width, height);
    p5.frameRate(30);
    p5.background(230);
    p5.textFont("Noto Sans JP");
    p5.textSize(fontSize)
    p5.textAlign(p5.LEFT,p5.TOP)
  };

  // ビートにあわせて背景を、発声にあわせて歌詞を表示
  p5.draw = () => {

    const mouseX = p5.touches.length>0?p5.touches[0].x:p5.mouseX
    const mouseY = p5.touches.length>0?p5.touches[0].y:p5.mouseY
    p5.noStroke();
    // プレイヤーが準備できていなかったら何もしない
    if (!player || !player.video) {
      return;
    }
    
    p5.background(230);
    switch (animeInitFlag) {
      case 0:
        return;
      case 1:
        let lastEnd = 0
        let latestWidth = 0
        words.forEach(word=> {
          toA.clear()
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


    const timeSpanner = []
    let y = 0
    cursorLine = -1
    cursorTime = -1
    separationList.forEach(block=> {
      if (cursorLine == -1 && y+margin <= mouseY && mouseY < y+margin+fontSize) {
        cursorLine = y+margin
      }
      if (block.type == "char") {
        if (position > block.startTime) {
          p5.fill(20)
        } else {
          p5.fill(140)
        }
        p5.text(block.text,block.x+margin,y+margin)
        if (block.x+margin <= mouseX && mouseX < block.x+margin+block.width && y+margin <= mouseY && mouseY < y+margin+fontSize+10) {
          cursorTime = block.startTime+(mouseX-block.x-margin)/block.width*(block.endTime-block.startTime)
        }
        timeSpanner.push([block.startTime,block.endTime,block.x,y,block.width/(block.endTime-block.startTime)])
      } else {
        y += fontSize+10
      }
    })

    let muteFlag = false
    blackOutBlocks.forEach(bBlock=>{
      if (bBlock.startTime-50 <= position && bBlock.endTime-40 >= position) {
        muteFlag = true
      }
      let kuronuriEnd = 0
      let kuronuriCarret = 0
      let kuronuriCount = 0
      timeSpanner.some(item=>{
        const [sT,eT,xI,yI,xB] = item;
        if (kuronuriCount == 0) {
          if (bBlock.startTime >= sT) {
            if (bBlock.startTime < eT) {
              kuronuriCount = 1
              kuronuriEnd = bBlock.endTime
              kuronuriCarret = bBlock.startTime
            }
          }
        }
        if (kuronuriCount > 0){
          let drawStart = xI+(kuronuriCarret-sT)*xB+margin
          if (kuronuriCount == 1) {
            drawStart += 2
          }
          const fillTo = Math.min((kuronuriEnd-kuronuriCarret),(eT-kuronuriCarret))
          let drawWidth = fillTo*xB+1
          if (Math.abs(kuronuriCarret+fillTo-kuronuriEnd) < 5) {
            drawWidth -= 5
          }
          p5.fill(0,0,0,230)
          p5.rect(drawStart,yI+margin,drawWidth,fontSize)
          kuronuriCarret += fillTo
          if (Math.abs(kuronuriCarret-kuronuriEnd) < 5) {
            return true
          }
          kuronuriCount += 1
        
        }
      })
    })
    if (cursorTime != -1 && cursorLine != -1) {
      p5.strokeWeight(2)
      p5.stroke(255)
      p5.line(mouseX,cursorLine,mouseX,cursorLine+fontSize)
      p5.noStroke()

      if ((p5.mouseIsPressed || p5.touches.length>0) && lastCursorTime != -1 && lastCursorLine != -1) {
        if (lastCursorLine == cursorLine) {
          let lSideOrder = 0
          let rSideOrder = 0
          const lSide = Math.min(lastCursorTime,cursorTime)
          const rSide = Math.max(lastCursorTime,cursorTime)
          blackOutBlocks.some(block=>{
            if (block.startTime <= lSide && lSide < block.endTime ) {
              blackOutBlocks.splice(lSideOrder,0,{
                startTime: block.startTime,
                endTime: lSide-2,
              })
              blackOutBlocks.splice(lSideOrder+1,1,{
                startTime: lSide+2,
                endTime: block.endTime,
              })
              return true
            } else if (block.startTime > lSide) {
              lSideOrder -= 1
              return true
            }
            lSideOrder += 1
          })
          blackOutBlocks.some(block=>{
            if (block.startTime <= rSide && rSide < block.endTime ) {
              blackOutBlocks.splice(rSideOrder,0,{
                startTime: block.startTime,
                endTime: rSide-1,
              })
              blackOutBlocks.splice(rSideOrder+1,1,{
                startTime: rSide+1,
                endTime: block.endTime,
              })
              return true
            } else if (block.startTime > rSide) {
              rSideOrder -= 1
              return true
            }
            rSideOrder += 1
          })
          blackOutBlocks.splice(lSideOrder+1,rSideOrder-lSideOrder)
          console.log(lSideOrder,rSideOrder)
          blackOutBlocks = blackOutBlocks.filter(block=>{
            return (Math.abs(block.endTime-block.startTime) > 0)
          })
        }
      }
    }
    if (muteFlag) {
      if (!beeping) {
        player.volume = 0
        osc = aContext.createOscillator()
        osc.type = "sine"
        osc.frequency.value = 523.3
        osc.connect(gain)
        gain.connect(aContext.destination)
        osc.start()
        beeping = true
      }
    } else {
      if (beeping) {
        player.volume = 100
        osc.stop()
        beeping = false
      }
    }
    lastCursorLine = cursorLine+0
    lastCursorTime = cursorTime+0
  };
});
