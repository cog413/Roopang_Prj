export function slide(row) {
    const size = row.length;
    const arr = row.filter(v => v);
    return arr.concat(Array(size - arr.length).fill(0));
}

export function combine(row, onScore) {
    for (let i = 0; i < row.length - 1; i++) {
        if (row[i] !== 0 && row[i] === row[i + 1]) {
            row[i] *= 2;
            onScore(row[i]);
            row[i + 1] = 0;
        }
    }
    return row;
}

export function operate(row, onScore) {
    row = slide(row);
    row = combine(row, onScore);
    row = slide(row);
    return row;
}

export function addRandomTile(board) {
    const size = board.length;
    const empty = [];
    for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
            if (board[r][c] === 0) empty.push({ r, c });
        }
    }
    if (empty.length === 0) return;
    const { r, c } = empty[Math.floor(Math.random() * empty.length)];
    board[r][c] = Math.random() < 0.9 ? 2 : 4;
}

export function isGameOver(board) {
    const size = board.length;
    for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
            if (board[r][c] === 0) return false;
            if (c < size - 1 && board[r][c] === board[r][c + 1]) return false;
            if (r < size - 1 && board[r][c] === board[r + 1][c]) return false;
        }
    }
    return true;
}
