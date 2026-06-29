const COMMON_WORDS = [
  "the", "be", "to", "of", "and", "a", "in", "that", "have", "i", "it", "for", "not", "on", "with", "he", "as", "you", 
  "do", "at", "this", "but", "his", "by", "from", "they", "we", "say", "her", "she", "or", "an", "will", "my", "one", 
  "all", "would", "there", "their", "what", "so", "up", "out", "if", "about", "who", "get", "which", "go", "me", "when", 
  "make", "can", "like", "time", "no", "just", "him", "know", "take", "people", "into", "year", "your", "good", "some", 
  "could", "them", "see", "other", "than", "then", "now", "look", "only", "come", "its", "over", "think", "also", "back", 
  "after", "use", "two", "how", "our", "work", "first", "well", "way", "even", "new", "want", "because", "any", "these", 
  "give", "day", "most", "us", "monkey", "race", "speed", "type", "accuracy", "keyboard", "finger", "score", "victory",
  "champion", "arena", "lobby", "server", "connection", "latency", "animation", "avatar", "banana", "climb", "tree", "forest"
];

const QUOTES = [
  "The only way to do great work is to love what you do. If you haven't found it yet, keep looking. Don't settle.",
  "Success is not final, failure is not fatal: it is the courage to continue that counts.",
  "To be yourself in a world that is constantly trying to make you something else is the greatest accomplishment.",
  "The typing race is not to the swift, nor the battle to the strong, but to those who type with consistency and accuracy.",
  "In the cyber forest, the code monkey is king. The keys clack like thunder, and the fingers fly like lightning.",
  "A smooth sea never made a skilled sailor, and an easy keyboard never made a master typist.",
  "Move fast and break things. Unless you are typing, in which case you should move fast and avoid breaking letters.",
  "JavaScript is to Java what ham is to hamster. One is small and fuzzy, the other is large and delicious with mustard.",
  "Behind every successful typing speed is a trail of thousands of corrected backspaces and broken keyboards.",
  "Do or do not. There is no try. Your focus determines your reality. Keep your eyes on the screen and your hands on home row."
];

export function generateWords(count: number): string {
  const result: string[] = [];
  for (let i = 0; i < count; i++) {
    const idx = Math.floor(Math.random() * COMMON_WORDS.length);
    result.push(COMMON_WORDS[idx]);
  }
  return result.join(' ');
}

export function getRandomQuote(): string {
  const idx = Math.floor(Math.random() * QUOTES.length);
  return QUOTES[idx];
}

export function generateText(mode: 'words' | 'time' | 'custom', value: number): string {
  if (mode === 'words') {
    return generateWords(value);
  } else if (mode === 'time') {
    // For time-based tests, generate a healthy amount of words (e.g. WPM 100 needs ~100 words in 60s, generate 150 words)
    // Value is time in seconds. Roughly count/seconds estimation: count = value * 2.5 words
    const wordCount = Math.max(50, Math.ceil(value * 2.5));
    return generateWords(wordCount);
  } else {
    return getRandomQuote();
  }
}
