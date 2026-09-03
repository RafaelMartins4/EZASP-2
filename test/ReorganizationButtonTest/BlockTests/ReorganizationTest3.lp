% Fact base
base(1).
base(2).

test1.
test2.
test3.

:- test2.
:- test3.

% Rule chain
p1(X) :- base(X).

p2(X) :- p1(X), base(X).
p3(X) :- p2(X).
p4(X) :- p2(X), p3(X). 
p13(X) :- p11(X), p12(X). %* block comment *% 
p14(X) :- p12(X), p13(X). %* another test *% % what  
p15(X) :- p13(X), p14(X). % testing 
p5(X) :- p3(X), p4(X).
p6(X) :- p4(X), p5(X).
p7(X) :- p5(X), p6(X).
p8(X) :- p6(X), p7(X).
p9(X) :- p7(X), p8(X). %* testing multi line comment *% % test


p10(X) :- p8(X), p9(X).
p11(X) :- p9(X), p10(X).
p12(X) :- p10(X), p11(X).

:- test1.

base(3).


#program test1.

% Fact base
base(1).
base(2).

test1.
test2.
test3.

:- test2.
:- test3.

% Rule chain
p1(X) :- base(X).

p2(X) :- p1(X), base(X).
p3(X) :- p2(X).
p4(X) :- p2(X), p3(X). 
p13(X) :- p11(X), p12(X). %* block comment *% 
p14(X) :- p12(X), p13(X). %* another test *% % what  
p15(X) :- p13(X), p14(X). % testing 
p5(X) :- p3(X), p4(X).
p6(X) :- p4(X), p5(X).
p7(X) :- p5(X), p6(X).
p8(X) :- p6(X), p7(X).
p9(X) :- p7(X), p8(X). %* testing multi line comment *% % test


p10(X) :- p8(X), p9(X).
p11(X) :- p9(X), p10(X).
p12(X) :- p10(X), p11(X).

:- test1.

base(3).
