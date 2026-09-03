% Testing Reorganization button with unclosed comment: should throw an error message and not reorganize the code

% Fact base
base(1).
base(2).

test1.
test2.
test3.

:- test2.
:- test3.

% Rule chain
p1(X) :- base(X).

p2(X) :- p1(X), base(X).
p3(X) :- p2(X).
p4(X) :- p2(X), p3(X). 

%* test

:- test1.

base(3).