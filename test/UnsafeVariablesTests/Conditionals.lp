% ============================================================
% HEAD AGGREGATE ELEMENTS — flat form (aggregate_literal)
% ============================================================
#count{X,a : q(X)} >= 1 :- p().              % UNSAFE - flat L0, no fallback in head
#count{X,a : q()} >= 1 :- p().               % UNSAFE - X not bound anywhere
#count{X,a : not q(X)} >= 1 :- p().          % UNSAFE - flat L0, negated, no fallback
#count{X,a : X > 1} >= 1 :- p().             % UNSAFE - comparison never binds, no fallback either
#count{X,a : q() : q(X)} >= 1 :- p().        % SAFE   - X in explicit condition, positive
#count{X,a : q() : not q(X)} >= 1 :- p().    % UNSAFE - X in condition, only negated
#count{X,a : q(X) : r()} >= 1 :- p().        % UNSAFE - X in nested L0, absent from condition
#count{X,a : q(X) : r(X)} >= 1 :- p().       % SAFE   - X in nested L0 AND condition, positive
#count{a,b : q() : q(Y)} >= 1 :- p().        % SAFE   - Y only in condition, positive (element-local)
#count{a,b : q(Y) : r()} >= 1 :- p().        % UNSAFE - Y only in nested L0, absent from condition
#count{X,a : q() : X > 1} >= 1 :- p().       % UNSAFE - comparison alone in condition never binds
#count{X,a : q(X) : r()} >= 1 :- s(X).       % SAFE   - X global via bare s(X) in body
#count{X,a : q(X)} >= 1 :- s(X).             % SAFE   - even the flat form is rescued by globality
p(X) :- s(X), #count{Y,a : q(Y)} >= 1.       % SAFE   - X (outside aggregate) global via s(X); Y is separate/local

% ============================================================
% BODY AGGREGATE ELEMENTS 
% ============================================================
p() :- #count{X,a : q(X)} >= 1.              % SAFE   - body flat form DOES get the fallback
p() :- #count{X,a : not q(X)} >= 1.          % UNSAFE - negation still never binds
