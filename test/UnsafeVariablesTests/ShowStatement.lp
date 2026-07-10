#show. % Safe

#show q/1.  % Safe

#show X : q.  % X unsafe

#show X : q(X).  % Safe

#show X : not q(X).  % X unsafe

#show X : not q(X), q(Y).  % X unsafe

#show X : not q(X), not q(Y).  % X, Y unsafe

#show X : q(X), not q(Y).  % Y unsafe

#show D/1.  % D unsafe

#show X.    % X unsafe

#show X : q(X), not q(Y), X == Y, #count{}.  % Safe

% Conditionals

#show X : p(X). % SAFE
#show X : p(Y). % UNSAFE: X
#show f(X) : p(X). % SAFE
#show f(X,Y) : p(X). % UNSAFE: Y
#show X : not p(X). % UNSAFE: X
#show X : p(X), q(X). % SAFE
#show 1 : p(a). % SAFE
#show X+1 : p(X). % SAFE
#show f(X) : p(X+1). % SAFE
#show f(X) : p(X+X). % SAFE
#show X : p(Y), q(X,Y). % SAFE
