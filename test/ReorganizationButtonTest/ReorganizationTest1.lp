% Testing Reorganization button: In this case, it should fully reorganize the code without having any ordering or stratification warnings in the end

% Fact base
base(1).
base(2).

{} :- test.

% Reorganized base(3)
base(3).

% Rule chain
p1(X) :- base(X).
p2(X) :- p1(X), base(X).
p3(X) :- p2(X).

