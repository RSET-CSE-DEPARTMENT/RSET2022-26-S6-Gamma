export type Event = {
    id?: string;
    name: string;
    organiser: string;
    category: string;
    venue: string;
    eventDate: string;
    poster: string;
    description?: string;
    participants?: string[]; // If you want to track participants
};
