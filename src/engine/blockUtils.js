// Utility file for program statements block logic

// Compares two positions by line first, then index. Returns negative if a < b, 0 if equal, positive if a > b.
function comparePositions(a, b) {
    if (a.lineStart !== b.lineStart) 
        return a.lineStart - b.lineStart;
    return a.indexStart - b.indexStart;
}

function isWithinBlock(construct, blockStart, blockEnd) {
    const constructPos = { lineStart: construct.lineStart, indexStart: construct.indexStart };
    return comparePositions(constructPos, blockStart) >= 0 &&
        comparePositions(constructPos, blockEnd) < 0;
}

// Gets the block (start and end positions) that contains the given position. 
// Useful when determining which block to reorganize based on the position of the cursor when the reorganization button is clicked. 
function getBlockAtPosition(pos, program_statements) {
    for (let i = 0; i < program_statements.length - 1; i++) {
        const blockStart = program_statements[i];
        const blockEnd = program_statements[i + 1];
        if (isWithinBlock(pos, blockStart, blockEnd)) {
            return { blockStart, blockEnd };
        }
    }
    return null;
}

module.exports = { isWithinBlock, getBlockAtPosition };