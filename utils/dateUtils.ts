export const timeAgo = (dateString: string): string => {
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) {
            return "Invalid date";
        }
        const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
        if (seconds < 60) return "Just now";
        
        const intervals: { [key: string]: number } = {
            year: 31536000,
            month: 2592000,
            day: 86400,
            hour: 3600,
            minute: 60,
        };

        for (const key in intervals) {
            const interval = Math.floor(seconds / intervals[key]);
            if (interval >= 1) {
                return `${interval} ${key}${interval === 1 ? '' : 's'} ago`;
            }
        }
        
        return "Just now";
    } catch (error) {
        console.error("Error in timeAgo function:", error);
        return "Invalid date";
    }
};
