grammar ASP;

program: (statement | line_comment | block_comment | unclosed_comment)* EOF;

statement: defined | external | heuristic | program_statement | constant | fact | choice_rule | definite_rule | constraint | optimization | weak_constraint | show;

defined:
       '#defined' CONSTANT '/' NUMBER DOT;

external: 
       '#external' classical_atom (':' body)? DOT;

heuristic: 
       '#heuristic' classical_atom (':' body)? DOT '[' termOrInterval ('@' termOrInterval)? ',' termOrInterval EOWC;

program_statement: 
       '#program' program_name ( '(' (CONSTANT (',' CONSTANT)*)? ')' )? DOT;

program_name: CONSTANT;

constant: 
       '#const' CONSTANT '=' (constant_term | interval) DOT;

// Types of Rules: Facts, Choice Rules, Definite Rules, Integrity Constraints
fact: 
       (head | choice) DOT;

choice_rule:
       choice ':-' body DOT;

choice: (termOrInterval | comparatorTerm1 )? '{' (choice_element (';' choice_element)*)? '}' (comparatorTerm2 | termOrInterval)?;

comparatorTerm1: termOrInterval (COMPARATOR | EQ | EQEQ);  // Used to be able to differentiate between both comparators used in choices. Useful for unsafe variable detection
comparatorTerm2: (COMPARATOR | EQ | EQEQ) termOrInterval;

choice_element: choiceHead_atoms (':' (choiceBody_atoms (',' choiceBody_atoms)* )? )?;

choiceHead_atoms: literal | (NOT? NOT? builtIn_atom);  // Used exclusively to separate the atoms before and after the colon. Useful for stratification errors
choiceBody_atoms: literal | (NOT? NOT? builtIn_atom);

definite_rule:
       head ':-' body DOT;

constraint: 
       ':-' body DOT;

head: 
       (head_atoms ((';' | ',') head_atoms)*) | aggregate_atom_head;
body: 
       (body_atoms ((';' | ',') body_atoms)*)?;

head_atoms: conditional | literal | NOT? NOT? builtIn_atom;

body_atoms: conditional | literal | NOT? NOT? builtIn_atom | NOT? NOT? aggregate_atom_body | NOT? NOT? choice;

// Optimization statements
optimization: 
       '#minimize' '{' (aggregate_element_optimization (';' aggregate_element_optimization)*)? '}' DOT
       | '#maximize' '{' (aggregate_element_optimization (';' aggregate_element_optimization)*)? '}' DOT;

// Weak Constraint
weak_constraint: 
       ':~' body '.' '[' (((termOrInterval '@' termOrInterval) (',' termOrInterval)*) | (termOrInterval (',' termOrInterval)*)) EOWC;

show:
       (show_atoms DOT)
       | (show_terms DOT)
       | (show_nothing DOT);

show_atoms: '#show' CONSTANT '/' NUMBER;
show_terms: '#show' termOrInterval (':' body)?;
show_nothing: '#show';

// Comments (line, block and unclosed)
block_comment: BLOCK_COMMENT;
unclosed_comment: UNCLOSED_COMMENT;
line_comment: LINE_COMMENT;

conditional: head_condition_atom ':' body_condition_atom (',' body_condition_atom)*;
head_condition_atom: literal | (NOT? NOT? builtIn_atom);  // Used exclusively to separate the atoms before and after the colon. Useful for stratification errors
body_condition_atom: literal | (NOT? NOT? builtIn_atom);

literal: NOT? NOT? classical_atom;
classical_atom: CLASSICAL_NEGATION? atom;
atom: CONSTANT ('(' (generalTerm (',' generalTerm)*)? ')')?;

builtIn_atom: termOrInterval (COMPARATOR | EQ | EQEQ) termOrInterval;

aggregate_atom_head:
       AGGREGATE_FUNCTION '{' (aggregate_element_head (';' aggregate_element_head)*)? '}' (COMPARATOR | EQ | EQEQ) termOrInterval
       | AGGREGATE_FUNCTION '{' (aggregate_element_head (';' aggregate_element_head)*)? '}'
       | termOrInterval (COMPARATOR | EQ | EQEQ) AGGREGATE_FUNCTION '{' (aggregate_element_head (';' aggregate_element_head)*)? '}'
       | AGGREGATE_FUNCTION '{' (aggregate_element_head (';' aggregate_element_head)*)? '}';


aggregate_element_head: generalTerm (',' generalTerm)* ':' (aggregate_literal | conditional);   // Separating aggregate elements because clingo accepts slightly different aggregates depending if it's placed on head or body

aggregate_atom_body: 
       AGGREGATE_FUNCTION '{' (aggregate_element_body (';' aggregate_element_body)*)? '}' (COMPARATOR | EQ | EQEQ) termOrInterval
       | AGGREGATE_FUNCTION '{' (aggregate_element_body (';' aggregate_element_body)*)? '}'
       | termOrInterval (COMPARATOR | EQ | EQEQ) AGGREGATE_FUNCTION '{' (aggregate_element_body (';' aggregate_element_body)*)? '}'
       | AGGREGATE_FUNCTION '{' (aggregate_element_body (';' aggregate_element_body)*)? '}' ;


aggregate_element_body: (generalTerm (',' generalTerm)*)? (':' (aggregate_literal (',' aggregate_literal)*)?)?;

aggregate_element_optimization: ( ((termOrInterval '@' termOrInterval) (',' termOrInterval)*) | (termOrInterval (',' termOrInterval)*) ) (':' (aggregate_literal (',' aggregate_literal)*)?)?;

aggregate_literal: literal | NOT? NOT? builtIn_atom;

// Terms
generalTerm: termOrInterval (';' termOrInterval)*;

termOrInterval: term | interval;

term: ('|' additiveTerm '|') | additiveTerm;

additiveTerm: CLASSICAL_NEGATION? multiplicativeTerm ((ADDITION | CLASSICAL_NEGATION | OR | EXCLUSIVE_OR) multiplicativeTerm)*;

multiplicativeTerm: powerTerm ((MULTIPLICATION| DIVISION | MODULO | AND) powerTerm)*;

powerTerm: unaryTerm (EXPONENTIATION unaryTerm)*;

unaryTerm: simpleTerm | functionTerm | tuple | '(' generalTerm ')';
simpleTerm: integer | CONSTANT | STRING | VARIABLE | UNDERSCORE | SUP | INF;
functionTerm: CONSTANT ('(' (generalTerm (',' generalTerm)*)? ')')?;
tuple: '(' generalTerm ',' generalTerm (',' generalTerm)* ')';

// Constant rules utilize slightly different terms
constant_term: constant_additiveTerm;

constant_additiveTerm: constant_multiplicativeTerm ((ADDITION | CLASSICAL_NEGATION | OR | EXCLUSIVE_OR) constant_multiplicativeTerm)*;

constant_multiplicativeTerm: constant_powerTerm ((MULTIPLICATION | DIVISION | MODULO | AND) constant_powerTerm)*;

constant_powerTerm: constant_unaryTerm (EXPONENTIATION constant_unaryTerm)*;

constant_unaryTerm: integer | CONSTANT | STRING | SUP | INF | constant_functionTerm | constant_tuple | '(' constant_term ')';
constant_functionTerm: CONSTANT '(' (constant_term (',' constant_term)*)? ')';
constant_tuple: '(' (constant_term (',' constant_term)* )? ')';

integer: NUMBER;

interval: term DOTDOT term;

// Tokens
NOT: 'not';                      // ensures that 'not' is treated as a standalone word
BLOCK_COMMENT : '%*' .*? '*%';
UNCLOSED_COMMENT : '%*' ~[*]* ('*' ~[%])* EOF;
LINE_COMMENT: '%' ~[*\r\n] ~[\r\n]* [\r\n]?;
DOTDOT: '..';
DOT: '.';
EOWC: ']';           // End of weak constraint and heuristic
CONSTANT: (UNDERSCORE)*[a-z][a-zA-Z0-9_]*;
VARIABLE: (UNDERSCORE)*[A-Z][a-zA-Z0-9_]*; 
UNDERSCORE: '_';
SUP: '#sup';
INF: '#inf';
NUMBER: ('0' | [1-9][0-9]*);
STRING: '"' (~('"' | '\n' | '\r'))* '"';
EQ: '=';      // we separated both equality signs from the rest of the comparators to ensure that the program accepts both types of equality
EQEQ: '==';   // without this separation there seemed to be some ambiguity and the parser could not decide between accepting the '=' operator or looking ahead in hopes of finding a '==' operator.
COMPARATOR: '<' | '<=' | '!=' | '>=' | '>';
AGGREGATE_FUNCTION: '#count' | '#sum' | '#max' | '#min';
CLASSICAL_NEGATION: '-';
ADDITION: '+';
OR: '?';
EXCLUSIVE_OR: '^';
MULTIPLICATION: '*';
DIVISION: '/';
MODULO: '\\';
AND: '&';
EXPONENTIATION: '**';
EXTERNAL_FUNCTION: '@' [a-zA-Z_][a-zA-Z_0-9]* '(' .*? ')' -> skip;
SCRIPT: '#script' .*? '#end.' -> skip;
// PROGRAM_STATEMENT: '#program' ~[.]* '.' -> skip;
WS: [ \t\r\n]+ -> skip;