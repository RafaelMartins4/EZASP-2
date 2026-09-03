% Testing Reorganization button: verifying if the comments are correctly assigned to each predicate

% Base 1
base(1).
% Base 2
base(2). % Further comment on base 2


% This should appear before the p3 rule

% And so should this

%* Any comment before a rule
should appear
before that exact 
rule after reorganization
*%

p3(X) :- p2(X).

p1(X) :- base(X). %* Block comment on
p1
rule
*%

p2(X) :- p1(X).


t1(X) :- t2(X).
t2(X) :- t3(X).
t3(X) :- p1(X).

base(3).

#program test1.

% Base 1
base(1).
% Base 2
base(2). % Further comment on base 2


% This should appear before the p3 rule

% And so should this

%* Any comment before a rule
should appear
before that exact 
rule after reorganization
*%

p3(X) :- p2(X).

p1(X) :- base(X). %* Block comment on
p1
rule
*%

p2(X) :- p1(X).


t1(X) :- t2(X).
t2(X) :- t3(X).
t3(X) :- p1(X).

base(3).