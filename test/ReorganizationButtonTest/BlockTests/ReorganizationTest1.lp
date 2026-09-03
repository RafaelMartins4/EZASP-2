% Testing Reorganization button within blocks: In this case, it should fully reorganize the code in the first block without having any ordering or stratification warnings in the end

#program reorganizationTest1.

% Fact base
base(1).
base(2).

{} :- test.

% Rule chain
p1(X) :- base(X).
p2(X) :- p1(X), base(X).
p3(X) :- p2(X).

% Reorganized base(3)
base(3). 

#program reorganizationTest2.

test1 :- test2.

:- test.

base(1).