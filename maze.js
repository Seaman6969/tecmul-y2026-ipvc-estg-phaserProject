function generateMaze(width, height) {
    // Directions: 0=N, 1=E, 2=S, 3=W
    const DX = [0, 1, 0, -1];
    const DY = [-1, 0, 1, 0];
    const OPPOSITE = [2, 3, 0, 1];
    const visited = Array.from({ length: width }, () => Array(height).fill(false));
    const walls = Array.from({ length: width }, () =>
        Array.from({ length: height }, () => [true, true, true, true])
    );

    function shuffle(arr) {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = getRand(i + 1);
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    }
    function carve(cx, cy) {
        visited[cx][cy] = true;
        const dirs = shuffle([0, 1, 2, 3]);
        for (const dir of dirs) {
            const nx = cx + DX[dir];
            const ny = cy + DY[dir];
            walls[cx][cy][dir] = (nx >= 0 && nx < width && ny >= 0 && ny < height && !visited[nx][ny]) ? false : walls[cx][cy][dir];
            walls[cx][cy][OPPOSITE(dir)] = (nx >= 0 && nx < width && ny >= 0 && ny < height && !visited[nx][ny]) ? false : walls[cx][cy][OPPOSITE(dir)];
            if (nx >= 0 && nx < width && ny >= 0 && ny < height && !visited[nx][ny]) { carve(nx, ny); }
        }
    }
    carve(0, 0);
    const grid = convertToGrid(walls, width, height);

    return { walls, grid };
}
function convertToGrid(walls, width, height) {
    const gridW = 2 * width + 1;
    const gridH = 2 * height + 1;
    const grid = Array.from({ length: gridH }, () => Array(gridW).fill(1));

    let y, x;
    for (y = 0; y < height; y++) {
        for (x = 0; x < width; x++) {
            grid[2 * y + 1][2 * x + 1] = 0;
            grid[2 * y][2 * x + 1] = (!walls[x][y][0]) ? 0 : grid[2 * y][2 * x + 1];// North
            grid[2 * y + 1][2 * x + 2] = (!walls[x][y][1]) ? 0 : grid[2 * y + 1][2 * x + 2];//East
            grid[2 * y + 2][2 * x + 1] = (!walls[x][y][2]) ? 0 : grid[2 * y + 1][2 * x + 2];// South
            grid[2 * y + 1][2 * x] = (!walls[x][y][3]) ? 0 : grid[2 * y + 1][2 * x];   // West
        }
    }
    return grid;
}

function getRand(n) {
    return Math.floor(Math.random() * n);
}