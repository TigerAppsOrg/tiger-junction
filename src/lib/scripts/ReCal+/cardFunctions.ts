// Functions for card actions
import type { CourseData } from "$lib/types/dbTypes";

//----------------------------------------------------------------------
// From Search
//----------------------------------------------------------------------

/**
 * 
 * @param course 
 */
const saveCourseFromSearch = (course: CourseData) => {

}

/**
 * 
 * @param course 
 */
const pinCourseFromSearch = (course: CourseData) => {
    
}

//----------------------------------------------------------------------
// From Saved
//----------------------------------------------------------------------

/**
 * 
 * @param course 
 */
const pinCourseFromSaved = (course: CourseData) => {
    
}

/**
 * 
 * @param course 
 */
const removeCourseFromSaved = (course: CourseData) => {
        
}

//----------------------------------------------------------------------
// From Pinned
//----------------------------------------------------------------------

/**
 * 
 * @param course 
 */
const saveCourseFromPinned = (course: CourseData) => {
        
}

/**
 * 
 * @param course 
 */
const removeCourseFromPinned = (course: CourseData) => {
            
}

//----------------------------------------------------------------------
// Helpers
//----------------------------------------------------------------------

export {
    saveCourseFromSearch,
    pinCourseFromSearch,
    pinCourseFromSaved,
    removeCourseFromSaved,
    saveCourseFromPinned,
    removeCourseFromPinned,
}