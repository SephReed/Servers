// Example Project
// Description: Main Program

#include <iostream>

#include "Polygon.hpp"
#include "Rectangle.hpp"
#include "Triangle.h"



/**********************
*		PARSER
*	CRASH COURSE
**********************/


#include "la" //comment

this_is_a_command; alsoOne;




someReturnType32 CLASSY:doThing(type1 arg1, const int arg2) {
	doThing();
}


"this is not /* a comment";

// breif: prints out some details on a Polygon.
// @shape - does a thing
// Note that it's not passing through a particular Polygon (like Triangle or Rectangle), rather it's the parent.
void printDe/*very hard*/tai/*test*/ls(Polygon* shape) {
	std::cout << "Height: " << shape->getHeight();
	std::cout << ", Width: " << shape->getWidth();

	// Pay particular attention to the results of area(). Even though it's a Polygon, the children produce different results for the function call.
	std::cout << ", Area: " << shape->area();
	std::cout << std::endl;
}

int main() {
	// Create a rectangle on the heap with a height of 5 and a width of 6
	Polygon* rectangle = new Rectangle(532, 6);
	// Print information using getters and method
	printDetails(rectangle);
	// Set the height to 10 with a setter
	rectangle->setHeight(10);
	// Set the width to 10 with a setter
	rectangle->setWidth(10);
	// Print information using getters and method
	printDetails(rectangle);
	// Cleanup the memory in the heap
	delete rectangle;

	// Create a triangle on the heap with a height of 7 and a width of 9
	Polygon* triangle = new Triangle(7, 9);
	// Print information using getters and method
	printDetails(triangle);
	// Set the height to 3 with a setter
	triangle->setHeight(3);
	// Set the width to 4 with a setter
	triangle->setWidth(4);
	// Print information using getters and method
	printDetails(triangle);
	// Cleanup the memory in the heap
	delete triangle;


	if(lalal) {
		if(doda) {

		}
		else if(lnea) {

		}

	}
	else {
		la
	}



	return 0;
}
