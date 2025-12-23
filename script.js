// ゲーム状態管理
let gameState = {
    theme: '',
    players: [],
    timeLimit: 0,
    wordPair: null,
    wolfIndex: -1,
    currentMemorizeIndex: 0,
    selectedVotePlayer: -1,
    timerInterval: null,
    remainingTime: 0,
    timerRunning: false,
};

// フォールバック単語ペア
const FALLBACK_WORDS = [
    { citizenWord: 'りんご', wolfWord: 'なし' },
    { citizenWord: 'みかん', wolfWord: 'オレンジ' },
    { citizenWord: 'ぶどう', wolfWord: 'スイカ' },
    { citizenWord: 'バナナ', wolfWord: 'プランテイン' },
    { citizenWord: 'いちご', wolfWord: 'ブルーベリー' },
    { citizenWord: '犬', wolfWord: '狼' },
    { citizenWord: '猫', wolfWord: 'ライオン' },
    { citizenWord: '鳥', wolfWord: 'こうもり' },
    { citizenWord: 'トマト', wolfWord: 'パプリカ' },
    { citizenWord: '花子', wolfWord: '太郎' },
];

// 画面切り替え関数
function showPage(id) {
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    document.getElementById(id).classList.add('active');
}

// ニックネーム入力欄を追加する関数
function addNicknameInput() {
    const container = document.getElementById('nicknameInputs');
    const newRow = document.createElement('div');
    newRow.className = 'nickname-input-row';
    newRow.innerHTML = `
        <input type="text" class="nickname-input" placeholder="10字以内" maxlength="10">
        <button class="btn-remove" onclick="this.parentElement.remove()">削除</button>
    `;
    container.appendChild(newRow);
}

// ゲーム開始処理
async function startGame() {
    const theme = document.getElementById('theme').value.trim();
    const timeLimit = parseInt(document.getElementById('timeLimit').value);
    const nicknameInputs = document.querySelectorAll('.nickname-input');
    const nicknames = Array.from(nicknameInputs)
        .map(input => input.value.trim())
        .filter(name => name.length > 0);

    const errorMessage = document.getElementById('errorMessage');
    errorMessage.classList.remove('show');

    // バリデーション
    if (!theme) {
        errorMessage.textContent = 'お題を入力してください';
        errorMessage.classList.add('show');
        return;
    }

    if (nicknames.length < 3) {
        errorMessage.textContent = 'プレイヤーは3人以上必要です';
        errorMessage.classList.add('show');
        return;
    }

    // 同じニックネームをチェック
    if (new Set(nicknames).size !== nicknames.length) {
        errorMessage.textContent = '同じニックネームは使用できません';
        errorMessage.classList.add('show');
        return;
    }

    // ゲーム状態を設定
    gameState.theme = theme;
    gameState.players = nicknames;
    gameState.timeLimit = timeLimit;
    gameState.currentMemorizeIndex = 0;
    gameState.selectedVotePlayer = -1;

    // ニックネームをlocalStorageに保存
    localStorage.setItem('wordwolf_nicknames', JSON.stringify(nicknames));

    // APIから単語を取得
    await fetchWordPair();

    // ウルフをランダムに決定
    gameState.wolfIndex = Math.floor(Math.random() * gameState.players.length);

    // 単語表示画面へ
    showWordDisplay();
}

// 単語ペアを取得する関数
async function fetchWordPair() {
    try {
        const response = await fetch('/api/generate-word.js');
        if (!response.ok) throw new Error('API呼び出し失敗');
        
        const words = await response.json();
        gameState.wordPair = words[Math.floor(Math.random() * words.length)];
    } catch (error) {
        console.log('APIエラー: ' + error.message);
        // フォールバック処理
        gameState.wordPair = FALLBACK_WORDS[Math.floor(Math.random() * FALLBACK_WORDS.length)];
    }
}

// 単語表示画面を表示
function showWordDisplay() {
    const wordCardContent = document.getElementById('wordCardContent');
    wordCardContent.textContent = gameState.wordPair.citizenWord;
    showPage('page-word-display');
}

// 暗記フェーズを開始
function startMemorizePhase() {
    gameState.currentMemorizeIndex = 0;
    showNextMemorizePlayer();
}

// 本人確認画面を表示
function showNextMemorizePlayer() {
    if (gameState.currentMemorizeIndex >= gameState.players.length) {
        // 全員の暗記が完了したらゲーム開始
        startGameTimer();
        return;
    }

    const currentPlayer = gameState.players[gameState.currentMemorizeIndex];
    document.getElementById('currentPlayerName').textContent = currentPlayer;
    document.getElementById('memorizeStatus').textContent = 
        `プレイヤー ${gameState.currentMemorizeIndex + 1} / ${gameState.players.length}`;
    
    showPage('page-memorize');
}

// 本人確認後、個別の単語を表示
function showMemorizeWord() {
    const isWolf = gameState.currentMemorizeIndex === gameState.wolfIndex;
    const word = isWolf ? gameState.wordPair.wolfWord : gameState.wordPair.citizenWord;
    
    document.getElementById('memorizeWordContent').textContent = word;
    document.getElementById('memorizeProgress').textContent = 
        `${gameState.currentMemorizeIndex + 1} / ${gameState.players.length}`;
    
    showPage('page-word-memorize');
}

// 次のプレイヤーへ
function proceedToNextPlayer() {
    gameState.currentMemorizeIndex++;
    showNextMemorizePlayer();
}

// ゲームタイマーを開始
function startGameTimer() {
    gameState.remainingTime = gameState.timeLimit * 60; // 分を秒に変換
    gameState.timerRunning = true;
    
    document.getElementById('wolfCountDisplay').textContent = '1'; // 仕様では常に1
    showPage('page-game');
    
    updateTimerDisplay();
    gameState.timerInterval = setInterval(updateTimer, 1000);
}

// タイマーを更新
function updateTimer() {
    if (gameState.timerRunning) {
        gameState.remainingTime--;
        updateTimerDisplay();
        
        if (gameState.remainingTime <= 0) {
            clearInterval(gameState.timerInterval);
            moveToVoting();
        }
    }
}

// タイマー表示を更新
function updateTimerDisplay() {
    const minutes = Math.floor(gameState.remainingTime / 60);
    const seconds = gameState.remainingTime % 60;
    const display = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    document.getElementById('timerDisplay').textContent = display;
}

// タイマーを一時停止/再開
function toggleTimer() {
    gameState.timerRunning = !gameState.timerRunning;
    const btn = document.getElementById('pauseBtn');
    btn.textContent = gameState.timerRunning ? '一時停止' : '再開';
}

// 時間を追加
function addTime() {
    gameState.remainingTime += 60; // 1分追加
    updateTimerDisplay();
}

// 投票画面へ移動
function moveToVoting() {
    clearInterval(gameState.timerInterval);
    
    // 投票ボタンを生成
    const votingSection = document.getElementById('votingSection');
    votingSection.innerHTML = '';
    
    gameState.players.forEach((playerName, index) => {
        const card = document.createElement('div');
        card.className = 'player-card';
        card.innerHTML = `<div class="player-name">${playerName}</div>`;
        card.onclick = () => selectVotePlayer(index, card);
        votingSection.appendChild(card);
    });
    
    showPage('page-voting');
}

// 投票対象を選択
function selectVotePlayer(index, element) {
    // 前の選択を解除
    document.querySelectorAll('.player-card').forEach(card => {
        card.classList.remove('selected');
    });
    
    // 新しい選択
    element.classList.add('selected');
    gameState.selectedVotePlayer = index;
    
    // 投票ボタンを有効化
    document.querySelector('.btn-primary').disabled = false;
}

// 投票を確定
function submitVote() {
    if (gameState.selectedVotePlayer === -1) {
        alert('誰かを選択してください');
        return;
    }
    
    // 結果を計算
    const selectedPlayerIsWolf = gameState.selectedVotePlayer === gameState.wolfIndex;
    
    // 結果画面を表示
    showResultPage(selectedPlayerIsWolf);
}

// 結果画面を表示
function showResultPage(citizensWon) {
    const resultTitle = document.getElementById('resultTitle');
    const playersList = document.getElementById('playersList');
    const resultWinnerRole = document.getElementById('resultWinnerRole');
    
    // 勝利判定
    if (citizensWon) {
        resultTitle.textContent = '🎉 市民の勝利！';
        resultTitle.className = 'result-title win';
        resultWinnerRole.textContent = '市民';
    } else {
        resultTitle.textContent = '🐺 ウルフの勝利！';
        resultTitle.className = 'result-title lose';
        resultWinnerRole.textContent = 'ウルフ';
    }
    
    // プレイヤーリストを表示
    playersList.innerHTML = '';
    gameState.players.forEach((playerName, index) => {
        const badge = document.createElement('div');
        badge.className = index === gameState.wolfIndex ? 'player-badge wolf' : 'player-badge citizen';
        badge.textContent = playerName + (index === gameState.wolfIndex ? '（ウルフ）' : '（市民）');
        playersList.appendChild(badge);
    });
    
    // 単語を表示
    document.getElementById('resultCitizenWord').textContent = gameState.wordPair.citizenWord;
    document.getElementById('resultWolfWord').textContent = gameState.wordPair.wolfWord;
    
    showPage('page-result');
}

// ゲームをリセット
function resetGame() {
    gameState = {
        theme: '',
        players: [],
        timeLimit: 0,
        wordPair: null,
        wolfIndex: -1,
        currentMemorizeIndex: 0,
        selectedVotePlayer: -1,
        timerInterval: null,
        remainingTime: 0,
        timerRunning: false,
    };
    
    // 設定画面に戻る
    showPage('page-setup');
    
    // 入力欄をリセット
    document.getElementById('theme').value = '';
    document.getElementById('timeLimit').value = '2';
    document.getElementById('nicknameInputs').innerHTML = '';
    addNicknameInput();
    addNicknameInput();
    addNicknameInput();
}

// 初期化処理
window.addEventListener('DOMContentLoaded', function() {
    // 初期ニックネーム入力欄を3つ作成
    addNicknameInput();
    addNicknameInput();
    addNicknameInput();
    
    // 保存されたニックネームがあれば復元
    const savedNicknames = localStorage.getItem('wordwolf_nicknames');
    if (savedNicknames) {
        const nicknames = JSON.parse(savedNicknames);
        const inputs = document.querySelectorAll('.nickname-input');
        nicknames.forEach((nick, index) => {
            if (inputs[index]) {
                inputs[index].value = nick;
            }
        });
    }
});
