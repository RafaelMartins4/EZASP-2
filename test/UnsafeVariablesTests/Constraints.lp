% Testing Variable Safety on Constraints.

:- q(X).   % Safe

:- q(X), X > 2.    % Safe

:- X == 3.      % Safe     

:- #count{Y : q(Y)} > X.   % X unsafe

:- q().    % Safe

:- not r(X).   % X unsafe

:- X > 2.  % X unsafe

:- #count{X : q(X)} > Y.   % Y unsafe

:- Y = 2, X = Y.   % Safe

:- Y != 2, X = Y.   % X,Y unsafe

:- Y != 2, X == Y.   % X,Y unsafe

:- Y == 2, X != Y.   % X unsafe

:- { q(Y) }.   % Safe

:- #count{Y : r()} > 1.   % Y unsafe

:- #count{Y : r()} > Y.   % Y unsafe

:- #count{Y : r()} > X.   % X,Y unsafe

:- #count{Y : r()} == Y.   % Y unsafe

:- #count{X,Y,Z : q()} == q(Y).  % X, Y, Z unsafe

:- not #count{X,Y,Z : q()} == q(Y).  % X, Y, Z unsafe

:- q(X), X != Y.  % Y unsafe

:- _ == 1.   % Safe

:- _ != 1.   % Anon0 unsafe 

:- _ != 1, _ == 2.  % Anon0 unsafe

:- _ != 1, _ != 2.   % Anon0, Anon1 unsafe

% Conditionals

:- avail(Y) : person(Y). % SAFE
:- not avail(Y) : person(Y). % SAFE
:- q(X), avail(Y) : person(Y). % SAFE
:- avail(X) : person(X), q(X). % SAFE
:- avail(Y) : person(Y); q(X). % SAFE
:- p(X) : q(X); r(X) : s(X). % SAFE
:- p(X) : q(Y). % SAFE
:- p(Y) : q(X), r(X). % SAFE
:- not p(Y) : q(X), r(X). % UNSAFE: Y
:- not p(Y) : q(X), not r(X). % UNSAFE: Y
:- not p(Y) : not q(X), not r(X). % UNSAFE: X, Y