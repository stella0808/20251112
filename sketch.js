// ====== 基準尺寸與縮放變數 ======
const BASE_WIDTH = 800;
const BASE_HEIGHT = 600;
let currentScale = 1; // 當前的縮放比例

// ====== 測驗狀態與計分變數 ======
let currentQuestion = 0;    // 選擇題索引
let correctAnswers = 0;     // 選擇題答對題數 (專門用於MCQ)
let dragQuestionIndex = 0;  // 拖拉題索引
let dragCorrectAnswers = 0; // 拖拉題答對題數
let imageMatchCorrectAnswers = 0; // 圖片題答對題數

// 測驗狀態：'start', 'question', 'drag_question', 'image_match', 'result'
let quizState = 'start'; // 初始狀態設定為 'start'

const totalMCQ = 3;
const totalDrag = 2;
const totalImages = 4; 

// 旗標
let initialDragSetupDone = false; 
let initialImageSetupDone = false; 

// ====== 顏色與尺寸設定 ======
// 馬卡龍漸層色設定
let gradientColors = [];
let backgroundColorOffset = 0; // 用於背景動畫偏移

const defaultColor = 50;
const correctColor = [50, 200, 50]; 
const wrongColor = [200, 50, 50]; 
const blankColor = [200, 200, 200]; 
const optionWidth = 300;
const optionHeight = 50;
const optionMargin = 20;

// 開始按鈕參數
const startBtnW = 200;
const startBtnH = 60;
const startBtnX = BASE_WIDTH / 2 - startBtnW / 2;
const startBtnY = BASE_HEIGHT / 2 + 50;


// ====== 數據變數 (JS 陣列) ======

let imageAssets = {}; 
let imageMatchData = []; 
let imageMatchChoices = []; 

// 選擇題 (MCQ) - 3 題
const questions = [
  ["請問紫色一顆一顆的是什麼水果？", ["葡萄", "蘋果", "香蕉", "鳳梨"], 1],
  ["請問綠色外表紅色內容物是什麼水果？", ["水蜜桃", "小番茄", "西瓜", "榴槤"], 2],
  ["請問何者水果是黃色的？", ["蘋果", "香蕉", "葡萄", "橘子"], 1]
];
let answeredMCQ = false;
let mcqOptionColors = [];
let mcqFeedbackTimer = 0;

// 拖拉填空題 (Drag & Drop) - 2 題
const dragQuestions = [
  {
    questionParts: ["下列何者是有刺的水果？ ", ""], 
    blanks: ["榴槤"],
    choices: ["芒果", "木瓜", "蘋果", "柳橙"] 
  },
  {
    questionParts: ["下列何者水果沒有籽 = ", ""],
    blanks: ["香蕉"], 
    choices: ["木瓜", "西瓜", "百香果", "香蕉"]
  }
];
let draggableChoices = []; 
let activeDraggable = null; 
let blanks = []; 
let answeredDrag = false;
let dragFeedbackTimer = 0;

// 圖片配對題數據
const imageNames = [
  { file: 'banana.png', text: '香蕉' },     
  { file: 'watermelon.png', text: '西瓜' },
  { file: 'strawberry.png', text: '草莓' },
  { file: 'apple.png', text: '蘋果' },      
];


// Draggable 類別 (保持不變)
class Draggable {
  constructor(text, x, y, w, h) {
    this.text = text;
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    this.originalX = x;
    this.originalY = y;
    this.isSnapped = false;
    this.snappedToBlankIndex = -1;
    this.isCorrect = false;
  }

  display() {
    let boxColor = [255]; 
    let textColor = defaultColor;

    if (activeDraggable === this) {
      boxColor = [250, 250, 200]; 
    } else if (quizState === 'image_match' && initialImageSetupDone && imageMatchData.length > 0) {
      let matchedData = imageMatchData[this.snappedToBlankIndex];
      if (this.isSnapped && matchedData && matchedData.answered) {
          boxColor = this.isCorrect ? correctColor : wrongColor;
          textColor = [255]; 
      }
    } else if (quizState === 'drag_question' && answeredDrag) {
      if (this.isSnapped) {
        boxColor = this.isCorrect ? correctColor : wrongColor;
        textColor = [255];
      }
    }

    fill(boxColor);
    stroke(defaultColor);
    rect(this.x, this.y, this.w, this.h, 5);

    fill(textColor);
    textSize(18);
    text(this.text, this.x + this.w / 2, this.y + this.h / 2); 
  }

  isClicked(mx, my) {
    return mx > this.x && mx < this.x + this.w && my > this.y && my < this.y + this.h;
  }

  updatePosition(mx, my) {
    this.x = mx - this.w / 2;
    this.y = my - this.h / 2;
  }

  returnToOriginal() {
    this.x = this.originalX;
    this.y = this.originalY;
    this.isSnapped = false;
    this.snappedToBlankIndex = -1;
    this.isCorrect = false;
  }
}

// ====== P5.JS 檔案載入與設定 ======

function preload() {
  for (let item of imageNames) {
    imageAssets[item.file] = loadImage(item.file); 
  }
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  
  gradientColors = [
    color(255, 204, 204), 
    color(204, 255, 204), 
    color(204, 204, 255), 
    color(255, 255, 204)  
  ];

  resizeCanvasAndElements();

  textAlign(CENTER, CENTER);
  textSize(20); 
  resetMCQOptionColors();
}

/** 核心功能：計算縮放比例並重新設定畫布 */
function resizeCanvasAndElements() {
    let widthScale = windowWidth / BASE_WIDTH;
    let heightScale = windowHeight / BASE_HEIGHT;
    
    currentScale = min(widthScale, heightScale);
    
    resizeCanvas(windowWidth, windowHeight);
}

// P5.js 內建函式：視窗大小改變時自動調用
function windowResized() {
    resizeCanvasAndElements();
}

// 繪製漸層背景
function drawGradientBackground() {
  let c1 = gradientColors[floor((backgroundColorOffset / 100) % gradientColors.length)];
  let c2 = gradientColors[floor(((backgroundColorOffset + 50) / 100) % gradientColors.length)];
  
  for (let i = 0; i <= height; i++) {
    let inter = map(i, 0, height, 0, 1);
    let c = lerpColor(c1, c2, inter);
    stroke(c);
    line(0, i, width, i);
  }
  if (quizState !== 'result') {
    backgroundColorOffset += 0.5; 
  }
}

function draw() {
  drawGradientBackground(); 
  
  push();
  
  translate(windowWidth / 2, windowHeight / 2);
  scale(currentScale);
  translate(-BASE_WIDTH / 2, -BASE_HEIGHT / 2);
  
  // =========================================================
  // 以下是使用 BASE_WIDTH 和 BASE_HEIGHT 座標的繪圖邏輯
  // =========================================================

  if (quizState === 'start') {
      displayStartScreen();
  }
  else if (quizState === 'question' && !initialDragSetupDone) {
    textSize(24); 
    initDragQuestion(0);
    initialDragSetupDone = true;
  }
  
  if (quizState === 'image_match' && !initialImageSetupDone) {
      initImageMatch();
      initialImageSetupDone = true;
  }

  if (quizState !== 'start') {
      displayScoreProgress();
  }

  if (quizState === 'question') {
    handleMCQFeedback(); 
    displayMCQQuestion();
  } else if (quizState === 'drag_question') {
    handleDragFeedback();
    displayDragQuestion();
  } else if (quizState === 'image_match') {
    displayImageMatch();
  } else if (quizState === 'result') {
    drawResultAnimation(); 
    displayResult();
  }
  
  pop();
}

// ====== 鼠標輸入轉換 (核心響應式互動) ======
function getTransformedMousePos() {
    let x_translated = mouseX - windowWidth / 2;
    let y_translated = mouseY - windowHeight / 2;
    
    let x_scaled = x_translated / currentScale;
    let y_scaled = y_translated / currentScale;
    
    let finalX = x_scaled + BASE_WIDTH / 2;
    let finalY = y_scaled + BASE_HEIGHT / 2;
    
    return { x: finalX, y: finalY };
}


// ====== P5.JS 滑鼠事件處理 (調用通用函式) ======

function mousePressed() {
  const { x: tX, y: tY } = getTransformedMousePos();
  
  // *** 處理開始按鈕點擊 ***
  if (quizState === 'start') {
    if (tX > startBtnX && tX < startBtnX + startBtnW && 
        tY > startBtnY && tY < startBtnY + startBtnH) {
      quizState = 'question'; // 開始測驗，進入第一階段
      return;
    }
  }

  if (quizState === 'question' && !answeredMCQ) {
    handleMCQClick(tX, tY);
  } else if (quizState === 'drag_question' && !answeredDrag) {
    handleDragStart(draggableChoices, tX, tY); 
  } else if (quizState === 'image_match') {
    handleDragStart(imageMatchChoices, tX, tY); 
  }
}

function mouseDragged() {
  const { x: tX, y: tY } = getTransformedMousePos();
  if ((quizState === 'drag_question' || quizState === 'image_match') && activeDraggable) {
    activeDraggable.updatePosition(tX, tY); 
  }
}

function mouseReleased() {
  if (quizState === 'drag_question' && !answeredDrag && activeDraggable) {
    handleDragEnd(blanks, draggableChoices, checkAllBlanksFilled);
  } else if (quizState === 'image_match' && activeDraggable) {
    handleDragEnd(imageMatchData, imageMatchChoices, checkAllImagesMatched);
  }
}


// **********************************************
// ********** 拖拉通用邏輯 (通用函式) **********
// **********************************************

function handleDragStart(choicesArray, tX, tY) {
  for (let d of choicesArray) {
    if (d.isClicked(tX, tY)) { 
      activeDraggable = d;
      if (d.isSnapped && d.snappedToBlankIndex !== -1) {
        let target = quizState === 'drag_question' ? blanks : imageMatchData;
        target[d.snappedToBlankIndex].filledWith = null;
        if (target[d.snappedToBlankIndex].answered !== undefined) {
             target[d.snappedToBlankIndex].answered = false; 
        }
        d.isSnapped = false;
        d.snappedToBlankIndex = -1;
      }
      break;
    }
  }
}

function handleDragEnd(targetArray, choicesArray, checkCompletionFunc) {
  if (activeDraggable === null) return;

  let snapped = false;
  
  for (let i = 0; i < targetArray.length; i++) {
    let t = targetArray[i]; 
    
    let cx = activeDraggable.x + activeDraggable.w / 2;
    let cy = activeDraggable.y + activeDraggable.h / 2;
    
    if (cx > t.x && cx < t.x + t.w && cy > t.y && cy < t.y + t.h) {
      if (t.filledWith === null) { 
        activeDraggable.x = t.x + (t.w - activeDraggable.w) / 2; 
        activeDraggable.y = t.y + (t.h - activeDraggable.h) / 2; 
        activeDraggable.isSnapped = true;
        activeDraggable.snappedToBlankIndex = i;
        
        t.filledWith = activeDraggable;
        snapped = true;

        if (quizState === 'image_match') {
            checkImageMatch(activeDraggable, t); 
        }
        break;
      }
    }
  }

  if (!snapped) {
    activeDraggable.returnToOriginal();
  }

  activeDraggable = null;
  
  checkCompletionFunc();
}


// **********************************************
// ********** 核心流程控制函式 ******************
// **********************************************

function handleMCQFeedback() {
  if (answeredMCQ && mcqFeedbackTimer > 0) {
    mcqFeedbackTimer--;
  } else if (answeredMCQ && mcqFeedbackTimer === 0) {
    answeredMCQ = false;
    currentQuestion++;
    if (currentQuestion < totalMCQ) {
      resetMCQOptionColors();
    } else {
      quizState = 'drag_question';
    }
  }
}

function handleDragFeedback() {
  if (answeredDrag && dragFeedbackTimer > 0) {
    dragFeedbackTimer--;
  } else if (answeredDrag && dragFeedbackTimer === 0) {
    dragQuestionIndex++;
    answeredDrag = false;
    if (dragQuestionIndex < totalDrag) {
      initDragQuestion(dragQuestionIndex); 
    } else {
      if (quizState !== 'image_match') {
          quizState = 'image_match';
      }
    }
  }
}


// ====== 封面與得分顯示 (修正了計分問題) ======

/** 繪製封面頁 */
function displayStartScreen() {
    // 標題
    textSize(50);
    fill(defaultColor);
    textAlign(CENTER, CENTER);
    text("隨堂小測驗", BASE_WIDTH / 2, BASE_HEIGHT / 2 - 50);

    // 開始按鈕
    let btnColor = color(100, 180, 255); 
    
    const { x: tX, y: tY } = getTransformedMousePos();
    if (tX > startBtnX && tX < startBtnX + startBtnW && 
        tY > startBtnY && tY < startBtnY + startBtnH) {
        btnColor = color(150, 200, 255);
    }
    
    // 繪製按鈕框
    fill(btnColor);
    stroke(defaultColor);
    rect(startBtnX, startBtnY, startBtnW, startBtnH, 10);
    
    // 繪製按鈕文字
    fill(255);
    textSize(28);
    text("開始測驗", BASE_WIDTH / 2, startBtnY + startBtnH / 2);

    // 右上角分數 (總答對題數 - 應為 0 在開始畫面)
    let totalCorrect = correctAnswers + dragCorrectAnswers + imageMatchCorrectAnswers;
    
    textSize(20);
    fill(defaultColor);
    textAlign(RIGHT, TOP);
    text("總答對: " + totalCorrect, BASE_WIDTH - 20, 20);
}


function displayScoreProgress() {
  // 總對題數 (所有階段的總和)
  let totalCorrect = correctAnswers + dragCorrectAnswers + imageMatchCorrectAnswers;

  textSize(20);
  fill(defaultColor);
  textAlign(RIGHT, TOP);
  // 右上角標示現在對幾題
  text("總答對: " + totalCorrect, BASE_WIDTH - 20, 20);

  // 分項進度 (左上角，輔助顯示)
  textSize(16);
  fill(defaultColor);
  textAlign(LEFT, TOP);
  
  let mcqProgress = "MCQ: " + (currentQuestion < totalMCQ ? currentQuestion : totalMCQ) + " / " + totalMCQ;
  text(mcqProgress, 20, 20);
  
  let dragProgress = "拖拉: " + (dragQuestionIndex < totalDrag ? dragQuestionIndex : totalDrag) + " / " + totalDrag;
  text(dragProgress, 20, 40);
  
  let imgProgress = "圖片: " + (quizState === 'image_match' || quizState === 'result' ? imageMatchData.length : 0) + " / " + totalImages;
  text(imgProgress, 20, 60);
}


// ====== MCQs 繪圖與邏輯 ======

function displayMCQQuestion() {
  if (currentQuestion >= totalMCQ) { return; }
  const q = questions[currentQuestion];
  
  textSize(24);
  fill(defaultColor);
  textAlign(CENTER, CENTER);
  text(q[0], BASE_WIDTH / 2, 80);
  let startY = 150;
  for (let i = 0; i < 4; i++) {
    let x = BASE_WIDTH / 2 - optionWidth / 2;
    let y = startY + i * (optionHeight + optionMargin);
    fill(mcqOptionColors[i]);
    stroke(defaultColor);
    rect(x, y, optionWidth, optionHeight, 10);
    fill(defaultColor);
    textSize(20);
    text(q[1][i], BASE_WIDTH / 2, y + optionHeight / 2);
  }
}

function handleMCQClick(tX, tY) {
  let startY = 150;
  for (let i = 0; i < 4; i++) {
    let x = BASE_WIDTH / 2 - optionWidth / 2;
    let y = startY + i * (optionHeight + optionMargin);

    if (tX > x && tX < x + optionWidth &&
        tY > y && tY < y + optionHeight) {
      
      answeredMCQ = true;
      checkMCQAnswer(i);
      mcqFeedbackTimer = 60; 
      break;
    }
  }
}

function checkMCQAnswer(selectedOption) {
  const correctAnswer = questions[currentQuestion][2];
  if (selectedOption === correctAnswer) {
    mcqOptionColors[selectedOption] = correctColor;
    correctAnswers++; // MCQ分數加到 correctAnswers
  } else {
    mcqOptionColors[selectedOption] = wrongColor;
    mcqOptionColors[correctAnswer] = correctColor;
  }
}

function resetMCQOptionColors() {
  mcqOptionColors = [];
  for (let i = 0; i < 4; i++) {
    mcqOptionColors.push([255]);
  }
}

// ====== Drag & Drop 繪圖與邏輯 ======

function initDragQuestion(index) {
  if (index >= totalDrag) return;
  const currentQ = dragQuestions[index];
  blanks = [];
  draggableChoices = [];
  
  let textWidthTracker = 0;
  let blankY = 150;
  let startX = 50; 

  textSize(24); 
  textAlign(LEFT, CENTER);
  
  for (let i = 0; i < currentQ.blanks.length; i++) {
    let textPart = currentQ.questionParts[i];
    
    // 計算第一個字的起始位置，讓整個句子能夠居中
    if (i === 0) {
      let sentenceWidth = textWidth(textPart) + currentQ.blanks.length * 200 + (currentQ.blanks.length - 1) * 0; 
      if (currentQ.questionParts.length > currentQ.blanks.length) {
        sentenceWidth += textWidth(currentQ.questionParts[currentQ.questionParts.length - 1]);
      }
      startX = (BASE_WIDTH - sentenceWidth) / 2;
      textWidthTracker = 0;
    }

    textWidthTracker += textWidth(textPart);
    
    let blankX = startX + textWidthTracker;
    let blankW = 200; 
    let blankH = 35;
    
    blanks.push({
      x: blankX, y: blankY, w: blankW, h: blankH,
      correctText: currentQ.blanks[i], filledWith: null, isCorrect: false
    });
    textWidthTracker += blankW;
  }
  
  let choiceY = 400;
  let choiceX = 0;
  let shuffledChoices = shuffle(currentQ.choices.slice()); 

  for (let i = 0; i < shuffledChoices.length; i++) {
    let text = shuffledChoices[i];
    textSize(18); 
    let w = textWidth(text) + 60; // 增加更多padding
    let h = 40;
    
    if (i === 0) {
      let totalChoiceWidth = shuffledChoices.reduce((sum, item) => {
          textSize(18);
          return sum + (textWidth(item) + 60);
      }, 0) + 20 * (shuffledChoices.length - 1);
      choiceX = (BASE_WIDTH - totalChoiceWidth) / 2; 
    }

    let x = choiceX;
    draggableChoices.push(new Draggable(text, x, choiceY, w, h));
    choiceX += w + 20; 
  }
}

function displayDragQuestion() {
  if (dragQuestionIndex >= totalDrag) { return; }
    
  const currentQ = dragQuestions[dragQuestionIndex];
  
  let blankY = 150;
  textSize(24);
  textAlign(LEFT, CENTER);

  // 重新計算起始X位置 (確保題目居中且固定)
  let startX = 50; 
  let currentQIndex = dragQuestionIndex;
  
  if (currentQIndex < dragQuestions.length) {
    let tempQ = dragQuestions[currentQIndex];
    let sentenceWidth = textWidth(tempQ.questionParts[0]) + tempQ.blanks.length * 200 + (tempQ.blanks.length - 1) * 0; 
    if (tempQ.questionParts.length > tempQ.blanks.length) {
      sentenceWidth += textWidth(tempQ.questionParts[tempQ.questionParts.length - 1]);
    }
    startX = (BASE_WIDTH - sentenceWidth) / 2;
  }
  
  let textWidthTracker = 0;

  for (let i = 0; i < currentQ.blanks.length; i++) {
    let textPart = currentQ.questionParts[i];
    
    // 繪製前面的文字
    fill(defaultColor);
    text(textPart, startX + textWidthTracker, blankY);
    textWidthTracker += textWidth(textPart);

    // 繪製空格 (位置是固定的)
    let blank = blanks[i];
    fill(blankColor);
    stroke(defaultColor);
    rect(blank.x, blank.y, blank.w, blank.h, 5);

    if (blank.filledWith) {
      let d = blank.filledWith;
      if (answeredDrag) {
          fill(d.isCorrect ? correctColor : wrongColor);
          rect(blank.x, blank.y, blank.w, blank.h, 5);
          fill([255]); 
      } else {
        fill(defaultColor);
      }
      textSize(18);
      textAlign(CENTER, CENTER); // 確保文字居中
      text(d.text, blank.x + blank.w / 2, blank.y + blank.h / 2); 
    }
    
    // 固定的空格寬度，不因填入內容而改變
    textWidthTracker += blank.w; 
  }
  
  // 繪製最後的文字段
  let lastTextPart = currentQ.questionParts[currentQ.questionParts.length - 1];
  fill(defaultColor);
  text(lastTextPart, startX + textWidthTracker, blankY);

  for (let d of draggableChoices) {
    if (!d.isSnapped || d === activeDraggable) {
      d.display();
    }
  }
}

function checkAllBlanksFilled() {
  let allFilled = true;
  for (let b of blanks) {
    if (b.filledWith === null) {
      allFilled = false;
      break;
    }
  }

  if (allFilled) {
    let currentDragCorrect = true;
    for (let i = 0; i < blanks.length; i++) {
      let b = blanks[i];
      let d = b.filledWith;
      
      if (d.text === b.correctText) {
        d.isCorrect = true;
      } else {
        d.isCorrect = false;
        currentDragCorrect = false;
      }
    }
    
    answeredDrag = true;
    dragFeedbackTimer = 120;

    if (currentDragCorrect) {
      dragCorrectAnswers++; // 分數加到專屬計數器
    }
  }
}


// ====== 圖片配對題函式 (Image Match) ======

function initImageMatch() {
    const matchDataFromJS = imageNames.slice(); 
    imageMatchData = []; 

    let shuffledImages = shuffle(matchDataFromJS.slice());
    
    const imageW = 150;
    const imageH = 150;
    const targetH = 35; 
    const spacing = 40;
    const totalW = totalImages * imageW + (totalImages - 1) * spacing;
    let startX = (BASE_WIDTH - totalW) / 2; 
    
    let choiceY = 400;
    let choiceX = 0;
    
    let shuffledTexts = [];
    
    // 1. 設定圖片位置和目標框
    for (let i = 0; i < totalImages; i++) {
        let x = startX + i * (imageW + spacing);
        let y = 100;
        
        let targetX = x;
        let targetY = y + imageH + 10; 
        let targetW = imageW;
        
        imageMatchData.push({
            imageX: x, 
            imageY: y, 
            x: targetX,
            y: targetY,
            w: targetW,
            h: targetH, 
            imageFile: shuffledImages[i].file,
            correctText: shuffledImages[i].text,
            filledWith: null,
            answered: false,
            isCorrect: false
        });
        shuffledTexts.push(shuffledImages[i].text);
    }
    
    // 2. 設定可拖拉的中文選項
    shuffledTexts = shuffle(shuffledTexts); 
    imageMatchChoices = []; 
    
    for (let i = 0; i < totalImages; i++) {
        let text = shuffledTexts[i];
        textSize(18); 
        let w = textWidth(text) + 60; // 增加更多padding
        let h = 40;
        
        if (i === 0) {
            let totalChoiceWidth = shuffledTexts.reduce((sum, item) => {
                textSize(18);
                return sum + (textWidth(item) + 60);
            }, 0) + 20 * (totalImages - 1);
            choiceX = (BASE_WIDTH - totalChoiceWidth) / 2; 
        }

        let x = choiceX;
        imageMatchChoices.push(new Draggable(text, x, choiceY, w, h));
        choiceX += w + 20; 
    }
}

function displayImageMatch() {
    if (!initialImageSetupDone) { return; } 
    
    textSize(24);
    fill(defaultColor);
    textAlign(CENTER, CENTER);
    text("請將下方文字拖拉至對應的圖片下方：", BASE_WIDTH / 2, 50); 

    for (let data of imageMatchData) {
        // 1. 繪製圖片
        image(imageAssets[data.imageFile], data.imageX, data.imageY, 150, 150);

        // 2. 繪製目標框 (Target Box)
        let targetX = data.x;
        let targetY = data.y;
        let targetW = data.w;
        let targetH = data.h;

        let boxColor = blankColor;
        let textColor = defaultColor;

        if (data.answered) {
            boxColor = data.isCorrect ? correctColor : wrongColor;
            textColor = [255];
        }
        
        fill(boxColor);
        stroke(defaultColor);
        rect(targetX, targetY, targetW, targetH, 5);

        // 3. 繪製已配對的文字
        if (data.filledWith) {
            let d = data.filledWith;
            
            fill(textColor);
            textSize(18);
            textAlign(CENTER, CENTER);
            text(d.text, targetX + targetW / 2, targetY + targetH / 2);
        }
    }

    // 繪製可拖拉的選項 (中文名稱)
    for (let d of imageMatchChoices) {
        if (!d.isSnapped || d === activeDraggable) {
            d.display();
        }
    }
}

function checkImageMatch(draggable, target) {
    if (draggable.text === target.correctText) {
        draggable.isCorrect = true;
        target.isCorrect = true;
    } else {
        draggable.isCorrect = false;
        target.isCorrect = false;
    }
    target.answered = true; 
}

function checkAllImagesMatched() {
    let allMatched = true;
    let currentScore = 0;
    for (let data of imageMatchData) {
        if (data.filledWith === null) {
            allMatched = false;
            break;
        }
        if (data.isCorrect) {
            currentScore++;
        }
    }

    if (allMatched) {
        imageMatchCorrectAnswers = currentScore; // 分數加到專屬計數器
        // 進入最終結果頁
        setTimeout(() => {
            quizState = 'result';
        }, 1500); 
    }
}


// ====== 通用函式 (使用 BASE_WIDTH 座標) ======

function displayScoreProgress() {
  // 總對題數 (所有階段的總和)
  let totalCorrect = correctAnswers + dragCorrectAnswers + imageMatchCorrectAnswers;

  textSize(20);
  fill(defaultColor);
  textAlign(RIGHT, TOP);
  // 右上角標示現在對幾題
  text("總答對: " + totalCorrect, BASE_WIDTH - 20, 20);

}

// 結束畫面動畫 (新增)
let bubbles = [];
function drawResultAnimation() {
  // 緩慢改變背景顏色
  backgroundColorOffset += 0.2; 
  
  // 每隔一段時間新增一個泡泡
  if (frameCount % 15 === 0) { 
    bubbles.push({
      x: random(0, BASE_WIDTH),
      y: BASE_HEIGHT + 20, 
      r: random(10, 30),
      speed: random(0.8, 2.5),
      color: color(random(200, 255), random(200, 255), random(200, 255), 180) 
    });
  }

  // 更新並繪製泡泡
  for (let i = bubbles.length - 1; i >= 0; i--) {
    let b = bubbles[i];
    b.y -= b.speed;
    b.x += sin(frameCount * 0.05 + b.y * 0.01) * 0.5; 

    noStroke();
    fill(b.color);
    ellipse(b.x, b.y, b.r * 2);

    // 如果泡泡超出畫面，則移除
    if (b.y < -20) {
      bubbles.splice(i, 1);
    }
  }
}


function displayResult() {
  // 總分數計算只依賴三個獨立計數器
  let totalScore = correctAnswers + dragCorrectAnswers + imageMatchCorrectAnswers;
  let totalQuestions = totalMCQ + totalDrag + totalImages;
  
  textSize(32);
  fill(defaultColor);
  
  // 調整最終得分文字居中顯示 (兩行)
  textAlign(CENTER, CENTER); 
  text("🎊 測驗結束！", BASE_WIDTH / 2, BASE_HEIGHT / 2 - 80); 
  text("總得分：" + totalScore + " / " + totalQuestions + " 🎊", BASE_WIDTH / 2, BASE_HEIGHT / 2 - 30);

  textSize(24);
  let percentage = totalScore / totalQuestions;
  
  // 設置所有鼓勵話語
  let line1 = "";
  let line2 = "";
  
  if (percentage >= 0.8) {
      line1 = "💯 太棒了！您是個全能型選手！";
      line2 = "所有題目都難不倒您！繼續保持！";
  } else if (percentage >= 0.5) {
      line1 = "👍 表現優異！您已掌握了大部分概念";
      line2 = "休息一下，然後再回來複習鞏固吧！";
  } else {
      line1 = "💪 這是學習的過程！請將這次的挑戰視為進步的墊腳石";
      line2 = "別氣餒，再試一次一定能做得更好！";
  }
  
  // 第一行
  text(line1, BASE_WIDTH / 2, BASE_HEIGHT / 2 + 50);
  // 第二行
  text(line2, BASE_WIDTH / 2, BASE_HEIGHT / 2 + 90);
}
