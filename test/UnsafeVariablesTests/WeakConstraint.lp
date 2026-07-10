:~ . [X]    % X unsafe

:~ q(X). [X]    % Safe

:~ q(X). [X,Y,Z]    % Y, Z unsafe

:~ q(X), Y == 1. [X,Y,Z]  % Z unsafe

:~ q(X), Y == X. [X,Y,Z]  % Z unsafe

:~ q(X), Y == X, Z == Y. [X,Y,Z]  % Safe

:~ q(X), #count{X,Y,Z}. [X]  % Safe

:~ q(X), #count{X,Y,Z} > 1. [X]  % Y, Z unsafe

:~ q(X), #count{X,Y,Z} > q(D). [X]  % Y, Z, D unsafe

:~ q(X), #count{X,Y,Z : q(Y), q(Z)} > q(D). [X]  % D unsafe

:~ q(X), #count{X,Y,Z : q(Y), q(Z), D == 1} > q(D). [X]  % D unsafe

:~ q(X), #count{X,Y,Z : q(Y), q(Z), D == 1} > q(D). [X,D]  % D unsafe

:~ q(X), Y == X, Z == Y, #count{X,Y,Z : q(Y), q(Z), D == 1} > q(D). [X]  % D unsafe

% Conditionals

:~ p(X). [X@1] % SAFE
:~ avail(Y) : person(Y). [1@1] % SAFE
:~ avail(Y) : person(Y). [Y@1] % UNSAFE: Y
:~ q(X), avail(Y) : person(Y). [X@1] % SAFE
:~ q(X), avail(Y) : person(Y). [Y@1] % UNSAFE: Y
:~ p(X) : q(X). [X@1] % UNSAFE: X
:~ p(X), q(X) : r(X). [X@1] % SAFE
:~ p(a). [X@1] % UNSAFE: X
:~ not p(X). [1@1] % UNSAFE: X
:~ p(X). [1@X] % SAFE
:~ p(X), q(Y). [X@1,Y] % SAFE