% --- Basic cases ---
#external q(X) : r(X).                    % SAFE   - X positive in condition
#external q(X) : not r(X).                % UNSAFE - X only negated
#external q(X) : r().                     % UNSAFE - X absent from condition, no fallback (head-like)
#external q() : r(X).                     % SAFE   - X only in condition, positive
#external q(X).                           % UNSAFE - no condition at all, X unbound

% --- Multiple variables / partial binding ---
#external q(X,Y) : r(X).                  % UNSAFE - Y never touched
#external q(X,Y) : r(X), s(Y).            % SAFE   - both bound
#external q(X,Y) : r(X,Y).                % SAFE   - both bound by one literal

% --- Built-ins / comparisons ---
#external q(X) : X > 1.                   % UNSAFE - comparison never binds
#external q(X) : r(X), X > 1.             % SAFE   - r(X) binds, comparison filters
#external q(Y) : r(X), Y = X+1.           % SAFE   - assignment from bound X
#external q(Y) : Y = X+1.                 % UNSAFE - neither var ever bound

% --- Aggregates / choice / nested conditionals in the condition ---
#external q(X) : { r(X) } >= 1.           % UNSAFE - aggregate never exports its bound X
#external q(X) : { r(X) }.                % UNSAFE - choice construct, same reason
#external q(X) : r(X) : s(X).             % UNSAFE - nested conditional literal, same reason
#external q(X) : { r(X) } >= 1, s(X).     % SAFE   - s(X) binds independently of the (dead) aggregate

% --- Multiple conditions, mixed polarity ---
#external q(X) : r(X), not s(X).          % SAFE

#external p(X) : p(X), q(X) : r().        % SAFE
#external p() : q(X) : r(X).              % SAFE 
#external p() : q(X) : not r(X).          % X UNSAFE
#external p() : q(X) : r().               % SAFE
#external p() : not q(X) : r().           % X UNSAFE
#external p() : q() : r(X).               % SAFE
#external q(X) : r(X) : p().              % X UNSAFE
#external q(X) : not r(X) : p().          % X UNSAFE
#external q(X) : r() : p().               % X UNSAFE
#external q() : r(X) : p().               % SAFE
#external p() : q() : X > 1.              % X UNSAFE
#external p() : q() : r(X), X > 1.        % SAFE
#external p() : q() : r(X), Y = X+1, s(Y).% SAFE
#external p() : q() : Y = X+1.            % Clingo 6.0 seems to have changed how these cases are handled (changed how builtIn atoms ground variables)
#external p() : X > 1 : q(X).
#external p() : X > 1 : q().              % X UNSAFE
#external q(X) : X > 1 : p().             % X UNSAFE
#external q(X) : r(X), X > 1 : p().
#external q(Y) : r(X), Y = X+1 : p().     % Y UNSAFE





