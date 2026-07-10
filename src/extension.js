const vscode = require('vscode');
const { loadErrors } = require('./engine/loadErrors.js');
const { readFileSync, existsSync, writeFileSync } = require('fs');
const path = require('path');
const { dirname } = require('path');

let disableFeatures;

const underlineRed = vscode.window.createTextEditorDecorationType({
	textDecoration: 'underline wavy red'
});

const underlineYellow = vscode.window.createTextEditorDecorationType({
	textDecoration: 'underline wavy rgba(255, 255, 0, 0.5)'
});

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
 * @param {{ lineStart: number; indexStart: number; lineEnd: number; indexEnd: number; }} range
 */
function convertRange(range){
	const startPosition = new vscode.Position(range.lineStart, range.indexStart);
	const endPosition = new vscode.Position(range.lineEnd, range.indexEnd);
	const rangeFinal = new vscode.Range(startPosition, endPosition);
	return rangeFinal;
}

// Useful information when reorganizing the code
let definedPredicates;
let usedPredicates;
let constructTypes;
let hasUnclosedComment = false;

function getExtraFiles(activeEditor){
	const fileName = activeEditor.document.fileName;

	const dir = path.dirname(fileName);

	let files = [];

	let text = [];

	if(existsSync(dir+'/config.json')){
		const fileData = readFileSync(dir+'/config.json', 'utf-8');
        const json = JSON.parse(fileData);
		const addFiles = json.additionalFiles;
		
		let split;
		if(detectOS() == WINDOWS)
			split = fileName.split('\\');
		else
			split = fileName.split('/');

		if(json.disableFeatures)
			disableFeatures = json.disableFeatures;
		else
			disableFeatures = undefined;

		if(addFiles.includes(split[split.length])){
			for (const item of addFiles)
				if (item !== split[split.length]) 
					files.push(item);
		}

		else
			files = addFiles;
	}
	else
		disableFeatures = undefined;
  
	for(const file of files){
		if(existsSync(dir+'/'+file))
			text.push(readFileSync(dir+'/'+file, 'utf-8'));
		else
			vscode.window.showErrorMessage('File ' + file + ' does not exist in this folder, check config.json file.');
	}

	return [files,text];
}

let hoverDisposable;
async function loadThings(activeEditor, fileName, diagnosticCollection) {
	// The following comment is just so TypeScript does not whine about typing :)
	/** @type {any} */
	const errorResults = await loadErrors(activeEditor.document.getText(), fileName, getExtraFiles(activeEditor), disableFeatures);

	definedPredicates = errorResults.definedPredicates;
	usedPredicates = errorResults.usedPredicates;
	constructTypes = errorResults.constructTypes
	hasUnclosedComment = errorResults.hasUnclosedComment;

	const syntaxErrorObjects = errorResults.syntaxErrorRanges;
	const unsafeVariablesObjects = errorResults.unsafeVariablesErrorRanges;
	const stratificationErrorObjects = errorResults.stratificationErrorRanges;
	const fullLineWarningObjects = errorResults.fullLineWarningRanges;
	const stratificationWarningObjects = errorResults.stratificationWarningRanges;
    const predicateHoverObjects = errorResults.predicateHoverRanges;

	const syntaxErrorMessages = errorResults.syntaxErrorMessages
	const unsafeVariablesMessages = errorResults.unsafeVariablesMessages
	const stratificationErrorMessages = errorResults.stratificationErrorMessages
	const fullLineWarningMessages = errorResults.fullLineWarningMessages
	const stratificationWarningMessages = errorResults.stratificationWarningMessages
	const predicateHoverMessages = errorResults.predicateHoverMessages
	
	// Converting ranges
	const syntaxErrorRanges = [];
	const stratificationErrorRanges = [];
	const fullLineWarningRanges = [];
	const stratificationWarningRanges = []
	const predicateHoverRanges = [];
	const unsafeVariablesRanges = [];

	if(errorResults.syntaxErrorRanges)		// syntaxErrorRanges
		errorResults.syntaxErrorRanges.forEach(range => {
			syntaxErrorRanges.push(convertRange(range));
		})

	if(errorResults.unsafeVariablesErrorRanges) // Unsafe Variables
		errorResults.unsafeVariablesErrorRanges.forEach(range => {
			unsafeVariablesRanges.push(convertRange(range));
		})

	if(errorResults.stratificationErrorRanges)		// stratificationErrorRanges
		errorResults.stratificationErrorRanges.forEach(range => {
			stratificationErrorRanges.push(convertRange(range));
		})

	if(errorResults.fullLineWarningRanges) 	// orderingWarningRanges + noGeneratorWarningRange + noCommentWarningRanges
		errorResults.fullLineWarningRanges.forEach(warning => {
			const range = warning.range;
			fullLineWarningRanges.push({
				range: convertRange(range),
				type: warning.type
			});
		})

	if(errorResults.stratificationWarningRanges)		// stratificationWarningRanges
		errorResults.stratificationWarningRanges.forEach(range => {
			stratificationWarningRanges.push(convertRange(range));
		})

	if(errorResults.predicateHoverRanges)		// predicateHoverRanges
		errorResults.predicateHoverRanges.forEach(range => {
			predicateHoverRanges.push(convertRange(range));
		})
    
    // Dispose of the previous hover provider if it exists
    if (hoverDisposable) {
        hoverDisposable.dispose();
    }

    // Register a new hover provider
    hoverDisposable = vscode.languages.registerHoverProvider('*', {
        provideHover(document, position) {
            for (let i = 0; i < syntaxErrorObjects.length; i++) {
                if (syntaxErrorRanges[i].contains(position)) {
					return
                }
            }

			for (let i = 0; i < unsafeVariablesObjects.length; i++) {
                if (unsafeVariablesRanges[i].contains(position)) {
					return
                }
            }

			for (let i = 0; i < stratificationErrorObjects.length; i++) {
                if (stratificationErrorRanges[i].contains(position)) {
					return
                }
            }

			for (let i = 0; i < fullLineWarningObjects.length; i++) {
                if (fullLineWarningRanges[i].range.contains(position)) {
					return				
                }
            }

			for( let i = 0; i < stratificationWarningObjects.length; i++) {
				if (stratificationWarningRanges[i].contains(position)) {
					return
				}
			}

            for (let i = 0; i < predicateHoverObjects.length; i++) {
                if (predicateHoverRanges[i].contains(position)) {
                	const hoverMessage = new vscode.Hover(predicateHoverMessages[i]);
					return hoverMessage;
                }
            }            
        }
    });


	updateDiagnostics(activeEditor.document, diagnosticCollection, 
		syntaxErrorRanges, syntaxErrorMessages,
		unsafeVariablesRanges, unsafeVariablesMessages,
		stratificationErrorRanges, stratificationErrorMessages, 
		fullLineWarningRanges, fullLineWarningMessages,
		stratificationWarningRanges, stratificationWarningMessages
	);

    return hoverDisposable;
}

function updateDiagnostics(document, diagnosticCollection, syntaxErrorRanges, syntaxErrorMessages, unsafeVariablesRanges,  unsafeVariablesMessages, 
	stratificationErrorRanges, stratificationErrorMessages, fullLineWarningRanges,	fullLineWarningMessages, stratificationWarningRanges, stratificationWarningMessages) {

	const diagnostics = [];

	syntaxErrorRanges.map(range => {
		const diagnostic = new vscode.Diagnostic(
			range,
			syntaxErrorMessages[syntaxErrorRanges.indexOf(range)],
			vscode.DiagnosticSeverity.Error
		)

		diagnostic.code = 'syntax-error'

		diagnostics.push(diagnostic);
	});

	unsafeVariablesRanges.map(range => {
		const diagnostic = new vscode.Diagnostic(
			range,
			unsafeVariablesMessages[unsafeVariablesRanges.indexOf(range)],
			vscode.DiagnosticSeverity.Error
		)

		diagnostic.code = 'unsafe-variable-error'

		diagnostics.push(diagnostic);
	});

	stratificationErrorRanges.map(range => {
		const diagnostic = new vscode.Diagnostic(
			range,
			stratificationErrorMessages[stratificationErrorRanges.indexOf(range)],
			vscode.DiagnosticSeverity.Error
		)

		diagnostic.code = 'stratification-error'

		diagnostics.push(diagnostic);
	});

	fullLineWarningRanges.map(warning => {
		const diagnostic = new vscode.Diagnostic(
			warning.range,
			fullLineWarningMessages[fullLineWarningRanges.indexOf(warning)],
			vscode.DiagnosticSeverity.Warning
		);

		const lineStart = warning.range.start.line;

		const hasOrderingWarning = fullLineWarningRanges.some(w => w.range.start.line === lineStart && w.type === 'ordering');
		if( hasOrderingWarning )
			diagnostic.code = 'ordering-warning';

		diagnostics.push(diagnostic);
	});

	stratificationWarningRanges.map(range => {
		const diagnostic = new vscode.Diagnostic(
			range,
			stratificationWarningMessages[stratificationWarningRanges.indexOf(range)],
			vscode.DiagnosticSeverity.Warning
		);

		diagnostic.code = 'stratification-warning';
		
		diagnostics.push(diagnostic);
	});

	diagnosticCollection.set(document.uri, diagnostics);
}

/**
 * @param {vscode.ExtensionContext} context
 */
async function activate(context) {
	let activeEditor = vscode.window.activeTextEditor;

	let fileName = activeEditor.document.fileName;

	if(fileName.includes('.lp') || fileName.includes('.cl') || fileName.includes('.clp') 
	|| fileName.includes('.iclp') || fileName.includes('.Clp') || fileName.includes('.iClp')
	|| fileName.includes('.blp') || fileName.includes('.iblp')) {

		const selector = { scheme: 'file', language: 'asp' };

		context.subscriptions.push(
			vscode.languages.registerCodeActionsProvider(
				selector,
				new CodeActionProvider(),
				{
					providedCodeActionKinds: [vscode.CodeActionKind.QuickFix]
				}
			)
		);

		context.subscriptions.push(
			vscode.commands.registerCommand('ezasp.fixOrderingErrors', fixOrderingHandler)
		);

		const diagnosticCollection = vscode.languages.createDiagnosticCollection("diagnostics");
		context.subscriptions.push(diagnosticCollection);

		let disposable = await loadThings(activeEditor, fileName, diagnosticCollection);
		context.subscriptions.push(disposable);

		vscode.workspace.onDidChangeTextDocument(() => {
			(async () => {
				disposable.dispose(); 
				activeEditor.setDecorations(underlineRed, []);
				activeEditor.setDecorations(underlineYellow, []);
		
				disposable = await loadThings(activeEditor, fileName, diagnosticCollection); 
				context.subscriptions.push(disposable); 
			})().catch(err => console.error(err));
		});

		vscode.window.onDidChangeActiveTextEditor(editor => {
			(async () => {
				if (!editor) {
					// No editor open, VS Code just lost focus or all tabs closed
					console.warn('No active editor');
					return;
				}
				fileName = editor.document.fileName;
		
				if (fileName.includes('.lp') || fileName.includes('.cl') || fileName.includes('.clp') ||
					fileName.includes('.iclp') || fileName.includes('.Clp') || fileName.includes('.iClp') ||
					fileName.includes('.blp') || fileName.includes('.iblp')) {
					
					activeEditor = editor;
					disposable.dispose();
					activeEditor.setDecorations(underlineRed, []);
					activeEditor.setDecorations(underlineYellow, []);
		
					disposable = await loadThings(activeEditor, fileName, diagnosticCollection);
					context.subscriptions.push(disposable);
				}
			})().catch(err => console.error(err));
		});
	}

	const initClingoConfig = vscode.commands.registerCommand('createConfig', function () {

		const sampleConfig = readFileSync(`${context.asAbsolutePath("")}/src/sampleConfig.json`);
		// @ts-ignore
		writeFileSync(`${dirname(vscode.window.activeTextEditor.document.fileName)}/config.json`, sampleConfig);
	});

	context.subscriptions.push(initClingoConfig);

	vscode.window.showInformationMessage('EZASP Extension is now active!');
}

function deactivate() { }

class CodeActionProvider {
  // @ts-ignore
  provideCodeActions(document, range, context) {
    const actions = [];

    for (const diagnostic of context.diagnostics) {
      if (diagnostic.code === 'ordering-warning') {
        const fix = new vscode.CodeAction(
          'Fix order',
          vscode.CodeActionKind.QuickFix
        );

        fix.command = {
          title: 'Fix order',
          command: 'ezasp.fixOrderingErrors',
          arguments: [document]
        };

        fix.diagnostics = [diagnostic];
        fix.isPreferred = true;

        actions.push(fix);
      }
    }

    return actions;
  }
}

function fixOrderingHandler(document) {
	if(hasUnclosedComment) {
		vscode.window.showErrorMessage('Detected an Unclosed Block Comment in the program. Please fix this issue before reorganizing the order of the constructs.')
	} else {

		const lines = document.getText().split(/\r?\n/);

		const expandedRanges = [];

		// Step 1: Extend Downwards
		for (const construct of constructTypes) {
			let { lineStart, lineEnd, indexStart, indexEnd, type } = construct;
			let endLine = lineEnd - 1;
			let endIndex = indexEnd + 1;

			let i = endLine;
			let j = endIndex;

			let line = lines[i];
			let rest = line.slice(j);

			

			while (true) {
				let restTrimmed = rest.trimStart();
				if (restTrimmed.startsWith('%*')) {
					// Block comment
					let blockLine = i;
					let blockIndex = line.indexOf('%*', j) + 2;
					let foundEnd = false;
					while (blockLine < lines.length) {
						let blockEndIdx = lines[blockLine].indexOf('*%', blockIndex);
						if (blockEndIdx !== -1) {
							i = blockLine;
							j = blockEndIdx + 2;
							line = lines[i];
							rest = line.slice(j);
							foundEnd = true;
							break;
						}
						blockLine++;
						blockIndex = 0;
					}

					// If the closing token is found AFTER the construct's line, don't search for any other comments
					if(i > endLine)
						break;
			
					if (!foundEnd) {
						// Shouldn't happen but check anyways
						console.error('Unclosed block comment detected.');
						break;
					}  
				} else if (restTrimmed.startsWith('%') || restTrimmed === '') {
					// Line comment or empty line
					j = line.length;
					rest = '';
					break;
				} else {
					// There's another statement or code after the dot
					break;
				}
			}

			expandedRanges.push({
				type,
				lineStart,
				lineEnd: i + 1,
				indexStart,
				indexEnd: j
			});
		}

		// Step 2: Extend Upwards
		const finalRanges = [];

		for (let k = 0; k < expandedRanges.length; k++) {
			const curr = expandedRanges[k];
			const prev = expandedRanges[k - 1];

			// Initial start point: either beginning of file or end of previous construct
			let scanLine = (k === 0) ? 0 : prev.lineEnd - 1;
			let scanIndex = (k === 0) ? 0 : prev.indexEnd;

			let adjustedLine = curr.lineStart - 1;
			let adjustedIndex = curr.indexStart;

			while (scanLine < curr.lineStart - 1 || (scanLine === curr.lineStart - 1 && scanIndex < curr.indexStart)) {
				const line = lines[scanLine];
				const rest = line.slice(scanIndex).trim();

				if (rest.startsWith('%') || rest.startsWith('%*')) {
					// Found a comment — adjust current construct to begin here
					adjustedLine = scanLine;
					adjustedIndex = scanIndex;
					break;
				}

				if (rest !== '') {
					break;
				}

				scanLine++;
				scanIndex = 0;
			}

			finalRanges.push({
				type: curr.type,
				lineStart: adjustedLine + 1,
				lineEnd: curr.lineEnd,
				indexStart: adjustedIndex,
				indexEnd: curr.indexEnd
			});
		}

		// Step 3: Reorganize constructs by type
		const ezaspOrder = [
			'Constant',
			'Fact',
			'ChoiceRule',
			'DefiniteRule',
			'Constraint',
			'Optimization',
			'Show'
		];

		const constructsByType = {};
		for (const type of ezaspOrder) constructsByType[type] = [];
		for (let i = 0; i < finalRanges.length; i++) {
			const { type, lineStart, lineEnd, indexStart, indexEnd } = finalRanges[i];
			constructsByType[type]?.push({ lineStart, lineEnd, indexStart, indexEnd });
		}

		// Step 4: Reorder constructs in critical sections (Facts, Choice Rules and Definite Rules)
		// These sections can define and use predicates, so it is possible to minimize stratification warnings by reordering them inside their own section
		// All other sections (Constants, Constraints, etc.) do not need to be reordered, given that their intra-section order will never 
		// cause stratification warnings (as they never define and use predicates simultaneously)

		const reorderedFacts = reorderSection(constructsByType['Fact']);

		const reorderedChoiceRules = reorderSection(constructsByType['ChoiceRule']);

		const reorderedDefiniteRules = reorderSection(constructsByType['DefiniteRule']);
		
		if(reorderedFacts.hasCycle) {
			vscode.window.showWarningMessage('Dependency cycle detected in Facts section. As a result, stratification warnings cannot be solved automatically in this section.');
		} 
		
		constructsByType['Fact'] = reorderedFacts.sorted;
		
		if(reorderedChoiceRules.hasCycle) {
			vscode.window.showWarningMessage('Dependency cycle detected in Choice Rules section. As a result, stratification warnings cannot be solved automatically in this section.');
		} 
		
		constructsByType['ChoiceRule'] = reorderedChoiceRules.sorted;

		if(reorderedDefiniteRules.hasCycle) {
			vscode.window.showWarningMessage('Dependency cycle detected in Definite Rules section. As a result, stratification warnings cannot be solved automatically in this section.');
		}
		
		constructsByType['DefiniteRule'] = reorderedDefiniteRules.sorted;

		// Step 5: Rewrite the code in the editor with the new ordering
		let result = [];

		for (const type of ezaspOrder) {
			for (const { lineStart, lineEnd, indexStart, indexEnd } of constructsByType[type]) {
				if (lineStart === lineEnd) {
					// Single-line construct
					result.push(lines[lineStart - 1].slice(indexStart, indexEnd));
				} else {
					// Multi-line construct
					let constructLines = [];
					constructLines.push(lines[lineStart - 1].slice(indexStart));
					for (let l = lineStart; l < lineEnd - 1; l++) {
						constructLines.push(lines[l]);
					}
					constructLines.push(lines[lineEnd - 1].slice(0, indexEnd));
					result.push(constructLines.join('\n'));
				}
			}
		}

		const finalText = result.join('\n\n');

		// Apply it back to the document
		const edit = new vscode.WorkspaceEdit();
		const fullRange = new vscode.Range(
			document.positionAt(0),
			document.positionAt(document.getText().length)
		);
		edit.replace(document.uri, fullRange, finalText);

		vscode.workspace.applyEdit(edit);
	}
}

function isRangeWithinConstruct(range, construct) {
	const startsAfterOrAt =
		range.lineStart > construct.lineStart ||
		(range.lineStart === construct.lineStart && range.indexStart >= construct.indexStart);

	const endsBeforeOrAt =
		range.lineEnd < construct.lineEnd ||
		(range.lineEnd === construct.lineEnd && range.indexEnd <= construct.indexEnd);

	return startsAfterOrAt && endsBeforeOrAt;
}



// This function will reorder the constructs inside a section to minimize stratification warnings
function reorderSection(constructs) {
	// Add two sets that will track the predicates that each construct defines and uses - this helps to build the dependency graph
	for(const construct of constructs) {
		construct.defines = new Set();
		construct.uses = new Set();

		for(const [predName, ranges] of definedPredicates.entries()) {
			for(const range of ranges) {
				if (isRangeWithinConstruct(range, construct)) {
					construct.defines.add(predName);
				}
			}
		}

		for(const [predName, ranges] of usedPredicates.entries()) {
			for(const range of ranges) {
				if (isRangeWithinConstruct(range, construct)) {
					construct.uses.add(predName);
				}
			}
		}
	}

	const dependencyGraph = buildDependencyGraph(constructs);

	const sortResult = topologicalSort(dependencyGraph);

	return sortResult;
}

function buildDependencyGraph(constructs) {
	const graph = new Map(); // construct -> Set of dependent constructs
	const predIsDefinedBy = new Map();

	// Map predicates to defining constructs
	for (const construct of constructs) {
		for (const pred of construct.defines) {
			if (!predIsDefinedBy.has(pred)) predIsDefinedBy.set(pred, []);
			predIsDefinedBy.get(pred).push(construct);
		}
	}

	// Build edges based on uses
	for (const construct of constructs) {
		graph.set(construct, new Set());

		for (const pred of construct.uses) {
			const definers = predIsDefinedBy.get(pred) || [];
			for (const def of definers) {
				if (def !== construct) {
					graph.get(construct).add(def);
				}
			}
		}
	}

	return graph;
}

function topologicalSort(graph) {
	const visited = new Set();
	const visiting = new Set();
	const result = [];
	let hasCycle = false;

	function dfs(node) {
		if (visited.has(node)) return;
		if (visiting.has(node)) {
			hasCycle = true;
			return;
		}

		visiting.add(node);
		for (const neighbor of graph.get(node) || []) {
			dfs(neighbor);
		}
		visiting.delete(node);
		visited.add(node);
		result.push(node);
	}

	for (const node of graph.keys()) {
		if (!visited.has(node)) dfs(node);
	}

	return { sorted: result, hasCycle };
}
	


module.exports = { activate, deactivate };
