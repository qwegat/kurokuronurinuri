import P5 from "p5";
import { Player, Ease } from "textalive-app-api";

// プレイヤーの初期化 / Initialize TextAlive Player
let player = new Player({
  // トークンは https://developer.textalive.jp/profile で取得したものを使う
  app: { token: "ZEHibqeUcqvUijFZ" },
  mediaElement: document.getElementById("media"),
});



onMusicChange = (e) => {
  player.createFromSongUrl(e.target.value, {
    video: {},
  });
  player.requestMediaSeek(0);
  player.requestPause();
  refreshP5()
}

// リスナの登録 / Register listeners
player.addListener({
  onAppReady: (app) => {
    if (!app.managed) {
      player.createFromSongUrl("https://piapro.jp/t/ELIC/20240130010349", {
        video: {},
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
    refreshP5()
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
  }
});

let p5Instance = null;



const aContext =
  new AudioContext() ||
  new (window.AudioContext || window.webkitAudioContext)();
let osc = aContext.createOscillator();
let gain = aContext.createGain();
gain.gain.setValueAtTime(0.4, aContext.currentTime);

refreshP5()
// p5.js を初期化
function refreshP5() {
  document.querySelector("#overlay").className = "active";
  let animeInitFlag = 0;

  let mouseIsPressed = false;
  let touchedP = false;

  const phrases = [];
  let blackOutBlocks = [];

  let iP = 0;
  let lastKilled = false;
  while (iP < player.video.phraseCount) {
    let iW = 0;
    const phrase = player.video.getPhrase(iP);
    console.log(phrase)
    const words = [];
    while (iW < phrase.wordCount) {
      const word = phrase.getWord(iW);
      words.push(word);
      if (["V", "N", "J"].includes(word.pos)) {
        if (Math.random() < (lastKilled ? 0.1 : 0.75)) {
          blackOutBlocks.push({
            startTime: word.startTime,
            endTime: word.endTime,
          });
          lastKilled = true;
        } else {
          lastKilled = false;
        }
      } else {
        lastKilled = false;
      }
      iW += 1;
    }
    phrases.push(words);
    iP += 1;
  }
  document.querySelector("#overlay").className = "inactive";
  animeInitFlag = 1;
  if (p5Instance !== null) {
    if (p5Instance.beeping) {
      osc.stop();
    }
    p5Instance.remove();
  }
  p5Instance = null;
  p5Instance = new P5((p5) => {
    const deg2rad = (deg) => deg * (Math.PI / 180);
    // キャンバスの大きさなどを計算
    const width = Math.min(1920, window.innerWidth);
    const height = Math.min(1080, window.innerHeight);
    const fontSize = Math.min(height, width) / 25;
    const minPadding = 20;
    const sliderWidth = Math.max(50, width / 30);
    const paperWidth = Math.min(
      (height - minPadding * 2) / 1.414,
      width - minPadding * 2 - sliderWidth
    );
    const paperHeight = paperWidth * 1.414;
      
    const paperPadding = 20;
    const textAreaWidth = paperWidth - paperPadding * 2;
    const textAreaHeight = paperHeight - paperPadding * 2 - 20;
    const marginX =
      (width - paperWidth - minPadding * 2 < sliderWidth * 2
        ? (width - (minPadding + sliderWidth) - paperWidth) / 2
        : (width - paperWidth) / 2) + paperPadding;
    const marginY = (height - paperHeight) / 2 + paperPadding;

    let hoveringStartStopButton = false;
    let hoveringSlider = false;

    const sliderLength = paperHeight - sliderWidth - 5;

    const separationList = [];
    const buttonX = width - 10 - sliderWidth / 2;
    const buttonY = marginY - paperPadding + sliderWidth / 2;

    let cursorLine = -1;

    let cursorTime = -1;

    let lastCursorLine = -1;

    let lastCursorTime = -1;

    let seeking = false;

    let lastMouseIsPressed = false;

    let truePlaying = false;

    let lastMillis = 0;


    let beeping = false;

    let currentPage = 0;

    const timeSpanner = [];

    const pageSplits = [];

    let onTouchButtonFlag = false;
    let onTouchSliderFlag = false;

    let position = 0;

    // キャンバスを作成
    p5.setup = () => {
      p5.createCanvas(width, height);
      p5.frameRate(30);
      p5.background(230);
      p5.textFont("Noto Serif JP");
      p5.textSize(fontSize);
      p5.textAlign(p5.LEFT, p5.BASELINE);
      try {
        osc.stop()
      } catch(error) {

      }
    };

    p5.mousePressed = () => {
      if (!player || !player.video || animeInitFlag != 2) {
        return;
      }

      const mouseX = p5.mouseX;
      const mouseY = p5.mouseY;
      const sliderX = width - 10 - sliderWidth / 2 - 10;
      const sliderY = marginY - paperPadding + sliderWidth + 5;
      hoveringSlider =
        sliderX <= mouseX &&
        mouseX <= sliderX + 20 &&
        sliderY <= mouseY &&
        mouseY <= sliderY + sliderLength;
      if (hoveringStartStopButton) {
        if (truePlaying) {
          truePlaying = false;
          if (player.isPlaying) {
            player.requestPause();
          }
          if (beeping) {
            beeping = false;
          }
          osc.stop();
        } else {
          truePlaying = true;
          if (!beeping && !player.isPlaying) {
            player.requestPlay();
          }
        }
      } else if (hoveringSlider) {
        if (!seeking) {
          seeking = true;
          if (beeping) {
            beeping = false;
          }
          osc.stop();
        }
      }
    };
    p5.mouseReleased = () => {
      touchedP = false;
      if (!player || !player.video || animeInitFlag != 2) {
        return;
      }
      if (seeking) {
        seeking = false;
        if (truePlaying && !player.isPlaying) {
          player.requestPlay();
        }
      }
    };
    p5.touchStarted = () => {
      const sliderX =  width - 10 - sliderWidth / 2 - 10;
      const sliderY = marginY - paperPadding + sliderWidth + 5;
      touchedP = true;
      if (!player || !player.video || animeInitFlag != 2) {
        return;
      }
      if (hoveringStartStopButton) {
        onTouchButtonFlag = true;
      }
      const mouseX = p5.mouseX;
      const mouseY = p5.mouseY;
      hoveringSlider =
        sliderX <= mouseX &&
        mouseX <= sliderX + 20 &&
        sliderY <= mouseY &&
        mouseY <= sliderY + sliderLength;
      if (hoveringSlider) {
        onTouchSliderFlag = true;
      }
    };
    p5.touchMoved = () => {
      if (hoveringSlider) {
        if (!seeking) {
          seeking = true;
          if (beeping) {
            beeping = false;
          }
          osc.stop();
        }
      }
    };
    p5.touchEnded = () => {
      touchedP = false;
      const mouseX = p5.mouseX;
      const mouseY = p5.mouseY;

      const sliderX = width - 10 - sliderWidth / 2 - 10
      const sliderY = marginY - paperPadding + sliderWidth + 5
      if (hoveringStartStopButton && onTouchButtonFlag) {
        if (truePlaying) {
          truePlaying = false;
          if (player.isPlaying) {
            player.requestPause();
          }
          if (beeping) {
            beeping = false;
          }
          osc.stop();
        } else {
          truePlaying = true;
          if (!beeping && !player.isPlaying) {
            player.requestPlay();
          }
        }
        onTouchButtonFlag = false;
      } else if (hoveringSlider && onTouchSliderFlag) {
        if (!seeking) {
          seeking = true;
          if (beeping) {
            beeping = false;
          }
          osc.stop();
        }
        onTouchSliderFlag = false;
      }
      if (seeking) {
        player.requestMediaSeek(
          (player.video.duration *
            Math.max(0, Math.min(sliderLength, mouseY - sliderY))) /
            sliderLength
        );
        position =
          (player.video.duration *
            Math.max(0, Math.min(sliderLength, mouseY - sliderY))) /
          sliderLength;
        seeking = false;
        if (truePlaying && !player.isPlaying) {
          player.requestPlay();
        }
      }
    };

    // ビートにあわせて背景を、発声にあわせて歌詞を表示
    p5.draw = () => {
      const mouseX = p5.mouseX;
      const mouseY = p5.mouseY;
      const millis = p5.millis();
      const deltaT = millis - lastMillis;
      lastMillis = millis;
      p5.noStroke();
      // プレイヤーが準備できていなかったら何もしない
      if (!player || !player.video || player.isLoading) {
        return;
      }

      p5.background(230);
      p5.fill(245);

      p5.push();
      {
        p5.drawingContext.filter = "drop-shadow(20px 20px 50px #555)";
        p5.rect(
          marginX - paperPadding,
          marginY - paperPadding,
          paperWidth,
          paperHeight
        );
      }
      p5.pop();

      p5.textSize(fontSize / 2);
      p5.fill(20);
      p5.textAlign(p5.CENTER);
      p5.text(
        String(currentPage + 1),
        width / 2,
        textAreaHeight + marginY + 25
      );
      p5.textSize(fontSize);
      p5.textAlign(p5.LEFT, p5.BASELINE);

      //p5.text(String([aContext.baseLatency,aContext.outputLatency,player.video.position,player.mediaPosition]), 100, 100);
      switch (animeInitFlag) {
        case 0:
          return;
        case 1:
          let latestWidth = 0;
          phrases.forEach((words) => {
            words.forEach((word) => {
              let wordWidth = 0;
              word.children.forEach((chara) => {
                wordWidth += p5.textWidth(chara.text) + 1;
              });
              wordWidth -= 1;
              if (wordWidth > textAreaWidth - latestWidth) {
                separationList.push({
                  type: "lineBreak",
                });
                latestWidth = 0;
              }
              let cc = 0;
              word.children.forEach((chara) => {
                if (cc > 0) {
                  separationList[separationList.length - 1].endTime =
                    chara.startTime;
                }
                const charWidth = p5.textWidth(chara.text);
                if (charWidth > textAreaWidth - latestWidth) {
                  separationList.push({
                    type: "lineBreak",
                  });
                  latestWidth = 0;
                }
                separationList.push({
                  type: "char",
                  text: chara.text,
                  x: latestWidth,
                  width: charWidth,
                  startTime: chara.startTime,
                  endTime: chara.endTime,
                });

                latestWidth += charWidth + 1;
                cc += 1;
              });
            });
            separationList.push({
              type: "lineBreak",
            });
            latestWidth = 0;
          });
          separationList.pop();
          let y = 0;
          let page = 0;
          separationList.forEach((block) => {
            if (block.type == "char") {
              timeSpanner.push({
                startTime: block.startTime,
                endTime: block.endTime,
                x: block.x,
                y: y,
                xMag: block.width / (block.endTime - block.startTime),
                page: page,
              });
            } else {
              y += fontSize * 1.1;
              if (y + fontSize * 1.1 >= textAreaHeight) {
                page += 1;
                y = 0;
                pageSplits.push(timeSpanner[timeSpanner.length - 1].endTime);
              }
            }
          });
          animeInitFlag = 2;
          break;
      }
      if (truePlaying) {
        if (beeping) {
          position = Math.min(player.video.duration, position + deltaT);
        } else {
          if (position + deltaT - 20 > player.mediaPosition) {
            position = Math.min(player.video.duration, position + deltaT);
          } else {
            position = player.mediaPosition;
          }
        }
      }
      if (seeking) {
        position = player.mediaPosition;
      }
      p5.fill(0);

      currentPage = 0;
      pageSplits.some((time) => {
        if (time < position) {
          currentPage += 1;
        } else {
          return true;
        }
      });

      let y = 0;
      let page = 0;
      cursorLine = -1;
      cursorTime = -1;
      separationList.forEach((block) => {
        if (
          cursorLine == -1 &&
          y + marginY <= mouseY &&
          mouseY < y + marginY + fontSize
        ) {
          cursorLine = y + marginY;
        }
        if (block.type == "char") {
          if (page == currentPage) {
            if (position > block.startTime) {
              p5.fill(20);
            } else {
              p5.fill(140);
            }
            p5.text(
              block.text,
              block.x + marginX,
              y + marginY + fontSize * 0.9
            );
            if (
              block.x + marginX <= mouseX &&
              mouseX < block.x + marginX + block.width &&
              y + marginY <= mouseY &&
              mouseY < y + marginY + fontSize * 1.1
            ) {
              cursorTime =
                block.startTime +
                ((mouseX - block.x - marginX) / block.width) *
                  (block.endTime - block.startTime);
            }
          }
        } else {
          y += fontSize * 1.1;
          if (y + fontSize * 1.1 >= textAreaHeight) {
            page += 1;
            y = 0;
          }
        }
      });

      mouseIsPressed = p5.mouseIsPressed || touchedP;
      hoveringStartStopButton = Math.sqrt((mouseX - buttonX) ** 2 + (mouseY - buttonY) ** 2) <= sliderWidth / 2;
      let muteFlag = false;
      blackOutBlocks.forEach((bBlock) => {
        if (
          bBlock.startTime - 120 <= position &&
          bBlock.endTime - 70 >= position
        ) {
          muteFlag = true;
        }
        let kuronuriEnd = 0;
        let kuronuriCarret = 0;
        let kuronuriCount = 0;
        timeSpanner.some((item) => {
          if (item.page == currentPage) {
            if (kuronuriCount == 0) {
              if (bBlock.startTime >= item.startTime) {
                if (bBlock.startTime < item.endTime) {
                  kuronuriCount = 1;
                  kuronuriEnd = bBlock.endTime;
                  kuronuriCarret = bBlock.startTime;
                }
              }
            }
            if (kuronuriCount > 0) {
              let drawStart =
                item.x +
                (kuronuriCarret - item.startTime) * item.xMag +
                marginX;
              if (kuronuriCount == 1) {
                drawStart += 2;
              }
              const fillTo = Math.min(
                kuronuriEnd - kuronuriCarret,
                item.endTime - kuronuriCarret
              );
              let drawWidth = fillTo * item.xMag + 1;
              if (Math.abs(kuronuriCarret + fillTo - kuronuriEnd) < 5) {
                drawWidth -= 2;
              }
              p5.fill(0);
              p5.rect(drawStart, item.y + marginY, drawWidth, fontSize);
              kuronuriCarret += fillTo;
              if (Math.abs(kuronuriCarret - kuronuriEnd) < 5) {
                return true;
              }
              kuronuriCount += 1;
            }
          }
        });
      });
      if (cursorTime != -1 && cursorLine != -1) {
        p5.cursor("text");
        p5.strokeWeight(2);
        p5.stroke(255);
        p5.line(mouseX, cursorLine, mouseX, cursorLine + fontSize);
        p5.noStroke();

        if (
          mouseIsPressed &&
          lastMouseIsPressed &&
          lastCursorTime != -1 &&
          lastCursorLine != -1
        ) {
          if (lastCursorLine == cursorLine) {
            let lSideOrder = 0;
            let rSideOrder = 0;
            const lSide = Math.min(lastCursorTime, cursorTime);
            const rSide = Math.max(lastCursorTime, cursorTime);
            blackOutBlocks.some((block) => {
              if (block.startTime <= lSide && lSide < block.endTime) {
                blackOutBlocks.splice(lSideOrder, 0, {
                  startTime: block.startTime,
                  endTime: lSide - 1,
                });
                blackOutBlocks.splice(lSideOrder + 1, 1, {
                  startTime: lSide + 1,
                  endTime: block.endTime,
                });
                return true;
              } else if (block.startTime > lSide) {
                lSideOrder -= 1;
                return true;
              }
              lSideOrder += 1;
            });
            blackOutBlocks.some((block) => {
              if (block.startTime <= rSide && rSide < block.endTime) {
                blackOutBlocks.splice(rSideOrder, 0, {
                  startTime: block.startTime,
                  endTime: rSide - 1,
                });
                blackOutBlocks.splice(rSideOrder + 1, 1, {
                  startTime: rSide + 1,
                  endTime: block.endTime,
                });
                return true;
              } else if (block.startTime > rSide) {
                rSideOrder -= 1;
                return true;
              }
              rSideOrder += 1;
            });
            blackOutBlocks.splice(lSideOrder + 1, rSideOrder - lSideOrder);
            blackOutBlocks = blackOutBlocks.filter((block) => {
              return block.endTime - block.startTime > 0;
            });
          }
        }
      } else if (hoveringStartStopButton || hoveringSlider) {
        p5.cursor("pointer");
      } else {
        p5.cursor("default");
      };
      p5.fill(60);
      p5.circle(
        buttonX,
        buttonY,
        sliderWidth + (hoveringStartStopButton ? 5 : 0)
      );
      if (truePlaying) {
        p5.fill(240);
        p5.rect(
          buttonX - sliderWidth * 0.3,
          buttonY - sliderWidth * 0.15,
          sliderWidth * 0.6,
          sliderWidth * 0.1
        );
        p5.rect(
          buttonX - sliderWidth * 0.3,
          buttonY + sliderWidth * 0.05,
          sliderWidth * 0.6,
          sliderWidth * 0.1
        );
      } else {
        p5.fill(240);
        p5.triangle(
          buttonX + sliderWidth * 0.3 * Math.cos(deg2rad(90)),
          buttonY + sliderWidth * 0.3 * Math.sin(deg2rad(90)),
          buttonX + sliderWidth * 0.3 * Math.cos(deg2rad(210)),
          buttonY + sliderWidth * 0.3 * Math.sin(deg2rad(210)),
          buttonX + sliderWidth * 0.3 * Math.cos(deg2rad(330)),
          buttonY + sliderWidth * 0.3 * Math.sin(deg2rad(330))
        );
      }

      const sliderX = width - 10 - sliderWidth / 2 - 10;
      const sliderY = marginY - paperPadding + sliderWidth + 5
      hoveringSlider =
        sliderX <= mouseX &&
        mouseX <= sliderX + 20 &&
        sliderY <= mouseY &&
        mouseY <= sliderY + sliderLength;

      p5.fill(255);
      p5.strokeWeight(1);
      p5.stroke(0);
      p5.rect(sliderX, sliderY, 20, sliderLength);
      p5.fill(140);
      p5.rect(
        sliderX,
        sliderY,
        20,
        (sliderLength * position) / player.video.duration
      );
      p5.noStroke();
      const spd = sliderLength / player.video.duration;
      p5.fill(0);
      blackOutBlocks.forEach((bBlock) => {
        if (bBlock.endTime - bBlock.startTime > 2) {
          p5.rect(
            sliderX,
            sliderY + spd * bBlock.startTime,
            20,
            (bBlock.endTime - bBlock.startTime) * spd
          );
        }
      });
      if (truePlaying && !seeking) {
        if (muteFlag) {
          if (!beeping) {
            if (player.isPlaying) {
              player.requestPause();
            }
            osc = aContext.createOscillator();
            osc.type = "sine";
            osc.frequency.value = 523.3;
            osc.connect(gain);
            gain.connect(aContext.destination);
            osc.start();
            beeping = true;
          }
        } else {
          if (beeping) {
            osc.stop();
            player.requestMediaSeek(Math.min(position, player.video.duration));
            beeping = false;
            if (truePlaying && !player.isPlaying) {
              player.requestPlay();
            }
          }
        }
      }

      if (seeking && mouseIsPressed ) {
        player.requestMediaSeek(
          (player.video.duration *
            Math.max(0, Math.min(sliderLength, mouseY - sliderY))) /
            sliderLength
        );
        position =
          (player.video.duration *
            Math.max(0, Math.min(sliderLength, mouseY - sliderY))) /
          sliderLength;
      }

      lastCursorLine = cursorLine + 0;
      lastCursorTime = cursorTime + 0;
      lastMouseIsPressed = mouseIsPressed;
    };
  });
}

window.addEventListener(
  "touchmove",
  function (event) {
    if (event.preventDefault) {
      event.preventDefault();
    }
  },
  { passive: false }
);
window.addEventListener(
  "touchstart",
  function (event) {
    if (event.preventDefault) {
      event.preventDefault();
    }
    aContext.resume();
  },
  { passive: false }
);