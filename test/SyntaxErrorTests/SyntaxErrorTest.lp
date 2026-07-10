% Testing different kinds of syntax errors.

% Missing '.'
#const a = 2    % This error will extend past the rule

% Invalid use of construct in a position not allowed by the grammar
#const a = X.

#const X = 1.

% Missing '.'
p()   % This error will extend past the rule

% Missing parenthesis
p(.   

% Missing closing brackets
1{ :- a().

% Stray comma
a :- , b.   

% Dangling '+'
a :- b + .

% Dangling comparator
a :- q(X) ==. 

% Atoms can't start with a digit
1abc.

% Predicate names cannot start with uppercase letters
A() :- b.   

% `not` without atom
not.      

% Same but inside a constraint
:- not.  

% Malformed Show Statement
#show a/..  

% "not" isn't valid before a heuristic atom
#heuristic not q(X). [1,sign]               





