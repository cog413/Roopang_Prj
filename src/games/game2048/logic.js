export function slide(row) {
    let arr = row.filter(val => val);
    let missing = 4 - arr.length;
    let zeros = Array(missing).fill(0);
    return arr.concat(zeros);
}

export function combine(row, onScore) {
    for (let i = 0; i < 3; i++) {
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
    let emptyCells = [];
    for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 4; c++) {
            if (board[r][c] === 0) emptyCells.push({r, c});
        }
    }
    if (emptyCells.length > 0) {
        const randomCell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
        board[randomCell.r][randomCell.c] = Math.random() < 0.9 ? 2 : 4;
    }
}
