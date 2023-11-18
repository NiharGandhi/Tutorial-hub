import { Category, Chapter, Course, Purchase } from "@prisma/client";
import { db } from "@/lib/db";
import { getProgress } from "@/actions/get-progress";

type CourseWithProgressWithCategory = Course & {
    category: Category;
    chapters: Chapter[];
    progress: number | null;
};

type DashboardCourses = {
    completedCourses: CourseWithProgressWithCategory[];
    coursesInProgress: CourseWithProgressWithCategory[];
};

export const getDashboardCourses = async (userId: string): Promise<DashboardCourses> => {
    try {
        const purchasedCourses = await db.purchase.findMany({
            where: {
                userId: userId,
            },
            include: {
                course: {
                    include: {
                        category: true,
                        chapters: {
                            where: {
                                isPublished: true,
                            },
                        },
                    },
                },
            },
        });

        const courses = purchasedCourses.map((purchase) => purchase.course) as CourseWithProgressWithCategory[];

        // Filter out unpublished courses
        const publishedCourses = courses.filter((course) => course.isPublished);

        for (let course of publishedCourses) {
            const progress = await getProgress(userId, course.id);
            course["progress"] = progress;
        }

        const completedCourses = publishedCourses.filter((course) => course.progress === 100);
        const coursesInProgress = publishedCourses.filter((course) => (course.progress ?? 0) < 100);

        return {
            completedCourses,
            coursesInProgress,
        };
    } catch (error) {
        console.log("[GET_DASHBOARD_COURSES]", error);
        return {
            completedCourses: [],
            coursesInProgress: [],
        };
    }
};
