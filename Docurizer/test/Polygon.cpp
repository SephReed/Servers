// Example Project
// Author: Jake Lane
// Student ID: a1686679
// Description: Polygon class

#include "Polygon.hpp"

// breif: constructs the Polygon.
// @width is the width of the polygon.
// @height (optional) is the width of the polygon
Polygon::Polygon(int height, int width): m_height(height), m_width(width) {}

// breif: destroys the object
Polygon::~Polygon() {}

// breif: returns the polygon height
int Polygon::getHeight() {
	return m_height;
}

// breif: returns the polygon width
int Polygon::getWidth() {
	return m_width;
}

// breif: sets the polygon height
void Polygon::setHeight(int height) {
	m_height = height;
}

// breif: sets the polygon width
void Polygon::setWidth(int width) {
	m_width = width;
}

// breif: runs if there is no child class (polymorphism) so we return an invalid area
float Polygon::area() {
	return -1;
}
