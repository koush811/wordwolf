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
    initialTime: 0,
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

// 画面切り替え関数（仕様書に指定されたコード）
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

// ゲーム開始処理（お題・時間・ニックネームの検証を行う）
async function startGame() {
    const theme = document.getElementById('theme').value.trim();
    const timeLimit = parseInt(document.getElementById('timeLimit').value);
    const nicknameInputs = document.querySelectorAll('.nickname-input');
    const nicknames = Array.from(nicknameInputs)
        .map(input => input.value.trim())
        .filter(name => name.length > 0);

    const errorMessage = document.getElementById('errorMessage');
    errorMessage.classList.remove('show');

    // バリデーション：お題
    if (!theme || theme.length === 0) {
        errorMessage.textContent = 'お題を入力してください';
        errorMessage.classList.add('show');
        return;
    }

    if (theme.length > 20) {
        errorMessage.textContent = 'お題は20字以内です';
        errorMessage.classList.add('show');
        return;
    }

    // バリデーション：プレイヤー数
    if (nicknames.length < 3) {
        errorMessage.textContent = 'プレイヤーは3人以上必要です';
        errorMessage.classList.add('show');
        return;
    }

    if (nicknames.length > 20) {
        errorMessage.textContent = 'プレイヤーは20人以下です';
        errorMessage.classList.add('show');
        return;
    }

    // バリデーション：同じニックネーム
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
    gameState.timerRunning = false;
    gameState.initialTime = timeLimit * 60;

    // ニックネームをlocalStorageに保存
    localStorage.setItem('wordwolf_nicknames', JSON.stringify(nicknames));

    // APIから単語を取得
    try {
        await fetchWordPair();
    } catch (error) {
        // APIエラーの場合はゲームを開始しない
        console.log('エラー: 単語の取得に失敗したため、ゲームを開始できません');
        return;
    }

    // ウルフをランダムに決定（参加者の中からランダムに1名）
    gameState.wolfIndex = Math.floor(Math.random() * gameState.players.length);

    // 直接本人確認画面へ移動
    startMemorizePhase();
}

// 単語ペアを取得する関数（APIから取得、ローカル環境のみフォールバック）
async function fetchWordPair() {
    // ローカル環境判定（Live Serverなど）
    const isLocalhost = window.location.hostname === 'localhost' || 
                       window.location.hostname === '127.0.0.1' ||
                       window.location.port !== '';
    
    if (isLocalhost) {
        console.log('ローカル環境のため、フォールバック単語を使用します');
        gameState.wordPair = FALLBACK_WORDS[Math.floor(Math.random() * FALLBACK_WORDS.length)];
        return;
    }
    
    // デプロイ環境ではAPIのみを使用
    try {
        const response = await fetch('/api/generate-word', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                theme: gameState.theme
            })
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error('APIレスポンスエラー: ' + response.status + ' - ' + errorText);
        }
        
        const wordPair = await response.json();
        console.log('APIから単語ペアを取得しました:', wordPair);
        // APIから直接1組の単語ペアを受け取る
        gameState.wordPair = wordPair;
    } catch (error) {
        console.log('エラー: APIからの単語取得に失敗しました - ' + error.message);
        // デプロイ環境ではフォールバックを使用せず、エラーを表示
        alert('エラー: 単語の生成に失敗しました。\n詳細: ' + error.message + '\nもう一度お試しください。');
        throw error;
    }
}

// 単語表示画面を表示（全員で見える状態で表示）
function showWordDisplay() {
    const wordCardContent = document.getElementById('wordCardContent');
    wordCardContent.textContent = gameState.wordPair.citizenWord;
    showPage('page-word-display');
}

// 暗記フェーズを開始（本人確認を出してから単語を表示）
function startMemorizePhase() {
    gameState.currentMemorizeIndex = 0;
    showNextMemorizePlayer();
}

// 本人確認画面を表示（本人でない人に違う人の情報がわからないようにする）
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

// 本人確認後、個別の単語を表示（ウルフと市民で異なる単語を表示）
function showMemorizeWord() {
    const isWolf = gameState.currentMemorizeIndex === gameState.wolfIndex;
    const word = isWolf ? gameState.wordPair.wolfWord : gameState.wordPair.citizenWord;
    
    document.getElementById('memorizeWordContent').textContent = word;
    document.getElementById('memorizeProgress').textContent = 
        `${gameState.currentMemorizeIndex + 1} / ${gameState.players.length}`;
    
    showPage('page-word-memorize');
}

// 次のプレイヤーへ移動
function proceedToNextPlayer() {
    gameState.currentMemorizeIndex++;
    showNextMemorizePlayer();
}

// ゲームタイマーを開始（設定画面で入力された時間を使う）
function startGameTimer() {
    gameState.remainingTime = gameState.timeLimit * 60; // 分を秒に変換
    gameState.initialTime = gameState.remainingTime;
    gameState.timerRunning = true;
    
    document.getElementById('wolfCountDisplay').textContent = '1'; // 仕様ではウルフは1名
    document.getElementById('themeDisplay').textContent = gameState.theme;
    showPage('page-game');
    
    updateTimerDisplay();
    gameState.timerInterval = setInterval(updateTimer, 1000);
}

// タイマーを更新する関数（1秒ごとに呼ばれる）
function updateTimer() {
    if (gameState.timerRunning) {
        gameState.remainingTime--;
        updateTimerDisplay();
        updateProgressBar();
        
        // タイマー終了時に投票画面へ自動移動
        if (gameState.remainingTime <= 0) {
            clearInterval(gameState.timerInterval);
            moveToVoting();
        }
    }
}

// タイマー表示を更新（"mm:ss"形式）
function updateTimerDisplay() {
    const minutes = Math.floor(gameState.remainingTime / 60);
    const seconds = gameState.remainingTime % 60;
    const display = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    document.getElementById('timerDisplay').textContent = display;
}

// プログレスバーを更新
function updateProgressBar() {
    const percentage = (gameState.remainingTime / gameState.initialTime) * 100;
    document.getElementById('progressFill').style.width = percentage + '%';
}

// タイマーを一時停止/再開
function toggleTimer() {
    gameState.timerRunning = !gameState.timerRunning;
    const btn = document.getElementById('pauseBtn');
    btn.textContent = gameState.timerRunning ? '一時停止' : '再開';
}

// 時間を追加する関数（+1分）
function addTime() {
    gameState.remainingTime += 60; // 1分追加
    gameState.initialTime += 60;
    updateTimerDisplay();
}

// 投票画面へ移動（参加者全員のニックネームを表示）
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
    document.getElementById('submitVoteBtn').disabled = false;
}

// 投票を確定する関数（勝敗を判定）
function submitVote() {
    if (gameState.selectedVotePlayer === -1) {
        alert('誰かを選択してください');
        return;
    }
    
    // 勝敗判定：選択された人がウルフかどうか
    // ウルフに投票されたら市民の勝ち、それ以外の人に投票されたらウルフの勝ち
    const selectedPlayerIsWolf = gameState.selectedVotePlayer === gameState.wolfIndex;
    const citizensWon = selectedPlayerIsWolf;
    
    // 結果画面を表示
    showResultPage(citizensWon);
}

// 結果画面を表示（全員のニックネーム、ウルフのハイライト、正解単語、勝利役職）
function showResultPage(citizensWon) {
    const resultTitle = document.getElementById('resultTitle');
    const playersList = document.getElementById('playersList');
    const resultWinnerRole = document.getElementById('resultWinnerRole');
    
    // 勝利判定表示
    if (citizensWon) {
        resultTitle.textContent = '🎉 市民の勝利！';
        resultTitle.className = 'result-title win';
        resultWinnerRole.textContent = '市民';
    } else {
        resultTitle.textContent = '🐺 ウルフの勝利！';
        resultTitle.className = 'result-title lose';
        resultWinnerRole.textContent = 'ウルフ';
    }
    
    // プレイヤーリストを表示（ウルフはハイライト）
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

// ゲームをリセットする関数（設定画面に戻る）
function resetGame() {
    // タイマーをクリア
    if (gameState.timerInterval) {
        clearInterval(gameState.timerInterval);
    }
    
    // ゲーム状態を初期化
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
        initialTime: 0,
    };
    
    // 設定画面に戻る
    showPage('page-setup');
}

// 初期化処理（DOMContentLoadedイベント）
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
    
    // 設定画面を表示
    showPage('page-setup');
});
