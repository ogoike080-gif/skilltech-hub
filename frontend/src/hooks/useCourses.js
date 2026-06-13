import { useDispatch, useSelector } from 'react-redux';
import { courseActions, selectCourses, selectMyCourses, selectCurrentCourse } from '../store';
import api from '../utils/api';
import toast from 'react-hot-toast';

export function useCourses() {
  const dispatch  = useDispatch();
  const courses   = useSelector(selectCourses);
  const myCourses = useSelector(selectMyCourses);
  const current   = useSelector(selectCurrentCourse);

  const fetchCourses = async (params = {}) => {
    const { data } = await api.get('/courses', { params });

    console.log('Courses API Response:', data);

    dispatch(
      courseActions.setCourses(
        Array.isArray(data)
          ? data
          : Array.isArray(data?.data)
          ? data.data
          : []
      )
    );
  };

  const fetchCourse = async (slug) => {
    const { data } = await api.get(`/courses/${slug}`);
    dispatch(courseActions.setCurrentCourse(data.data));
    return data.data;
  };

  const fetchMyCourses = async () => {
    const { data } = await api.get('/courses/my-courses');
    dispatch(courseActions.setMyCourses(data.data));
  };

  const enroll = async (courseId) => {
    await api.post(`/courses/${courseId}/enroll`);
    toast.success('Enrolled successfully!');
    await fetchMyCourses();
  };

  const updateProgress = async (lessonId, payload) => {
    const { data } = await api.post(`/courses/lessons/${lessonId}/progress`, payload);
    return data.data;
  };

  return { courses, myCourses, current, fetchCourses, fetchCourse, fetchMyCourses, enroll, updateProgress };
}
