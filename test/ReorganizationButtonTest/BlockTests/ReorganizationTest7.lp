% Testing reorganized comments


#program test1.

% This comment should stay in place (in the start of the program)
% This line has to be reordered.
:- test. % Does these comments go with the line?

% This comment should stay close to test().
test().

test2(). %* And this 
too *%

test3(). % Same here

:- test2.