import './createPost.js';
import { Devvit, useState } from '@devvit/public-api';
import wordList from './wordlist.json'; // Preprocessed JSON

Devvit.configure({
  redditAPI: true,
});

const words = wordList; // Use the preprocessed word list

// Choose a mix of small, medium, and large words for the game
const selectRandomWords = (): string[] => {
  const smallWords = words.filter((word) => word.length >= 3 && word.length <= 4);
  const mediumWords = words.filter((word) => word.length >= 5 && word.length <= 7);
  const largeWords = words.filter((word) => word.length >= 8);

  const randomSmallWords = Array.from({ length: 5 }, () =>
    smallWords[Math.floor(Math.random() * smallWords.length)].toUpperCase()
  );
  const randomMediumWords = Array.from({ length: 7 }, () =>
    mediumWords[Math.floor(Math.random() * mediumWords.length)].toUpperCase()
  );
  const randomLargeWords = Array.from({ length: 3 }, () =>
    largeWords[Math.floor(Math.random() * largeWords.length)].toUpperCase()
  );

  return [...randomSmallWords, ...randomMediumWords, ...randomLargeWords];
};

// Generate pseudo-random letters (with filler logic)
const generatePseudoRandomLetter = (targetWords: string[]): string => {
  const targetLetters = targetWords.join('');
  const fillerLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const allLetters = targetLetters + fillerLetters.repeat(3);
  return allLetters[Math.floor(Math.random() * allLetters.length)];
};

// Check if a word exists in the dictionary
const isWordValid = (word: string): boolean => words.includes(word.toLowerCase());

// Find all words in the grid with a minimum length filter
const findWords = (grid: (string | null)[][]): { word: string; positions: [number, number][] }[] => {
  const words: { word: string; positions: [number, number][] }[] = [];
  const directions = [
    [0, 1], // Horizontal right
    [1, 0], // Vertical down
    [1, 1], // Diagonal down-right
    [1, -1], // Diagonal down-left
  ];

  for (let y = 0; y < grid.length; y++) {
    for (let x = 0; x < grid[y].length; x++) {
      for (const [dx, dy] of directions) {
        let word = '';
        const positions: [number, number][] = [];
        let nx = x;
        let ny = y;

        while (
          nx >= 0 &&
          ny >= 0 &&
          nx < grid[0].length &&
          ny < grid.length &&
          grid[ny][nx]
        ) {
          word += grid[ny][nx];
          positions.push([ny, nx]);

          // Only include words with 4 or more letters
          if (isWordValid(word) && word.length >= 4) {
            words.push({ word, positions: [...positions] });
          }

          nx += dx;
          ny += dy;
        }
      }
    }
  }

  return words;
};

// Gravity logic to make letters fall after clearing words
const applyGravity = (grid: (string | null)[][]): void => {
  for (let x = 0; x < 9; x++) {
    const stack: (string | null)[] = [];
    for (let y = 8; y >= 0; y--) {
      if (grid[y][x]) {
        stack.push(grid[y][x]); // Collect non-empty cells
        grid[y][x] = null; // Clear the cell
      }
    }
    for (let y = 8; stack.length > 0 && y >= 0; y--) {
      grid[y][x] = stack.shift()!;
    }
  }
};

// Custom delay function for animations
const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    if (typeof setTimeout !== 'undefined') {
      setTimeout(resolve, ms); // Standard delay
    } else {
      resolve(); // No delay mechanism available, resolve immediately
    }
  });

// Main game component
Devvit.addCustomPostType({
  name: 'Word Tetris',
  height: 'tall',
  render: () => {
    const [grid, setGrid] = useState<(string | null)[][]>(
      Array(9)
        .fill(null)
        .map(() => Array(9).fill(null))
    );
    const [cursorX, setCursorX] = useState<number>(4);
    const [currentLetter, setCurrentLetter] = useState<string>('');
    const [highlightedPositions, setHighlightedPositions] = useState<[number, number][]>([]);
    const [targetWords, setTargetWords] = useState<string[]>(() => {
      const selectedWords = selectRandomWords();
      console.log('Selected Target Words:', selectedWords);
      return selectedWords;
    });

    if (!currentLetter) {
      setCurrentLetter(generatePseudoRandomLetter(targetWords));
    }

    const dropLetter = async (column: number): Promise<void> => {
      const newGrid = [...grid];
      console.log('Before dropping letter:', JSON.stringify(newGrid));

      // Place the letter in the lowest available space
      for (let y = 8; y >= 0; y--) {
        if (!newGrid[y][column]) {
          newGrid[y][column] = currentLetter;
          break;
        }
      }

      console.log('After placing letter:', JSON.stringify(newGrid));
      setGrid(newGrid);

      // Find words with the updated grid
      const foundWords = findWords(newGrid);
      console.log('Words found (4+ letters):', foundWords);

      if (foundWords.length > 0) {
        const positionsToHighlight = foundWords.flatMap(({ positions }) => positions);
        console.log('Highlighting positions:', positionsToHighlight);
        setHighlightedPositions(positionsToHighlight);

        // Animation: Highlight cells for 1 second
        await delay(1000);

        // Clear words immediately
        positionsToHighlight.forEach(([py, px]) => {
          newGrid[py][px] = null;
        });

        console.log('After clearing words:', JSON.stringify(newGrid));

        // Apply gravity and update grid
        applyGravity(newGrid);
        console.log('After applying gravity:', JSON.stringify(newGrid));

        setGrid(newGrid);
        setHighlightedPositions([]); // Clear highlights
      }

      setCurrentLetter(generatePseudoRandomLetter(targetWords));
    };

    const handleColumnClick = async (column: number): Promise<void> => {
      setCursorX(column);
      await dropLetter(column);
    };

    const moveCursor = (direction: number): void => {
      setCursorX((prev) => Math.max(0, Math.min(8, prev + direction)));
    };

    return (
      <vstack grow padding="small" alignment="center middle">
        <text size="large" weight="bold">
          Current Letter: {currentLetter}
        </text>
        <text size="medium" weight="bold">
          Target Words: {targetWords.join(', ')}
        </text>
        <vstack grow alignment="center middle" gap="small">
          {grid.map((row, y) => (
            <hstack key={y.toString()} gap="small">
              {row.map((letter, x) => (
                <vstack
                  key={`${x}-${y}`}
                  height="32px"
                  width="32px"
                  alignment="center middle"
                  border="thin"
                  borderColor="gray"
                  backgroundColor={
                    highlightedPositions.some(([py, px]) => py === y && px === x)
                      ? 'yellow' // Highlighted word
                      : cursorX === x && y === 0
                      ? 'lightgreen' // Active column
                      : letter
                      ? 'lightblue' // Filled cell
                      : 'transparent' // Empty cell
                  }
                  onPress={() => handleColumnClick(x)}
                >
                  <text>{letter || ''}</text>
                </vstack>
              ))}
            </hstack>
          ))}
        </vstack>
        <hstack gap="medium" alignment="center middle">
          <button onPress={() => moveCursor(-1)}>←</button>
          <button onPress={() => dropLetter(cursorX)}>Drop Letter</button>
          <button onPress={() => moveCursor(1)}>→</button>
        </hstack>
      </vstack>
    );
  },
});

export default Devvit;
