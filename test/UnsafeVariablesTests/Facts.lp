% Testing Variable Safety on Facts.

% ============================
% LITERALS
% ============================

q(X).                      % X unsafe

not q(X).                  % X unsafe

-q(X).                     % X unsafe

q((X,Y)).                  % X,Y unsafe

q(_).   % Anon0 unsafe

% ============================
% BUILT-IN COMPARISONS
% ============================

X > 2.                     % X unsafe
X < 2.                     % X unsafe
X == 2.                    % X unsafe
X != 2.                    % Safe

% Comparisons with NOT
not X > 2.                 % X unsafe
not X == 2.                % Safe
not X != 2.                % X unsafe

% Comparisons between variables
X > Y.                     % X,Y unsafe
X == Y.                    % X,Y unsafe
X != Y.                    % X,Y unsafe

% Nested terms
X == f(Y).                 % X,Y unsafe (both sides are vars)
X != f(2).                 % Safe
X != f(Y).                 % X,Y unsafe


% ============================
% AGGREGATE FACTS
% ============================

% Aggregates with ungrounded variable
#sum { X : q(X) }.          % X unsafe
#count { X : q(X) }.        % X unsafe

% Aggregate grounded by built-in comparison
#sum { X : X == 2 }.        % safe
#count { X : X != 3 }.      % X unsafe

% Aggregate with only constants
#sum { 2 : q(a) }.          % safe


% ============================
% CHOICE FACTS
% ============================

% Choice with ungrounded variable
{ q(X) }.                  % X unsafe

% Choice with multiple heads — unsafe
{ q(X); t(X) : y(X) }.     % X unsafe
{ q(Y); t(X) : y(X) }.     % Y unsafe

% Choice with safe grounding
{ X == 2 : X == 2 }.       % safe
{ q(X) : X != 2 }.         % X unsafe

% Multiple atoms, with grounding
{ q(X) : X == 2 }.   % safe


% ============================
% EDGE CASES
% ============================

% Constant-only atoms → safe
q(a).                      % safe
p(1).                      % safe

% Function term with constant only
f(g(1)).                   % safe

% Function term with variable → unsafe
f(g(X)).                   % X unsafe
f(g(1,Y)).                 % Y unsafe
f(g(X,Y)).                 % X,Y unsafe

% Fact with a choice that has a non positive atom on its body
{ q(X) : not y(X)}.  % X unsafe
{ q(X) : -y(X)}.     % Safe
{ q(X) : y(X)}.     % Safe

% ============================
% CONDITIONALS
% ============================

p(X) : person(X). % SAFE
p(X,Y) : person(X). % UNSAFE: Y
p : q(X). % SAFE
p(X) : not q(X). % UNSAFE: X
p(X) : not q(X), r(X). % SAFE
p(X,Y) : q(X), r(Y). % SAFE
p(X) : X > 0. % UNSAFE: X
p(X) : X = 1+1. % SAFE
p(X) : q(X+1). % SAFE
p(X) : q(X) ; s(Y) : r(Y). % SAFE
p(_) : q(a). % UNSAFE
p(X) : q(X;X). % SAFE
p : q(a). % SAFE
avail(X) : day(X). % SAFE
p(X) : q(X+X). % SAFE
p(X) : q(0*X). % UNSAFE: X
p(X) : q(2*(X+1)). % SAFE