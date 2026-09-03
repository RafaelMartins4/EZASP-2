const { loadParser } = require('../parser/parser-wrapper.cjs');
const { isWithinBlock } = require('./blockUtils.js');

const MAC_OS = 1;
const WINDOWS = 2;
const LINUX = 3;

function detectOS() {
	switch (process.platform) {
		case "darwin": return MAC_OS;
		case "win32": return WINDOWS;
		default: return LINUX;
	}
}

/**
 * @param {string} textRaw
 */
async function loadErrors(textRaw, fileName, extraTextRaw, disableFeatures) {

	if (textRaw == '' || textRaw == '\r\n' || textRaw == '\n')
		return [[], []];

	const extraTextExists = JSON.stringify(extraTextRaw) != JSON.stringify([[], []]);

	let syntax;
	let orderErrors;
	let predicateErrors;
	let commentWarnings;
	let hover;
	let unsafeVariables;

	if (disableFeatures) {
		syntax = disableFeatures.syntaxChecking;
		orderErrors = disableFeatures.orderErrors;
		predicateErrors = disableFeatures.predicateErrors;
		commentWarnings = disableFeatures.commentWarnings;
		hover = disableFeatures.hoverPredicates;
		unsafeVariables = disableFeatures.unsafeVariables;
	}
	else{
		commentWarnings = "true";
	}

	/*
	* ---------- GET DATA FROM PARSER CLASSES ----------
	*/
	const parser = await loadParser();
	const parserResult = parser.parse(textRaw);
	const lineRanges = parserResult.lineRanges;
	const hasUnclosedComment = parserResult.hasUnclosedComment;
	const program_statements = parserResult.program_statements;

	const extraParserResults = [];
	const extraDefinedPredicates = [];
	const extraHasGenerator = [];

	if (extraTextRaw != []) {
		for (const text of extraTextRaw[1]) {
			let extraResult = parser.parse(text); 
			extraParserResults.push(extraResult);
			extraDefinedPredicates.push(extraResult.definedPredicates);
			extraHasGenerator.push(extraResult.hasGenerator);
		}
	}
	
	// Syntax Errors

	let syntaxErrorRanges = [];
	let syntaxErrorMessages = [];

	if (syntax != "true") {
		const syntaxErrors = parserResult.syntaxErrors;
		const tokenErrors = parserResult.tokenErrors;

		syntaxErrors.forEach(error => {
			const range = {
				lineStart: error.lineStart - 1,
				lineEnd: error.lineEnd - 1,
				indexStart: error.indexStart,
				indexEnd: error.indexEnd
			};
			syntaxErrorRanges.push(range);
			syntaxErrorMessages.push(error.message);
		});

		tokenErrors.forEach(error => {
			const range = {
				lineStart: error.lineStart - 1,
				lineEnd: error.lineEnd - 1,
				indexStart: error.indexStart,
				indexEnd: error.indexEnd
			};
			syntaxErrorRanges.push(range);
			syntaxErrorMessages.push(error.message);
		});
	}

	// Unsafe Variables

	let unsafeVariablesErrorRanges = [];
	let unsafeVariablesMessages = [];

	if(unsafeVariables != "true") {
		parserResult.unsafeVariables.forEach(unsafeError => {
			const range = {
				lineStart: unsafeError.lineStart - 1,
				lineEnd: unsafeError.lineEnd - 1,
				indexStart: unsafeError.indexStart,
				indexEnd: unsafeError.indexEnd
			};

			if(!containsSyntaxErrorInLocation(range)) {
				const errorMessage = `Unsafe Variables: ${unsafeError.unsafeVariables.join(", ")}`;	
				unsafeVariablesErrorRanges.push(range)
				unsafeVariablesMessages.push(errorMessage)
			}
		});
	}

	// Ordering Errors

	const constructTypes = parserResult.constructTypes;

	let orderingWarningRanges = [];
	let orderingWarningMessages = [];
	let noGeneratorWarningRanges = [];
	let noGeneratorWarningMessages = [];

	if (orderErrors != "true") {
		const correctOrder = ['Constant', 'Fact', 'ChoiceRule', 'DefiniteRule', 'Constraint', 'Optimization', 'Show'];

		let hasGenerator = parserResult.hasGenerator;
		if (!hasGenerator && extraTextExists) {
			hasGenerator = extraHasGenerator.includes(true);
		}

		for (let i = 0; i < program_statements.length - 1; i++) {
			const blockStart = program_statements[i];
			const blockEnd = program_statements[i + 1];
			const blockConstructs = constructTypes.filter(c => isWithinBlock(c, blockStart, blockEnd));

			const result = checkOrderingForBlock(blockConstructs, correctOrder, hasGenerator);
			orderingWarningRanges.push(...result.orderingWarningRanges);
			orderingWarningMessages.push(...result.orderingWarningMessages);
			noGeneratorWarningRanges.push(...result.noGeneratorWarningRanges);
			noGeneratorWarningMessages.push(...result.noGeneratorWarningMessages);

			hasGenerator = result.hasGenerator; // carry forward into the next block
		}
	}

	function checkOrderingForBlock(constructs, correctOrder, hasGenerator) {
		const orderingWarningRanges = [];
		const orderingWarningMessages = [];
		const noGeneratorWarningRanges = [];
		const noGeneratorWarningMessages = [];

		let lastSeenIndex = -1;

		for (const construct of constructs) {
			const currentIndex = correctOrder.indexOf(construct.type);
			if (currentIndex === -1) continue;

			const generatorWarningMessage = "Warning: The program does not have a generator. Consider adding a Choice Rule or a Fact with a choice in its head";

			const range = {
				lineStart: construct.lineStart - 1,
				lineEnd: construct.lineEnd - 1,
				indexStart: construct.indexStart,
				indexEnd: construct.indexEnd + 1
			};

			if (currentIndex < lastSeenIndex) {
				orderingWarningRanges.push(range);
				orderingWarningMessages.push(getOrderingMessage(construct.type));

				if (!hasGenerator && currentIndex > 2) {
					noGeneratorWarningMessages.push(generatorWarningMessage);
					noGeneratorWarningRanges.push(range);
					hasGenerator = true;
				}
			} else {
				if (!hasGenerator && currentIndex > 2) {
					noGeneratorWarningRanges.push(range);
					noGeneratorWarningMessages.push(generatorWarningMessage);
					hasGenerator = true;
				}
				lastSeenIndex = currentIndex;
			}
		}

		return { orderingWarningRanges, orderingWarningMessages, noGeneratorWarningRanges, noGeneratorWarningMessages, hasGenerator };
	}

	function getOrderingMessage(type) {
		switch (type) {
			case 'Constant': return 'Warning: Constants must be at the beginning of the program.';
			case 'Fact': return 'Warning: Facts must be at the beginning or between Constants and Choice Rules.';
			case 'ChoiceRule': return 'Warning: Choice Rules must be at the beginning or between Facts and Definite Rules.';
			case 'DefiniteRule': return 'Warning: Definite Rules must be between Choice Rules and Constraints.';
			case 'Constraint': return 'Warning: Constraints must be at the end of the program or between Definite Rules and either Weak Constraints, Optimization Statements or Show Statements.';
			case 'Optimization': return 'Warning: Optimization Statements and Weak Constraints must appear after Constraints and before Show Statements.';
			case 'Show': return 'Warning: Show Statements must appear at the end of the program.';
			default: return `Warning: "${type}" is out of order.`;
		}
	}

	// Stratification Errors

	const definedPredicates = parserResult.definedPredicates;
	const usedPredicates = parserResult.usedPredicates;

	/* We separate stratification errors in two types:
		1. Predicates that are used but never defined - Error, this is underlined in red
		2. Predicates that are used before they are defined - Warning, this is underlined in yellow
	*/

	let stratificationErrorRanges = [];
	let stratificationErrorMessages = [];
	let stratificationWarningRanges = [];
	let stratificationWarningMessages = [];

	for (let i = 0; i < program_statements.length - 1; i++) {
		const blockStart = program_statements[i];
		const blockEnd = program_statements[i + 1];

		const result = checkStratificationForBlock(
			usedPredicates,
			definedPredicates,
			extraDefinedPredicates,
			extraTextExists,
			blockStart,
			blockEnd,
			predicateErrors
		);

		stratificationErrorRanges.push(...result.blockStratificationErrorRanges);
		stratificationErrorMessages.push(...result.blockStratificationErrorMessages);
		stratificationWarningRanges.push(...result.blockStratificationWarningRanges);
		stratificationWarningMessages.push(...result.blockStratificationWarningMessages);
	}

	function checkStratificationForBlock(usedPredicates, definedPredicates, extraDefinedPredicates, extraTextExists, blockStart, blockEnd, predicateErrors) {
		const blockStratificationErrorRanges = [];
		const blockStratificationErrorMessages = [];
		const blockStratificationWarningRanges = [];
		const blockStratificationWarningMessages = [];

		for (const [usedPredicateKey, usedPositions] of usedPredicates.entries()) {
			const blockUsedPositions = usedPositions.filter(pos => isWithinBlock(pos, blockStart, blockEnd));
			if (blockUsedPositions.length === 0) continue; // not used in this block at all

			let isDefinedInExtraFile = false;
			// Checks if another file defines the predicate
			if(extraTextExists) {
				for(const extraDefinedPredicatesMap of extraDefinedPredicates) {
					if(extraDefinedPredicatesMap.has(usedPredicateKey)) {
						// If the predicate is defined in another file, we don't need to check the rest of the extra files
						isDefinedInExtraFile = true;
						break;
					}
				}
			}
			// If the predicate is defined in another file, we don't need to check the current file
			if(isDefinedInExtraFile)
				continue;

			const allDefinedLocations = definedPredicates.get(usedPredicateKey);
			const blockDefinedLocations = allDefinedLocations ? allDefinedLocations.filter(loc => isWithinBlock(loc, blockStart, blockEnd)) : [];

			if (blockDefinedLocations.length === 0) {
				// If the predicate is not defined in this block or in an extra file, produce a stratification error
				blockUsedPositions.forEach(position => {
					if (predicateErrors != "true") {
						const range = {
							lineStart: position.lineStart - 1,
							lineEnd: position.lineEnd - 1,
							indexStart: position.indexStart,
							indexEnd: position.indexEnd + 1
						};

						if (!containsSyntaxErrorInLocation(range) && !containsUnsafeVariableErrorInLocation(range)) {
							blockStratificationErrorRanges.push(range);
							blockStratificationErrorMessages.push(`Error: Predicate ${usedPredicateKey} is never defined.`);
						}
					}
				});
			} else {
				// If the predicate is used before being defined in this block, produce a stratification warning
				blockUsedPositions.forEach(usedPosition => {
					const isDefinedBefore = blockDefinedLocations.some(definedLocation => {
						return (
							definedLocation.lineStart < usedPosition.lineStart ||
							(definedLocation.lineStart === usedPosition.lineStart &&
								definedLocation.indexStart <= usedPosition.indexStart)
						);
					});

					if (!isDefinedBefore && predicateErrors != "true") {
						const range = {
							lineStart: usedPosition.lineStart - 1,
							lineEnd: usedPosition.lineEnd - 1,
							indexStart: usedPosition.indexStart,
							indexEnd: usedPosition.indexEnd + 1
						};

						if (!containsSyntaxErrorInLocation(range) && !containsUnsafeVariableErrorInLocation(range) && !containsStratificationErrorInLocation(range, blockStratificationErrorRanges)) {
							blockStratificationWarningRanges.push(range);
							blockStratificationWarningMessages.push(`Warning: Predicate ${usedPredicateKey} is used before it is defined.`);
						}
					}
				});
			}
		}

		return { blockStratificationErrorRanges, blockStratificationErrorMessages, blockStratificationWarningRanges, blockStratificationWarningMessages };
	}

	let symbol;

	if (detectOS() == WINDOWS) {
		symbol = "\\";
	}
	else
		symbol = "/";

	let currentFileName;

	if (extraTextExists) {
		const split = fileName.split(symbol)

		currentFileName = split[split.length - 1];
	}

	// Preprocess the ASP comments from the text and save them in a map with their last line as the key
	function preprocessComments(text) {
	    const comments = new Map();
		const normalizedText = text.replace(/\r\n/g, '\n'); // Ensure that it works across all OS
		const lines = normalizedText.split('\n'); 

		let insideBlockComment = false;
		let currentBlockComment = ''; 


		lines.forEach((line, index) => {
			let i = 0;
			while (i < line.length) {
				// If we're inside a block comment, accumulate text until we find '*%'
				if (insideBlockComment) {
					const blockEndIndex = line.indexOf('*%', i);
					// Block comment ends on this line
					if (blockEndIndex !== -1) {
						currentBlockComment += line.slice(i, blockEndIndex).trim();
						insideBlockComment = false;
						if (!comments.has(index + 1)) {
							comments.set(index + 1, []);
						}
						comments.get(index + 1).push(currentBlockComment);
						currentBlockComment = '';
						i = blockEndIndex + 2; // Move the index past '*%'
					} 
					// Block comment continues on this line
					else {
						currentBlockComment += line.slice(i).trim() + ' ';
						break; // Move to the next line
					}
				} 
				// Found the start of a comment
				else if (line[i] === '%') {
					// It's a block comment
					if (i + 1 < line.length && line[i + 1] === '*') {
						insideBlockComment = true;
						currentBlockComment = '';
						i += 2; // Move past '%*'
					} 
					// It's a line comment
					else {
						const commentText = line.slice(i + 1).trim();
						if (!comments.has(index + 1)) {
							comments.set(index + 1, []);
						}
						comments.get(index + 1).push(commentText);
						break; // No need to process the rest of the line
					}
				} else {
					i++;
				}
			}
		});

		return comments;
	}

	// Calculate the definition messages for the predicates
	const definitionMessages = new Map();
	const noCommentLines = new Map();
	const comments = preprocessComments(textRaw);
	
	for(const [predicateKey, locations] of definedPredicates.entries()) {
		locations.forEach(location => {
			const commentLine = location.lineStart - 1;
			// If the previous line has a comment, add it to the definitionMessages
			if(comments.has(commentLine)) {
				const commentTexts = comments.get(commentLine);
				commentTexts.forEach(commentText => {
					if (!definitionMessages.has(predicateKey)) {
						definitionMessages.set(predicateKey, []);
					}
					if(!extraTextExists)
						definitionMessages.get(predicateKey).push(`${commentText} (line ${location.lineStart}).`);
					else
						definitionMessages.get(predicateKey).push(`${commentText} (${currentFileName} line ${location.lineStart}).`);
				});
			// If not, add it to the noCommentLines, saving the predicateKey and the location
			// This will later be processed to add a 'No comment' message with all the lines to the definitionMessages map 
			} else {
				if (!noCommentLines.has(predicateKey)) {
					noCommentLines.set(predicateKey, []);
				}
				noCommentLines.get(predicateKey).push(location);
			}
		});
	}

	// Process the noCommentLines to add a 'No comment' message to the definitionMessages map
	for (const [predicateKey, lines] of noCommentLines.entries()) {
		if (!definitionMessages.has(predicateKey)) {
			definitionMessages.set(predicateKey, []);
		}
		const uniqueLineStarts = [...new Set(lines.map(line => line.lineStart))]; // Remove duplicates
		if(!extraTextExists) {
			if(uniqueLineStarts.length > 1)
				definitionMessages.get(predicateKey).push(`No comment found where predicate ${predicateKey} is defined (lines ${uniqueLineStarts.join(', ')}).`);
			else
				definitionMessages.get(predicateKey).push(`No comment found where predicate ${predicateKey} is defined (line ${uniqueLineStarts.join(', ')}).`);
		} else {
			if(uniqueLineStarts.length > 1)
				definitionMessages.get(predicateKey).push(`No comment found where predicate ${predicateKey} is defined (${currentFileName} lines ${uniqueLineStarts.join(', ')}).`);
			else 
				definitionMessages.get(predicateKey).push(`No comment found where predicate ${predicateKey} is defined (${currentFileName} line ${uniqueLineStarts.join(', ')}).`);
		}
	}

	// Process the extra files' predicates
	if(extraTextExists) {
		extraDefinedPredicates.forEach((extraDefinedPredicatesMap, index) => {
			const currentExtraFileName = extraTextRaw[0][index];
			const extraComments = preprocessComments(extraTextRaw[1][index]);
			const extraNoCommentLines = new Map();
			for(const [predicateKey, locations] of extraDefinedPredicatesMap.entries()) {
				locations.forEach(location => {
					const commentLine = location.lineStart - 1;
					// If the previous line has a comment, add it to the definitionMessages
					if(extraComments.has(commentLine)) {
						const commentTexts = extraComments.get(commentLine);
						commentTexts.forEach(commentText => {
							if (!definitionMessages.has(predicateKey)) {
								definitionMessages.set(predicateKey, []);
							}
							definitionMessages.get(predicateKey).push(`${commentText} (${currentExtraFileName} line ${location.lineStart}).`);
						});
					// If not, add it to the noCommentLines, saving the predicateKey and the line number
					// This will later be processed to add a 'No comment' message with all the lines to the definitionMessages map 
					} else {
						if (!extraNoCommentLines.has(predicateKey)) {
							extraNoCommentLines.set(predicateKey, []);
						}
						extraNoCommentLines.get(predicateKey).push(location.lineStart);
					}
				});
			}

			// Process the noCommentLines to add a 'No comment' message to the definitionMessages map
			for (const [predicateKey, lines] of extraNoCommentLines.entries()) {
				if (!definitionMessages.has(predicateKey)) {
					definitionMessages.set(predicateKey, []);
				}
				const uniqueLines = [...new Set(lines)]; // Remove duplicates
				if(uniqueLines.length > 1)
					definitionMessages.get(predicateKey).push(`No comment found where predicate ${predicateKey} is defined (${currentExtraFileName} lines ${uniqueLines.join(', ')}).`);
				else 
					definitionMessages.get(predicateKey).push(`No comment found where predicate ${predicateKey} is defined (${currentExtraFileName} line ${uniqueLines.join(', ')}).`);
			}
		});
	}

	// Add a warning message to lines that define a predicate and are not commented
	let noCommentWarningRanges = [];
	let noCommentWarningLines = [];

	let noCommentWarningMessages = [];
	let noCommentWarningRangesFinal = [];

	if(commentWarnings != "true") {
		for(const [noCommentKey, locations] of noCommentLines.entries()) {
			locations.forEach(location => {
				if(!noCommentWarningLines.includes(location.lineStart)) {
					noCommentWarningLines.push(location.lineStart);
				}
			});
		}

		noCommentWarningLines.forEach(line => {
			lineRanges.get(line).forEach(range => {
				noCommentWarningRanges.push({
					lineStart: range.lineStart - 1,
					lineEnd: range.lineEnd - 1,
					indexStart: range.indexStart,
					indexEnd: range.indexEnd
				});
			});
		});
	
		const checker = [];

		for (const range of noCommentWarningRanges) {
			const tmp = JSON.stringify(range);
			if (!checker.includes(JSON.stringify(range)))
				checker.push(tmp)
		}

		for (const range of checker) {
			if(!containsErrorInLocation(JSON.parse(range))) {
				noCommentWarningRangesFinal.push(JSON.parse(range))
			}
		}

		for (const range of noCommentWarningRangesFinal) {
			noCommentWarningMessages.push(`Warning: This line is defining a predicate without proper commenting (line ${range.lineStart + 1}).`);
		}
	}

	// Remove duplicates from the definitionMessages map (not sure if this is necessary)
	for (const key of [...definitionMessages.keys()]) {
		const checker = [];
		const array = definitionMessages.get(key);

		for (const message of array)
			if (!checker.includes(message))
				checker.push(message)

		definitionMessages.set(key, checker);
	}

	function isBefore(range1, range2) {
		return range1.lineEnd < range2.lineStart || (range1.lineEnd === range2.lineStart && range1.indexEnd <= range2.indexStart)
	}

	function doRangesOverlap(range1, range2) {
		return !(isBefore(range1, range2) || isBefore(range2, range1));
	}

	function containsSyntaxErrorInLocation(location) {
		// We utilize an extended location to ensure that only ranges that have atleast one character between them are considered as non-overlapping
		// This way we eliminate cases where two issues connect their underlines, making it look like a single issue
		const extendedLocation = {
			lineStart: location.lineStart,
			lineEnd: location.lineEnd,
			indexStart: location.indexStart > 0 ? location.indexStart - 1 : 0,
			indexEnd: location.indexEnd + 1
		}

		if (syntax != "true") {
			if (syntaxErrorRanges.some(range => {
				if (doRangesOverlap(range, extendedLocation)) {
					return true;
				}
				return false;
			})) return true;
		}

		return false;
	}

	function containsUnsafeVariableErrorInLocation(location) {
		// We utilize an extended location to ensure that only ranges that have atleast one character between them are considered as non-overlapping
		// This way we eliminate cases where two issues connect their underlines, making it look like a single issue
		const extendedLocation = {
			lineStart: location.lineStart,
			lineEnd: location.lineEnd,
			indexStart: location.indexStart > 0 ? location.indexStart - 1 : 0,
			indexEnd: location.indexEnd + 1
		}

		if(unsafeVariables != "true") {
			if (unsafeVariablesErrorRanges.some(range => {
				if (doRangesOverlap(range, extendedLocation)) {
					return true;
				}
				return false;
			})) return true;
		}

		return false;
	}

	function containsStratificationErrorInLocation(location, errorRanges = stratificationErrorRanges) {
		// We utilize an extended location to ensure that only ranges that have atleast one character between them are considered as non-overlapping
		// This way we eliminate cases where two issues connect their underlines, making it look like a single issue
		const extendedLocation = {
			lineStart: location.lineStart,
			lineEnd: location.lineEnd,
			indexStart: location.indexStart > 0 ? location.indexStart - 1 : 0,
			indexEnd: location.indexEnd + 1
		}

		if (predicateErrors != "true") {
			if (errorRanges.some(range => {
				if (doRangesOverlap(range, extendedLocation)) {
					return true;
				}
				return false;
			})) return true;
		}

		return false
	}

	function containsStratificationWarningInLocation(location) {
		// We utilize an extended location to ensure that only ranges that have atleast one character between them are considered as non-overlapping
		// This way we eliminate cases where two issues connect their underlines, making it look like a single issue
		const extendedLocation = {
			lineStart: location.lineStart,
			lineEnd: location.lineEnd,
			indexStart: location.indexStart > 0 ? location.indexStart - 1 : 0,
			indexEnd: location.indexEnd + 1
		}

		if (predicateErrors != "true") {
			if (stratificationWarningRanges.some(range => {
				if (doRangesOverlap(range, extendedLocation)) {
					return true;
				}
				return false;
			})) return true;
		}

		return false;
	}

	function containsNonFullLineIssueInLocation(location) {
		return containsSyntaxErrorInLocation(location) ||
			containsUnsafeVariableErrorInLocation(location) ||
			containsStratificationErrorInLocation(location) ||
			containsStratificationWarningInLocation(location);
	}

	function serializeRange(range) {
		return `${range.lineStart}:${range.lineEnd}:${range.indexStart}:${range.indexEnd}`;
	}

	function removeDuplicates(ranges, messages) {
		const map = new Map();

		for (let i = 0; i < ranges.length; i++) {
			const key = serializeRange(ranges[i].range);

			if (map.has(key)) {
				map.get(key).message += ' | ' + messages[i];
			} else {
				map.set(key, {
					range: ranges[i],
					message: messages[i]
				});
			}
		}

		const dedupedRanges = [];
		const dedupedMessages = [];

		for (const {range, message} of map.values()) {
			dedupedRanges.push(range);
			dedupedMessages.push(message);
		}

		return {ranges: dedupedRanges, messages: dedupedMessages};
 	}

	function concatenateFullLineWarnings() {
		let ordering = orderingWarningRanges.map(range => ({
			range,
			type: 'ordering',
		}));

		let noGenerator = noGeneratorWarningRanges.map(range => ({
			range,
			type: 'noGenerator',
		}));

		let noComment = noCommentWarningRangesFinal.map(range => ({
			range,
			type: 'noComment',
		}));

		return [...ordering, ...noGenerator, ...noComment]
	}
	
	// This is done to differentiate between the different types of full line warnings (ordering, no generator, no comment), which is useful when displaying them in the editor
	let fullLineWarningRanges = concatenateFullLineWarnings();	
	let fullLineWarningMessages = orderingWarningMessages.concat(noGeneratorWarningMessages.concat(noCommentWarningMessages));

	// Do a final check to ensure that ordering and no comment warnings only appear in lines that do not have any other errors/warnings
	// This is done to avoid creating lines with entagled errors and warnings. Given that ordering and no comment warnings underline the whole line, we give priority
	// to errors and warnings that are specific to the predicate (i.e. there can only be full line warnings/errors if there are no other errors/warnings in the line) 
	let finalFullLineWarningRanges = [];
	let finalFullLineWarningMessages = [];

	for (const warning of fullLineWarningRanges) {
		const range = warning.range;
		if (!containsNonFullLineIssueInLocation(range)) {
			finalFullLineWarningRanges.push(warning);
			finalFullLineWarningMessages.push(fullLineWarningMessages[fullLineWarningRanges.indexOf(warning)]);
		}
	}

	// This will remove duplicate ranges from finalFullLineWarningRanges and collapse their messages
	const result = removeDuplicates(finalFullLineWarningRanges, finalFullLineWarningMessages);
	finalFullLineWarningRanges = result.ranges;
	finalFullLineWarningMessages =  result.messages;

	function containsErrorInLocation(location) {
		const normalizedLocation = {
			lineStart: location.lineStart - 1,
			lineEnd: location.lineEnd - 1,
			indexStart: location.indexStart,
			indexEnd: location.indexEnd
		};

		if(predicateErrors != "true") {
			stratificationErrorRanges.forEach(range => {
				if(doRangesOverlap(range, normalizedLocation)) {
					return true;
				}
			});
		}

		if(syntax != "true") {
			syntaxErrorRanges.forEach(range => {
				if(doRangesOverlap(range, normalizedLocation)) {
					return true;
				}
			});
		}

		return false;
	}

	function containsWarningInLocation(location) {
		const normalizedLocation = {
			lineStart: location.lineStart - 1,
			lineEnd: location.lineEnd - 1,
			indexStart: location.indexStart,
			indexEnd: location.indexEnd
		};
		
		finalFullLineWarningRanges.forEach(warning => {
			const range = warning.range;
			if(doRangesOverlap(range, normalizedLocation)) {
				return true;
			}
		});

		if(predicateErrors != "true") {
			stratificationWarningRanges.forEach(range => {
				if(doRangesOverlap(range, normalizedLocation)) {
					return true;
				}
			});
		}

		return false;
	}

	let predicateHoverRanges = [];
	let predicateHoverMessages = [];

	if(hover != "true") {
		for (const [predicateKey, locations] of definedPredicates.entries()) {
			locations.forEach(location => {
				if(!containsErrorInLocation(location) && !containsWarningInLocation(location)) {
					if (!predicateHoverRanges.includes(location) && definitionMessages.has(predicateKey)) {
						predicateHoverRanges.push({
							lineStart: location.lineStart - 1,
							lineEnd: location.lineEnd - 1,
							indexStart: location.indexStart,
							indexEnd: location.indexEnd
						});
						const messages = definitionMessages.get(predicateKey);
						let finalMessage = "";
						for(let i = 0; i < messages.length - 1; i++) {
							finalMessage += messages[i] + " | ";
						}
						finalMessage += messages[messages.length - 1];
						predicateHoverMessages.push(finalMessage);
					}
				}
			});	
		}

		for( const [predicateKey, locations] of usedPredicates.entries()) {
			locations.forEach(location => {
				if(!containsErrorInLocation(location) && !containsWarningInLocation(location)) {
					if (!predicateHoverRanges.includes(location) && definitionMessages.has(predicateKey)) {
						predicateHoverRanges.push({
							lineStart: location.lineStart - 1,
							lineEnd: location.lineEnd - 1,
							indexStart: location.indexStart,
							indexEnd: location.indexEnd
						});
						const messages = definitionMessages.get(predicateKey);
						let finalMessage = "";
						for(let i = 0; i < messages.length - 1; i++) {
							finalMessage += messages[i] + " | ";
						}
						finalMessage += messages[messages.length - 1];
						predicateHoverMessages.push(finalMessage);
					}
				}
			});		
		}
	}

	return {
		syntaxErrorRanges: syntaxErrorRanges,
		unsafeVariablesErrorRanges: unsafeVariablesErrorRanges,
		stratificationErrorRanges: stratificationErrorRanges, 
		fullLineWarningRanges: finalFullLineWarningRanges, 
		stratificationWarningRanges: stratificationWarningRanges,
		predicateHoverRanges: predicateHoverRanges, 

		syntaxErrorMessages: syntaxErrorMessages, 
		unsafeVariablesMessages: unsafeVariablesMessages,
		stratificationErrorMessages: stratificationErrorMessages, 
		fullLineWarningMessages: finalFullLineWarningMessages, 
		stratificationWarningMessages: stratificationWarningMessages,
		predicateHoverMessages: predicateHoverMessages,

		definedPredicates: definedPredicates, 
		usedPredicates: usedPredicates, 
		constructTypes: constructTypes,
		hasUnclosedComment: hasUnclosedComment,
		program_statements: program_statements,
	};

	
}

module.exports = { loadErrors };