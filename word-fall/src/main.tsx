import './createPost.js';
import { Devvit, useState } from '@devvit/public-api';
import wordList from './wordlist.json'; // Preprocessed JSON

Devvit.configure({
  redditAPI: true,
});

const MIN_WORD_LENGTH = 4;
const WORDS = wordList.filter((word) => word.length >= MIN_WORD_LENGTH); // Use the preprocessed word list
const alphabetList = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const COLS = 7;
const ROWS = 7;

// Choose a mix of small, medium, and large words for the game
const selectRandomWords = (): string[] => {
  const smallWords = WORDS.filter((word) => word.length >= 3 && word.length <= 4);
  const mediumWords = WORDS.filter((word) => word.length >= 5 && word.length <= 7);
  const largeWords = WORDS.filter((word) => word.length >= 8);

  const randomSmallWords = smallWords.length ? 
  [smallWords[Math.floor(Math.random() * smallWords.length)].toUpperCase()] : [];

  const randomMediumWords = mediumWords.length ? 
  [mediumWords[Math.floor(Math.random() * mediumWords.length)].toUpperCase()] : [];
  
  const randomLargeWords = largeWords.length ? 
  [largeWords[Math.floor(Math.random() * largeWords.length)].toUpperCase()] : [];

  return [...randomSmallWords, ...randomMediumWords, ...randomLargeWords];
};

// Check if a word exists in the dictionary
const isWordValid = (word: string): boolean => WORDS.includes(word.toLowerCase());

// Find all words in the grid with a minimum length filter
const findWords = (grid: (string | null)[][]): { word: string; positions: [number, number][] }[] => {
  const words: { word: string; positions: [number, number][] }[] = [];
  const directions = [
    [0, 1], // Horizontal right
    [1, 0], // Vertical down
    [1, 1], // Diagonal down-right
    [1, -1], // Diagonal down-left
    [0, -1], // Horizontal left
    [-1, 0], // Verical up
    [-1, 1], // diagonal up-right
    [-1, -1] // diagonal up-left
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

          // Only include words with MIN_WORD_LENGTH or more letters
          if (word.length >= MIN_WORD_LENGTH && isWordValid(word)) {
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
  for (let x = 0; x < COLS; x++) {
    const stack: (string | null)[] = [];
    for (let y = ROWS -1 ; y >= 0; y--) {
      if (grid[y][x]) {
        stack.push(grid[y][x]); // Collect non-empty cells
        grid[y][x] = null; // Clear the cell
      }
    }
    for (let y = ROWS - 1; stack.length > 0 && y >= 0; y--) {
      grid[y][x] = stack.shift()!;
    }
  }
};


// Main game component
Devvit.addCustomPostType({
  name: 'Word Tetris',
  height: 'tall',
  render: () => {
    const [grid, setGrid] = useState<(string | null)[][]>(
      Array(ROWS)
        .fill(null)
        .map(() => Array(COLS).fill(null))
    );
    const [cursorX, setCursorX] = useState<number>(4);
    const [currentLetter, setCurrentLetter] = useState<string>('');
    const [highlightedPositions, setHighlightedPositions] = useState<[number, number][]>([]);
    const [targetWords, setTargetWords] = useState<string[]>(() => {
      const selectedWords = selectRandomWords();
      console.log('Selected Target Words:', selectedWords);
      return selectedWords;
    });


    const generatePseudoRandomLetter = (): string => {
      const targetLetters = targetWords.join('');
      return targetLetters[Math.floor(Math.random() * targetLetters.length)];
    };

    if (!currentLetter) {
      setCurrentLetter(generatePseudoRandomLetter());
    }

    // Clear the highlighted words and apply gravity
    const handleClearWords = () => {
      const newGrid = [...grid];
      highlightedPositions.forEach(([py, px]) => {
          newGrid[py][px] = null;
        });
      applyGravity(newGrid);
      setGrid(newGrid);
      setHighlightedPositions([]);
    };

    const placeLetterOrClear = (column: number) => {
      if (highlightedPositions.length) {
        handleClearWords();
        return
      }
      
      // First action - update grid with new letter
      const newGrid = [...grid];
      var placed = false;
      for (let y = ROWS - 1; y >= 0; y--) {
        if (!newGrid[y][column]) {
          newGrid[y][column] = currentLetter;
          placed = true;
          break;
        }
      }
      setGrid(newGrid);

      if (placed){
        setCurrentLetter(generatePseudoRandomLetter());
      }
    
      // Set highlight state
      const foundWords = findWords(newGrid);
      if (foundWords.length > 0) {
        const positions = foundWords.flatMap(({ positions }) => positions);
        setHighlightedPositions(positions);
      }
    };

    const moveCursor = (direction: number): void => {

       if (highlightedPositions.length) {
        // If words exist, then clear it and re-render by returning
        handleClearWords();
        return
      }
      setCursorX((prev) => {
        const newPosition = prev + direction;
        if (newPosition < 0) {
          return newPosition + COLS
        }
        else if (newPosition >= COLS) {
        return newPosition - COLS
        } else {
          return newPosition
        }
      });
    };

    const handleColumnClick = async (column: number): Promise<void> => {
      setCursorX(column);
      placeLetterOrClear(column);
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
                      ? 'lightyellow' // Highlighted word
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
          <button onPress={() => placeLetterOrClear(cursorX)}>Drop Letter</button>
          <button onPress={() => moveCursor(1)}>→</button>
        </hstack>
      </vstack>
    );
  },
});

export default Devvit;
