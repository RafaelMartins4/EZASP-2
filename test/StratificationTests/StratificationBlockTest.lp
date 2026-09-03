a().

% No stratification errors, a/0 is defined.
:- a(). 

#program test().
% Testing Stratification warnings (a/1 is defined only after being used)

{q(a(X)) : a(X), q(a(X))}.
{a(X) == 1}.
{q(a(X)) : a(X), q(a(X))} :- a(X), a(X) == 1, {a(X) : a(X)}, #count{a(X) : a(X)}.
:- a(X).
#maximize {a(X) : a(X), a(X) == 1}.
:~ a(X). [a(X)]
#show a(X) : a(X).

a(1).

% Testing stratification error (a/2 is never defined)

{q(a(X,Y)) : a(X,Y), q(a(X,Y))}.
{a(X,Y) == 1}.
{q(a(X,Y)) : a(X,Y), q(a(X,Y))} :- a(X,Y), a(X,Y) == 1, {a(X,Y) : a(X,Y)}, #count{a(X,Y) : a(X,Y)}.
:- a(X,Y).
#maximize {a(X,Y) : a(X,Y), a(X,Y) == 1}.
:~ a(X,Y). [a(X,Y)]
#show a(X,Y) : a(X,Y).

#program test2().
% Testing stratification errors within another block (a/1 is defined in another block)
{q(a(X)) : a(X), q(a(X))}.
{a(X) == 1}.
{q(a(X)) : a(X), q(a(X))} :- a(X), a(X) == 1, {a(X) : a(X)}, #count{a(X) : a(X)}.
:- a(X).
#maximize {a(X) : a(X), a(X) == 1}.
:~ a(X). [a(X)]
#show a(X) : a(X).