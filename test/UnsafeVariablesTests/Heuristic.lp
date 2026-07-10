#heuristic q(X). [1,sign]                    % SAFE   - atom's own predicate provides fallback domain
#heuristic q() : r(). [1,X]                  % UNSAFE - atom has no vars, X only in bracket, nothing binds it
#heuristic q() : r(X). [1,X]                 % SAFE   - X positive in condition
#heuristic q() : not r(X). [1,X]             % UNSAFE - only negated, never binds
#heuristic q(). [1,q(X)]                     % UNSAFE - your example; nothing binds X anywhere
#heuristic q(). [q(X)@2,sign]                % UNSAFE - same issue, priority slot
#heuristic q(). [q(X),sign]                  % UNSAFE - same issue, weight slot
#heuristic q(X) : q(X). [1,q(X)]             % SAFE   - X already bound via the condition
#heuristic q(X). [1,X]                       % SAFE   - X already bound via the atom's own fallback
#heuristic q(X) : Y = X+1. [1,Y]             % SAFE   - Y bound via assignment from bound X, then used in bracket
