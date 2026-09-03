% Testing Reorganization button with stratification errors: should still be able to automatically reorganize the code without issues

% Fact base
base(1).
base(2).
p9(X) :- p7(X), p8(X). 

%* testing 
%* multi line comment *%
p10(X) :- p8(X), p9(X).
base(3).

#program test1.

% Fact base
base(1).
base(2).
p9(X) :- p7(X), p8(X). 

%* testing 
%* multi line comment *%
p10(X) :- p8(X), p9(X).
base(3).